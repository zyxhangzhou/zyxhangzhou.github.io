export const TWEET_STATUS_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com|mobile\.twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com)\/(?:i\/web\/status|[^/\s]+\/status)\/(\d+)/gi;

export type TweetMedia = {
  type: "photo" | "video";
  url: string;
  width?: number;
  height?: number;
};

export type TweetPreview = {
  id: string;
  url: string;
  text: string;
  authorName: string;
  authorHandle: string;
  avatarUrl: string;
  createdAt: string;
  photos: string[];
  media: TweetMedia[];
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseMediaItems(media: unknown): TweetMedia[] {
  const record = readObject(media);
  if (!record) return [];

  const items: TweetMedia[] = [];

  for (const photo of readArray(record.photos)) {
    const item = readObject(photo);
    const url = readString(item?.url);
    if (!url) continue;
    items.push({
      type: "photo",
      url,
      width: readFiniteNumber(item?.width),
      height: readFiniteNumber(item?.height),
    });
  }

  for (const video of readArray(record.videos)) {
    const item = readObject(video);
    const url = readString(item?.thumbnail_url) || readString(item?.url);
    if (!url) continue;
    items.push({
      type: "video",
      url,
      width: readFiniteNumber(item?.width),
      height: readFiniteNumber(item?.height),
    });
  }

  return items;
}

export function emptyTweetPreview(id: string): TweetPreview {
  return {
    id,
    url: tweetUrl(id),
    text: "",
    authorName: "",
    authorHandle: "",
    avatarUrl: "",
    createdAt: "",
    photos: [],
    media: [],
  };
}

/** 周报按 JST 展示日期，与收集区间一致 */
export function formatTweetDate(unixSeconds: number, timeZone = "Asia/Tokyo"): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function parseFxTweet(id: string, payload: unknown): TweetPreview {
  const fallback = emptyTweetPreview(id);
  const tweet = readObject(readObject(payload)?.tweet);
  if (!tweet) return fallback;

  const author = readObject(tweet.author);
  const media = parseMediaItems(tweet.media);
  const timestamp = readFiniteNumber(tweet.created_timestamp);

  return {
    id,
    url: readString(tweet.url) || fallback.url,
    text: readString(tweet.text),
    authorName: readString(author?.name),
    authorHandle: readString(author?.screen_name),
    avatarUrl: readString(author?.avatar_url),
    createdAt: timestamp ? formatTweetDate(timestamp) : "",
    photos: media.filter((item) => item.type === "photo").map((item) => item.url),
    media,
  };
}

export function extractTweetIds(text: string): string[] {
  if (!text) return [];
  const ids = new Set<string>();
  const pattern = new RegExp(TWEET_STATUS_RE.source, "gi");
  for (const match of text.matchAll(pattern)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

export function tweetUrl(id: string): string {
  return `https://x.com/i/status/${id}`;
}

export async function fetchTweetPreview(id: string): Promise<TweetPreview> {
  const fallback = emptyTweetPreview(id);

  try {
    const response = await fetch(`https://api.fxtwitter.com/status/${id}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return fallback;
    return parseFxTweet(id, await response.json());
  } catch {
    return fallback;
  }
}
