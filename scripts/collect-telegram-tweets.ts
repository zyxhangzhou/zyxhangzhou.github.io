import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMomentFilenames,
  formatTokyoDateTime,
} from "../src/toolkit/moments/buildMomentMarkdown.ts";
import { prependMomentAndPersist } from "../src/toolkit/moments/feedDisk.ts";
import type { MomentFeedItem } from "../src/toolkit/moments/feedTypes.ts";
import { clusterTelegramMessages } from "../src/toolkit/telegram/clusterMessages.ts";
import { isHelpCommand, parseMemoCommand } from "../src/toolkit/telegram/parseMemoCommand.ts";
import { pickTelegramPhoto } from "../src/toolkit/telegram/pickTelegramPhoto.ts";
import { extractTweetIds, tweetUrl } from "../src/toolkit/twitter.ts";

const INBOX_PATH = path.resolve("src/data/tweet-inbox.json");
const MOMENTS_MEDIA_DIR = path.resolve("data/moments/media");
const TELEGRAM_API = "https://api.telegram.org";
const HELP_TEXT = `用法：
• 发 X/Twitter 链接 → 收进周报 inbox，周日再生成 PR
• /memo 文字 → 发一条动态
• 照片说明写 /memo → 带图动态

动态写入 data/moments，约 15 分钟内同步到仓库。`;

type InboxItem = {
  id: string;
  url: string;
  telegramMessageId: number;
  telegramChatId: number;
  receivedAt: string;
  telegramText: string;
};

type Inbox = {
  ownerUserId: number | null;
  lastUpdateId: number;
  items: InboxItem[];
};

type TelegramEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
};

type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramMessage = {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  media_group_id?: string;
  photo?: TelegramPhotoSize[];
  entities?: TelegramEntity[];
  caption_entities?: TelegramEntity[];
  from?: { id: number; is_bot?: boolean; username?: string };
  chat: { id: number; type: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("TELEGRAM_BOT_TOKEN is not set. Skip collect.");
  process.exit(0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInboxItem(value: unknown): InboxItem | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.id !== "string" || typeof value.url !== "string") return undefined;
  return {
    id: value.id,
    url: value.url,
    telegramMessageId: typeof value.telegramMessageId === "number" ? value.telegramMessageId : 0,
    telegramChatId: typeof value.telegramChatId === "number" ? value.telegramChatId : 0,
    receivedAt: typeof value.receivedAt === "string" ? value.receivedAt : "",
    telegramText: typeof value.telegramText === "string" ? value.telegramText : "",
  };
}

function readInbox(value: unknown): Inbox {
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.lastUpdateId !== "number") {
    throw new Error("tweet-inbox.json is invalid");
  }

  const items: InboxItem[] = [];
  for (const item of value.items) {
    const parsed = readInboxItem(item);
    if (parsed) items.push(parsed);
  }

  return {
    ownerUserId: typeof value.ownerUserId === "number" ? value.ownerUserId : null,
    lastUpdateId: value.lastUpdateId,
    items,
  };
}

function readEntity(value: unknown): TelegramEntity | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  if (typeof value.offset !== "number" || typeof value.length !== "number") return undefined;
  return {
    type: value.type,
    offset: value.offset,
    length: value.length,
    url: typeof value.url === "string" ? value.url : undefined,
  };
}

function readEntities(value: unknown): TelegramEntity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entities: TelegramEntity[] = [];
  for (const item of value) {
    const entity = readEntity(item);
    if (entity) entities.push(entity);
  }
  return entities;
}

function readPhoto(value: unknown): TelegramPhotoSize | undefined {
  if (!isRecord(value) || typeof value.file_id !== "string") return undefined;
  if (typeof value.width !== "number" || typeof value.height !== "number") return undefined;
  return {
    file_id: value.file_id,
    width: value.width,
    height: value.height,
    file_size: typeof value.file_size === "number" ? value.file_size : undefined,
  };
}

function readFrom(value: unknown): TelegramMessage["from"] {
  if (!isRecord(value) || typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    is_bot: typeof value.is_bot === "boolean" ? value.is_bot : undefined,
    username: typeof value.username === "string" ? value.username : undefined,
  };
}

