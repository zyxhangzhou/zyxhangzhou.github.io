/** 运行时动态 Feed：仓库内 JSON，页面按页拉取 */

export const MOMENTS_FEED_PAGE_SIZE = 20;
export const MOMENTS_FEED_VERSION = 1;
export const DEFAULT_MOMENTS_FEED_BASE_PATH = "data/moments";

export type MomentFeedItem = {
  id: string;
  date: string;
  text: string;
  images: string[];
};

export type MomentsFeedMeta = {
  version: number;
  pageSize: number;
  total: number;
  pageCount: number;
  updatedAt: string;
};

export type MomentsFeedPage = {
  page: number;
  items: MomentFeedItem[];
};

export type MomentsFeedSource = "raw" | "jsdelivr";

export type MomentsFeedConfig = {
  repo: string;
  branch: string;
  basePath: string;
  pageSize: number;
  source: MomentsFeedSource;
};
