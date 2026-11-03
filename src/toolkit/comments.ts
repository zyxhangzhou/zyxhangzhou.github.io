interface CommentsToggle {
  enable?: boolean;
  waline?: {
    serverURL?: string;
  };
}

/**
 * 文章、关于页和最新评论都要同时满足开关与服务端地址。
 * 只有开关、没有地址时不渲染评论区，避免页面上出现空的占位。
 */
export function isWalineCommentsEnabled(comments: CommentsToggle | undefined): boolean {
  const serverURL = comments?.waline?.serverURL?.trim() ?? "";
  return Boolean(comments?.enable && serverURL);
}
