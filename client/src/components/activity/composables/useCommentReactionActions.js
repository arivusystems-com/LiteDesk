export function useCommentReactionActions({
  getCommentId,
  normalizeEmoji,
  canToggle,
  requestToggle,
  onSuccess,
  logPrefix = 'Failed to toggle comment reaction:'
}) {
  const toggleCommentReaction = async (event, emoji) => {
    const commentId = getCommentId(event);
    const normalizedEmoji = normalizeEmoji(emoji);
    if (!commentId || !normalizedEmoji) return;
    if (typeof canToggle === 'function' && !canToggle()) return;

    try {
      const response = await requestToggle({ commentId, emoji: normalizedEmoji, event });
      if (response?.success && typeof onSuccess === 'function') {
        await onSuccess({ response, commentId, emoji: normalizedEmoji, event });
      }
    } catch (error) {
      console.error(logPrefix, error);
    }
  };

  return { toggleCommentReaction };
}