function readMessage(value: unknown): TelegramMessage | undefined {
  if (!isRecord(value) || typeof value.message_id !== "number" || typeof value.date !== "number") {
    return undefined;
  }
  if (
    !isRecord(value.chat) ||
    typeof value.chat.id !== "number" ||
    typeof value.chat.type !== "string"
  ) {
    return undefined;
  }

  const photos = Array.isArray(value.photo)
    ? value.photo.flatMap((item) => {
        const photo = readPhoto(item);
        return photo ? [photo] : [];
      })
    : undefined;

  return {
    message_id: value.message_id,
    date: value.date,
    text: typeof value.text === "string" ? value.text : undefined,
    caption: typeof value.caption === "string" ? value.caption : undefined,
    media_group_id: typeof value.media_group_id === "string" ? value.media_group_id : undefined,
    photo: photos,
    entities: readEntities(value.entities),
    caption_entities: readEntities(value.caption_entities),
    from: readFrom(value.from),
    chat: { id: value.chat.id, type: value.chat.type },
  };
}

function readUpdates(value: unknown): TelegramUpdate[] {
  if (!Array.isArray(value)) {
    throw new Error("getUpdates did not return an array");
  }

  const updates: TelegramUpdate[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.update_id !== "number") continue;
    updates.push({
      update_id: entry.update_id,
      message: readMessage(entry.message),
    });
  }
  return updates;
}

function readFilePath(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.file_path !== "string") return undefined;
  return value.file_path;
}

const api = (method: string) => `${TELEGRAM_API}/bot${token}/${method}`;

async function telegram(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(api(method), {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.ok !== true) {
    const description =
      isRecord(payload) && typeof payload.description === "string"
        ? payload.description
        : `Telegram API failed: ${method}`;
    throw new Error(description);
  }
  return payload.result;
}

async function loadInbox(): Promise<Inbox> {
  const raw = await readFile(INBOX_PATH, "utf8");
  return readInbox(JSON.parse(raw));
}

function entityUrls(text: string, entities: TelegramEntity[] = []): string[] {
  return entities.flatMap((entity) => {
    if (entity.type === "url") {
      return [text.slice(entity.offset, entity.offset + entity.length)];
    }
    if (entity.type === "text_link" && entity.url) {
      return [entity.url];
    }
    return [];
  });
}

function collectTweetIds(message: TelegramMessage): string[] {
  const text = `${message.text ?? ""}\n${message.caption ?? ""}`;
  const fromEntities = [
    ...entityUrls(message.text ?? "", message.entities),
    ...entityUrls(message.caption ?? "", message.caption_entities),
  ].join("\n");
  return [...new Set([...extractTweetIds(text), ...extractTweetIds(fromEntities)])];
}

function clusterText(messages: TelegramMessage[]): string {
  for (const message of messages) {
    const text = (message.text ?? message.caption ?? "").trim();
    if (text) return text;
  }
  return "";
}

function clusterPhotos(messages: TelegramMessage[]): TelegramPhotoSize[] {
  const photos: TelegramPhotoSize[] = [];
  for (const message of messages) {
    const picked = pickTelegramPhoto(message.photo ?? []);
    if (picked) photos.push(picked);
  }
  return photos;
}

function extensionFromFilePath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;
  return ".jpg";
}

async function reply(chatId: number, text: string, replyTo?: number) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_to_message_id: replyTo,
  });
}

async function saveTelegramPhoto(fileId: string, destWithoutExt: string): Promise<string> {
  const filePath = readFilePath(await telegram("getFile", { file_id: fileId }));
  if (!filePath) {
    throw new Error(`Telegram getFile missing file_path for ${fileId}`);
  }

  const response = await fetch(`${TELEGRAM_API}/file/bot${token}/${filePath}`);
  if (!response.ok) {
    throw new Error(`Download failed: ${filePath}`);
  }

  const ext = extensionFromFilePath(filePath);
  const destPath = `${destWithoutExt}${ext}`;
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, Buffer.from(await response.arrayBuffer()));
  return `media/${path.basename(destPath)}`;
}

