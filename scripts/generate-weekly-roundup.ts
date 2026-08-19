import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildRoundupUserPrompt, ROUNDUP_SYSTEM_PROMPT } from "../src/toolkit/roundup/prompts.ts";
import {
  fallbackPlan,
  normalizeRoundupPlan,
  parseModelJson,
} from "../src/toolkit/roundup/normalizePlan.ts";
import { renderRoundupMarkdown } from "../src/toolkit/roundup/renderMarkdown.ts";
import { fetchTweetPreview } from "../src/toolkit/twitter.ts";
import type { RoundupCatalogItem, RoundupPlan } from "../src/toolkit/roundup/types.ts";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readInbox(raw: string): Inbox {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("tweet-inbox.json 格式无效");
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    ownerUserId: typeof parsed.ownerUserId === "number" ? parsed.ownerUserId : null,
    items: items.flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.url !== "string") {
        return [];
      }
      return [
        {
          id: item.id,
          url: item.url,
          receivedAt: typeof item.receivedAt === "string" ? item.receivedAt : "",
          telegramText: typeof item.telegramText === "string" ? item.telegramText : "",
        },
      ];
    }),
  };
}

function readChoiceContent(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return "";
  const first = payload.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return "";
  return typeof first.message.content === "string" ? first.message.content : "";
}

const formatJst = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: JST, ...options }).format(date);

const now = new Date();
const weekEnd = new Date(now);
const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const weekEndLabel = formatJst(weekEnd, { year: "numeric", month: "2-digit", day: "2-digit" });
const weekStartLabel = formatJst(weekStart, { year: "numeric", month: "2-digit", day: "2-digit" });
const slugDate = weekEndLabel;

const inbox = readInbox(await readFile(INBOX_PATH, "utf8"));
const weeklyItems = inbox.items.filter((item) => {
  const received = new Date(item.receivedAt).getTime();
  return received >= weekStart.getTime() && received <= weekEnd.getTime();
});

if (weeklyItems.length === 0) {
  console.log("No tweets in the last 7 days. Skip roundup.");
  process.exit(0);
}

const catalog: RoundupCatalogItem[] = await Promise.all(
  weeklyItems.map(async (item) => {
    const preview = await fetchTweetPreview(item.id);
    return {
      id: item.id,
      url: item.url,
      author: preview.authorHandle || "",
      text: preview.text || item.telegramText,
    };
  }),
);

async function planWithQwen(): Promise<RoundupPlan> {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return fallbackPlan(catalog, weekStartLabel, weekEndLabel);

  const baseUrl = (
    process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
  ).replace(/\/$/, "");
  const model = process.env.QWEN_MODEL || "qwen-plus";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ROUNDUP_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildRoundupUserPrompt({
            weekStartLabel,
            weekEndLabel,
            catalogJson: JSON.stringify(catalog, null, 2),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Qwen request failed: ${response.status}`);
    return fallbackPlan(catalog, weekStartLabel, weekEndLabel);
  }

  const content = readChoiceContent(await response.json());

  if (!content) return fallbackPlan(catalog, weekStartLabel, weekEndLabel);

  try {
    return normalizeRoundupPlan(parseModelJson(content), catalog, weekStartLabel, weekEndLabel);
  } catch (error) {
    console.warn("Qwen JSON parse failed:", error);
    return fallbackPlan(catalog, weekStartLabel, weekEndLabel);
  }
}

const plan = await planWithQwen();
const body = renderRoundupMarkdown(plan, {
  weekStartLabel,
  weekEndLabel,
  tweetCount: weeklyItems.length,
});

await mkdir(POSTS_DIR, { recursive: true });
const filePath = path.join(POSTS_DIR, `weekly-roundup-${slugDate}.mdx`);
await writeFile(filePath, body, "utf8");
console.log(`Wrote ${filePath}`);
