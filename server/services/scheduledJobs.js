const cron = require('node-cron');
const { runDailyDigest, runWeeklyDigest } = require('./digestScheduler');
const { tick: escalationTick } = require('./escalationResolver');
const { purgeExpiredRetention } = require('./deletionService');
const { processDueAssignmentJobs } = require('./assignmentSchedulingService');
const { tickHelpdeskSlaNotifications } = require('./helpdeskSlaMonitorService');
const { tickScheduledGmailInboxSync } = require('./gmailInboxSyncSchedulerService');
const { tickSnoozeWakeNotifications } = require('./snoozeWakeNotificationSchedulerService');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const ENABLE_DIGEST_SCHEDULER = process.env.ENABLE_DIGEST_SCHEDULER !== 'false'; // Default: enabled
const ENABLE_ESCALATION_SCHEDULER = process.env.ENABLE_ESCALATION_SCHEDULER !== 'false'; // Default: enabled (Phase 3)
const ENABLE_TRASH_RETENTION_SCHEDULER = process.env.ENABLE_TRASH_RETENTION_SCHEDULER !== 'false'; // Default: enabled
const ENABLE_ASSIGNMENT_SCHEDULER = process.env.ENABLE_ASSIGNMENT_SCHEDULER !== 'false'; // Default: enabled (Helpdesk Step 7C)
const ENABLE_HELPDESK_SLA_SCHEDULER = process.env.ENABLE_HELPDESK_SLA_SCHEDULER !== 'false'; // Default: enabled (Step 9)
const ENABLE_GMAIL_INBOX_SYNC_SCHEDULER = process.env.ENABLE_GMAIL_INBOX_SYNC_SCHEDULER !== 'false'; // Default: enabled (Phase 5)
const ENABLE_SNOOZE_WAKE_NOTIFICATION_SCHEDULER =
  process.env.ENABLE_SNOOZE_WAKE_NOTIFICATION_SCHEDULER !== 'false'; // Default: enabled (Phase 6)

let dailyDigestJob = null;
let weeklyDigestJob = null;
let escalationJob = null;
let trashRetentionJob = null;
let assignmentJob = null;
let helpdeskSlaJob = null;
let gmailInboxSyncJob = null;
let snoozeWakeNotificationJob = null;

