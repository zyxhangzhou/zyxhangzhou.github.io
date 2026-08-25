import {
  DEFAULT_MOMENTS_FEED_BASE_PATH,
  MOMENTS_FEED_PAGE_SIZE,
  MOMENTS_FEED_VERSION,
  type MomentFeedItem,
  type MomentsFeedConfig,
  type MomentsFeedMeta,
  type MomentsFeedPage,
} from "./feedTypes";

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const entries: Array<[string, unknown]> = [];
  for (const key of Object.keys(value)) {
    entries.push([key, Reflect.get(value, key)]);
  }
  return Object.fromEntries(entries);
}

function cloneMomentItem(item: MomentFeedItem): MomentFeedItem {
  return {
    id: item.id,
    date: item.date,
    text: item.text,
    images: item.images.slice(),
  };
}

export function normalizeMomentsFeedConfig(
  input?: Partial<MomentsFeedConfig> & { repo?: string },
): MomentsFeedConfig {
  const repo = input?.repo?.trim() || "zyxhangzhou/zyxhangzhou.github.io";
  const pageSizeValue = input?.pageSize;
  return {
    repo,
    branch: input?.branch?.trim() || "main",
    basePath: (input?.basePath?.trim() || DEFAULT_MOMENTS_FEED_BASE_PATH).replace(/\/+$/, ""),
    pageSize:
      typeof pageSizeValue === "number" && Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? Math.floor(pageSizeValue)
        : MOMENTS_FEED_PAGE_SIZE,
    source: input?.source === "jsdelivr" ? "jsdelivr" : "raw",
  };
}

export function buildMomentsFeedBaseUrl(config: MomentsFeedConfig): string {
  const { repo, branch, basePath, source } = config;
  if (source === "jsdelivr") {
    return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${basePath}`;
  }
  return `https://raw.githubusercontent.com/${repo}/${branch}/${basePath}`;
}

export function buildMomentsMetaUrl(config: MomentsFeedConfig): string {
  return `${buildMomentsFeedBaseUrl(config)}/meta.json`;
}

export function buildMomentsPageUrl(config: MomentsFeedConfig, page: number): string {
  return `${buildMomentsFeedBaseUrl(config)}/pages/${page}.json`;
}

/** 相对路径 media/xxx 拼成可请求的 URL；已是 http(s) 则原样返回 */
export function resolveMomentImageUrl(image: string, config: MomentsFeedConfig): string {
  const trimmed = image.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const relative = trimmed.replace(/^\/+/, "");
  return `${buildMomentsFeedBaseUrl(config)}/${relative}`;
}

export function emptyMomentsMeta(pageSize = MOMENTS_FEED_PAGE_SIZE): MomentsFeedMeta {
  return {
    version: MOMENTS_FEED_VERSION,
    pageSize,
    total: 0,
    pageCount: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildMomentsFeedSnapshot(
  items: readonly MomentFeedItem[],
  options?: { pageSize?: number; updatedAt?: string },
): { meta: MomentsFeedMeta; pages: MomentsFeedPage[] } {
  const pageSizeValue = options?.pageSize;
  const pageSize =
    typeof pageSizeValue === "number" && Number.isFinite(pageSizeValue) && pageSizeValue > 0
      ? Math.floor(pageSizeValue)
      : MOMENTS_FEED_PAGE_SIZE;
  const total = items.length;
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);
  const updatedAt = options?.updatedAt ?? new Date().toISOString();

  const meta: MomentsFeedMeta = {
    version: MOMENTS_FEED_VERSION,
    pageSize,
    total,
    pageCount,
    updatedAt,
  };

  const pages: MomentsFeedPage[] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const start = (page - 1) * pageSize;
    pages.push({
      page,
      items: items.slice(start, start + pageSize).map(cloneMomentItem),
    });
  }

  return { meta, pages };
}

export function prependMomentItem(
  items: readonly MomentFeedItem[],
  item: MomentFeedItem,
): MomentFeedItem[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items.map(cloneMomentItem);
  }
  return [cloneMomentItem(item), ...items.map(cloneMomentItem)];
}

export function isMomentFeedItem(value: unknown): value is MomentFeedItem {
  const record = readObject(value);
  if (!record) return false;
  return (
    typeof record.id === "string" &&
    typeof record.date === "string" &&
    typeof record.text === "string" &&
    Array.isArray(record.images) &&
    record.images.every((image) => typeof image === "string")
  );
}

export function parseMomentsItemsFile(value: unknown): MomentFeedItem[] {
  const record = readObject(value);
  if (!record || !Array.isArray(record.items)) {
    throw new Error("moments items.json is invalid");
  }
  const items: MomentFeedItem[] = [];
  for (const item of record.items) {
    if (isMomentFeedItem(item)) {
      items.push(cloneMomentItem(item));
    }
  }
  return items;
}

export function serializeMomentsItemsFile(items: readonly MomentFeedItem[]): string {
  return `${JSON.stringify({ items }, null, 2)}\n`;
}

export function serializeMomentsMeta(meta: MomentsFeedMeta): string {
  return `${JSON.stringify(meta, null, 2)}\n`;
}

export function serializeMomentsPage(page: MomentsFeedPage): string {
  return `${JSON.stringify(page, null, 2)}\n`;
}

export function parseMomentsMeta(value: unknown): MomentsFeedMeta {
  const record = readObject(value);
  if (!record) {
    throw new Error("moments meta.json is invalid");
  }
  const pageSize = typeof record.pageSize === "number" ? record.pageSize : MOMENTS_FEED_PAGE_SIZE;
  const total = typeof record.total === "number" ? record.total : 0;
  const pageCount = typeof record.pageCount === "number" ? record.pageCount : 0;
  return {
    version: typeof record.version === "number" ? record.version : MOMENTS_FEED_VERSION,
    pageSize,
    total,
    pageCount,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date(0).toISOString(),
  };
}

export function parseMomentsPage(value: unknown): MomentsFeedPage {
  const record = readObject(value);
  if (!record) {
    throw new Error("moments page.json is invalid");
  }
  const page = typeof record.page === "number" ? record.page : 1;
  const items: MomentFeedItem[] = [];
  if (Array.isArray(record.items)) {
    for (const item of record.items) {
      if (isMomentFeedItem(item)) {
        items.push(cloneMomentItem(item));
      }
    }
  }
  return { page, items };
}
