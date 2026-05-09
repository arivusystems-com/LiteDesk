const SUPPORTED_MODULES = new Set(['people', 'organizations', 'deals', 'tasks', 'cases']);

function normalizeAddressList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  const asString = String(value).trim();
  return asString ? [asString] : [];
}

function normalizeSendEmailPayload(payload = {}) {
  const normalized = {
    relatedTo: payload.relatedTo || {},
    to: normalizeAddressList(payload.to),
    cc: normalizeAddressList(payload.cc),
    bcc: normalizeAddressList(payload.bcc),
    subject: typeof payload.subject === 'string' ? payload.subject.trim() : '',
    body: typeof payload.body === 'string' ? payload.body : '',
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    parentCommunicationId: payload.parentCommunicationId || null
  };

  const errors = [];
  if (!normalized.relatedTo.moduleKey || !normalized.relatedTo.recordId) {
    errors.push('relatedTo.moduleKey and relatedTo.recordId are required');
  }

  if (normalized.to.length === 0) {
    errors.push('At least one recipient (to) is required');
  }

  if (!normalized.subject) {
    errors.push('Subject is required');
  }

  if (
    normalized.relatedTo.moduleKey &&
    !SUPPORTED_MODULES.has(normalized.relatedTo.moduleKey)
  ) {
    errors.push('Unsupported moduleKey. Supported: people, organizations, deals, tasks, cases');
  }

  return {
    ok: errors.length === 0,
    errors,
    value: normalized
  };
}

module.exports = {
  SUPPORTED_MODULES,
  normalizeSendEmailPayload
};
