/**
 * Shared formatters for Attention / InboxItem UI.
 * @see docs/architecture/inbox-aggregation.md
 */

export function formatAttentionDueTime(dueAt, isOverdue) {
  if (isOverdue) {
    return 'overdue';
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffHours < 0) {
    const absHours = Math.abs(diffHours);
    return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
  }

  return 'soon';
}

export function getEventAttentionType(item) {
  if (item?.kind === 'event' && 'eventAttentionType' in item) {
    return item.eventAttentionType;
  }
  return null;
}

export function getEventAttentionBadgeLabel(attentionType) {
  if (!attentionType) return 'Action Required';
  const labels = {
    start: 'Starting Soon',
    review: 'Needs Review',
    corrective: 'Corrective Actions',
    approval: 'Approval Required'
  };
  return labels[attentionType] || 'Action Required';
}

export function getEventAttentionBadgeVariant(attentionType) {
  if (!attentionType) return 'default';
  const variants = {
    start: 'info',
    review: 'warning',
    corrective: 'danger',
    approval: 'primary'
  };
  return variants[attentionType] || 'default';
}

/** Summarize attention items for home hero chips. */
export function summarizeAttentionItems(items) {
  const list = Array.isArray(items) ? items : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let overdue = 0;
  let dueToday = 0;

  for (const item of list) {
    if (item.isOverdue) {
      overdue += 1;
      continue;
    }
    if (!item.dueAt) continue;
    const due = new Date(item.dueAt);
    if (due >= today && due < tomorrow) {
      dueToday += 1;
    }
  }

  return {
    total: list.length,
    overdue,
    dueToday
  };
}
