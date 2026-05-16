'use strict';

/**
 * Rule-based focus line for platform home (no LLM — fast, deterministic).
 */

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function buildFocusLine({ attention, shell, appPulses }) {
  const overdue = attention?.summary?.overdue ?? 0;
  const dueToday = attention?.summary?.dueToday ?? 0;
  const attentionTotal = attention?.total ?? 0;
  const approvals = shell?.approvalsPending ?? 0;
  const unreadMail = shell?.mail?.unread ?? 0;

  const dangerSignals = [];
  for (const pulse of appPulses || []) {
    for (const signal of pulse.signals || []) {
      if (signal.severity === 'danger' && signal.text !== 'No urgent items') {
        dangerSignals.push(signal.text);
      }
    }
  }

  if (overdue > 0) {
    const extra = dueToday > 0 ? ` and ${dueToday} due today` : '';
    return `Start with ${overdue} overdue item${overdue !== 1 ? 's' : ''}${extra} — clear those first.`;
  }

  if (dangerSignals.length > 0) {
    return `Priority: ${dangerSignals[0]}.`;
  }

  if (approvals > 0) {
    return `${approvals} approval${approvals !== 1 ? 's' : ''} waiting for you.`;
  }

  if (dueToday > 0) {
    return `You have ${dueToday} item${dueToday !== 1 ? 's' : ''} due today.`;
  }

  if (unreadMail > 0) {
    return `${unreadMail} unread email thread${unreadMail !== 1 ? 's' : ''} in your inbox.`;
  }

  if (attentionTotal > 0) {
    return `${attentionTotal} thing${attentionTotal !== 1 ? 's' : ''} need your attention across your apps.`;
  }

  const hasOnlyClearPulses = (appPulses || []).length > 0 &&
    (appPulses || []).every((p) =>
      (p.signals || []).every((s) => s.text === 'No urgent items' || s.severity === 'info')
    );

  if (hasOnlyClearPulses) {
    return "You're all caught up. Pick an app below or review what's new.";
  }

  return 'Your workspace is quiet. Open an app to get started.';
}

function buildGreetingPayload(user) {
  const firstName = (user?.firstName || '').trim();
  return {
    firstName,
    timeOfDay: getTimeOfDay()
  };
}

module.exports = {
  buildFocusLine,
  buildGreetingPayload,
  getTimeOfDay
};
