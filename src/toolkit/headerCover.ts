import type { ImageMetadata } from "astro";
import coversConfig from "@/covers.config";

export type HeaderCover = ImageMetadata | string;
export type HeaderCoverTheme = "light" | "dark";

/** 每张壁纸占位时长。下一张在这段结束时开始淡入。 */
export const HEADER_COVER_INTERVAL_SECONDS = 8;
/** 交叉淡化时长，需短于占位时长。 */
export const HEADER_COVER_FADE_SECONDS = 1.2;

export interface HeaderCoverCycle {
  theme: HeaderCoverTheme;
  count: number;
  intervalSeconds: number;
  fadeSeconds: number;
  durationSeconds: number;
  animationName: string;
  css: string;
}

export function normalizeCoverRefs(refs: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const ref of refs ?? []) {
    if (typeof ref !== "string") {
      continue;
    }

    const trimmed = ref.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

/**
 * 亮暗两套壁纸都空时返回 null，调用方继续走原来的固定封面。
 * 只有一侧有图时，另一侧复用这套，避免主题切换后头图消失。
 */
export function resolveThemedCoverSets<T>(sets: {
  light: readonly T[];
  dark: readonly T[];
}): { light: T[]; dark: T[] } | null {
  const light = [...sets.light];
  const dark = [...sets.dark];

  if (light.length === 0 && dark.length === 0) {
    return null;
  }

  return {
    light: light.length > 0 ? light : [...dark],
    dark: dark.length > 0 ? dark : [...light],
  };
}

function formatCssNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

/**
 * 按张数生成一整圈的交叉淡化动画。
 * 关键帧百分比随张数变化，避免沿用原先写死的 6 张节奏。
 */
export function buildHeaderCoverCycle(options: {
  theme: HeaderCoverTheme;
  count: number;
  intervalSeconds?: number;
  fadeSeconds?: number;
}): HeaderCoverCycle | null {
  const { theme, count } = options;
  const intervalSeconds = options.intervalSeconds ?? HEADER_COVER_INTERVAL_SECONDS;
  const fadeSeconds = options.fadeSeconds ?? HEADER_COVER_FADE_SECONDS;

  if (!Number.isInteger(count) || count < 2) {
    return null;
  }

  if (intervalSeconds <= 0 || fadeSeconds <= 0 || fadeSeconds >= intervalSeconds) {
    return null;
  }

  const durationSeconds = count * intervalSeconds;
  const animationName = `header-cover-cycle-${theme}`;
  const fadeInEnd = (fadeSeconds / durationSeconds) * 100;
  const holdEnd = (intervalSeconds / durationSeconds) * 100;
  const fadeOutEnd = ((intervalSeconds + fadeSeconds) / durationSeconds) * 100;
  const fadeInEndText = formatCssNumber(fadeInEnd);
  const holdEndText = formatCssNumber(holdEnd);
  const fadeOutEndText = formatCssNumber(fadeOutEnd);
  const durationText = formatCssNumber(durationSeconds);

  const css = `@keyframes ${animationName} {
  0% {
    opacity: 0;
    transform: scale(1);
    animation-timing-function: ease-in;
  }
  ${fadeInEndText}% {
    opacity: 1;
    transform: scale(1.03);
    animation-timing-function: linear;
  }
  ${holdEndText}% {
    opacity: 1;
    transform: scale(1.06);
    animation-timing-function: ease-out;
  }
  ${fadeOutEndText}% {
    opacity: 0;
    transform: scale(1.08);
  }
  100% {
    opacity: 0;
    transform: scale(1.08);
  }
}
.header-cover-set[data-cover-theme="${theme}"] .cover-item.is-cycle {
  animation-name: ${animationName};
  animation-duration: ${durationText}s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}`;

  return {
    theme,
    count,
    intervalSeconds,
    fadeSeconds,
    durationSeconds,
    animationName,
    css,
  };
}

export async function resolveHeaderCovers(options: {
  coverUrls?: string[];
  fallbackCovers: HeaderCover[];
}): Promise<HeaderCover[]> {
  const directCoverUrls = (options.coverUrls || [])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((url) => url.trim());

  if (directCoverUrls.length > 0) {
    return directCoverUrls;
  }

  const configCoverUrls = coversConfig.urls;
  if (configCoverUrls.length > 0) {
    return configCoverUrls;
  }

  return options.fallbackCovers;
}
