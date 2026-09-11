/** 周报正文会写进 MDX：转义会被当成 JSX 的字符 */

export function escapeMdxText(text: string): string {
  return text.replaceAll("<", "&lt;").replaceAll("{", "&#123;").replaceAll("}", "&#125;");
}
