<template>
  <div class="min-h-screen bg-gray-100/70 dark:bg-gray-900 flex overflow-x-hidden">
    <!-- Sidebar Navigation -->
    <Nav v-model="sidebarCollapsed" />
    
    <!-- Main Content Area - Dynamic margin based on sidebar state -->
    <main 
      :class="[
        'flex-1 flex flex-col transition-all duration-300 min-h-screen overflow-x-hidden',
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      ]"
    >
      <!-- Tab Bar - Hidden on mobile, visible on tablet and up -->
      <TabBar class="hidden md:block" />
      
      <!-- Content wrapper with padding -->
      <div
        ref="contentWrapperRef"
        class="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden mt-16 md:mt-30 lg:mt-14"
        :style="{ '--table-sticky-offset': tableStickyOffset }"
      >
        <!-- Router view for dynamic routes -->
        <RouterView v-slot="{ Component }">
          <keep-alive :max="10">
            <component :is="Component" :key="$route.fullPath" />
          </keep-alive>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Nav from '@/components/Nav.vue';
import TabBar from '@/components/TabBar.vue';
import { useAppShellStore } from '@/stores/appShell';
import { useTabs } from '@/composables/useTabs';

const route = useRoute();
const appShellStore = useAppShellStore();

// Sidebar collapsed state - Load from localStorage, default to false
const sidebarCollapsed = ref(
  localStorage.getItem('litedesk-sidebar-collapsed') === 'true'
);

// Save sidebar state to localStorage whenever it changes
watch(sidebarCollapsed, (newValue) => {
  localStorage.setItem('litedesk-sidebar-collapsed', newValue.toString());
  queueContentOffsetUpdate();
});

const DEFAULT_CONTENT_OFFSET = 0;
const EXTRA_OFFSET_LIGHT = '2rem';
const EXTRA_OFFSET_LARGE = '2rem';
const contentWrapperRef = ref(null);
const tableStickyOffset = ref(`calc(${DEFAULT_CONTENT_OFFSET}px + ${EXTRA_OFFSET_LIGHT})`);

const updateContentOffset = () => {
  const el = contentWrapperRef.value;

  if (!(el instanceof HTMLElement)) {
    tableStickyOffset.value = `calc(${DEFAULT_CONTENT_OFFSET}px + ${EXTRA_OFFSET_LIGHT})`;
    return;
  }

  const rect = el.getBoundingClientRect();
  const baseOffset = Math.max(DEFAULT_CONTENT_OFFSET, Math.round(rect.top));
  const extraSpacing = window.innerWidth >= 1024 ? EXTRA_OFFSET_LARGE : EXTRA_OFFSET_LIGHT;

  tableStickyOffset.value = `calc(${baseOffset}px + ${extraSpacing})`;
};

const queueContentOffsetUpdate = () => {
  nextTick(() => {
    requestAnimationFrame(updateContentOffset);
  });
};

watch(
  () => route.fullPath,
  () => {
    queueContentOffsetUpdate();
  }
);

watch(sidebarCollapsed, () => {
  queueContentOffsetUpdate();
});

const handleResize = () => {
  updateContentOffset();
};

onMounted(() => {
  queueContentOffsetUpdate();
  window.addEventListener('resize', handleResize, { passive: true });
});
</script>

<style scoped>
/* Component-specific styles if needed */
</style>

