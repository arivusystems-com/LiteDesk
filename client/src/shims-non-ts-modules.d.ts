declare module '@/stores/appShell' {
  // JS Pinia store (no TS declarations yet)
  export function useAppShellStore(): { activeApp?: string | null };
}

declare module '@/stores/authRegistry' {
  // JS Pinia store (no TS declarations yet)
  export function useAuthStore(): any;
}

declare module '@/stores/notifications' {
  // JS Pinia store (no TS declarations yet)
  export function useNotificationStore(): any;
}

declare module '@/utils/apiClient' {
  // JS API client (no TS declarations yet)
  const apiClient: any;
  export default apiClient;
}

declare module '@/utils/dateUtils' {
  export function openDatePicker(target?: any): void;
  export function format(...args: any[]): any;
  export function fromNow(...args: any[]): any;
  export function duration(...args: any[]): any;
  const dateUtils: {
    openDatePicker: typeof openDatePicker;
    format: typeof format;
    fromNow: typeof fromNow;
    duration: typeof duration;
    [key: string]: any;
  };
  export default dateUtils;
}

declare module '@/composables/useTabs' {
  // JS tabs composable (no TS declarations yet)
  export function useTabs(): any;
}

declare module '@/composables/useColorMode' {
  // JS color mode composable (no TS declarations yet)
  export function useColorMode(): {
    colorMode: { value: 'light' | 'dark' | 'system' };
    toggleColorMode: (mode: 'light' | 'dark' | 'system') => void;
  };
}

declare module '@/components/activity/useRecordActivityAdapter' {
  export function createActivityTimelineRefSetter(timelineRef: any): (instance: any) => void;
  export function buildRecordActivityUi(moduleUi?: Record<string, any>): Record<string, any>;
}

declare module '@/components/activity/adapters/taskActivityUiAdapter' {
  export function createTaskActivityUi(options: Record<string, any>): any;
}

declare module '@/components/activity/adapters/dealActivityUiAdapter' {
  export function createDealActivityUi(options: Record<string, any>): any;
}

declare module '@/components/activity/activityUiContract' {
  export const ACTIVITY_UI_STATE_DEFAULTS: Record<string, any>;
  export const ACTIVITY_UI_HANDLER_KEYS: string[];
  export function normalizeActivityUiContract(moduleUi?: Record<string, any>): Record<string, any>;
}

