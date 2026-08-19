import type { RoundupCatalogItem, RoundupNote, RoundupPlan } from "./types";

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = entry;
  }
  return record;
}

function clipHeadline(text: string): string {
  const compact = text.replaceAll(/\s+/g, " ").trim();
  if (!compact) return "本周一条摘录";
  return compact.length > 24 ? `${compact.slice(0, 24)}…` : compact;
}

function parseTakeaways(value: unknown): string[] {
  return readArray(value)
    .map((item) => readString(item))
    .filter(Boolean)
    .slice(0, 3);
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] || trimmed);
}

export function fallbackNote(item: RoundupCatalogItem, section = "本周分享"): RoundupNote {
  return {
    id: item.id,
    section,
    headline: clipHeadline(item.text),
    explain: "",
    takeaways: [],
  };
}

export function ensureRoundupTitle(
  title: string,
  weekStartLabel: string,
  weekEndLabel: string,
): string {
  const prefix = `${weekStartLabel} 至 ${weekEndLabel} 技术周报`;
  const trimmed = title.trim();
  if (!trimmed) return prefix;
  if (trimmed.startsWith(prefix)) return trimmed;

  const marker = "技术周报：";
  const markerAt = trimmed.indexOf(marker);
  const theme = (markerAt >= 0 ? trimmed.slice(markerAt + marker.length) : trimmed).trim();
  return theme ? `${prefix}：${theme}` : prefix;
}

export function fallbackPlan(
  catalog: RoundupCatalogItem[],
  weekStartLabel: string,
  weekEndLabel: string,
): RoundupPlan {
  return {
    title: `${weekStartLabel} 至 ${weekEndLabel} 技术周报`,
    description: `本周分享了 ${catalog.length} 条推文。`,
    intro: "模型这次没写出提纲，下面按收藏顺序附上原推。",
    items: catalog.map((item) => fallbackNote(item)),
  };
}

export function normalizeRoundupPlan(
  payload: unknown,
  catalog: RoundupCatalogItem[],
  weekStartLabel: string,
  weekEndLabel: string,
): RoundupPlan {
  const defaults = fallbackPlan(catalog, weekStartLabel, weekEndLabel);
  const root = readObject(payload);
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const used = new Set<string>();

  const items: RoundupNote[] = [];
  for (const entry of readArray(root?.items)) {
    const note = readObject(entry);
    const id = readString(note?.id);
    const source = byId.get(id);
    if (!source || used.has(id)) continue;
    used.add(id);
    items.push({
      id,
      section: readString(note?.section) || "其他",
      headline: readString(note?.headline) || clipHeadline(source.text),
      explain: readString(note?.explain),
      takeaways: parseTakeaways(note?.takeaways),
    });
  }

  for (const item of catalog) {
    if (used.has(item.id)) continue;
    items.push(fallbackNote(item, "其他"));
  }

  return {
    title: ensureRoundupTitle(readString(root?.title), weekStartLabel, weekEndLabel),
    description: readString(root?.description) || defaults.description,
    intro: readString(root?.intro) || defaults.intro,
    items,
  };
}

export function groupNotesBySection(
  items: RoundupNote[],
): Array<{ name: string; items: RoundupNote[] }> {
  const groups: Array<{ name: string; items: RoundupNote[] }> = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
    const name = item.section || "其他";
    const existing = indexByName.get(name);
    if (existing === undefined) {
      indexByName.set(name, groups.length);
      groups.push({ name, items: [item] });
      continue;
    }
    groups[existing]?.items.push(item);
  }

  return groups;
}
