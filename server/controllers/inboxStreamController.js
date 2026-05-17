'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const inboxSSEHub = require('../services/inboxSSEHub');

async function validateTokenFromQuery(req) {
  let token = req.query.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user?.organizationId) return null;
    if (user.status && user.status !== 'active') return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * GET /api/communications/inbox/stream?token=<jwt>
 * SSE for workspace inbox list refresh (R3).
 */
exports.streamInbox = async (req, res) => {
  const user = await validateTokenFromQuery(req);
  if (!user?._id || !user.organizationId) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

  const connectionId = inboxSSEHub.subscribe(res, user._id, user.organizationId);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    inboxSSEHub.unsubscribe(connectionId);
  });

  req.on('error', () => {
    clearInterval(keepAlive);
    inboxSSEHub.unsubscribe(connectionId);
  });
};
