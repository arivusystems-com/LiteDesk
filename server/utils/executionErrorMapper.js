/**
 * ============================================================================
 * Phase 1F: Centralized Execution Error Mapper
 * ============================================================================
 * 
 * Maps all execution errors to normalized format:
 * {
 *   code,
 *   message,
 *   severity,
 *   retryable
 * }
 * 
 * Integrates with:
 * - Execution controller
 * - Execution feedback metadata (Phase 0K)
 * 
 * ============================================================================
 */

const { resolveExecutionFeedback } = require('./executionFeedbackResolver');

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Map error to normalized format
 * @param {Error|Object} error - Error object or error-like object
 * @param {Object} context - Execution context (capabilityKey, domain, etc.)
 * @returns {Object} Normalized error object
 */
function mapExecutionError(error, context = {}) {
  // Handle null/undefined
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return mapErrorObject(error, context);
  }

  // Handle error-like objects with code/message
  if (error.code || error.message) {
    return mapErrorLikeObject(error, context);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: 'EXECUTION_ERROR',
      message: error,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false
    };
  }

  // Fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    severity: ERROR_SEVERITY.MEDIUM,
    retryable: false
  };
}

/**
 * Map Error object
 */
function mapErrorObject(error, context) {
  const errorName = error.name || '';
  const errorMessage = error.message || 'An error occurred';

  // Database errors
  if (errorName === 'MongoError' || errorName === 'MongoServerError') {
    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      originalError: errorMessage
    };
  }

  // Validation errors
  if (errorName === 'ValidationError' || error.name === 'CastError') {
    return {
      code: 'VALIDATION_ERROR',
      message: errorMessage,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false
    };
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('access denied') || errorMessage.includes('not allowed')) {
    return {
      code: 'PERMISSION_ERROR',
      message: errorMessage,
      severity: ERROR_SEVERITY.HIGH,
      retryable: false
    };
  }

  // Entitlement errors (check if error has entitlement feedback)
  if (error.entitlementResult || error.feedback) {
    const feedback = error.feedback || resolveExecutionFeedback(error.entitlementResult);
    return {
      code: feedback.code || 'ENTITLEMENT_ERROR',
      message: feedback.message || errorMessage,
      severity: mapSeverityFromFeedback(feedback.severity),
      retryable: false
    };
  }

  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network operation failed',
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      originalError: errorMessage
    };
  }

  // Default Error object
  return {
    code: 'EXECUTION_ERROR',
    message: errorMessage,
    severity: ERROR_SEVERITY.MEDIUM,
    retryable: false
  };
}

/**
 * Map error-like object (with code/message)
 */
function mapErrorLikeObject(error, context) {
  const code = error.code || 'EXECUTION_ERROR';
  const message = error.message || 'An error occurred';

  // Check if it's an entitlement error
  if (error.entitlementResult || error.feedback) {
    const feedback = error.feedback || resolveExecutionFeedback(error.entitlementResult);
    return {
      code: feedback.code || code,
      message: feedback.message || message,
      severity: mapSeverityFromFeedback(feedback.severity),
      retryable: false
    };
  }

  // Map common error codes
  const codeMappings = {
    'VALIDATION_ERROR': {
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false
    },
    'PERMISSION_ERROR': {
      severity: ERROR_SEVERITY.HIGH,
      retryable: false
    },
    'NOT_FOUND': {
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false
    },
    'DATABASE_ERROR': {
      severity: ERROR_SEVERITY.HIGH,
      retryable: true
    },
    'NETWORK_ERROR': {
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true
    },
    'TIMEOUT': {
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true
    }
  };

  const mapping = codeMappings[code] || {
    severity: ERROR_SEVERITY.MEDIUM,
    retryable: false
  };

  return {
    code,
    message,
    severity: mapping.severity,
    retryable: mapping.retryable
  };
}

/**
 * Map feedback severity to error severity
 */
function mapSeverityFromFeedback(feedbackSeverity) {
  const severityMap = {
    'NONE': ERROR_SEVERITY.LOW,
    'INFO': ERROR_SEVERITY.LOW,
    'WARNING': ERROR_SEVERITY.MEDIUM,
    'ERROR': ERROR_SEVERITY.HIGH
  };
  return severityMap[feedbackSeverity] || ERROR_SEVERITY.MEDIUM;
}

module.exports = {
  mapExecutionError,
  ERROR_SEVERITY
};

