import { computed, nextTick, ref } from 'vue';

export function useCommentReactionPicker({
  findCommentEventByKey,
  isCommentReactionSelected,
  toggleCommentReaction
}) {
  const commentReactionPickerRef = ref(null);
  const commentReactionPickerCommentKey = ref('');
  const commentReactionPickerPosition = ref({ top: 0, left: 0 });
  const showCommentReactionPicker = ref(false);
  const isDarkTheme = ref(false);
  const emojiPickerTheme = computed(() => (isDarkTheme.value ? 'dark' : 'light'));
  const emojiPickerColorScheme = computed(() => (isDarkTheme.value ? 'dark' : 'light'));
  const commentReactionButtonRefs = new Map();
  let emojiThemeObserver = null;

  const commentReactionPickerStyle = computed(() => ({
    top: `${commentReactionPickerPosition.value.top}px`,
    left: `${commentReactionPickerPosition.value.left}px`
  }));

  const getCommentReactionKey = (event) => {
    const key = event?.id || event?._id || event?.createdAt;
    return key ? String(key) : '';
  };

  const setCommentReactionButtonRef = (event, el) => {
    const key = getCommentReactionKey(event);
    if (!key) return;
    if (el) {
      commentReactionButtonRefs.set(key, el);
      return;
    }
    commentReactionButtonRefs.delete(key);
  };

  const updateCommentReactionPickerPosition = () => {
    if (!showCommentReactionPicker.value || !commentReactionPickerCommentKey.value) return;
    const anchor = commentReactionButtonRefs.get(commentReactionPickerCommentKey.value);
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const pickerWidth = commentReactionPickerRef.value?.offsetWidth || 304;
    const pickerHeight = commentReactionPickerRef.value?.offsetHeight || 44;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top;
    if (spaceAbove >= pickerHeight + 8 || spaceAbove >= spaceBelow) {
      top = rect.top - pickerHeight - 6;
    } else {
      top = rect.bottom + 6;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - pickerHeight - 8));

    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));

    commentReactionPickerPosition.value = { top, left };
  };

  const closeCommentReactionPicker = () => {
    showCommentReactionPicker.value = false;
    commentReactionPickerCommentKey.value = '';
  };

  const openCommentReactionPicker = (event) => {
    const key = getCommentReactionKey(event);
    if (!key) return;
    commentReactionPickerCommentKey.value = key;
    showCommentReactionPicker.value = true;
    nextTick(() => {
      updateCommentReactionPickerPosition();
      requestAnimationFrame(() => updateCommentReactionPickerPosition());
    });
  };

  const toggleCommentReactionPicker = (event) => {
    const key = getCommentReactionKey(event);
    if (!key) return;
    if (showCommentReactionPicker.value && commentReactionPickerCommentKey.value === key) {
      closeCommentReactionPicker();
      return;
    }
    openCommentReactionPicker(event);
  };

  const addCommentReactionFromPicker = async (emoji) => {
    const key = commentReactionPickerCommentKey.value;
    if (!key || !emoji) return;
    const event = findCommentEventByKey(key);
    if (!event) return;
    if (!isCommentReactionSelected(event, emoji)) {
      await toggleCommentReaction(event, emoji);
    }
    closeCommentReactionPicker();
  };

  const handleCommentReactionEmojiClick = async (event) => {
    const emoji = event?.detail?.unicode || '';
    if (!emoji) return;
    await addCommentReactionFromPicker(emoji);
  };

  const handleCommentReactionPickerOutsideClick = (event) => {
    if (!showCommentReactionPicker.value) return;
    const target = event.target;
    if (commentReactionPickerRef.value?.contains(target)) return;
    const activeButton = commentReactionButtonRefs.get(commentReactionPickerCommentKey.value);
    if (activeButton?.contains(target)) return;
    closeCommentReactionPicker();
  };

  const syncEmojiPickerTheme = () => {
    if (typeof document === 'undefined') return;
    isDarkTheme.value = document.documentElement.classList.contains('dark');
  };

  const startEmojiThemeObserver = () => {
    syncEmojiPickerTheme();
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    emojiThemeObserver = new MutationObserver(() => syncEmojiPickerTheme());
    emojiThemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  };

  const stopEmojiThemeObserver = () => {
    if (!emojiThemeObserver) return;
    emojiThemeObserver.disconnect();
    emojiThemeObserver = null;
  };

  const cleanupCommentReactionPicker = () => {
    closeCommentReactionPicker();
    commentReactionButtonRefs.clear();
  };

  return {
    commentReactionPickerRef,
    commentReactionPickerStyle,
    showCommentReactionPicker,
    isDarkTheme,
    emojiPickerTheme,
    emojiPickerColorScheme,
    setCommentReactionButtonRef,
    toggleCommentReactionPicker,
    updateCommentReactionPickerPosition,
    handleCommentReactionPickerOutsideClick,
    handleCommentReactionEmojiClick,
    closeCommentReactionPicker,
    startEmojiThemeObserver,
    stopEmojiThemeObserver,
    cleanupCommentReactionPicker,
    getCommentReactionKey
  };
}
