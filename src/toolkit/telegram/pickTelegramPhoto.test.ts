import { describe, expect, it } from "bun:test";
import { pickTelegramPhoto } from "./pickTelegramPhoto";

describe("pickTelegramPhoto", () => {
  it("优先选不超过 1280 宽的最大尺寸", () => {
    const picked = pickTelegramPhoto([
      { file_id: "a", width: 320, height: 240 },
      { file_id: "b", width: 1280, height: 960 },
      { file_id: "c", width: 2560, height: 1920 },
    ]);

    expect(picked?.file_id).toBe("b");
  });

  it("空数组返回 undefined", () => {
    expect(pickTelegramPhoto([])).toBeUndefined();
  });
});
