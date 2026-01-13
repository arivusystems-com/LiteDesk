/**
 * ============================================================================
 * PLATFORM SIDEBAR: State Management Composable
 * ============================================================================
 * 
 * Manages collapsed/expanded state for sidebar domains.
 * Persists state to localStorage.
 * 
 * State Persistence:
 * - Collapsed/expanded domains (per domain)
 * - Last active domain (for auto-expansion)
 * 
 * ============================================================================
 */

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';

const STORAGE_KEY = 'litedesk-sidebar-domains-state';
const LAST_ACTIVE_DOMAIN_KEY = 'litedesk-sidebar-last-active-domain';

export interface DomainState {
  [appKey: string]: boolean; // true = expanded, false = collapsed
}

/**
 * Load domain state from localStorage
 */
function loadDomainState(): DomainState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load sidebar domain state:', error);
  }
  return {};
}

/**
 * Save domain state to localStorage
 */
function saveDomainState(state: DomainState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save sidebar domain state:', error);
  }
}

/**
 * Get last active domain from localStorage
 */
export function getLastActiveDomain(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_DOMAIN_KEY);
  } catch (error) {
    console.warn('Failed to load last active domain:', error);
    return null;
  }
}

/**
 * Save last active domain to localStorage
 */
export function setLastActiveDomain(appKey: string): void {
  try {
    localStorage.setItem(LAST_ACTIVE_DOMAIN_KEY, appKey);
  } catch (error) {
    console.warn('Failed to save last active domain:', error);
  }
}

/**
 * Composable for managing sidebar domain state
 * 
 * @param initialDomains - Initial list of domain appKeys
 * @returns State management functions
 */
export function useSidebarState(initialDomains: string[] = []) {
  // Load initial state from localStorage
  const domainState = ref<DomainState>(loadDomainState());
  
  // Initialize domains that don't exist in storage (default to expanded)
  initialDomains.forEach((appKey) => {
    if (!(appKey in domainState.value)) {
      domainState.value[appKey] = true; // Default expanded
    }
  });

  // Save to localStorage whenever state changes
  watch(
    domainState,
    (newState) => {
      saveDomainState(newState);
    },
    { deep: true }
  );

  /**
   * Check if a domain is expanded
   */
  const isDomainExpanded = (appKey: string): boolean => {
    return domainState.value[appKey] !== false; // Default to true if not set
  };

  /**
   * Toggle domain expanded/collapsed state
   */
  const toggleDomain = (appKey: string): void => {
    domainState.value[appKey] = !isDomainExpanded(appKey);
  };

  /**
   * Set domain expanded state
   */
  const setDomainExpanded = (appKey: string, expanded: boolean): void => {
    domainState.value[appKey] = expanded;
  };

  /**
   * Expand a domain (for auto-expansion on active module)
   */
  const expandDomain = (appKey: string): void => {
    setDomainExpanded(appKey, true);
  };

  /**
   * Collapse a domain
   */
  const collapseDomain = (appKey: string): void => {
    setDomainExpanded(appKey, false);
  };

  return {
    domainState,
    isDomainExpanded,
    toggleDomain,
    setDomainExpanded,
    expandDomain,
    collapseDomain,
  };
}

