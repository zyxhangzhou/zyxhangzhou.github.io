import { describe, expect, it } from "bun:test";
import { isWalineCommentsEnabled } from "./comments";

describe("isWalineCommentsEnabled", () => {
  it("requires both the switch and a server URL", () => {
    expect(isWalineCommentsEnabled(undefined)).toBe(false);
    expect(isWalineCommentsEnabled({ enable: true })).toBe(false);
    expect(
      isWalineCommentsEnabled({
        enable: true,
        waline: { serverURL: "   " },
      }),
    ).toBe(false);
    expect(
      isWalineCommentsEnabled({
        enable: false,
        waline: { serverURL: "https://comments.example.com" },
      }),
    ).toBe(false);
    expect(
      isWalineCommentsEnabled({
        enable: true,
        waline: { serverURL: " https://comments.example.com " },
      }),
    ).toBe(true);
  });
});
