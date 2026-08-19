import { describe, expect, it } from "bun:test";
import {
  ensureRoundupTitle,
  fallbackPlan,
  normalizeRoundupPlan,
  parseModelJson,
} from "./normalizePlan";
import { renderRoundupMarkdown } from "./renderMarkdown";
import type { RoundupCatalogItem } from "./types";

const catalog: RoundupCatalogItem[] = [
  { id: "1", url: "https://x.com/i/status/1", author: "a", text: "Redis 想把跳表换成 B+ 树" },
  { id: "2", url: "https://x.com/i/status/2", author: "b", text: "Java 接口可以有私有方法吗" },
];

describe("parseModelJson", () => {
  it("解析裸 JSON 与 markdown 围栏", () => {
    expect(parseModelJson('{"title":"ok"}')).toEqual({ title: "ok" });
    expect(parseModelJson('```json\n{"title":"ok"}\n```')).toEqual({ title: "ok" });
  });
});

describe("ensureRoundupTitle", () => {
  it("补上日期前缀，并保留主题词", () => {
    expect(ensureRoundupTitle("", "2026-08-12", "2026-08-19")).toBe(
      "2026-08-12 至 2026-08-19 技术周报",
    );
    expect(
      ensureRoundupTitle(
        "2026-08-12 至 2026-08-19 技术周报：Agent 工程精进、缓存实战与底层优化",
        "2026-08-12",
        "2026-08-19",
      ),
    ).toBe("2026-08-12 至 2026-08-19 技术周报：Agent 工程精进、缓存实战与底层优化");
    expect(
      ensureRoundupTitle("Agent 工程精进、缓存实战与底层优化", "2026-08-12", "2026-08-19"),
    ).toBe("2026-08-12 至 2026-08-19 技术周报：Agent 工程精进、缓存实战与底层优化");
  });
});

describe("normalizeRoundupPlan", () => {
  it("去掉未知 id、补上漏掉的帖子", () => {
    const plan = normalizeRoundupPlan(
      {
        title: "本周摘录：缓存和 Redis",
        description: "看了缓存和数据结构。",
        intro: "这周主要在看基础设施。",
        items: [
          {
            id: "1",
            section: "数据结构",
            headline: "Redis 可能换 B+ 树",
            explain: "跳表像多层有序链表。",
            takeaways: ["先看指针多不多", ""],
          },
          { id: "999", section: "假的", headline: "x", explain: "x", takeaways: ["x"] },
          { id: "1", section: "重复", headline: "x", explain: "x", takeaways: ["x"] },
        ],
      },
      catalog,
      "2026-08-12",
      "2026-08-19",
    );

    expect(plan.title).toBe("2026-08-12 至 2026-08-19 技术周报：本周摘录：缓存和 Redis");
    expect(plan.items.map((item) => item.id)).toEqual(["1", "2"]);
    expect(plan.items[0]?.takeaways).toEqual(["先看指针多不多"]);
    expect(plan.items[1]).toMatchObject({ id: "2", section: "其他" });
  });

  it("空载荷回退到收藏顺序", () => {
    const plan = fallbackPlan(catalog, "2026-08-12", "2026-08-19");
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]?.headline).toContain("Redis");
  });
});

describe("renderRoundupMarkdown", () => {
  it("按主题分组并写出解说与收获", () => {
    const markdown = renderRoundupMarkdown(
      {
        title: "本周摘录：Redis",
        description: "看了有序集合。",
        intro: "这周收藏了一条 Redis 讨论。",
        items: [
          {
            id: "1",
            section: "数据结构",
            headline: "Redis 可能换 B+ 树",
            explain: "跳表像多层有序链表。",
            takeaways: ["先问内存跳不跳"],
          },
          {
            id: "2",
            section: "其他",
            headline: "Java 接口私有方法",
            explain: "",
            takeaways: [],
          },
        ],
      },
      {
        weekStartLabel: "2026-08-12",
        weekEndLabel: "2026-08-19",
        tweetCount: 2,
      },
    );

    expect(markdown).toContain("## 数据结构");
    expect(markdown).toContain("### Redis 可能换 B+ 树");
    expect(markdown).toContain('<Tweet id="1" />');
    expect(markdown).toContain("**这是在说什么**");
    expect(markdown).toContain("**我们能学到什么**");
    expect(markdown).toContain("- 先问内存跳不跳");
    expect(markdown).toContain("## 其他");
    expect(markdown).not.toMatch(/## 其他[\s\S]*这是在说什么/);
    expect(markdown).toContain(
      'cover: "https://picsum.photos/seed/weekly-2026-08-19/1920/1080.webp"',
    );
  });
});
