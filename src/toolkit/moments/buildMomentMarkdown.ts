/** 动态 Markdown：东京时间 frontmatter，可选本地图路径 */

export function formatTokyoDateTime(date: Date): { fileSlug: string; frontmatter: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = read("year");
  const month = read("month");
  const day = read("day");
  const hour = read("hour");
  const minute = read("minute");
  const second = read("second");

  return {
    fileSlug: `${year}-${month}-${day}-${hour}${minute}`,
    frontmatter: `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`,
  };
}

export function buildMomentMarkdown(input: {
  frontmatterDate: string;
  text: string;
  imagePaths: string[];
}): string {
  const lines = ["---", `date: ${input.frontmatterDate}`];

  if (input.imagePaths.length > 0) {
    lines.push("images:");
    for (const imagePath of input.imagePaths) {
      lines.push(`  - ${JSON.stringify(imagePath)}`);
    }
  }

  lines.push("---", "", input.text.trim(), "");
  return lines.join("\n");
}

export function buildMomentFilenames(fileSlug: string, telegramMessageId: number) {
  const stem = `${fileSlug}-tg${telegramMessageId}`;
  return {
    stem,
    markdownPath: `src/moments/${stem}.md`,
  };
}
