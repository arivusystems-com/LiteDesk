declare module '@/stores/auth' {
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

