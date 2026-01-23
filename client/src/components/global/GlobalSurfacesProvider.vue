<template>
  <!--
    ============================================================================
    Global Surfaces Provider
    ============================================================================
    
    ARCHITECTURE NOTE: This component centralizes all global UI surfaces.
    
    This component must be mounted once at the application root level.
    It owns the visibility state and keyboard shortcuts for all global surfaces
    that are available across the entire application.
    
    Responsibilities:
    - Owns global UI surfaces (GlobalSearch, CommandPalette)
    - Owns their visibility state
    - Owns global keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+/)
    - Owns global custom-event listeners
    
    This ensures consistent behavior across all layouts (PlatformShell, AuditLayout, etc.)
    and prevents duplicate keyboard listeners and state management.
    
    See: docs/architecture/command-palette-invariants.md (if exists)
    ============================================================================
  -->
  
  <!-- Global Search -->
  <GlobalSearch
    :is-open="showGlobalSearch"
    @close="closeGlobalSearch"
    @open="openGlobalSearch"
  />
  
  <!-- Command Palette -->
  <!-- NOTE: Currently using GlobalSearch for command palette functionality -->
  <!-- GlobalSearch switches to command mode when user types '/' -->
  <!-- A separate CommandPalette component can be added here if needed in the future -->
</template>

<script setup>
/**
 * GlobalSurfacesProvider
 *
 * Owns all global, cross-app UI surfaces:
 * - GlobalSearch
 * - CommandPalette
 *
 * Rules:
 * - Must be mounted exactly once
 * - App layouts must NEVER own global surfaces
 * - App layouts trigger via custom events only
 *
 * Any deviation requires architecture review.
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';
import GlobalSearch from '@/components/GlobalSearch.vue';

// Visibility state for global surfaces
const showGlobalSearch = ref(false);
const showCommandPalette = ref(false);

// Open/close handlers for GlobalSearch
const openGlobalSearch = () => {
  showGlobalSearch.value = true;
};

const closeGlobalSearch = () => {
  showGlobalSearch.value = false;
};

// Open/close handlers for CommandPalette
const openCommandPalette = () => {
  // ARCHITECTURE NOTE: For now, CommandPalette functionality is handled by GlobalSearch
  // When user types '/' in GlobalSearch, it switches to command mode
  // If a separate CommandPalette component is created, open it here
  showCommandPalette.value = true;
  // For now, also open GlobalSearch (which handles commands)
  openGlobalSearch();
};

const closeCommandPalette = () => {
  showCommandPalette.value = false;
};

// Keyboard shortcut handlers
const handleGlobalSearchKeydown = (event) => {
  // Cmd/Ctrl + K to open global search
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    openGlobalSearch();
  }
};

const handleCommandPaletteKeydown = (event) => {
  // Cmd/Ctrl + / to open command palette
  if ((event.metaKey || event.ctrlKey) && event.key === '/') {
    event.preventDefault();
    openCommandPalette();
  }
};

// Combined keyboard handler
const handleKeydown = (event) => {
  handleGlobalSearchKeydown(event);
  handleCommandPaletteKeydown(event);
};

// Custom event handlers
const handleOpenGlobalSearchEvent = () => {
  openGlobalSearch();
};

const handleOpenCommandPaletteEvent = () => {
  openCommandPalette();
};

// Setup event listeners on mount
onMounted(() => {
  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeydown);
  
  // Custom events
  window.addEventListener('litedesk:open-global-search', handleOpenGlobalSearchEvent);
  window.addEventListener('litedesk:open-command-palette', handleOpenCommandPaletteEvent);
});

// Cleanup event listeners on unmount
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('litedesk:open-global-search', handleOpenGlobalSearchEvent);
  window.removeEventListener('litedesk:open-command-palette', handleOpenCommandPaletteEvent);
});
</script>
