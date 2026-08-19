import { buildRoundupCoverUrl } from "./cover";
import { groupNotesBySection } from "./normalizePlan";
import type { RoundupPlan, RoundupRenderContext } from "./types";

function renderTakeaways(takeaways: string[]): string[] {
  if (takeaways.length === 0) return [];
  return ["**我们能学到什么**", "", ...takeaways.map((item) => `- ${item}`), ""];
}

function renderExplain(explain: string): string[] {
  if (!explain) return [];
  return ["**这是在说什么**", "", explain, ""];
}

export function renderRoundupMarkdown(plan: RoundupPlan, context: RoundupRenderContext): string {
  const sections: string[] = [];

  for (const group of groupNotesBySection(plan.items)) {
    sections.push(`## ${group.name}`, "");
    for (const item of group.items) {
      sections.push(`### ${item.headline}`, "", `<Tweet id="${item.id}" />`, "");
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
    plan.intro,
    "",
    `> 收集区间：${context.weekStartLabel} – ${context.weekEndLabel}（JST），共 ${context.tweetCount} 条。`,
    "",
    ...sections,
  ].join("\n");
}
