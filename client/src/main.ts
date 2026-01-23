import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// @ts-ignore: no declaration file for './router'
import router from './router'
// @ts-ignore: no declaration file for './composables/useColorMode'
import { useColorMode } from './composables/useColorMode'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Platform Permissions Contract Guard (DEV-only)
// CONTRACT-LOCKED: See docs/architecture/platform-permission-contract.md
if (process.env.NODE_ENV === 'development') {
  console.info(
    '[Platform Permissions]',
    'Explanation-only system (contract-locked). Enforcement is forbidden.'
  );
}

// Initialize color mode
const { colorMode } = useColorMode()
console.log('Initial color mode:', colorMode.value)

// Register service worker for PWA (audit app only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register for audit routes
    if (window.location.pathname.startsWith('/audit/')) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/audit/' })
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });
    }
  });
}

app.mount('#app')

