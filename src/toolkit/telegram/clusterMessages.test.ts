import { describe, expect, it } from "bun:test";
import { clusterTelegramMessages } from "./clusterMessages";

describe("clusterTelegramMessages", () => {
  it("把同一 media_group_id 收成一组", () => {
    const clusters = clusterTelegramMessages([
      { id: 1 },
      { id: 2, media_group_id: "g" },
      { id: 3, media_group_id: "g" },
      { id: 4 },
    ]);

    expect(clusters.map((cluster) => cluster.map((item) => item.id))).toEqual([[1], [2, 3], [4]]);
  });
});
