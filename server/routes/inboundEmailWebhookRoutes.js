/**
 * ============================================================================
 * Email Webhook Routes (Phase 2 + Phase 4)
 * ============================================================================
 *
 * POST /api/webhooks/email/inbound
 * - No auth middleware (webhook uses token-in-address verification)
 * - Accepts raw MIME (Content-Type: message/rfc822) or JSON { rawMime: "<base64>" }
 *
 * POST /api/webhooks/email/ses-events
 * - No auth middleware (SNS posts from AWS)
 * - Accepts SNS Notification (SES delivery/bounce/complaint)
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const inboundController = require('../controllers/inboundEmailController');
const sesWebhookController = require('../controllers/sesWebhookController');

// For message/rfc822: parse raw body. For application/json: body already parsed by app-level middleware
const rawParser = express.raw({ type: ['message/rfc822', 'text/plain'], limit: '10mb' });

router.post('/inbound', (req, res, next) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('message/rfc822') || ct.includes('text/plain')) {
    return rawParser(req, res, (err) => (err ? next(err) : next()));
  }
  next();
}, inboundController.handleInbound);

router.post('/ses-events', sesWebhookController.handleSesEvents);

module.exports = router;
