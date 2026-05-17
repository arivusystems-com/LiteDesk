import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import { isMailboxConnectedForProvider } from '@/constants/inboxProviders';

const mailboxes = ref([]);
const flags = ref({
  canCreatePersonal: false,
  canCreateGroup: false,
  gmailOAuthAppConfigured: false,
  gmailSmtpOrgConfigured: false
});
const loading = ref(false);
const loaded = ref(false);

let inflight = null;

const personalMailbox = computed(
  () => mailboxes.value.find((m) => m.kind === 'personal') || null
);

const groupMailboxes = computed(() => mailboxes.value.filter((m) => m.kind === 'group'));

const hasConnectedGroupMailbox = computed(() =>
  groupMailboxes.value.some((m) => isMailboxConnectedForProvider(m, 'google'))
);

/** True when any supported inbox provider is linked (personal or shared mailbox). */
const hasConnectedInbox = computed(() =>
  mailboxes.value.some(
    (m) => isMailboxConnectedForProvider(m, 'google') || isMailboxConnectedForProvider(m, 'google-smtp')
  )
);

const connectedPersonalMailbox = computed(
  () =>
    mailboxes.value.find(
      (m) => m.kind === 'personal' && isMailboxConnectedForProvider(m, 'google')
    ) || null
);

const gmailOAuthReady = computed(() => flags.value.gmailOAuthAppConfigured === true);

async function refreshMailboxes() {
  if (inflight) return inflight;
  loading.value = true;
  inflight = (async () => {
    try {
      const res = await apiClient('/mailboxes', { method: 'GET' });
      if (res?.success && res?.data) {
        mailboxes.value = Array.isArray(res.data.mailboxes) ? res.data.mailboxes : [];
        flags.value = {
          canCreatePersonal: Boolean(res.data.flags?.canCreatePersonal),
          canCreateGroup: Boolean(res.data.flags?.canCreateGroup),
          gmailOAuthAppConfigured: Boolean(res.data.flags?.gmailOAuthAppConfigured),
          gmailSmtpOrgConfigured: Boolean(res.data.flags?.gmailSmtpOrgConfigured)
        };
      } else {
        mailboxes.value = [];
      }
      loaded.value = true;
    } catch (err) {
      console.warn('[useMailboxConnection] refresh failed:', err);
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();
  return inflight;
}

async function ensurePersonalMailbox() {
  if (personalMailbox.value?.id) return personalMailbox.value;
  if (!flags.value.canCreatePersonal) return null;
  const res = await apiClient('/mailboxes', {
    method: 'POST',
    body: JSON.stringify({ kind: 'personal', label: 'My work inbox' })
  });
  if (res?.success && res?.data?.mailbox) {
    await refreshMailboxes();
    return res.data.mailbox;
  }
  return null;
}

/**
 * @param {{ label: string, emailAddress?: string, memberUserIds?: string[] }} input
 */
async function ensureGroupMailbox(input = {}) {
  const label = String(input.label || 'Shared inbox').trim();
  if (!label) return null;
  if (!flags.value.canCreateGroup) return null;
  const body = {
    kind: 'group',
    label,
    emailAddress: input.emailAddress ? String(input.emailAddress).trim() : '',
    memberUserIds: Array.isArray(input.memberUserIds) ? input.memberUserIds : []
  };
  const res = await apiClient('/mailboxes', { method: 'POST', body: JSON.stringify(body) });
  if (res?.success && res?.data?.mailbox) {
    await refreshMailboxes();
    return res.data.mailbox;
  }
  return null;
}

/**
 * Shared mailbox connection state for inbox + compose gating.
 */
export function useMailboxConnection() {
  return {
    mailboxes,
    flags,
    loading,
    loaded,
    personalMailbox,
    groupMailboxes,
    hasConnectedInbox,
    hasConnectedGroupMailbox,
    connectedPersonalMailbox,
    gmailOAuthReady,
    refreshMailboxes,
    ensurePersonalMailbox,
    ensureGroupMailbox
  };
}
