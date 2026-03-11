import { ref } from 'vue';

export const useRecordLoading = () => {
  const loading = ref(false);
  const error = ref(null);

  const runWithLoading = async (loader, fallbackMessage = 'Failed to load record') => {
    if (typeof loader !== 'function') return null;

    loading.value = true;
    error.value = null;
    try {
      return await loader();
    } catch (err) {
      console.error('Record loading error:', err);
      error.value = err?.message || fallbackMessage;
      return null;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    loading,
    error,
    runWithLoading,
    clearError
  };
};
