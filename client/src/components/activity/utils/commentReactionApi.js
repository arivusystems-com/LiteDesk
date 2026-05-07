import apiClient from '@/utils/apiClient';

/**
 * Unified API adapter for comment reaction toggles.
 * Keeps endpoint construction out of page-level components.
 */
export function createCommentReactionApi(config) {
  const type = String(config?.type || '').trim();

  if (type === 'task') {
    return {
      toggleReaction: ({ commentId, emoji }) => {
        const taskId = config.getTaskId?.();
        return apiClient.post(`/tasks/${taskId}/comments/${commentId}/reactions`, { emoji });
      }
    };
  }

  if (type === 'deal') {
    return {
      toggleReaction: ({ commentId, emoji }) => {
        const dealId = config.getDealId?.();
        return apiClient.post(`/deals/${dealId}/comments/${commentId}/reactions`, { emoji });
      }
    };
  }

  if (type === 'module-record') {
    return {
      toggleReaction: ({ commentId, emoji }) => {
        const moduleKey = config.getModuleKey?.();
        const recordId = config.getRecordId?.();
        return apiClient.post(`/modules/${moduleKey}/records/${recordId}/comments/${commentId}/reactions`, { emoji });
      }
    };
  }

  throw new Error(`Unsupported comment reaction api type: ${type}`);
}
