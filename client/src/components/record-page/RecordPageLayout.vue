<template>
  <div ref="layoutRootRef" class="record-page-layout flex flex-col h-full w-full bg-white dark:bg-gray-900 overflow-hidden absolute inset-0">
    <!-- Fixed header - positioned below TabBar -->
    <header v-if="$slots.header" :class="['record-page-layout__header', 'fixed', 'z-20', 'flex-shrink-0', 'bg-white', 'dark:bg-gray-900', 'border-b', 'border-gray-200', 'dark:border-gray-700', 'record-page-layout__header--positioned', { 'transition-all duration-300 ease-in-out': allowTransition }]">
      <slot name="header" />
    </header>
    <!-- Body container - no scroll, only columns scroll -->
    <div :class="['record-page-layout__body', 'flex', 'flex-1', 'min-h-0', 'gap-0', isMobile ? 'px-0' : 'px-6', 'pr-0', forceMobile ? 'pt-0' : 'pt-6', 'overflow-hidden', 'record-page-layout__body--responsive', !forceMobile && 'record-page-layout__body--with-header', !forceMobile && 'record-page-layout__body--positioned', { 'transition-all duration-300 ease-in-out': allowTransition }]">
      <!-- Left column: Main content (2/3 width) - scrollable; on mobile/tablet hidden unless leftExpanded (e.g. version history) -->
      <div
        v-show="!isMobile || leftExpanded"
        ref="leftEl"
        :class="['record-page-layout__left', 'flex', 'flex-col', 'min-w-0', 'flex-1', 'py-6', 'pr-10', 'lg:flex-[2]', 'overflow-y-auto', 'overflow-x-hidden', { 'is-scrolling': leftScrolling }]"
        @scroll="onLeftScroll"
        @wheel="onLeftWheel"
      >
        <div class="record-page-layout__left-content max-w-4xl mx-auto w-full px-6">
          <slot name="left" :is-mobile="isMobile" />
        </div>
      </div>
      <!-- Right column: Activity sidebar (1/3 width) - hidden when section expanded (e.g. description history) -->
      <aside v-show="!leftExpanded" :class="['record-page-layout__right', 'min-w-0', 'flex', 'flex-col', 'border-l', 'border-gray-200', 'dark:border-gray-700', 'overflow-hidden', isMobile ? 'w-full border-l-0' : 'w-full lg:w-auto lg:flex-shrink-0']">
        <slot name="right" :is-mobile="isMobile">
          <!-- Default slot content -->
        </slot>
      </aside>
    </div>
    
    <!-- Teleport target for Summary tab content - when mobile and not in expanded full-screen view (e.g. version history) -->
    <Teleport v-if="isMobile && summaryTeleportReady && !leftExpanded" to="#record-summary-teleport-target">
      <div class="record-page-layout__summary-content">
        <slot name="left" :is-mobile="isMobile" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, nextTick, ref, provide, computed } from 'vue';

/**
 * RecordPageLayout – global record page structure.
 * Top: header slot. Main: two columns (left = record content, right = context panel).
 * Related records are composed at bottom of left column by parent.
 * The right slot is a full-height context panel container (typically RecordContextPanel).
 * No business logic. Responsive stacking only.
 *
 * On tablet/mobile (< 1024px), the left column is hidden and its content is shown
 * as a "Summary" tab in the right pane – unless leftExpanded is true (e.g. version history),
 * in which case the left column is shown full-screen and the right pane is hidden by the parent.
 */

const props = defineProps({
  /** When true, left column is shown full-screen even on mobile/tablet (e.g. description version history). */
  leftExpanded: { type: Boolean, default: false },
  /** When true, force mobile layout (left hidden, Summary tab in right pane) - e.g. for embed in QuickPreviewDrawer */
  forceMobile: { type: Boolean, default: false }
});

const allowTransition = ref(false);
const leftEl = ref(null);
const layoutRootRef = ref(null);
const leftScrolling = ref(false);
let leftScrollHideTimer = null;
const SCROLL_HIDE_DELAY = 800;

