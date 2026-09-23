import { describe, expect, it } from "bun:test";
import coversConfig from "@/covers.config";
import {
  buildHeaderCoverCycle,
  normalizeCoverRefs,
  resolveHeaderCovers,
  resolveThemedCoverSets,
} from "./headerCover";

describe("headerCover", () => {
  it("should return coverUrls when provided", async () => {
    const options = {
      coverUrls: ["cover1.jpg", "cover2.jpg"],
      fallbackCovers: ["fallback1.jpg", "fallback2.jpg"],
    };
    const result = await resolveHeaderCovers(options);
    expect(result).toEqual(["cover1.jpg", "cover2.jpg"]);
  });

  it("should trim and filter out invalid coverUrls", async () => {
    const options = {
      coverUrls: ["  cover1.jpg  ", "", "   ", "cover2.jpg"],
      fallbackCovers: ["fallback1.jpg", "fallback2.jpg"],
    };
    const result = await resolveHeaderCovers(options);
    expect(result).toEqual(["cover1.jpg", "cover2.jpg"]);
  });

  it("should return covers from config when coverUrls is empty", async () => {
    const options = {
      coverUrls: [],
      fallbackCovers: ["fallback1.jpg", "fallback2.jpg"],
    };
    const result = await resolveHeaderCovers(options);
    expect(result).toEqual(
      coversConfig.urls.length > 0 ? coversConfig.urls : options.fallbackCovers,
    );
  });
});

describe("normalizeCoverRefs", () => {
  it("trims, drops blanks, and keeps the first copy of each ref", () => {
    expect(normalizeCoverRefs([" cover-1 ", "", "  ", "cover-1", "cover-2"])).toEqual([
      "cover-1",
      "cover-2",
    ]);
  });
});

describe("resolveThemedCoverSets", () => {
  it("returns null when both themes are empty", () => {
    expect(resolveThemedCoverSets({ light: [], dark: [] })).toBeNull();
  });

  it("reuses the only available set for the empty theme", () => {
    expect(resolveThemedCoverSets({ light: ["day"], dark: [] })).toEqual({
      light: ["day"],
      dark: ["day"],
    });
  });

  it("keeps distinct light and dark sets", () => {
    expect(resolveThemedCoverSets({ light: ["day"], dark: ["night"] })).toEqual({
      light: ["day"],
      dark: ["night"],
    });
  });
});

describe("buildHeaderCoverCycle", () => {
  it("does not build a cycle for a single image", () => {
    expect(buildHeaderCoverCycle({ theme: "light", count: 1 })).toBeNull();
  });

  it("scales the crossfade to the image count", () => {
    const cycle = buildHeaderCoverCycle({
      theme: "dark",
      count: 4,
      intervalSeconds: 8,
      fadeSeconds: 1.2,
    });

    expect(cycle).not.toBeNull();
    expect(cycle?.durationSeconds).toBe(32);
    expect(cycle?.animationName).toBe("header-cover-cycle-dark");
    expect(cycle?.css).toContain("3.75%");
    expect(cycle?.css).toContain("25%");
    expect(cycle?.css).toContain("28.75%");
    expect(cycle?.css).toContain("animation-duration: 32s");
    expect(cycle?.css).toContain('[data-cover-theme="dark"]');
  });
});
