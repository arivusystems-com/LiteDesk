import { ref } from 'vue';

const connectModalOpen = ref(false);
const connectModalReason = ref('send');

/**
 * Global connect-inbox modal (mounted in GlobalSurfacesProvider).
 */
export function useConnectMailboxPrompt() {
  function promptConnectMailbox(reason = 'send') {
    connectModalReason.value = reason;
    connectModalOpen.value = true;
  }

  function closeConnectMailboxModal() {
    connectModalOpen.value = false;
  }

  return {
    connectModalOpen,
    connectModalReason,
    promptConnectMailbox,
    closeConnectMailboxModal
  };
}
