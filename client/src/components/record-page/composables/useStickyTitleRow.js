import { ref, nextTick } from 'vue';

const STICKY_TITLE_ENABLE_OFFSET = 10;
const STICKY_TITLE_DISABLE_OFFSET = 2;
const LEFT_PANE_SELECTOR = '.record-page-layout__left';

/**
 * Composable for record page sticky title row: tracks scroll on the left pane
 * and exposes isLeftTitleSticky so the title bar can show border/background when sticky.
 *
 * @param {import('vue').Ref<HTMLElement | null>} pageRootRef - Ref to the record page root element that contains .record-page-layout__left
 * @returns {{ isLeftTitleSticky: import('vue').Ref<boolean>, attach: () => boolean, detach: () => void, reset: () => void }}
 */
export function useStickyTitleRow(pageRootRef) {
  const isLeftTitleSticky = ref(false);
  const leftPaneScrollElement = ref(null);

  const updateStickyTitleState = (scrollTop) => {
    if (isLeftTitleSticky.value) {
      if (scrollTop <= STICKY_TITLE_DISABLE_OFFSET) {
        isLeftTitleSticky.value = false;
      }
      return;
    }
    if (scrollTop >= STICKY_TITLE_ENABLE_OFFSET) {
      isLeftTitleSticky.value = true;
    }
  };

  const handleLeftPaneScroll = (event) => {
    const nextScrollTop = event?.target?.scrollTop ?? 0;
    updateStickyTitleState(nextScrollTop);
  };

  const detach = () => {
    if (!leftPaneScrollElement.value) return;
    leftPaneScrollElement.value.removeEventListener('scroll', handleLeftPaneScroll);
    leftPaneScrollElement.value = null;
  };

  const reset = () => {
    isLeftTitleSticky.value = false;
  };

  const attach = () => {
    const rootEl = pageRootRef?.value ?? pageRootRef;
    const leftPaneEl =
      rootEl instanceof HTMLElement ? rootEl.querySelector(LEFT_PANE_SELECTOR) : null;
    if (!leftPaneEl) return false;
    if (leftPaneScrollElement.value === leftPaneEl) {
      updateStickyTitleState(leftPaneEl.scrollTop ?? 0);
      return true;
    }
    detach();
    leftPaneScrollElement.value = leftPaneEl;
    updateStickyTitleState(leftPaneEl.scrollTop ?? 0);
    leftPaneEl.addEventListener('scroll', handleLeftPaneScroll, { passive: true });
    return true;
  };

  /** Call after content is ready (e.g. when loading becomes false or record is set). Uses nextTick + rAF fallback. */
  const attachWhenReady = () => {
    nextTick(() => {
      if (attach()) return;
      requestAnimationFrame(() => {
        attach();
      });
    });
  };

  return {
    isLeftTitleSticky,
    attach,
    detach,
    reset,
    attachWhenReady
  };
}
