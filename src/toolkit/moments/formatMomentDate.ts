/** 动态时间按东京时区显示，避免构建机 UTC 把晚上写成下午 */

export const MOMENT_TIME_ZONE = "Asia/Tokyo";

export function formatMomentDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: MOMENT_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatMomentMonthDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: MOMENT_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
