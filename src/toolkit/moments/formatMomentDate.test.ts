import { describe, expect, it } from "bun:test";
import { formatMomentDateTime, formatMomentMonthDay } from "./formatMomentDate";

describe("formatMomentDateTime", () => {
  it("按东京时区显示，而不是构建机的 UTC", () => {
    const date = new Date("2026-08-19T22:45:46+09:00");
    expect(formatMomentDateTime(date, "zh-CN")).toContain("22:45");
    expect(formatMomentDateTime(date, "zh-CN")).toContain("19");
    expect(formatMomentDateTime(date, "zh-CN")).not.toContain("13:45");
  });
});

describe("formatMomentMonthDay", () => {
  it("按东京时区取月日", () => {
    expect(formatMomentMonthDay(new Date("2026-08-19T22:45:46+09:00"), "zh-CN")).toBe("08/19");
  });
});
