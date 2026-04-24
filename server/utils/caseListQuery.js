function parsePositiveInt(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  const normalized = Math.floor(parsed);
  return typeof max === 'number' ? Math.min(normalized, max) : normalized;
}

function parseCaseListQuery(query, { CASE_STATUSES, CASE_PRIORITIES, CASE_TYPES, CASE_CHANNELS }) {
  const filters = {};
  const errors = [];

  if (query.status != null && query.status !== '') {
    if (!CASE_STATUSES.includes(query.status)) {
      errors.push('Invalid status filter');
    } else {
      filters.status = query.status;
    }
  }

  if (query.priority != null && query.priority !== '') {
    if (!CASE_PRIORITIES.includes(query.priority)) {
      errors.push('Invalid priority filter');
    } else {
      filters.priority = query.priority;
    }
  }

  if (query.caseType != null && query.caseType !== '') {
    if (!CASE_TYPES.includes(query.caseType)) {
      errors.push('Invalid caseType filter');
    } else {
      filters.caseType = query.caseType;
    }
  }

  if (query.channel != null && query.channel !== '') {
    if (!CASE_CHANNELS.includes(query.channel)) {
      errors.push('Invalid channel filter');
    } else {
      filters.channel = query.channel;
    }
  }

  if (query.caseOwnerId != null && query.caseOwnerId !== '') {
    filters.caseOwnerId = query.caseOwnerId;
  }

  const allowedSortBy = new Set(['updatedAt', 'createdAt', 'priority', 'status']);
  const sortBy = allowedSortBy.has(query.sortBy) ? query.sortBy : 'updatedAt';
  const sortDir = String(query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  return {
    errors,
    filters,
    limit: Math.max(1, parsePositiveInt(query.limit, 50, 200)),
    skip: parsePositiveInt(query.skip, 0, 100000),
    sort: { [sortBy]: sortDir }
  };
}

module.exports = {
  parseCaseListQuery
};
