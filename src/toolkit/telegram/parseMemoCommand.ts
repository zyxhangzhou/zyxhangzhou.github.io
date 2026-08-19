/** 解析 Telegram /memo 命令，支持 /memo@bot 和后面的正文 */

const MEMO_RE = /^\/memo(?:@\S+)?(?:\s+([\s\S]*))?$/i;
const HELP_RE = /^\/(?:start|help)(?:@\S+)?$/i;

export function parseMemoCommand(text: string): { isMemo: boolean; body: string } {
  const match = text.trim().match(MEMO_RE);
  if (!match) return { isMemo: false, body: "" };
  return { isMemo: true, body: (match[1] ?? "").trim() };
}

export function isHelpCommand(text: string): boolean {
  return HELP_RE.test(text.trim());
}
