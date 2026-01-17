/**
 * ============================================================================
 * Phase 1E + 1F: Execution Controller
 * ============================================================================
 * 
 * Generic execution controller that routes capability actions to appropriate handlers.
 * 
 * Phase 1F Enhancements:
 * - Centralized execution logging
 * - Idempotency protection
 * - Safer error handling
 * - Safety guardrails (AUDIT/PORTAL app restrictions, instance status)
 * 
 * Endpoint: POST /api/execution/execute
 * 
 * Request Body:
 * {
 *   capabilityKey: "RESPONSE_APPROVE",
 *   recordId: "response_id",
 *   params: { ... }, // Optional action-specific parameters
 *   idempotencyKey: "optional-key" // Optional idempotency key
 * }
 * 
 * ============================================================================
 */

const { getAllExecutionCapabilities } = require('../constants/executionCapabilities');
const { APP_KEYS } = require('../constants/appKeys');
const FormResponse = require('../models/FormResponse');
const Event = require('../models/Event');
const ExecutionLog = require('../models/ExecutionLog');
const { checkIdempotency, storeIdempotencyResult } = require('../utils/idempotencyGuard');
const { mapExecutionError } = require('../utils/executionErrorMapper');
const Organization = require('../models/Organization');

/**
 * Get capability metadata
 */
function getCapability(capabilityKey) {
  const allCapabilities = getAllExecutionCapabilities();
  return allCapabilities[capabilityKey] || null;
}

/**
 * @route   POST /api/execution/execute
 * @desc    Execute a capability action
 * @access  Private
 */
exports.execute = async (req, res) => {
  const startTime = Date.now();
  let executionId = null;
  let executionLog = null;

  try {
    const { capabilityKey, recordId, params = {}, idempotencyKey } = req.body;
    const appKey = req.appKey || APP_KEYS.SALES;
    const userId = req.user._id;
    const organizationId = req.user.organizationId;

    // Phase 1F: Safety Guardrail #1 - No execution in Audit App
    if (appKey === APP_KEYS.AUDIT) {
      const error = {
        code: 'EXECUTION_NOT_ALLOWED',
        message: 'Execution is not allowed in Audit App. Audit App is read-only.',
        severity: 'HIGH',
        retryable: false
      };
      return await handleExecutionError(req, res, error, {
        capabilityKey,
        recordId,
        domain: null,
        startTime,
        executionId: null
      });
    }

    // Phase 1F: Safety Guardrail #2 - No execution in Portal App
    if (appKey === APP_KEYS.PORTAL) {
      const error = {
        code: 'EXECUTION_NOT_ALLOWED',
        message: 'Execution is not allowed in Portal App. Portal App is read-only.',
        severity: 'HIGH',
        retryable: false
      };
      return await handleExecutionError(req, res, error, {
        capabilityKey,
        recordId,
        domain: null,
        startTime,
        executionId: null
      });
    }

    // Phase 1F: Safety Guardrail #3 - Check instance status
    const organization = await Organization.findById(organizationId);
    if (organization) {
      const subscriptionStatus = organization.subscription?.status;
      if (subscriptionStatus === 'suspended' || subscriptionStatus === 'terminated' || subscriptionStatus === 'cancelled') {
        const error = {
          code: 'INSTANCE_BLOCKED',
          message: `Execution is not allowed. Instance status: ${subscriptionStatus}`,
          severity: 'HIGH',
          retryable: false
        };
        return await handleExecutionError(req, res, error, {
          capabilityKey,
          recordId,
          domain: null,
          startTime,
          executionId: null
        });
      }
    }

    // Validation
    if (!capabilityKey || !recordId) {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'capabilityKey and recordId are required',
        severity: 'MEDIUM',
        retryable: false
      };
      return await handleExecutionError(req, res, error, {
        capabilityKey,
        recordId,
        domain: null,
        startTime,
        executionId: null
      });
    }

    // Get capability metadata
    const capability = getCapability(capabilityKey);
    if (!capability) {
      const error = {
        code: 'CAPABILITY_NOT_FOUND',
        message: `Capability '${capabilityKey}' not found`,
        severity: 'MEDIUM',
        retryable: false
      };
      return await handleExecutionError(req, res, error, {
        capabilityKey,
        recordId,
        domain: null,
        startTime,
        executionId: null
      });
    }

    const domain = capability.domain;

    // Phase 1F: Idempotency check (always check, auto-generate key if not provided)
    const idempotencyCheck = await checkIdempotency(
      idempotencyKey || null, // Use provided key or null (will auto-generate in hash)
      userId.toString(),
      organizationId.toString(),
      capabilityKey,
      recordId.toString()
    );

    if (idempotencyCheck.isDuplicate) {
      // Return the existing result (safe duplicate execution)
      console.log(`[executionController] Duplicate execution detected: ${capabilityKey} on ${recordId}`);
      return res.status(200).json({
        success: true,
        message: 'This action was already executed',
        data: idempotencyCheck.existingResult?.data || null,
        duplicate: true
      });
    }

    // Route based on domain
    let executionResult;
    try {
      switch (domain) {
        case 'RESPONSE':
          executionResult = await executeResponseAction(capability, recordId, params, req);
          break;
        
        case 'EVENT':
          executionResult = await executeEventAction(capability, recordId, params, req);
          break;
        
        default:
          const error = {
            code: 'DOMAIN_NOT_SUPPORTED',
            message: `Execution domain '${domain}' not supported`,
            severity: 'MEDIUM',
            retryable: false
          };
          return await handleExecutionError(req, res, error, {
            capabilityKey,
            recordId,
            domain,
            startTime,
            executionId: null
          });
      }

      // Phase 1F: Store idempotency result
      const responseData = {
        success: executionResult.success,
        message: executionResult.message,
        data: executionResult.data
      };
      
      // Always store idempotency result (key auto-generated if not provided)
      await storeIdempotencyResult(
        idempotencyKey || null,
        userId.toString(),
        organizationId.toString(),
        capabilityKey,
        recordId.toString(),
        responseData
      );

      // Phase 1F: Log successful execution
      const durationMs = Date.now() - startTime;
      const finalExecutionId = require('uuid').v4();
      await logExecution({
        executionId: finalExecutionId,
        capabilityKey,
        domain,
        recordId,
        appKey,
        organizationId,
        userId,
        status: 'SUCCESS',
        errorCode: null,
        errorMessage: null,
        executedAt: new Date(startTime),
        durationMs,
        idempotencyKey: idempotencyKey || null,
        metadata: { params }
      });

      // Return success response
      return res.status(executionResult.statusCode || 200).json(responseData);
    } catch (actionError) {
      // Action handler threw an error
      const mappedError = mapExecutionError(actionError, {
        capabilityKey,
        domain
      });
      return await handleExecutionError(req, res, mappedError, {
        capabilityKey,
        recordId,
        domain,
        startTime,
        executionId: null
      });
    }
  } catch (error) {
    console.error('[executionController] Error:', error);
    
    // Phase 1F: Map error and log
    const mappedError = mapExecutionError(error, {
      capabilityKey: req.body?.capabilityKey,
      domain: null
    });

    return await handleExecutionError(req, res, mappedError, {
      capabilityKey: req.body?.capabilityKey,
      recordId: req.body?.recordId,
      domain: null,
      startTime,
      executionId
    });
  }
};

