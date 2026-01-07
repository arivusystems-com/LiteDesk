/**
 * Offline Action Queue Service
 * 
 * Manages queued actions for offline execution:
 * - CHECK_IN: Queue check-in with geo data
 * - SUBMIT: Queue form submission
 * 
 * Rules:
 * - Prevent duplicate CHECK_IN for same event
 * - FIFO execution order
 * - Actions are append-only
 */

import { saveOfflineAction, getPendingActions, updateActionStatus, deleteAction, getAllActions } from './offlineDb.js';

/**
 * Check if a CHECK_IN action already exists for an event
 */
const hasPendingCheckIn = async (eventId) => {
  const actions = await getPendingActions();
  return actions.some(
    action => action.type === 'CHECK_IN' && action.eventId === eventId && action.status === 'PENDING'
  );
};

/**
 * Enqueue an action for offline execution
 * @param {string} type - 'CHECK_IN' | 'SUBMIT'
 * @param {string} eventId - Event ID
 * @param {object} payload - Action payload (geo, formResponseId, etc.)
 * @returns {Promise<number>} Action ID
 */
export const enqueueAction = async (type, eventId, payload) => {
  // Prevent duplicate CHECK_IN
  if (type === 'CHECK_IN') {
    const hasCheckIn = await hasPendingCheckIn(eventId);
    if (hasCheckIn) {
      throw new Error('Check-in already queued for this audit');
    }
  }

  const actionId = await saveOfflineAction({
    type,
    eventId,
    payload
  });

  console.log(`[OfflineQueue] Enqueued ${type} action for ${eventId}, ID: ${actionId}`);
  return actionId;
};

/**
 * List all pending actions (FIFO order)
 */
export const listPendingActions = async () => {
  return await getPendingActions();
};

/**
 * Mark action as synced (successfully sent to server)
 */
export const markSynced = async (actionId) => {
  await updateActionStatus(actionId, 'SYNCED');
};

/**
 * Mark action as failed
 */
export const markFailed = async (actionId, errorMessage) => {
  await updateActionStatus(actionId, 'FAILED', errorMessage);
};

/**
 * Get action by ID
 */
export const getAction = async (actionId) => {
  const allActions = await getAllActions();
  return allActions.find(action => action.id === actionId);
};

/**
 * Get pending actions count
 */
export const getPendingCount = async () => {
  const pending = await listPendingActions();
  return pending.length;
};

/**
 * Clear synced actions (cleanup)
 */
export const clearSyncedActions = async () => {
  const allActions = await getAllActions();
  const synced = allActions.filter(action => action.status === 'SYNCED');
  
  await Promise.all(synced.map(action => deleteAction(action.id)));
  console.log(`[OfflineQueue] Cleared ${synced.length} synced actions`);
};