/**
 * Initialize and start scheduled jobs (node-cron).
 *
 * Master switch on the API process: set ENABLE_SCHEDULED_JOBS=false to skip
 * starting this module entirely (see server.js).
 *
 * Per-job toggles include ENABLE_DIGEST_SCHEDULER, ENABLE_ESCALATION_SCHEDULER,
 * ENABLE_GMAIL_INBOX_SYNC_SCHEDULER, etc.
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

  // Assignment scheduler (Helpdesk): execute delayed/scheduled assignment jobs
  if (ENABLE_ASSIGNMENT_SCHEDULER) {
    assignmentJob = cron.schedule('* * * * *', async () => {
      try {
        const result = await processDueAssignmentJobs();
        if (result.processed > 0 || NOTIFICATION_DEBUG) {
          const parts = [
            `processed=${result.processed}`,
            `completed=${result.completed}`,
            `failed=${result.failed}`,
            `skipped=${result.skipped}`
          ];
          if (result.skipped > 0 && result.skipReasons && Object.keys(result.skipReasons).length > 0) {
            parts.push(`skipReasons=${JSON.stringify(result.skipReasons)}`);
          }
          console.log(`[scheduledJobs] Assignment tick: ${parts.join(' ')}`);
          if (result.failed > 0) {
            console.warn('[scheduledJobs] Assignment tick completed with failures (see job rows for lastError)');
          }
        }
      } catch (err) {
        console.error('[scheduledJobs] Assignment tick failed:', err.message);
      }
    }, { scheduled: true, timezone: process.env.DIGEST_TIMEZONE || 'UTC' });
    console.log('[scheduledJobs]   - Assignment scheduler: every minute');
  } else {
    console.log('[scheduledJobs] Assignment scheduler disabled (ENABLE_ASSIGNMENT_SCHEDULER=false)');
  }

  if (ENABLE_HELPDESK_SLA_SCHEDULER) {
    helpdeskSlaJob = cron.schedule('* * * * *', async () => {
      try {
        const result = await tickHelpdeskSlaNotifications();
        if (result.warningSent > 0 || result.breachSent > 0 || NOTIFICATION_DEBUG) {
          console.log(
            `[scheduledJobs] Helpdesk SLA tick: processed=${result.processed} warningSent=${result.warningSent} breachSent=${result.breachSent}`
          );
        }
      } catch (err) {
        console.error('[scheduledJobs] Helpdesk SLA tick failed:', err.message);
      }
    }, { scheduled: true, timezone: process.env.DIGEST_TIMEZONE || 'UTC' });
    console.log('[scheduledJobs]   - Helpdesk SLA monitor: every minute');
  } else {
    console.log('[scheduledJobs] Helpdesk SLA scheduler disabled (ENABLE_HELPDESK_SLA_SCHEDULER=false)');
  }

  // Gmail personal inbox sync (Phase 5): poll Gmail API on an interval across tenant DBs
  if (ENABLE_GMAIL_INBOX_SYNC_SCHEDULER) {
    const gmailCron = String(process.env.GMAIL_INBOX_SYNC_CRON || '*/5 * * * *').trim();
    const tickGmail = async () => {
      const startTime = new Date();
      try {
        await tickScheduledGmailInboxSync();
      } catch (err) {
        console.error('[scheduledJobs] Gmail inbox sync tick failed:', err.message);
      }
      if (NOTIFICATION_DEBUG) {
        console.log(`[scheduledJobs] Gmail inbox sync tick finished in ${Date.now() - startTime.getTime()}ms`);
      }
    };
    try {
      if (!cron.validate(gmailCron)) {
        console.error(
          `[scheduledJobs] Invalid GMAIL_INBOX_SYNC_CRON="${gmailCron}" — Gmail inbox scheduler not started`
        );
      } else {
        gmailInboxSyncJob = cron.schedule(gmailCron, tickGmail, {
          scheduled: true,
          timezone: process.env.DIGEST_TIMEZONE || 'UTC'
        });
        console.log(`[scheduledJobs]   - Gmail inbox sync: cron "${gmailCron}"`);
      }
    } catch (err) {
      console.error('[scheduledJobs] Gmail inbox sync scheduler failed to start:', err.message);
    }
  } else {
    console.log('[scheduledJobs] Gmail inbox sync scheduler disabled (ENABLE_GMAIL_INBOX_SYNC_SCHEDULER=false)');
  }

  if (ENABLE_SNOOZE_WAKE_NOTIFICATION_SCHEDULER) {
    snoozeWakeNotificationJob = cron.schedule('* * * * *', async () => {
      try {
        await tickSnoozeWakeNotifications();
      } catch (err) {
        console.error('[scheduledJobs] Snooze wake notification tick failed:', err.message);
      }
    }, { scheduled: true, timezone: process.env.DIGEST_TIMEZONE || 'UTC' });
    console.log('[scheduledJobs]   - Snooze wake notifications: every minute');
  } else {
    console.log(
      '[scheduledJobs] Snooze wake notification scheduler disabled (ENABLE_SNOOZE_WAKE_NOTIFICATION_SCHEDULER=false)'
    );
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

  if (assignmentJob) {
    assignmentJob.stop();
    assignmentJob = null;
    console.log('[scheduledJobs] Assignment scheduler job stopped');
  }

  if (helpdeskSlaJob) {
    helpdeskSlaJob.stop();
    helpdeskSlaJob = null;
    console.log('[scheduledJobs] Helpdesk SLA scheduler job stopped');
  }

  if (gmailInboxSyncJob) {
    gmailInboxSyncJob.stop();
    gmailInboxSyncJob = null;
    console.log('[scheduledJobs] Gmail inbox sync job stopped');
  }

  if (snoozeWakeNotificationJob) {
    snoozeWakeNotificationJob.stop();
    snoozeWakeNotificationJob = null;
    console.log('[scheduledJobs] Snooze wake notification job stopped');
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

async function triggerGmailInboxSyncTick() {
  console.log('[scheduledJobs] Manually triggering Gmail inbox sync tick...');
  return tickScheduledGmailInboxSync();
}

async function triggerSnoozeWakeNotificationsTick() {
  console.log('[scheduledJobs] Manually triggering snooze wake notification tick...');
  return tickSnoozeWakeNotifications();
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  triggerDailyDigest,
  triggerWeeklyDigest,
  triggerTrashRetention,
  triggerGmailInboxSyncTick,
  triggerSnoozeWakeNotificationsTick
};

