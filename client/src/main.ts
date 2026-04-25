import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './stores/auth'
// @ts-ignore: no declaration file for './router'
import router, { initializeDynamicRoutes } from './router'
import App from './App.vue'
import HeadlessCheckbox from './components/ui/HeadlessCheckbox.vue'
import HeadlessSwitch from './components/ui/HeadlessSwitch.vue'
// @ts-ignore: no declaration file for './composables/useColorMode'
import { useColorMode } from './composables/useColorMode'
import { installFetchApiBase } from './config/installFetchApiBase'

installFetchApiBase()

const app = createApp(App)
app.provide('litedeskInitializeDynamicRoutes', initializeDynamicRoutes)
app.use(createPinia())
app.use(router)
app.component('HeadlessCheckbox', HeadlessCheckbox)
app.component('HeadlessSwitch', HeadlessSwitch)

// Platform Permissions Contract Guard (DEV-only)
// CONTRACT-LOCKED: See docs/architecture/platform-permission-contract.md
if (import.meta.env.DEV) {
  console.info(
    '[Platform Permissions]',
    'Explanation-only system (contract-locked). Enforcement is forbidden.'
  );
}

void (() => {
  // Color mode (must run before first paint: applies <html> class)
  const { colorMode } = useColorMode()
  if (import.meta.env.DEV) {
    console.log('Initial color mode:', colorMode.value)
  }

  // Register service worker for PWA (audit app only)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (window.location.pathname.startsWith('/audit/')) {
        navigator.serviceWorker.register('/service-worker.js', { scope: '/audit/' })
          .then((registration) => {
            if (import.meta.env.DEV) {
              console.log('[SW] Service Worker registered:', registration.scope)
            }
          })
          .catch((error) => {
            console.error('[SW] Service Worker registration failed:', error)
          })
      }
    })
  }

  app.mount('#app')

  // Sentry + PostHog after first paint: avoids blocking TTI on analytics bundles.
  const startObservability = () => {
    void (async () => {
      try {
        const { initClientObservability } = await import('./config/observability.client')
        await initClientObservability(app, router)
      } catch (e) {
        console.error('[observability] init failed', e)
      }
    })()
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(startObservability, { timeout: 4000 })
  } else {
    setTimeout(startObservability, 0)
  }
})()
