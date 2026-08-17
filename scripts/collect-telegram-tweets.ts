import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { extractTweetIds, tweetUrl } from "../src/toolkit/twitter.ts";

const INBOX_PATH = path.resolve("src/data/tweet-inbox.json");
const TELEGRAM_API = "https://api.telegram.org";

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

type TelegramMessage = {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  entities?: TelegramEntity[];
  caption_entities?: TelegramEntity[];
  from?: { id: number; is_bot?: boolean; username?: string };
  chat: { id: number; type: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("TELEGRAM_BOT_TOKEN is not set. Skip collect.");
  process.exit(0);
}

const api = (method: string) => `${TELEGRAM_API}/bot${token}/${method}`;

async function telegram<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(api(method), {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as { ok: boolean; result: T; description?: string };
  if (!payload.ok) {
    throw new Error(payload.description || `Telegram API failed: ${method}`);
  }
  return payload.result;
}

async function loadInbox(): Promise<Inbox> {
  const raw = await readFile(INBOX_PATH, "utf8");
  return JSON.parse(raw) as Inbox;
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

async function reply(chatId: number, text: string, replyTo?: number) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_to_message_id: replyTo,
  });
}

const inbox = await loadInbox();
const allowedFromEnv = process.env.TELEGRAM_ALLOWED_USER_ID;
if (allowedFromEnv && !inbox.ownerUserId) {
  inbox.ownerUserId = Number(allowedFromEnv);
}

const updates = await telegram<TelegramUpdate[]>("getUpdates", {
  offset: (inbox.lastUpdateId ?? 0) + 1,
  timeout: 0,
  allowed_updates: ["message"],
});

if (updates.length === 0) {
  console.log("No new Telegram updates.");
  process.exit(0);
}

const knownIds = new Set(inbox.items.map((item) => item.id));
let added = 0;
let maxUpdateId = 0;

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

  if (fromId !== inbox.ownerUserId) {
    continue;
  }

  const text = (message.text ?? message.caption ?? "").trim();
  if (text === "/start" || text === "/help") {
    await reply(
      message.chat.id,
      "把 X/Twitter 链接发给我，或直接转发推文。我会先收进 inbox，周日下午再生成周报 PR。",
      message.message_id,
    );
    continue;
  }

  const tweetIds = collectTweetIds(message);
  if (tweetIds.length === 0) {
    await reply(message.chat.id, "没有识别到 X/Twitter 链接。直接发 https://x.com/.../status/数字 即可。", message.message_id);
    continue;
  }

  const newIds = tweetIds.filter((id) => !knownIds.has(id));
  for (const id of newIds) {
    inbox.items.push({
      id,
      url: tweetUrl(id),
      telegramMessageId: message.message_id,
      telegramChatId: message.chat.id,
      receivedAt: new Date(message.date * 1000).toISOString(),
      telegramText: text,
    });
    knownIds.add(id);
    added += 1;
  }

  if (newIds.length > 0) {
    const lines = newIds.map((id) => `• ${tweetUrl(id)}`).join("\n");
    await reply(message.chat.id, `已收录 ${newIds.length} 条：\n${lines}`, message.message_id);
  }
}

inbox.lastUpdateId = maxUpdateId;
await writeFile(INBOX_PATH, `${JSON.stringify(inbox, null, 2)}\n`, "utf8");

console.log(`Processed ${updates.length} updates, added ${added} tweets.`);
