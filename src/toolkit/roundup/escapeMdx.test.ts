import { describe, expect, it } from "bun:test";

import { escapeMdxText } from "./escapeMdx";

describe("escapeMdxText", () => {
  it("把小于号和花括号转成 MDX 安全实体", () => {
    expect(escapeMdxText("索引 <30 秒，用 {id} 查")).toBe("索引 &lt;30 秒，用 &#123;id&#125; 查");
  });

  it("普通中文原样保留", () => {
    expect(escapeMdxText("先问内存跳不跳")).toBe("先问内存跳不跳");
  });
});
