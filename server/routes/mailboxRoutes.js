const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const controller = require('../controllers/mailboxController');

/** Google OAuth redirect (no Bearer token). */
router.get('/inbox-sync/google/callback', controller.gmailOAuthCallback);

router.use(protect);
router.use(organizationIsolation);

router.get('/', controller.listMailboxes);
router.post('/', controller.createMailbox);
router.get('/:id/inbox-sync/google/start', controller.gmailInboxSyncGoogleStart);
router.get('/:id/inbox-sync/google/labels', controller.listGmailInboxSyncLabels);
router.patch('/:id/inbox-sync/google/sync-labels', controller.patchGmailInboxSyncSyncLabels);
router.post('/:id/inbox-sync/run', controller.gmailInboxSyncRun);
router.post('/:id/inbox-sync/google/disconnect', controller.gmailInboxSyncDisconnect);
router.post('/:id/outbound/gmail-smtp/connect', controller.connectMailboxGmailSmtpHandler);
router.post('/:id/outbound/gmail-smtp/disconnect', controller.disconnectMailboxGmailSmtpHandler);
router.get('/:id', controller.getMailbox);
router.patch('/:id', controller.updateMailbox);

module.exports = router;
