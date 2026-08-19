export type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

const PREFERRED_MAX_WIDTH = 1280;

/** 优先选不超过 1280 宽的最大图，避免把原图塞进仓库 */
export function pickTelegramPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize | undefined {
  if (photos.length === 0) return undefined;

  const sorted = [...photos].toSorted((left, right) => left.width - right.width);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const photo = sorted[index];
    if (photo && photo.width <= PREFERRED_MAX_WIDTH) return photo;
  }
  return sorted[sorted.length - 1];
}
