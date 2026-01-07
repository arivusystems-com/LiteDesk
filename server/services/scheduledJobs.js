const cron = require('node-cron');
const { runDailyDigest, runWeeklyDigest } = require('./digestScheduler');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const ENABLE_DIGEST_SCHEDULER = process.env.ENABLE_DIGEST_SCHEDULER !== 'false'; // Default: enabled

let dailyDigestJob = null;
let weeklyDigestJob = null;

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
  if (!ENABLE_DIGEST_SCHEDULER) {
    console.log('[scheduledJobs] Digest scheduler disabled (ENABLE_DIGEST_SCHEDULER=false)');
    return;
  }

  console.log('[scheduledJobs] Starting notification digest scheduler...');

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

  console.log('[scheduledJobs] ✅ Digest scheduler started');
  console.log('[scheduledJobs]   - Daily digest: 9:00 AM every day');
  console.log('[scheduledJobs]   - Weekly digest: 9:00 AM every Monday');
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

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  triggerDailyDigest,
  triggerWeeklyDigest
};

