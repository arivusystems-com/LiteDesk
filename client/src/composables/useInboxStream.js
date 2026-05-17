/**
 * SSE for workspace inbox refresh (R3).
 */

import { withApiOrigin } from '@/config/apiBase';

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

function getReconnectDelay(attempt) {
  const delay = Math.min(INITIAL_RECONNECT_DELAY * 2 ** attempt, MAX_RECONNECT_DELAY);
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return delay + jitter;
}

/**
 * @param {object} options
 * @param {() => string|null|undefined} options.getToken
 * @param {(event: object) => void} options.onInboxUpdated
 * @returns {{ connect: () => void, disconnect: () => void }}
 */
export function createInboxStream(options = {}) {
  const { getToken, onInboxUpdated } = options;
  let eventSource = null;
  let reconnectTimer = null;
  let attemptCount = 0;
  let stopped = false;

  function closeConnection() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function disconnect() {
    stopped = true;
    closeConnection();
  }

  function scheduleReconnect() {
    if (stopped || attemptCount >= MAX_RECONNECT_ATTEMPTS) return;
    const delay = getReconnectDelay(attemptCount);
    attemptCount += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect() {
    if (stopped) return;
    const token = getToken?.();
    if (!token) return;

    closeConnection();

    const url = withApiOrigin(
      `/api/communications/inbox/stream?token=${encodeURIComponent(token)}`
    );

    try {
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.addEventListener('connected', () => {
        attemptCount = 0;
      });

      eventSource.addEventListener('inbox', (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data?.type === 'inbox:updated' && onInboxUpdated) {
            onInboxUpdated(data);
          }
        } catch {
          /* ignore malformed */
        }
      });

      eventSource.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data?.timestamp) return;
          if (data?.type === 'inbox:updated' && onInboxUpdated) {
            onInboxUpdated(data);
          }
        } catch {
          /* ignore */
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        scheduleReconnect();
      };
    } catch {
      scheduleReconnect();
    }
  }

  return { connect, disconnect };
}
