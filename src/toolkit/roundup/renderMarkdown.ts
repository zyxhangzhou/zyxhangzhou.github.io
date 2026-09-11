import { buildRoundupCoverUrl } from "./cover";
import { escapeMdxText } from "./escapeMdx";
import { groupNotesBySection } from "./normalizePlan";
import type { RoundupPlan, RoundupRenderContext } from "./types";

function renderTakeaways(takeaways: string[]): string[] {
  if (takeaways.length === 0) return [];
  return ["**我们能学到什么**", "", ...takeaways.map((item) => `- ${escapeMdxText(item)}`), ""];
}

function renderExplain(explain: string): string[] {
  if (!explain) return [];
  return ["**这是在说什么**", "", escapeMdxText(explain), ""];
}

export function renderRoundupMarkdown(plan: RoundupPlan, context: RoundupRenderContext): string {
  const sections: string[] = [];

  for (const group of groupNotesBySection(plan.items)) {
    sections.push(`## ${escapeMdxText(group.name)}`, "");
    for (const item of group.items) {
      sections.push(`### ${escapeMdxText(item.headline)}`, "", `<Tweet id="${item.id}" />`, "");
      sections.push(...renderExplain(item.explain));
      sections.push(...renderTakeaways(item.takeaways));
    }
  }

  return [
    "---",
    `title: ${JSON.stringify(plan.title)}`,
    `description: ${JSON.stringify(plan.description)}`,
    `date: ${context.weekEndLabel}`,
    "tags:",
    "  - roundup",
    "  - twitter",
    "categories:",
    "  - 摘录",
    `cover: ${JSON.stringify(buildRoundupCoverUrl(context.weekEndLabel))}`,
    "draft: false",
    "---",
    "",
    escapeMdxText(plan.intro),
    "",
    `> 收集区间：${context.weekStartLabel} – ${context.weekEndLabel}（JST），共 ${context.tweetCount} 条。`,
    "",
    ...sections,
  ].join("\n");
}
