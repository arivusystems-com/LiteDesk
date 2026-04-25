import { ref, watch, onMounted, getCurrentInstance } from 'vue';

/** Dev-only: hot path; avoid main-thread console cost in production. */
function dbg(...args) {
  if (import.meta.env.DEV) console.log(...args);
}

const colorMode = ref('light'); // Global state shared across the app
let initialized = false; // Track if color mode has been initialized
let systemListener = null; // Store the system listener reference

// Inside src/composables/useColorMode.js

const applyMode = (mode) => {
  // Target the root <html> element
  const root = document.documentElement;
  
  dbg('Applying color mode:', mode);
  
  // 1. **CRITICAL STEP:** Remove the 'dark' class (and 'light', if used)
  // This ensures a clean slate, especially important when switching FROM dark TO light.
  root.classList.remove('dark', 'light'); 
  
  // 2. Conditionally apply the 'dark' class based on the mode
  if (mode === 'system') {
    // Check OS preference and apply 'dark' if preferred
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    dbg('System mode - prefers dark:', prefersDark);
    if (prefersDark) {
      root.classList.add('dark');
    }
  } else if (mode === 'dark') {
    // Explicitly set to dark mode
    dbg('Adding dark class');
    root.classList.add('dark');
  } else if (mode === 'light') {
    dbg('Light mode - no dark class added');
  }

  dbg('HTML classes after applyMode:', root.classList.toString());
  dbg('Dark class present:', root.classList.contains('dark'));
  dbg('Current mode:', mode);
  // If mode is 'light', the 'dark' class remains removed, 
  // and Tailwind defaults to the base (light mode) styles.
};

// Initialize color mode from localStorage (runs synchronously)
const initializeColorMode = () => {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  
  const storedMode = localStorage.getItem('color-mode');
  dbg('Stored color mode:', storedMode);
  if (['light', 'dark', 'system'].includes(storedMode)) {
    colorMode.value = storedMode;
    dbg('Using stored mode:', storedMode);
  } else {
    dbg('Using default mode:', colorMode.value);
  }
  
  applyMode(colorMode.value);
  initialized = true;
};

// Listen for system preference changes while in 'system' mode
const setupSystemListener = () => {
  if (typeof window === 'undefined' || systemListener) {
    return;
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (colorMode.value === 'system') {
      applyMode('system');
    }
  };
  mediaQuery.addEventListener('change', handler);
  systemListener = { mediaQuery, handler };
};

export function useColorMode() {
  // Initialize color mode immediately if not already initialized (works outside components)
  initializeColorMode();
  
  const toggleColorMode = (mode) => {
    dbg('toggleColorMode called with:', mode);
    if (!['light', 'dark', 'system'].includes(mode)) {
      dbg('Invalid mode:', mode);
      return;
    }
    dbg('Setting color mode to:', mode);
    colorMode.value = mode;
    localStorage.setItem('color-mode', mode);
    applyMode(mode);
  };

  // Only use onMounted if we're in a component context
  // This allows the composable to work both in components and in main.ts
  const instance = getCurrentInstance();
  if (instance) {
    // We're in a component, so we can use onMounted for setting up the system listener
    onMounted(() => {
      setupSystemListener();
    });
  } else {
    // We're not in a component (e.g., called from main.ts), set up listener immediately
    if (typeof window !== 'undefined') {
      setupSystemListener();
    }
  }

  // Watch for manual changes via the switcher and apply
  watch(colorMode, (newMode) => {
    applyMode(newMode);
  });

  // Clear stored mode (for debugging)
  const clearStoredMode = () => {
    localStorage.removeItem('color-mode');
    dbg('Cleared stored color mode');
  };

  // Expose the current mode for use in templates (e.g., to switch logos)
  return {
    colorMode,
    toggleColorMode,
    clearStoredMode,
  };
}