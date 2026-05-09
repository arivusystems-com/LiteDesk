import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

type StorageMap = Record<string, string>;

function createStorageMock(initial: StorageMap = {}) {
  let store: StorageMap = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('authStore.hasAssignedAppAccess', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', createStorageMock());
    vi.stubGlobal('sessionStorage', createStorageMock());
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses explicit allowedApps for access decisions', async () => {
    const { useAuthStore } = await import('@/stores/auth');
    const store = useAuthStore();

    store.user = {
      _id: 'u1',
      role: 'owner',
      isOwner: true,
      allowedApps: ['AUDIT'],
      appAccess: [],
      permissions: {},
      token: 'token',
    };
    store.organization = {
      enabledApps: [{ appKey: 'SALES', status: 'ACTIVE' }, { appKey: 'AUDIT', status: 'ACTIVE' }],
    };

    expect(store.hasAssignedAppAccess('AUDIT')).toBe(true);
    expect(store.hasAssignedAppAccess('SALES')).toBe(false);
  });

  it('ignores INACTIVE rows in appAccess', async () => {
    const { useAuthStore } = await import('@/stores/auth');
    const store = useAuthStore();

    store.user = {
      _id: 'u2',
      role: 'admin',
      isOwner: false,
      allowedApps: [],
      appAccess: [{ appKey: 'PORTAL', status: 'INACTIVE' }],
      permissions: {},
      token: 'token',
    };

    expect(store.hasAssignedAppAccess('PORTAL')).toBe(false);
  });

  it('falls back to legacy hasAppAccess when explicit data is missing', async () => {
    const { useAuthStore } = await import('@/stores/auth');
    const store = useAuthStore();

    store.user = {
      _id: 'u3',
      role: 'owner',
      isOwner: true,
      allowedApps: [],
      appAccess: [],
      permissions: {},
      token: 'token',
    };
    store.organization = {
      enabledApps: [{ appKey: 'SALES', status: 'ACTIVE' }],
    };

    expect(store.hasAssignedAppAccess('SALES')).toBe(true);
    expect(store.hasAssignedAppAccess('AUDIT')).toBe(false);
  });
});
