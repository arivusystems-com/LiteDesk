/**
 * Public entry for `useAuthStore` — no static import of ./auth in consumers.
 * stores/auth.js calls registerUseAuthStore() on load; main.ts imports auth first
 * so registration always runs before any component setup.
 */
let _useAuthStore = null

export function registerUseAuthStore(fn) {
  _useAuthStore = fn
}

export function useAuthStore(pinia) {
  if (!_useAuthStore) {
    throw new Error(
      '[useAuthStore] Not registered. Import @/stores/auth in main.ts before the app root.'
    )
  }
  return _useAuthStore(pinia)
}
