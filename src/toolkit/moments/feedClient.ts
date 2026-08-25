import { buildMomentsMetaUrl, buildMomentsPageUrl, normalizeMomentsFeedConfig } from "./feedStore";
import type { MomentsFeedConfig } from "./feedTypes";

/** 优先远程（最新），失败再读构建快照同源路径 */
export function momentsMetaUrlCandidates(feedInput?: Partial<MomentsFeedConfig>): string[] {
  const feed = normalizeMomentsFeedConfig(feedInput);
  return [buildMomentsMetaUrl(feed), "/moments-data/meta.json"];
}

export function momentsPageUrlCandidates(
  feedInput: Partial<MomentsFeedConfig> | undefined,
  page: number,
): string[] {
  const feed = normalizeMomentsFeedConfig(feedInput);
  return [buildMomentsPageUrl(feed, page), `/moments-data/pages/${page}.json`];
}

export async function fetchMomentsJson(urls: string[]): Promise<unknown> {
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        errors.push(`${url} -> HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      errors.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join("; ") || "moments fetch failed");
}
