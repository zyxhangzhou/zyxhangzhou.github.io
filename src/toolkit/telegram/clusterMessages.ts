/** 把同一相册的 Telegram 消息收成一组，其余各自成组 */

export function clusterTelegramMessages<T extends { media_group_id?: string }>(
  messages: T[],
): T[][] {
  const clusters: T[][] = [];
  const groupIndex = new Map<string, number>();

  for (const message of messages) {
    const groupId = message.media_group_id;
    if (!groupId) {
      clusters.push([message]);
      continue;
    }

    const existing = groupIndex.get(groupId);
    if (existing === undefined) {
      groupIndex.set(groupId, clusters.length);
      clusters.push([message]);
      continue;
    }

    clusters[existing]?.push(message);
  }

  return clusters;
}
