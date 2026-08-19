/** 周报题图：用日期当 seed，从 Picsum 稳定抽一张，仓库里不用存图 */

const ROUNDUP_COVER_WIDTH = 1920;
const ROUNDUP_COVER_HEIGHT = 1080;

export function buildRoundupCoverUrl(weekEndLabel: string): string {
  const seed = encodeURIComponent(`weekly-${weekEndLabel.trim()}`);
  return `https://picsum.photos/seed/${seed}/${ROUNDUP_COVER_WIDTH}/${ROUNDUP_COVER_HEIGHT}.webp`;
}
