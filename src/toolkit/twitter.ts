export const TWEET_STATUS_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com|mobile\.twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com)\/(?:i\/web\/status|[^/\s]+\/status)\/(\d+)/gi;

export type TweetPreview = {
  id: string;
  url: string;
  text: string;
  authorName: string;
  authorHandle: string;
  photos: string[];
};

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
  const fallback: TweetPreview = {
    id,
    url: tweetUrl(id),
    text: "",
    authorName: "",
    authorHandle: "",
    photos: [],
  };

  try {
    const response = await fetch(`https://api.fxtwitter.com/status/${id}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      tweet?: {
        text?: string;
        url?: string;
        author?: { name?: string; screen_name?: string };
        media?: { photos?: { url?: string }[] };
      };
    };
    const tweet = data.tweet;
    if (!tweet) return fallback;
    return {
      id,
      url: tweet.url || tweetUrl(id),
      text: tweet.text ?? "",
      authorName: tweet.author?.name ?? "",
      authorHandle: tweet.author?.screen_name ?? "",
      photos: (tweet.media?.photos ?? []).map((photo) => photo.url).filter(Boolean) as string[],
    };
  } catch {
    return fallback;
  }
}