// Mobile detection (< 1024px matches lg: breakpoint)
const MOBILE_BREAKPOINT = 1024;
const TABLET_MIN_WIDTH = 768;
const windowIsMobile = ref(window.innerWidth < MOBILE_BREAKPOINT);
const isMobile = computed(() => props.forceMobile || windowIsMobile.value);
const summaryTeleportReady = ref(false);

// Provide isMobile to child components (RecordRightPane) - must be ref-like for inject
provide('recordLayoutIsMobile', computed(() => isMobile.value));
provide('recordLayoutSummaryTeleportReady', summaryTeleportReady);

function showLeftScrollbar() {
  leftScrolling.value = true;
  if (leftScrollHideTimer) clearTimeout(leftScrollHideTimer);
  leftScrollHideTimer = setTimeout(() => {
    leftScrolling.value = false;
    leftScrollHideTimer = null;
  }, SCROLL_HIDE_DELAY);
}

function onLeftScroll() {
  showLeftScrollbar();
}

function onLeftWheel() {
  showLeftScrollbar();
}
let updateHeaderHeight = null;
let updateHeaderPosition = null;
let resizeHandler = null;
let sidebarToggleHandler = null;

onMounted(async () => {
  await nextTick();
  const el = leftEl.value;
  if (el) el.addEventListener('touchstart', showLeftScrollbar, { passive: true });

  if (!props.forceMobile) {
    // Disable overflow on parent content wrapper to prevent body scroll
    // Find the parent content wrapper that contains RouterView
    const recordPageElement = layoutRootRef.value;
    if (recordPageElement) {
      let parent = recordPageElement.parentElement;
      // Traverse up to find the content wrapper with overflow-y-auto
      while (parent && parent !== document.body) {
        if (parent.classList.contains('overflow-y-auto') || 
            getComputedStyle(parent).overflowY === 'auto' ||
            getComputedStyle(parent).overflowY === 'scroll') {
          parent.classList.add('record-page-parent-no-scroll');
          parent.style.overflowY = 'hidden';
          break;
        }
        parent = parent.parentElement;
      }
    }

    // Calculate header height dynamically
    updateHeaderHeight = () => {
      const header = layoutRootRef.value?.querySelector('.record-page-layout__header');
      if (header) {
        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      } else {
        // Default height if header not found
        document.documentElement.style.setProperty('--header-height', '120px');
      }
    };

    // Calculate header position (below TabBar and accounting for sidebar)
    updateHeaderPosition = () => {
      const header = layoutRootRef.value?.querySelector('.record-page-layout__header');
      if (!header) return;

      // Get TabBar height - TabBar uses h-12 which is 48px (3rem)
      // On mobile it's at top-16 (64px), on desktop at top-0
      const viewportWidth = window.innerWidth;
      const isMobileView = viewportWidth < MOBILE_BREAKPOINT;
      const mobileTopNavHeight = 64; // h-16 = 4rem = 64px
      const tabBarHeight = 48; // h-12 = 3rem = 48px
      // Phone: no tab bar in this layout, use navbar offset only.
      // Tablet: tab bar is present below navbar, reserve both heights.
      const isTabletView = isMobileView && viewportWidth >= TABLET_MIN_WIDTH;
      const tabBarTopOffset = isMobileView
        ? (isTabletView ? (mobileTopNavHeight + tabBarHeight) : mobileTopNavHeight)
        : tabBarHeight;

      // Get sidebar width from localStorage
      let sidebarWidth = 0;
      let leftOffset = 0;

      if (!isMobileView) {
        const sidebarCollapsed = localStorage.getItem('litedesk-sidebar-collapsed') === 'true';
        sidebarWidth = sidebarCollapsed ? 80 : 256;
        leftOffset = sidebarWidth;
      }

      // Set CSS variables for header and body positioning
      document.documentElement.style.setProperty('--tabbar-height', `${tabBarTopOffset}px`);
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
      document.documentElement.style.setProperty('--header-top', `${tabBarTopOffset}px`);
      document.documentElement.style.setProperty('--header-left', `${leftOffset}px`);
      document.documentElement.style.setProperty('--body-left', `${leftOffset}px`);
    };

    // Initial setup without transition
    updateHeaderHeight();
    updateHeaderPosition();

    // Enable transitions after initial positioning is complete
    // Use a small delay to ensure initial position is set before enabling transitions
    setTimeout(() => {
      allowTransition.value = true;
    }, 50);

    resizeHandler = () => {
      updateHeaderHeight();
      updateHeaderPosition();
      windowIsMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
    };
    window.addEventListener('resize', resizeHandler);

    // Listen for sidebar toggle events - transitions will be enabled by this point
    sidebarToggleHandler = () => {
      setTimeout(() => {
        updateHeaderPosition();
      }, 0); // Update immediately to sync with TabBar transition
    };
    window.addEventListener('sidebar-toggle', sidebarToggleHandler);
  }
});

