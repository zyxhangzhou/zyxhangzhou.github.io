import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMomentsFeedSnapshot,
  parseMomentsItemsFile,
  prependMomentItem,
  serializeMomentsItemsFile,
  serializeMomentsMeta,
  serializeMomentsPage,
} from "./feedStore";
import type { MomentFeedItem } from "./feedTypes";
import { MOMENTS_FEED_PAGE_SIZE } from "./feedTypes";

const ROOT = path.resolve("data/moments");

export async function loadMomentItemsFromDisk(rootDir = ROOT): Promise<MomentFeedItem[]> {
  const itemsPath = path.join(rootDir, "items.json");
  try {
    const raw = await readFile(itemsPath, "utf8");
    return parseMomentsItemsFile(JSON.parse(raw));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      Reflect.get(error, "code") === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

export async function writeMomentsFeedToDisk(
  items: readonly MomentFeedItem[],
  options?: { pageSize?: number; rootDir?: string; updatedAt?: string },
): Promise<void> {
  const rootDir = options?.rootDir ?? ROOT;
  const pageSize = options?.pageSize ?? MOMENTS_FEED_PAGE_SIZE;
  const { meta, pages } = buildMomentsFeedSnapshot(items, {
    pageSize,
    updatedAt: options?.updatedAt,
  });

  const pagesDir = path.join(rootDir, "pages");
  await mkdir(pagesDir, { recursive: true });
  await mkdir(path.join(rootDir, "media"), { recursive: true });

  await writeFile(path.join(rootDir, "items.json"), serializeMomentsItemsFile(items), "utf8");
  await writeFile(path.join(rootDir, "meta.json"), serializeMomentsMeta(meta), "utf8");

  const existing = await readdir(pagesDir).catch(() => [] as string[]);
  for (const name of existing) {
    if (/^\d+\.json$/.test(name)) {
      await rm(path.join(pagesDir, name), { force: true });
    }
  }

  for (const page of pages) {
    await writeFile(path.join(pagesDir, `${page.page}.json`), serializeMomentsPage(page), "utf8");
  }
}

export async function prependMomentAndPersist(
  item: MomentFeedItem,
  options?: { pageSize?: number; rootDir?: string },
): Promise<{ wrote: boolean; total: number }> {
  const rootDir = options?.rootDir ?? ROOT;
  const existing = await loadMomentItemsFromDisk(rootDir);
  if (existing.some((entry) => entry.id === item.id)) {
    return { wrote: false, total: existing.length };
  }

  const next = prependMomentItem(existing, item);
  await writeMomentsFeedToDisk(next, {
    pageSize: options?.pageSize,
    rootDir,
  });
  return { wrote: true, total: next.length };
}
