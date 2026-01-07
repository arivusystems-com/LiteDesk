/**
 * In-app channel persists notifications (already saved by engine) and can
 * trigger real-time fan-out later. Currently a no-op that logs for traceability.
 */
async function send({ notification }) {
  console.log('[inAppChannel] In-app notification ready:', notification._id);
  return { success: true };
}

module.exports = { send };

