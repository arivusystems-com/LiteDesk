/**
 * ============================================================================
 * PLATFORM COMMAND PALETTE: Pure Data Contract
 * ============================================================================
 * 
 * This file defines the command palette schema as a pure data contract:
 * - No UI logic
 * - No Vue/React specifics
 * - Registry-driven and permission-aware
 * - Keyboard-first navigation
 * 
 * Core Principle: If something is reachable by mouse, it must be reachable by keyboard.
 * 
 * ============================================================================
 */

import type { PermissionOutcome } from './permission-visibility.types';

/**
 * Command Scope
 * 
 * Defines where the command is available or relevant.
 */
export type CommandScope = 'GLOBAL' | 'APP' | 'MODULE';

/**
 * Command Category
 * 
 * Groups commands for better organization in the palette.
 */
export type CommandCategory =
  | 'navigation'
  | 'actions'
  | 'modules'
  | 'apps'
  | 'settings'
  | 'system';

/**
 * Command Item
 * 
 * Represents a single command in the command palette.
 * Commands are derived from sidebar, dashboard, and app registry.
 */
export interface CommandItem {
  /** Unique command identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Optional description/subtitle */
  description?: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Route to navigate to (if navigation command) */
  route?: string;
  
  /** Optional action function (deferred execution, not stored in data) */
  action?: () => void;
  
  /** Command scope */
  scope: CommandScope;
  
  /** Optional permission required to show this command */
  permission?: string;
  
  /** Permission outcome (HIDDEN, VISIBLE, ENABLED) */
  visibility: PermissionOutcome;
  
  /** Command category for grouping */
  category: CommandCategory;
  
  /** Optional keywords for search matching */
  keywords?: string[];
  
  /** Optional display order */
  order?: number;
  
  /** Optional app key (if scope is APP or MODULE) */
  appKey?: string;
  
  /** Optional module key (if scope is MODULE) */
  moduleKey?: string;
}

/**
 * Command Palette Definition
 * 
 * Complete command palette structure with all available commands.
 */
export interface CommandPaletteDefinition {
  /** Contract version (incremented on breaking changes) */
  version: number;
  
  /** All available commands */
  commands: CommandItem[];
  
  /** Commands grouped by category */
  commandsByCategory: Record<CommandCategory, CommandItem[]>;
  
  /** Commands grouped by scope */
  commandsByScope: Record<CommandScope, CommandItem[]>;
}

/**
 * Command Search Result
 * 
 * Result of searching/filtering commands.
 */
export interface CommandSearchResult {
  /** Matching commands */
  commands: CommandItem[];
  
  /** Total count */
  total: number;
  
  /** Search query */
  query: string;
}

/**
 * Keyboard Shortcut Definition
 * 
 * Defines keyboard shortcuts for the command palette.
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'Meta+K', 'Control+K') */
  key: string;
  
  /** Description */
  description: string;
  
  /** Action */
  action: 'open' | 'close' | 'navigate' | 'execute';
}

/**
 * Command Palette Configuration
 * 
 * Configuration for the command palette behavior.
 */
export interface CommandPaletteConfig {
  /** Primary keyboard shortcut */
  primaryShortcut: KeyboardShortcut;
  
  /** Optional secondary keyboard shortcut */
  secondaryShortcut?: KeyboardShortcut;
  
  /** Maximum number of results to show */
  maxResults?: number;
  
  /** Enable fuzzy search */
  fuzzySearch?: boolean;
}

