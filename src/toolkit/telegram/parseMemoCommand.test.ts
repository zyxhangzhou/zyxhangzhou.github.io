import { describe, expect, it } from "bun:test";
import { isHelpCommand, parseMemoCommand } from "./parseMemoCommand";

describe("parseMemoCommand", () => {
  it("识别 /memo 和正文", () => {
    expect(parseMemoCommand("/memo 今天天气真好")).toEqual({
      isMemo: true,
      body: "今天天气真好",
    });
    expect(parseMemoCommand("/memo@info_digest_inbox_bot 出门了")).toEqual({
      isMemo: true,
      body: "出门了",
    });
    expect(parseMemoCommand("/MEMO")).toEqual({ isMemo: true, body: "" });
  });

  it("不把普通文本或推文链接当成 memo", () => {
    expect(parseMemoCommand("今天天气真好").isMemo).toBe(false);
    expect(parseMemoCommand("/memoized").isMemo).toBe(false);
    expect(parseMemoCommand("https://x.com/i/status/1").isMemo).toBe(false);
  });
});

describe("isHelpCommand", () => {
  it("识别 /start 与 /help", () => {
    expect(isHelpCommand("/start")).toBe(true);
    expect(isHelpCommand("/help@bot")).toBe(true);
    expect(isHelpCommand("/memo")).toBe(false);
  });
});
