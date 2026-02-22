const cron = require('node-cron');
const { runDailyDigest, runWeeklyDigest } = require('./digestScheduler');
const { tick: escalationTick } = require('./escalationResolver');
const { purgeExpiredRetention } = require('./deletionService');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const ENABLE_DIGEST_SCHEDULER = process.env.ENABLE_DIGEST_SCHEDULER !== 'false'; // Default: enabled
const ENABLE_ESCALATION_SCHEDULER = process.env.ENABLE_ESCALATION_SCHEDULER !== 'false'; // Default: enabled (Phase 3)
const ENABLE_TRASH_RETENTION_SCHEDULER = process.env.ENABLE_TRASH_RETENTION_SCHEDULER !== 'false'; // Default: enabled

let dailyDigestJob = null;
let weeklyDigestJob = null;
let escalationJob = null;
let trashRetentionJob = null;

/**
 * Initialize and start scheduled jobs for notification digests.
 * 
 * Jobs:
 * - Daily digest: Runs every day at 9:00 AM
 * - Weekly digest: Runs every Monday at 9:00 AM
 * 
 * Set ENABLE_DIGEST_SCHEDULER=false to disable.
 */
function startScheduledJobs() {
  console.log('[scheduledJobs] Starting scheduled jobs...');

  if (ENABLE_DIGEST_SCHEDULER) {

  // Daily digest: Every day at 9:00 AM
  // Cron format: minute hour day month day-of-week
  // '0 9 * * *' = 9:00 AM every day
  dailyDigestJob = cron.schedule('0 9 * * *', async () => {
    const startTime = new Date();
    console.log(`[scheduledJobs] Running daily digest at ${startTime.toISOString()}`);
    
    try {
      await runDailyDigest();
      const duration = Date.now() - startTime.getTime();
      console.log(`[scheduledJobs] Daily digest completed in ${duration}ms`);
    } catch (err) {
      // Error already logged in runDailyDigest, but log here too for visibility
      console.error('[scheduledJobs] Daily digest job failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.DIGEST_TIMEZONE || 'UTC'
  });

  // Weekly digest: Every Monday at 9:00 AM
  // '0 9 * * 1' = 9:00 AM every Monday (0 = Sunday, 1 = Monday)
  weeklyDigestJob = cron.schedule('0 9 * * 1', async () => {
    const startTime = new Date();
    console.log(`[scheduledJobs] Running weekly digest at ${startTime.toISOString()}`);
    
    try {
      await runWeeklyDigest();
      const duration = Date.now() - startTime.getTime();
      console.log(`[scheduledJobs] Weekly digest completed in ${duration}ms`);
    } catch (err) {
      // Error already logged in runWeeklyDigest, but log here too for visibility
      console.error('[scheduledJobs] Weekly digest job failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.DIGEST_TIMEZONE || 'UTC'
  });

    console.log('[scheduledJobs]   - Daily digest: 9:00 AM every day');
    console.log('[scheduledJobs]   - Weekly digest: 9:00 AM every Monday');
  } else {
    console.log('[scheduledJobs] Digest scheduler disabled (ENABLE_DIGEST_SCHEDULER=false)');
  }

  // Escalation resolver (Phase 3): check pending approvals past timeout
  if (ENABLE_ESCALATION_SCHEDULER) {
    escalationJob = cron.schedule('* * * * *', async () => {
      try {
        const r = await escalationTick();
        if (r.processed > 0 && NOTIFICATION_DEBUG) {
          console.log(`[scheduledJobs] Escalation tick: processed=${r.processed} escalated=${r.escalated} failed=${r.failed}`);
        }
      } catch (err) {
        console.error('[scheduledJobs] Escalation tick failed:', err.message);
      }
    }, { scheduled: true, timezone: process.env.DIGEST_TIMEZONE || 'UTC' });
    console.log('[scheduledJobs]   - Escalation resolver: every minute');
  } else {
    console.log('[scheduledJobs] Escalation scheduler disabled (ENABLE_ESCALATION_SCHEDULER=false)');
  }

  // Trash retention: purge items past retentionExpiresAt (excluding legal hold)
  if (ENABLE_TRASH_RETENTION_SCHEDULER) {
    trashRetentionJob = cron.schedule('0 3 * * *', async () => {
      const startTime = new Date();
      console.log(`[scheduledJobs] Running trash retention purge at ${startTime.toISOString()}`);
      try {
        const r = await purgeExpiredRetention();
        const duration = Date.now() - startTime.getTime();
        if (r.purged > 0 || r.failed > 0) {
          console.log(`[scheduledJobs] Trash retention: purged=${r.purged} failed=${r.failed} skipped=${r.skipped} (${duration}ms)`);
        }
      } catch (err) {
        console.error('[scheduledJobs] Trash retention job failed:', err.message);
      }
    }, { scheduled: true, timezone: process.env.DIGEST_TIMEZONE || 'UTC' });
    console.log('[scheduledJobs]   - Trash retention: 3:00 AM every day');
  } else {
    console.log('[scheduledJobs] Trash retention scheduler disabled (ENABLE_TRASH_RETENTION_SCHEDULER=false)');
  }

  console.log(`[scheduledJobs]   - Timezone: ${process.env.DIGEST_TIMEZONE || 'UTC'}`);
  if (NOTIFICATION_DEBUG) {
    console.log('[scheduledJobs]   - Debug mode: enabled');
  }
}

/**
 * Stop all scheduled jobs (for graceful shutdown).
 */
function stopScheduledJobs() {
  if (dailyDigestJob) {
    dailyDigestJob.stop();
    dailyDigestJob = null;
    console.log('[scheduledJobs] Daily digest job stopped');
  }
  
  if (weeklyDigestJob) {
    weeklyDigestJob.stop();
    weeklyDigestJob = null;
    console.log('[scheduledJobs] Weekly digest job stopped');
  }

  if (escalationJob) {
    escalationJob.stop();
    escalationJob = null;
    console.log('[scheduledJobs] Escalation job stopped');
  }

  if (trashRetentionJob) {
    trashRetentionJob.stop();
    trashRetentionJob = null;
    console.log('[scheduledJobs] Trash retention job stopped');
  }
}

/**
 * Manually trigger daily digest (for testing or manual runs).
 */
async function triggerDailyDigest() {
  console.log('[scheduledJobs] Manually triggering daily digest...');
  await runDailyDigest();
}

/**
 * Manually trigger weekly digest (for testing or manual runs).
 */
async function triggerWeeklyDigest() {
  console.log('[scheduledJobs] Manually triggering weekly digest...');
  await runWeeklyDigest();
}

/**
 * Manually trigger trash retention purge (for testing or manual runs).
 */
async function triggerTrashRetention() {
  console.log('[scheduledJobs] Manually triggering trash retention purge...');
  return purgeExpiredRetention();
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  triggerDailyDigest,
  triggerWeeklyDigest,
  triggerTrashRetention
};

