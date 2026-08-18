import { describe, expect, it } from "bun:test";
import { extractTweetIds, formatTweetDate, parseFxTweet, tweetUrl } from "./twitter";

const SAMPLE_ID = "2088915755127759039";

describe("extractTweetIds", () => {
  it("从 x.com / twitter.com / 镜像域名提取去重后的 ID", () => {
    const text = [
      "https://x.com/huangzworks/status/2088915755127759039",
      "https://twitter.com/user/status/123",
      "https://vxtwitter.com/user/status/123",
      "https://x.com/i/web/status/456",
    ].join("\n");

    expect(extractTweetIds(text)).toEqual(["2088915755127759039", "123", "456"]);
  });

  it("空文本返回空数组", () => {
    expect(extractTweetIds("")).toEqual([]);
  });
});

describe("tweetUrl", () => {
  it("生成 x.com 状态页链接", () => {
    expect(tweetUrl(SAMPLE_ID)).toBe(`https://x.com/i/status/${SAMPLE_ID}`);
  });
});

describe("formatTweetDate", () => {
  it("按东京时区格式化为 YYYY-MM-DD", () => {
    expect(formatTweetDate(1786871300)).toBe("2026-08-16");
  });

  it("无效时间戳返回空字符串", () => {
    expect(formatTweetDate(0)).toBe("");
    expect(formatTweetDate(Number.NaN)).toBe("");
  });
});

describe("parseFxTweet", () => {
  it("解析 fxtwitter 响应中的作者、正文、头像与图片", () => {
    const preview = parseFxTweet(SAMPLE_ID, {
      code: 200,
      tweet: {
        url: "https://x.com/huangzworks/status/2088915755127759039",
        text: "Redis 正准备使用 B+ 树",
        created_timestamp: 1786871300,
        author: {
          name: "黄健宏",
          screen_name: "huangzworks",
          avatar_url: "https://pbs.twimg.com/profile_images/avatar.jpg",
        },
        media: {
          photos: [
            {
              type: "photo",
              url: "https://pbs.twimg.com/media/photo.jpg?name=orig",
              width: 679,
              height: 382,
            },
          ],
        },
      },
    });

    expect(preview).toEqual({
      id: SAMPLE_ID,
      url: "https://x.com/huangzworks/status/2088915755127759039",
      text: "Redis 正准备使用 B+ 树",
      authorName: "黄健宏",
      authorHandle: "huangzworks",
      avatarUrl: "https://pbs.twimg.com/profile_images/avatar.jpg",
      createdAt: "2026-08-16",
      photos: ["https://pbs.twimg.com/media/photo.jpg?name=orig"],
      media: [
        {
          type: "photo",
          url: "https://pbs.twimg.com/media/photo.jpg?name=orig",
          width: 679,
          height: 382,
        },
      ],
    });
  });

  it("视频优先使用封面图", () => {
    const preview = parseFxTweet("1", {
      tweet: {
        media: {
          videos: [
            {
              type: "video",
              url: "https://video.twimg.com/clip.mp4",
              thumbnail_url: "https://pbs.twimg.com/thumb.jpg",
              width: 1280,
              height: 720,
            },
          ],
        },
      },
    });

    expect(preview.media).toEqual([
      {
        type: "video",
        url: "https://pbs.twimg.com/thumb.jpg",
        width: 1280,
        height: 720,
      },
    ]);
    expect(preview.photos).toEqual([]);
  });

  it("缺少 tweet 字段时回退到空预览", () => {
    expect(parseFxTweet(SAMPLE_ID, { code: 404 })).toEqual({
      id: SAMPLE_ID,
      url: tweetUrl(SAMPLE_ID),
      text: "",
      authorName: "",
      authorHandle: "",
      avatarUrl: "",
      createdAt: "",
      photos: [],
      media: [],
    });
  });
});