onUnmounted(() => {
  if (leftScrollHideTimer) clearTimeout(leftScrollHideTimer);
  const el = leftEl.value;
  if (el) el.removeEventListener('touchstart', showLeftScrollbar);

  // Restore overflow on parent content wrapper when component unmounts
  const parentWithNoScroll = document.querySelector('.record-page-parent-no-scroll');
  if (parentWithNoScroll) {
    parentWithNoScroll.classList.remove('record-page-parent-no-scroll');
    parentWithNoScroll.style.overflowY = '';
  }
  
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (sidebarToggleHandler) window.removeEventListener('sidebar-toggle', sidebarToggleHandler);
});
</script>

<style scoped>
.record-page-layout__body--responsive {
  flex-direction: column;
}
@media (min-width: 1024px) {
  .record-page-layout__body--responsive {
    flex-direction: row;
  }
}

/* Position header below TabBar and account for sidebar */
.record-page-layout__header--positioned {
  top: var(--tabbar-height, 48px);
  left: var(--header-left, 0px);
  right: var(--header-right, 0px);
}

/* Add padding-top to body to account for fixed header and TabBar */
.record-page-layout__body--with-header {
  padding-top: calc(var(--tabbar-height, 48px) + var(--header-height, 120px));
  margin-top: 0;
}

/* Position body to respect sidebar width */
.record-page-layout__body--positioned {
  margin-left: var(--body-left, 0px);
  width: calc(100% - var(--body-left, 0px));
}

/* Ensure header has proper shadow when scrolling */
/* .record-page-layout__header {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

:global(.dark) .record-page-layout__header {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2);
} */

/* Section spacing in left column (scoped CSS so it always applies) */
.record-page-layout__left-content > * + * {
  margin-top: 0.75rem; /* 12px */
}

/* Smooth scrolling for left column; scrollbar hidden by default, shown when scrolling */
.record-page-layout__left {
  scroll-behavior: smooth;
  scrollbar-color: transparent transparent;
  scrollbar-width: thin;
}

.record-page-layout__left.is-scrolling {
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}

.record-page-layout__left::-webkit-scrollbar {
  width: 8px;
}

.record-page-layout__left::-webkit-scrollbar-track {
  background: transparent;
}

.record-page-layout__left::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.record-page-layout__left.is-scrolling::-webkit-scrollbar-thumb {
  background: rgb(203 213 225);
}

:global(.dark) .record-page-layout__left.is-scrolling {
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

:global(.dark) .record-page-layout__left.is-scrolling::-webkit-scrollbar-thumb {
  background: rgb(75 85 99);
}

/* Right column scrolling is handled by RecordRightPane */

/* Show pointer cursor on clickable elements */
.record-page-layout :deep(button:not(:disabled)),
.record-page-layout :deep(a[href]),
.record-page-layout :deep([role="button"]),
.record-page-layout :deep([role="tab"]) {
  cursor: pointer;
}

/* Summary content teleported to right pane on mobile */
.record-page-layout__summary-content > * + * {
  margin-top: 0.75rem; /* 12px - match left column spacing */
}
</style>
