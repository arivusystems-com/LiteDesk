import { ref, computed, watch } from 'vue';

// Singleton state so every consumer (avatar dot, dropdown header, dropdown picker)
// stays in sync without prop drilling. Keyed by the active user's _id so the
// status survives reloads but is per-account on shared machines.

const STORAGE_PREFIX = 'arivu:user-status:';

const PRESETS = Object.freeze([
  {
    id: 'active',
    label: 'Active',
    description: 'You\u2019re available',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-500/20'
  },
  {
    id: 'busy',
    label: 'Busy',
    description: 'Do not disturb \u2014 notifications muted',
    dotClass: 'bg-rose-500',
    ringClass: 'ring-rose-500/20'
  },
  {
    id: 'away',
    label: 'Away',
    description: 'Stepped away for a bit',
    dotClass: 'bg-amber-500',
    ringClass: 'ring-amber-500/20'
  },
  {
    id: 'offline',
    label: 'Appear offline',
    description: 'Others see you as offline',
    dotClass: 'bg-gray-400 dark:bg-gray-500',
    ringClass: 'ring-gray-400/20'
  }
]);

const QUICK_EMOJIS = Object.freeze(['\uD83D\uDCAC', '\uD83C\uDF34', '\uD83E\uDD12', '\uD83C\uDFE0', '\uD83C\uDFAF', '\u2728', '\u2615', '\uD83D\uDCDA']);

const DEFAULT_STATE = Object.freeze({
  type: 'active',
  custom: null
});

const state = ref(cloneDefault());
let boundUserId = null;

function cloneDefault() {
  return { type: DEFAULT_STATE.type, custom: null };
}

function storageKey(userId) {
  if (!userId) return null;
  return `${STORAGE_PREFIX}${userId}`;
}

function readFromStorage(userId) {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return cloneDefault();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw);
    return normalize(parsed);
  } catch {
    return cloneDefault();
  }
}

function writeToStorage(userId, value) {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked \u2014 ignore */
  }
}

function normalize(input) {
  const out = cloneDefault();
  if (!input || typeof input !== 'object') return out;
  if (PRESETS.some(p => p.id === input.type)) {
    out.type = input.type;
  }
  if (input.custom && typeof input.custom === 'object') {
    const text = typeof input.custom.text === 'string' ? input.custom.text.trim() : '';
    const emoji = typeof input.custom.emoji === 'string' && input.custom.emoji.trim()
      ? input.custom.emoji.trim()
      : '\uD83D\uDCAC';
    if (text) {
      out.custom = { emoji, text };
    }
  }
  return out;
}

function bindUser(userId) {
  if (boundUserId === userId) return;
  boundUserId = userId || null;
  state.value = readFromStorage(boundUserId);
}

watch(state, (val) => {
  if (boundUserId) writeToStorage(boundUserId, val);
}, { deep: true });

export function useUserStatus(userIdRef) {
  if (userIdRef && typeof userIdRef === 'object' && 'value' in userIdRef) {
    watch(
      userIdRef,
      (id) => bindUser(id),
      { immediate: true }
    );
  } else if (typeof userIdRef === 'string') {
    bindUser(userIdRef);
  }

  const currentPreset = computed(() =>
    PRESETS.find(p => p.id === state.value.type) || PRESETS[0]
  );

  const displayLabel = computed(() =>
    state.value.custom?.text ? state.value.custom.text : currentPreset.value.label
  );

  const displayEmoji = computed(() =>
    state.value.custom?.emoji || null
  );

  function setType(typeId) {
    if (!PRESETS.some(p => p.id === typeId)) return;
    state.value = { ...state.value, type: typeId };
  }

  function setCustomStatus(emoji, text) {
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) {
      clearCustomStatus();
      return;
    }
    const cleanEmoji = typeof emoji === 'string' && emoji.trim() ? emoji.trim() : '\uD83D\uDCAC';
    state.value = { ...state.value, custom: { emoji: cleanEmoji, text: cleanText } };
  }

  function clearCustomStatus() {
    if (!state.value.custom) return;
    state.value = { ...state.value, custom: null };
  }

  return {
    state,
    presets: PRESETS,
    quickEmojis: QUICK_EMOJIS,
    currentPreset,
    displayLabel,
    displayEmoji,
    setType,
    setCustomStatus,
    clearCustomStatus
  };
}

export const USER_STATUS_PRESETS = PRESETS;
