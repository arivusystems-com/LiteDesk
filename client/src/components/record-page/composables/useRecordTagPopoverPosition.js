import { ref, nextTick } from 'vue';

function resolveMaybeElement(refValue) {
  if (!refValue) return null;
  if (Array.isArray(refValue)) {
    for (let i = refValue.length - 1; i >= 0; i -= 1) {
      const el = resolveMaybeElement(refValue[i]);
      if (el) return el;
    }
    return null;
  }
  if (refValue instanceof HTMLElement) return refValue;
  if (refValue?.$el instanceof HTMLElement) return refValue.$el;
  return null;
}

function eventHitsMenuSurface(event) {
  const target = event?.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[role="menu"]')) return true;
  if (target.closest('[role="menuitem"]')) return true;
  if (target.closest('[role="menuitemcheckbox"]')) return true;
  if (target.closest('[role="menuitemradio"]')) return true;
  // Headless UI elements commonly carry this attribute; keep popover open
  // while interacting with menu controls even when they are portalled.
  if (target.closest('[data-headlessui-state]')) return true;
  return false;
}

/**
 * Composable for tag popover visibility and positioning.
 * Use with RecordTagPopover: bind refs to the popover container and header/field buttons.
 */
export function useRecordTagPopoverPosition() {
  const tagHeaderButtonRef = ref(null);
  const tagFieldButtonRef = ref(null);
  const tagPopoverRef = ref(null);
  const showTagPopover = ref(false);
  const tagPopoverAnchor = ref('header');
  const activeTagAnchorEl = ref(null);
  const tagPopoverStyle = ref({ top: '0px', left: '0px' });
  /** True if the current click started with mousedown inside the popover (avoids closing when re-render removes the clicked element) */
  const mousedownInsidePopover = ref(false);

  const getAnchorElementForPopover = () => {
    if (activeTagAnchorEl.value instanceof HTMLElement) return activeTagAnchorEl.value;
    if (tagPopoverAnchor.value === 'field') return resolveMaybeElement(tagFieldButtonRef.value);
    return resolveMaybeElement(tagHeaderButtonRef.value);
  };

  const updateTagPopoverPosition = () => {
    if (!showTagPopover.value) return;
    const anchor = getAnchorElementForPopover();
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = 360;
    const margin = 12;
    const popoverHeight = tagPopoverRef.value?.offsetHeight || 320;
    const left = Math.min(
      Math.max(rect.left + window.scrollX, margin),
      window.scrollX + window.innerWidth - width - margin
    );

    const belowTop = rect.bottom + window.scrollY + 8;
    const aboveTop = rect.top + window.scrollY - popoverHeight - 8;
    const canPlaceBelow = rect.bottom + popoverHeight + margin <= window.innerHeight;
    const top = canPlaceBelow ? belowTop : Math.max(margin, aboveTop);

    tagPopoverStyle.value = {
      top: `${top}px`,
      left: `${left}px`
    };
  };

  const openTagPopover = async (anchor = 'header', anchorEl = null) => {
    tagPopoverAnchor.value = anchor;
    activeTagAnchorEl.value = resolveMaybeElement(anchorEl);
    showTagPopover.value = true;
    await nextTick();
    updateTagPopoverPosition();
    requestAnimationFrame(updateTagPopoverPosition);
  };

  const closeTagPopover = () => {
    showTagPopover.value = false;
    activeTagAnchorEl.value = null;
  };

  const handleTagIconClick = (event) => {
    if (showTagPopover.value) {
      closeTagPopover();
      return;
    }
    openTagPopover('header', event?.currentTarget || event?.target || null);
  };

  const openTagPopoverFromField = (event) => {
    openTagPopover('field', event?.currentTarget || event?.target || null);
  };

  const handleTagPopoverMousedown = (event) => {
    if (!showTagPopover.value) return;
    if (eventHitsMenuSurface(event)) {
      mousedownInsidePopover.value = true;
      return;
    }
    const target = event?.target;
    if (!target) return;
    const popoverEl = tagPopoverRef.value;
    const headerButtonEl = resolveMaybeElement(tagHeaderButtonRef.value);
    const fieldButtonEl = resolveMaybeElement(tagFieldButtonRef.value);
    const activeAnchorEl = resolveMaybeElement(activeTagAnchorEl.value);
    mousedownInsidePopover.value = !!(
      (popoverEl && popoverEl.contains(target)) ||
      (headerButtonEl && headerButtonEl.contains(target)) ||
      (fieldButtonEl && fieldButtonEl.contains(target)) ||
      (activeAnchorEl && activeAnchorEl.contains(target))
    );
  };

  const handleTagPopoverOutsideClick = (event) => {
    if (!showTagPopover.value) return;
    if (eventHitsMenuSurface(event)) return;
    if (mousedownInsidePopover.value) {
      mousedownInsidePopover.value = false;
      return;
    }
    const target = event?.target;
    if (!target) return;

    const popoverEl = tagPopoverRef.value;
    const clickedInsidePopover = popoverEl && popoverEl.contains(target);
    const headerButtonEl = resolveMaybeElement(tagHeaderButtonRef.value);
    const fieldButtonEl = resolveMaybeElement(tagFieldButtonRef.value);
    const activeAnchorEl = resolveMaybeElement(activeTagAnchorEl.value);
    const clickedHeaderButton = headerButtonEl && headerButtonEl.contains(target);
    const clickedFieldButton = fieldButtonEl && fieldButtonEl.contains(target);
    const clickedActiveAnchor = activeAnchorEl && activeAnchorEl.contains(target);

    if (clickedInsidePopover || clickedHeaderButton || clickedFieldButton || clickedActiveAnchor) return;
    closeTagPopover();
  };

  return {
    tagHeaderButtonRef,
    tagFieldButtonRef,
    tagPopoverRef,
    showTagPopover,
    tagPopoverStyle,
    updateTagPopoverPosition,
    openTagPopover,
    closeTagPopover,
    handleTagIconClick,
    openTagPopoverFromField,
    handleTagPopoverMousedown,
    handleTagPopoverOutsideClick
  };
}
