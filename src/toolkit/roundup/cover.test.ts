import { describe, expect, it } from "bun:test";
import { buildRoundupCoverUrl } from "./cover";

describe("buildRoundupCoverUrl", () => {
  it("用周末日期当 seed，生成稳定的 Picsum 链接", () => {
    expect(buildRoundupCoverUrl("2026-08-19")).toBe(
      "https://picsum.photos/seed/weekly-2026-08-19/1920/1080.webp",
    );
    expect(buildRoundupCoverUrl("2026-08-26")).toBe(
      "https://picsum.photos/seed/weekly-2026-08-26/1920/1080.webp",
    );
  });
});
