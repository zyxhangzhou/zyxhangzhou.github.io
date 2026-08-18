import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchTweetPreview, type TweetPreview } from "../src/toolkit/twitter.ts";

const INBOX_PATH = path.resolve("src/data/tweet-inbox.json");
const POSTS_DIR = path.resolve("src/posts/roundup");
const JST = "Asia/Tokyo";

type InboxItem = {
  id: string;
  url: string;
  receivedAt: string;
  telegramText: string;
};

type Inbox = {
  ownerUserId: number | null;
  items: InboxItem[];
};

type Cluster = {
  name: string;
  summary: string;
  tweetIds: string[];
};

type RoundupPlan = {
  title: string;
  description: string;
  intro: string;
  clusters: Cluster[];
};

const formatJst = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: JST, ...options }).format(date);

const now = new Date();
const weekEnd = new Date(now);
const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const weekEndLabel = formatJst(weekEnd, { year: "numeric", month: "2-digit", day: "2-digit" });
const weekStartLabel = formatJst(weekStart, { year: "numeric", month: "2-digit", day: "2-digit" });
const slugDate = weekEndLabel;

const inbox = JSON.parse(await readFile(INBOX_PATH, "utf8")) as Inbox;
const weeklyItems = inbox.items.filter((item) => {
  const received = new Date(item.receivedAt).getTime();
  return received >= weekStart.getTime() && received <= weekEnd.getTime();
});

if (weeklyItems.length === 0) {
  console.log("No tweets in the last 7 days. Skip roundup.");
  process.exit(0);
}

const previews = new Map<string, TweetPreview>();
for (const item of weeklyItems) {
  const preview = await fetchTweetPreview(item.id);
  if (!preview.text && item.telegramText) {
    preview.text = item.telegramText;
  }
  previews.set(item.id, preview);
}

function fallbackPlan(): RoundupPlan {
  return {
    title: `本周摘录 · ${weekStartLabel} – ${weekEndLabel}`,
    description: `本周分享了 ${weeklyItems.length} 条推文。`,
    intro: "Qwen API Key 还没有配置，这一期先按时间顺序列出，不进行主题聚类。",
    clusters: [
      {
        name: "本周分享",
        summary: "以下是这一周转发到 inbox 的推文。",
        tweetIds: weeklyItems.map((item) => item.id),
      },
    ],
  };
}

async function planWithQwen(): Promise<RoundupPlan> {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return fallbackPlan();

  const baseUrl = (
    process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
  ).replace(/\/$/, "");
  const model = process.env.QWEN_MODEL || "qwen-plus";

  const catalog = weeklyItems.map((item) => {
    const preview = previews.get(item.id);
    return {
      id: item.id,
      url: item.url,
      author: preview?.authorHandle || "",
      text: preview?.text || item.telegramText,
    };
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是中文技术博客编辑。根据用户本周收藏的 X/Twitter 帖子，聚类并写成周报提纲。只返回 JSON。",
        },
        {
          role: "user",
          content: `时间范围：${weekStartLabel} 至 ${weekEndLabel}（日本时间）。
请输出 JSON，字段如下：
{
  "title": "中文标题，含本周摘录",
  "description": "不超过 80 字的摘要",
  "intro": "2-4 句开篇综述",
  "clusters": [
    {
      "name": "主题名",
      "summary": "这个主题为什么值得看，2-4 句",
      "tweetIds": ["只使用我提供的 id"]
    }
  ]
}
规则：
- 3 到 8 个主题；无法归类的放进名为「其他」的最后一组
- tweetIds 必须全部来自输入，不要编造
- 每条推文只出现一次
- 用简体中文

帖子列表：
${JSON.stringify(catalog, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Qwen request failed: ${response.status}`);
    return fallbackPlan();
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return fallbackPlan();

  const parsed = JSON.parse(content) as RoundupPlan;
  const known = new Set(weeklyItems.map((item) => item.id));
  const used = new Set<string>();
  parsed.clusters = (parsed.clusters ?? [])
    .map((cluster) => ({
      ...cluster,
      tweetIds: (cluster.tweetIds ?? []).filter((id) => known.has(id) && !used.has(id) && (used.add(id), true)),
    }))
    .filter((cluster) => cluster.tweetIds.length > 0);

  const missing = weeklyItems.map((item) => item.id).filter((id) => !used.has(id));
  if (missing.length > 0) {
    parsed.clusters.push({
      name: "其他",
      summary: "这一组没有被模型明确归类，原样附上。",
      tweetIds: missing,
    });
  }

  parsed.title ||= `本周摘录 · ${weekStartLabel} – ${weekEndLabel}`;
  parsed.description ||= `本周分享了 ${weeklyItems.length} 条推文。`;
  parsed.intro ||= "下面是这一周从 X 收藏下来的帖子。";
  return parsed;
}

const plan = await planWithQwen();

const body = [
  "---",
  `title: ${JSON.stringify(plan.title)}`,
  `description: ${JSON.stringify(plan.description)}`,
  `date: ${slugDate}`,
  "tags:",
  "  - roundup",
  "  - twitter",
  "categories:",
  "  - 摘录",
  "cover: ../../assets/images/cover-1.avif",
  "draft: false",
  "---",
  "",
  plan.intro,
  "",
  `> 收集区间：${weekStartLabel} – ${weekEndLabel}（JST），共 ${weeklyItems.length} 条。`,
  "",
  ...plan.clusters.flatMap((cluster) => [
    `## ${cluster.name}`,
    "",
    cluster.summary,
    "",
    ...cluster.tweetIds.flatMap((id) => {
      const preview = previews.get(id);
      const author = preview?.authorHandle ? `@${preview.authorHandle}` : "X";
      return [`<Tweet id="${id}" />`, "", `<small>来源：[${author}](${preview?.url ?? `https://x.com/i/status/${id}`})</small>`, ""];
    }),
  ]),
].join("\n");

await mkdir(POSTS_DIR, { recursive: true });
const filePath = path.join(POSTS_DIR, `weekly-roundup-${slugDate}.mdx`);
await writeFile(filePath, body, "utf8");
console.log(`Wrote ${filePath}`);
