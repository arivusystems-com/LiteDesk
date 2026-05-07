import { computed, nextTick, ref } from 'vue';

const DEFAULT_SHOW_DELAY_MS = 220;
const DEFAULT_HIDE_DELAY_MS = 90;

const normalizeReactionUser = (reactor) => {
  if (!reactor) return null;
  if (typeof reactor === 'string') {
    return { id: reactor, name: reactor, avatar: '' };
  }
  const rawId = reactor.id || reactor._id || reactor.userId || '';
  const rawName = reactor.name
    || [reactor.firstName, reactor.lastName].filter(Boolean).join(' ').trim()
    || reactor.username
    || reactor.email
    || '';
  if (!rawId && !rawName) return null;
  return {
    id: rawId ? String(rawId) : String(rawName).toLowerCase(),
    name: rawName || 'Unknown',
    avatar: reactor.avatar || ''
  };
};

const mergeReactionUsers = (existingUsers = [], incomingUsers = []) => {
  const merged = [];
  const seen = new Set();
  [...existingUsers, ...incomingUsers].forEach((reactor) => {
    const normalized = normalizeReactionUser(reactor);
    if (!normalized) return;
    const key = `${normalized.id}|${normalized.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  });
  return merged;
};

export function useCommentReactionTooltip({ getCurrentUserId }) {
  const commentReactionTooltipRef = ref(null);
  const commentReactionTooltipPosition = ref({ top: 0, left: 0 });
  const commentReactionTooltipPlacement = ref('above');
  const showCommentReactionTooltip = ref(false);
  const commentReactionTooltipData = ref(null);
  const commentReactionTooltipAnchorEl = ref(null);
  let commentReactionTooltipHideTimer = null;
  let commentReactionTooltipShowTimer = null;

  const commentReactionTooltipStyle = computed(() => ({
    top: `${commentReactionTooltipPosition.value.top}px`,
    left: `${commentReactionTooltipPosition.value.left}px`
  }));

  const isCurrentReactionUser = (reactor) => {
    const currentUserId = String(getCurrentUserId?.() || '');
    if (!currentUserId) return false;
    return String(reactor?.id || '') === currentUserId;
  };

  const getReactionUserDisplayName = (reactor) => {
    if (!reactor) return 'Unknown';
    return isCurrentReactionUser(reactor) ? 'You' : (reactor.name || 'Unknown');
  };

  const getReactionUserInitial = (reactor) => {
    const name = getReactionUserDisplayName(reactor);
    const firstChar = (name || '?').trim().charAt(0);
    return (firstChar || '?').toUpperCase();
  };

  const getReactionTooltipMode = (tooltipData) => {
    const count = Number(tooltipData?.count || 0);
    if (count <= 1) return 'single';
    if (count <= 7) return 'few';
    return 'many';
  };

  const getReactionTooltipSingleText = (tooltipData) => {
    if (!tooltipData) return '';
    const firstReactor = (tooltipData.reactors || [])[0] || null;
    const who = firstReactor ? getReactionUserDisplayName(firstReactor) : 'Someone';
    return `${who} reacted with ${tooltipData.emoji}`;
  };

  const getReactionTooltipInlineText = (tooltipData) => {
    if (!tooltipData) return '';
    const names = (tooltipData.reactors || []).slice(0, 7).map(getReactionUserDisplayName);
    if (!names.length) return `People reacted with ${tooltipData.emoji}`;
    return `${names.join(', ')} reacted with ${tooltipData.emoji}`;
  };

  const updateCommentReactionTooltipPosition = () => {
    if (!showCommentReactionTooltip.value || !commentReactionTooltipAnchorEl.value) return;
    const anchorRect = commentReactionTooltipAnchorEl.value.getBoundingClientRect();
    const mode = getReactionTooltipMode(commentReactionTooltipData.value);
    const fallbackWidth = mode === 'single' ? 160 : 272;
    const fallbackHeight = mode === 'single' ? 88 : (mode === 'few' ? 116 : 188);
    const tooltipWidth = commentReactionTooltipRef.value?.offsetWidth || fallbackWidth;
    const tooltipHeight = commentReactionTooltipRef.value?.offsetHeight || fallbackHeight;
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;

    let top = 0;
    let placement = 'above';
    if (spaceAbove >= tooltipHeight + 10 || spaceAbove >= spaceBelow) {
      top = anchorRect.top - tooltipHeight - 8;
      placement = 'above';
    } else {
      top = anchorRect.bottom + 8;
      placement = 'below';
    }

    let left = anchorRect.left + (anchorRect.width / 2) - (tooltipWidth / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));

    commentReactionTooltipPlacement.value = placement;
    commentReactionTooltipPosition.value = { top, left };
  };

  const cancelCommentReactionTooltipHide = () => {
    if (!commentReactionTooltipHideTimer) return;
    clearTimeout(commentReactionTooltipHideTimer);
    commentReactionTooltipHideTimer = null;
  };

  const cancelCommentReactionTooltipShow = () => {
    if (!commentReactionTooltipShowTimer) return;
    clearTimeout(commentReactionTooltipShowTimer);
    commentReactionTooltipShowTimer = null;
  };

  const handleShowCommentReactionTooltip = (domEvent, reaction) => {
    cancelCommentReactionTooltipShow();
    cancelCommentReactionTooltipHide();

    const reactors = mergeReactionUsers([], reaction?.reactors || []);
    const sortedReactors = reactors.sort((a, b) => {
      const aIsMe = isCurrentReactionUser(a);
      const bIsMe = isCurrentReactionUser(b);
      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;
      return getReactionUserDisplayName(a).localeCompare(getReactionUserDisplayName(b));
    });

    commentReactionTooltipData.value = {
      emoji: reaction?.emoji || '',
      count: Number(reaction?.count || sortedReactors.length || 0),
      reactors: sortedReactors
    };
    commentReactionTooltipAnchorEl.value = domEvent?.currentTarget || null;

    const reveal = () => {
      showCommentReactionTooltip.value = true;
      nextTick(() => {
        updateCommentReactionTooltipPosition();
        requestAnimationFrame(() => updateCommentReactionTooltipPosition());
      });
    };

    if (showCommentReactionTooltip.value) {
      reveal();
      return;
    }

    commentReactionTooltipShowTimer = setTimeout(() => {
      commentReactionTooltipShowTimer = null;
      reveal();
    }, DEFAULT_SHOW_DELAY_MS);
  };

  const handleHideCommentReactionTooltip = () => {
    cancelCommentReactionTooltipShow();
    cancelCommentReactionTooltipHide();
    commentReactionTooltipHideTimer = setTimeout(() => {
      showCommentReactionTooltip.value = false;
      commentReactionTooltipData.value = null;
      commentReactionTooltipAnchorEl.value = null;
      commentReactionTooltipHideTimer = null;
    }, DEFAULT_HIDE_DELAY_MS);
  };

  const cleanupCommentReactionTooltip = () => {
    cancelCommentReactionTooltipShow();
    cancelCommentReactionTooltipHide();
    showCommentReactionTooltip.value = false;
    commentReactionTooltipData.value = null;
    commentReactionTooltipAnchorEl.value = null;
  };

  return {
    commentReactionTooltipRef,
    commentReactionTooltipStyle,
    commentReactionTooltipPlacement,
    showCommentReactionTooltip,
    commentReactionTooltipData,
    getReactionTooltipMode,
    getReactionTooltipSingleText,
    getReactionTooltipInlineText,
    getReactionUserDisplayName,
    getReactionUserInitial,
    updateCommentReactionTooltipPosition,
    cancelCommentReactionTooltipHide,
    handleShowCommentReactionTooltip,
    handleHideCommentReactionTooltip,
    cleanupCommentReactionTooltip
  };
}