async function publishMemo(messages: TelegramMessage[], body: string): Promise<string> {
  const photos = clusterPhotos(messages);
  if (!body && photos.length === 0) {
    return "发点文字，或者配一张图。例如：/memo 今天天气真好";
  }

  const anchor = messages[0];
  if (!anchor) return "没有可用的消息。";

  const { fileSlug, frontmatter } = formatTokyoDateTime(new Date(anchor.date * 1000));
  const { stem } = buildMomentFilenames(fileSlug, anchor.message_id);

  const imagePaths: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const relativePath = await saveTelegramPhoto(
      photo.file_id,
      path.join(MOMENTS_MEDIA_DIR, `${stem}-${index}`),
    );
    imagePaths.push(relativePath);
  }

  const item: MomentFeedItem = {
    id: stem,
    date: frontmatter,
    text: body,
    images: imagePaths,
  };

  const { wrote } = await prependMomentAndPersist(item);
  if (!wrote) {
    return "这条动态已经写过了。";
  }

  return photos.length > 0
    ? `已写入动态（${photos.length} 张图），几分钟后刷新即可。`
    : "已写入动态，几分钟后刷新即可。";
}

const inbox = await loadInbox();
const allowedFromEnv = process.env.TELEGRAM_ALLOWED_USER_ID;
if (allowedFromEnv && !inbox.ownerUserId) {
  inbox.ownerUserId = Number(allowedFromEnv);
}

const updates = readUpdates(
  await telegram("getUpdates", {
    offset: (inbox.lastUpdateId ?? 0) + 1,
    timeout: 0,
    allowed_updates: ["message"],
  }),
);

if (updates.length === 0) {
  console.log("No new Telegram updates.");
  process.exit(0);
}

const knownIds = new Set(inbox.items.map((item) => item.id));
let added = 0;
let memos = 0;
let maxUpdateId = 0;
const ownerMessages: TelegramMessage[] = [];

for (const update of updates) {
  maxUpdateId = Math.max(maxUpdateId, update.update_id);
  const message = update.message;
  if (!message || message.from?.is_bot) continue;
  if (message.chat.type !== "private") continue;

  const fromId = message.from?.id;
  if (!fromId) continue;

  if (!inbox.ownerUserId) {
    inbox.ownerUserId = fromId;
    console.log(`Locked inbox owner to Telegram user ${fromId}`);
  }

  if (fromId !== inbox.ownerUserId) continue;
  ownerMessages.push(message);
}

for (const cluster of clusterTelegramMessages(ownerMessages)) {
  const text = clusterText(cluster);
  const replyTo = cluster[0]?.message_id;
  const chatId = cluster[0]?.chat.id;
  if (!chatId) continue;

  if (isHelpCommand(text)) {
    await reply(chatId, HELP_TEXT, replyTo);
    continue;
  }

  const memo = parseMemoCommand(text);
  if (memo.isMemo) {
    const response = await publishMemo(cluster, memo.body);
    await reply(chatId, response, replyTo);
    memos += 1;
    continue;
  }

  const tweetIds = [...new Set(cluster.flatMap((message) => collectTweetIds(message)))];
  if (tweetIds.length === 0) {
    await reply(chatId, "没有识别到指令。发 X 链接收藏周报，或用 /memo 发动态。", replyTo);
    continue;
  }

  const newIds = tweetIds.filter((id) => !knownIds.has(id));
  for (const id of newIds) {
    inbox.items.push({
      id,
      url: tweetUrl(id),
      telegramMessageId: cluster[0]?.message_id ?? 0,
      telegramChatId: chatId,
      receivedAt: new Date((cluster[0]?.date ?? 0) * 1000).toISOString(),
      telegramText: text,
    });
    knownIds.add(id);
    added += 1;
  }

  if (newIds.length > 0) {
    const lines = newIds.map((id) => `• ${tweetUrl(id)}`).join("\n");
    await reply(chatId, `已收录 ${newIds.length} 条：\n${lines}`, replyTo);
  }
}

inbox.lastUpdateId = maxUpdateId;
await writeFile(INBOX_PATH, `${JSON.stringify(inbox, null, 2)}\n`, "utf8");

console.log(`Processed ${updates.length} updates, added ${added} tweets, wrote ${memos} memos.`);
