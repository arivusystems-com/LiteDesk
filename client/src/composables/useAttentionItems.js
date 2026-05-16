import { ref } from 'vue';
import apiClient from '@/utils/apiClient';

/** Default preview count on Platform Home. */
export const ATTENTION_PREVIEW_LIMIT = 7;

/**
 * Cross-app attention queue from GET /api/inbox.
 * @see docs/architecture/inbox-surface-invariants.md
 */
export function useAttentionItems() {
  const loading = ref(true);
  const error = ref(null);
  const items = ref([]);

  const fetchItems = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient('/inbox', {
        method: 'GET'
      });

      if (response.success) {
        items.value = response.data || [];
      } else {
        error.value = 'Unable to load attention items';
        items.value = [];
      }
    } catch (err) {
      console.error('[Attention] Error fetching items:', err);
      error.value = 'Unable to load attention items';
      items.value = [];
    } finally {
      loading.value = false;
    }
  };

  const completeTask = async (item) => {
    if (item.kind !== 'task' || !item.allowComplete) {
      return false;
    }

    try {
      if (item.completeAction?.startsWith('/api/')) {
        await apiClient(item.completeAction, {
          method: 'POST'
        });
        await fetchItems();
        return true;
      }
      return { navigate: item.completeAction };
    } catch (err) {
      console.error('[Attention] Error completing task:', err);
      error.value = 'Unable to complete task';
      return false;
    }
  };

  return {
    loading,
    error,
    items,
    fetchItems,
    completeTask
  };
}
