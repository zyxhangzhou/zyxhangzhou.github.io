import { describe, expect, it } from "bun:test";
import {
  buildMomentsFeedSnapshot,
  buildMomentsMetaUrl,
  buildMomentsPageUrl,
  normalizeMomentsFeedConfig,
  prependMomentItem,
  resolveMomentImageUrl,
} from "./feedStore";
import type { MomentFeedItem } from "./feedTypes";

const sample = (id: string): MomentFeedItem => ({
  id,
  date: "2026-08-25T12:00:00+09:00",
  text: `hello ${id}`,
  images: [],
});

describe("normalizeMomentsFeedConfig", () => {
  it("填充默认仓库与 raw 源", () => {
    const config = normalizeMomentsFeedConfig({});
    expect(config.repo).toBe("zyxhangzhou/zyxhangzhou.github.io");
    expect(config.source).toBe("raw");
    expect(config.pageSize).toBe(20);
    expect(config.basePath).toBe("data/moments");
  });
});

describe("buildMomentsFeedSnapshot", () => {
  it("按 pageSize 切页并生成 meta", () => {
    const items = Array.from({ length: 25 }, (_, index) => sample(String(index + 1)));
    const { meta, pages } = buildMomentsFeedSnapshot(items, {
      pageSize: 20,
      updatedAt: "2026-08-25T00:00:00.000Z",
    });

    expect(meta.total).toBe(25);
    expect(meta.pageCount).toBe(2);
    expect(meta.pageSize).toBe(20);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.items).toHaveLength(20);
    expect(pages[1]?.items).toHaveLength(5);
    expect(pages[0]?.items[0]?.id).toBe("1");
  });

  it("空列表时 pageCount 为 0", () => {
    const { meta, pages } = buildMomentsFeedSnapshot([]);
    expect(meta.total).toBe(0);
    expect(meta.pageCount).toBe(0);
    expect(pages).toEqual([]);
  });
});

describe("prependMomentItem", () => {
  it("新条目插到最前且按 id 去重", () => {
    const existing = [sample("a"), sample("b")];
    const next = prependMomentItem(existing, sample("c"));
    expect(next.map((item) => item.id)).toEqual(["c", "a", "b"]);

    const deduped = prependMomentItem(next, sample("a"));
    expect(deduped.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});

describe("moments feed urls", () => {
  it("raw 与 jsdelivr 拼出 meta / page / 图片地址", () => {
    const raw = normalizeMomentsFeedConfig({ source: "raw" });
    expect(buildMomentsMetaUrl(raw)).toBe(
      "https://raw.githubusercontent.com/zyxhangzhou/zyxhangzhou.github.io/main/data/moments/meta.json",
    );
    expect(buildMomentsPageUrl(raw, 2)).toBe(
      "https://raw.githubusercontent.com/zyxhangzhou/zyxhangzhou.github.io/main/data/moments/pages/2.json",
    );
    expect(resolveMomentImageUrl("media/a.jpg", raw)).toBe(
      "https://raw.githubusercontent.com/zyxhangzhou/zyxhangzhou.github.io/main/data/moments/media/a.jpg",
    );
    expect(resolveMomentImageUrl("https://example.com/x.jpg", raw)).toBe(
      "https://example.com/x.jpg",
    );

    const jsdelivr = normalizeMomentsFeedConfig({ source: "jsdelivr" });
    expect(buildMomentsMetaUrl(jsdelivr)).toBe(
      "https://cdn.jsdelivr.net/gh/zyxhangzhou/zyxhangzhou.github.io@main/data/moments/meta.json",
    );
  });
});
