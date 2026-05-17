import { ref } from 'vue';

const connectModalOpen = ref(false);
const connectModalReason = ref('send');
const connectModalMailboxKind = ref('personal');
const connectModalTargetMailbox = ref(null);

/**
 * Global connect-inbox modal (mounted in GlobalSurfacesProvider).
 * @param {string} reason
 * @param {{ mailboxKind?: 'personal'|'group', targetMailbox?: object }} [options]
 */
export function useConnectMailboxPrompt() {
  function promptConnectMailbox(reason = 'send', options = {}) {
    connectModalReason.value = reason;
    connectModalMailboxKind.value = options.mailboxKind || 'personal';
    connectModalTargetMailbox.value = options.targetMailbox || null;
    connectModalOpen.value = true;
  }

  function closeConnectMailboxModal() {
    connectModalOpen.value = false;
  }

  return {
    connectModalOpen,
    connectModalReason,
    connectModalMailboxKind,
    connectModalTargetMailbox,
    promptConnectMailbox,
    closeConnectMailboxModal
  };
}