/**
 * Execute Response domain actions
 * Returns data instead of sending response directly
 */
async function executeResponseAction(capability, recordId, params, req) {
  const action = capability.action;
  
  // Find response
  const response = await FormResponse.findOne({
    _id: recordId,
    organizationId: req.user.organizationId
  });

  if (!response) {
    throw {
      code: 'NOT_FOUND',
      message: 'Response not found',
      severity: 'MEDIUM',
      retryable: false
    };
  }

  switch (action) {
    case 'APPROVE':
      return await approveResponse(response, req);
    
    case 'REJECT':
      return await rejectResponse(response, params.reason, req);
    
    case 'CLOSE':
      return await closeResponse(response, req);
    
    default:
      throw {
        code: 'ACTION_NOT_IMPLEMENTED',
        message: `Response action '${action}' not implemented`,
        severity: 'MEDIUM',
        retryable: false
      };
  }
}

/**
 * Execute Event domain actions
 * Returns data instead of sending response directly
 */
async function executeEventAction(capability, recordId, params, req) {
  const action = capability.action;
  
  // Import event controller
  const eventController = require('./eventController');
  
  // Create proxy req/res objects for event controller methods
  const proxyReq = {
    ...req,
    params: { id: recordId },
    body: params
  };
  
  let proxyResData = null;
  let proxyResStatus = 200;
  const proxyRes = {
    status: (code) => {
      proxyResStatus = code;
      return proxyRes;
    },
    json: (data) => {
      proxyResData = data;
      return proxyRes;
    }
  };

  try {
    switch (action) {
      case 'CHECK_IN':
        await eventController.checkIn(proxyReq, proxyRes);
        break;
      
      case 'SUBMIT':
        await eventController.submitAudit(proxyReq, proxyRes);
        break;
      
      case 'APPROVE':
        await eventController.approveAudit(proxyReq, proxyRes);
        break;
      
      case 'REJECT':
        await eventController.rejectAudit(proxyReq, proxyRes);
        break;
      
      default:
        throw {
          code: 'ACTION_NOT_IMPLEMENTED',
          message: `Event action '${action}' not implemented`,
          severity: 'MEDIUM',
          retryable: false
        };
    }

    // Return the proxied response data
    if (!proxyResData || !proxyResData.success) {
      throw {
        code: 'EXECUTION_ERROR',
        message: proxyResData?.message || 'Event action failed',
        severity: 'MEDIUM',
        retryable: false
      };
    }

    return {
      success: proxyResData.success,
      message: proxyResData.message,
      data: proxyResData.data,
      statusCode: proxyResStatus
    };
  } catch (error) {
    console.error('[executionController] Event action error:', error);
    
    // If it's already a mapped error, re-throw it
    if (error.code) {
      throw error;
    }
    
    // Otherwise, map it
    throw {
      code: 'EXECUTION_ERROR',
      message: error.message || 'Event action failed',
      severity: 'MEDIUM',
      retryable: false
    };
  }
}

