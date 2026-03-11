/**
 * Shared adapter contract helpers for record activity modules.
 *
 * Keeps `ActivitySection` dumb by requiring pages/adapters to provide
 * module-specific behavior through a stable `ui` object shape.
 */

import { normalizeActivityUiContract } from '@/components/activity/activityUiContract';

/**
 * @param {import('vue').Ref<any>} timelineRef
 * @returns {(instance: any) => void}
 */
export const createActivityTimelineRefSetter = (timelineRef) => {
  return (instance) => {
    timelineRef.value = instance || null;
  };
};

/**
 * Build canonical ui adapter consumed by activity event components.
 *
 * @param {Record<string, any>} moduleUi
 * @returns {Record<string, any>}
 */
export const buildRecordActivityUi = (moduleUi = {}) => {
  return normalizeActivityUiContract(moduleUi);
};
