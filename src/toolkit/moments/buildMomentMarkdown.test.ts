import { describe, expect, it } from "bun:test";
import {
  buildMomentFilenames,
  buildMomentMarkdown,
  formatTokyoDateTime,
} from "./buildMomentMarkdown";

describe("formatTokyoDateTime", () => {
  it("按东京时区格式化文件名和 frontmatter", () => {
    const result = formatTokyoDateTime(new Date("2026-08-19T11:58:00.000Z"));
    expect(result.fileSlug).toBe("2026-08-19-2058");
    expect(result.frontmatter).toBe("2026-08-19T20:58:00+09:00");
  });
});

describe("buildMomentMarkdown", () => {
  it("写出日期、图片和正文", () => {
    const markdown = buildMomentMarkdown({
      frontmatterDate: "2026-08-19T20:58:00+09:00",
      text: "今天天气真好",
      imagePaths: ["/moments/a.jpg"],
    });

    expect(markdown).toContain("date: 2026-08-19T20:58:00+09:00");
    expect(markdown).toContain('  - "/moments/a.jpg"');
    expect(markdown).toContain("今天天气真好");
  });
});

describe("buildMomentFilenames", () => {
  it("用 Telegram message id 保证重试不重复写文件", () => {
    expect(buildMomentFilenames("2026-08-19-2058", 42)).toEqual({
      stem: "2026-08-19-2058-tg42",
      markdownPath: "src/moments/2026-08-19-2058-tg42.md",
    });
  });
});