/**
 * Approve response
 * Returns data instead of sending response directly
 */
async function approveResponse(response, req) {
  // Validate current state
  if (response.executionStatus !== 'Submitted') {
    throw {
      code: 'VALIDATION_ERROR',
      message: `Response must be in 'Submitted' state. Current state: ${response.executionStatus}`,
      severity: 'MEDIUM',
      retryable: false
    };
  }

  if (response.reviewStatus === 'Approved') {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Response is already approved',
      severity: 'MEDIUM',
      retryable: false
    };
  }

  // Update approval fields
  response.approved = true;
  response.approvedBy = req.user._id;
  response.approvedAt = new Date();
  response.reviewedBy = req.user._id;
  // reviewStatus will be computed automatically by pre-save hook, but we can set it explicitly
  response.reviewStatus = 'Approved';
  
  await response.save();

  return {
    success: true,
    message: 'Response approved successfully',
    data: response,
    statusCode: 200
  };
}

/**
 * Reject response
 * Returns data instead of sending response directly
 */
async function rejectResponse(response, reason, req) {
  // Validate current state
  if (response.executionStatus !== 'Submitted') {
    throw {
      code: 'VALIDATION_ERROR',
      message: `Response must be in 'Submitted' state. Current state: ${response.executionStatus}`,
      severity: 'MEDIUM',
      retryable: false
    };
  }

  // Update review status
  response.reviewStatus = 'Rejected';
  response.reviewedBy = req.user._id;
  response.approved = false;
  
  await response.save();

  return {
    success: true,
    message: reason ? `Response rejected: ${reason}` : 'Response rejected successfully',
    data: response,
    statusCode: 200
  };
}

/**
 * Close response
 * Returns data instead of sending response directly
 */
async function closeResponse(response, req) {
  // Validate current state
  if (response.reviewStatus !== 'Approved') {
    throw {
      code: 'VALIDATION_ERROR',
      message: `Response must be approved before closing. Current review status: ${response.reviewStatus}`,
      severity: 'MEDIUM',
      retryable: false
    };
  }

  // Update review status
  response.reviewStatus = 'Closed';
  
  await response.save();

  return {
    success: true,
    message: 'Response closed successfully',
    data: response,
    statusCode: 200
  };
}

/**
 * Phase 1F: Handle execution error with logging
 */
async function handleExecutionError(req, res, error, context) {
  const { capabilityKey, recordId, domain, startTime, executionId } = context;
  const appKey = req.appKey || APP_KEYS.SALES;
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;
  const durationMs = Date.now() - startTime;

  // Log failed execution
  try {
    await logExecution({
      executionId: executionId || require('uuid').v4(),
      capabilityKey: capabilityKey || 'UNKNOWN',
      domain: domain || 'UNKNOWN',
      recordId: recordId || null,
      appKey,
      organizationId: organizationId || null,
      userId: userId || null,
      status: 'FAILED',
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.message || 'Execution failed',
      executedAt: new Date(startTime),
      durationMs,
      idempotencyKey: req.body?.idempotencyKey || null,
      metadata: { error: error }
    });
  } catch (logError) {
    console.error('[executionController] Error logging execution failure:', logError);
    // Continue - logging should never block error response
  }

  // Return error response with mapped error
  const statusCode = error.code === 'PERMISSION_ERROR' || error.code === 'EXECUTION_NOT_ALLOWED' ? 403 :
                     error.code === 'VALIDATION_ERROR' || error.code === 'CAPABILITY_NOT_FOUND' ? 400 :
                     error.code === 'NOT_FOUND' ? 404 : 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Execution failed',
    error: {
      code: error.code,
      severity: error.severity,
      retryable: error.retryable
    },
    feedback: error.feedback || null // Phase 0K integration
  });
}

/**
 * Phase 1F: Log execution attempt (append-only, never blocks)
 */
async function logExecution(logData) {
  try {
    const log = new ExecutionLog(logData);
    await log.save();
  } catch (error) {
    // Logging should never block execution
    console.error('[executionController] Failed to log execution:', error);
  }
}

