/**
 * ============================================================================
 * AUDIT APP: Audit Execution Controller (Proxy Layer)
 * ============================================================================
 * 
 * Purpose:
 * - Proxies execution commands from Audit App to CRM
 * - Enables auditors to execute audits without CRM access
 * - Maintains strict ownership-based authorization
 * - Updates AuditExecutionContext for UX tracking
 * 
 * Core Principle:
 * - CRM remains single execution engine
 * - This controller is a thin proxy layer
 * - No logic duplication
 * - No workflow state management
 * 
 * Authorization:
 * - Ownership-based: eventOwnerId === req.user._id
 * - No CRM permissions required
 * - No role-based checks
 * 
 * See AUDIT_EXECUTION_GATEWAY.md for architecture details.
 * ============================================================================
 */

const Event = require('../models/Event');
const AuditAssignment = require('../models/AuditAssignment');
const AuditExecutionContext = require('../models/AuditExecutionContext');
const FormResponse = require('../models/FormResponse');

// Import CRM controller functions
const crmEventController = require('./eventController');

/**
 * Helper: Validate event ownership (MANDATORY for all execution endpoints)
 */
async function validateEventOwnership(eventId, userId, organizationId) {
    const query = { organizationId };
    if (eventId.match(/^[0-9a-f]{24}$/i)) {
        query._id = eventId;
    } else {
        query.eventId = eventId;
    }
    
    const event = await Event.findOne(query);
    
    if (!event) {
        return {
            valid: false,
            error: {
                status: 404,
                message: 'Event not found.'
            }
        };
    }
    
    // Validate event type is audit type
    const auditEventTypes = ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'];
    if (!auditEventTypes.includes(event.eventType)) {
        return {
            valid: false,
            error: {
                status: 400,
                message: 'This event type does not support audit execution.'
            }
        };
    }
    
    // Ownership validation (MANDATORY)
    if (event.eventOwnerId.toString() !== userId.toString()) {
        return {
            valid: false,
            error: {
                status: 403,
                message: 'Only the event owner (auditor) can execute this audit.'
            }
        };
    }
    
    return {
        valid: true,
        event
    };
}

/**
 * Helper: Get or create AuditExecutionContext
 */
async function getOrCreateExecutionContext(eventId, auditAssignmentId, userId, organizationId) {
    let context = await AuditExecutionContext.findOne({
        eventId,
        executedBy: userId,
        executionStatus: { $in: ['idle', 'in_progress'] }
    });
    
    if (!context) {
        // Find or create assignment if needed
        let assignment = await AuditAssignment.findOne({ eventId });
        if (!assignment) {
            // Create assignment if it doesn't exist (sync issue)
            const event = await Event.findById(eventId);
            if (event) {
                assignment = await AuditAssignment.create({
                    auditorId: event.eventOwnerId,
                    organizationId: event.organizationId,
                    eventId: event._id,
                    auditType: event.eventType,
                    auditState: event.auditState,
                    scheduledAt: event.startDateTime,
                    dueAt: event.endDateTime,
                    status: 'active'
                });
            }
        }
        
        context = await AuditExecutionContext.create({
            organizationId,
            auditAssignmentId: assignment?._id || auditAssignmentId,
            eventId,
            executedBy: userId,
            executionStatus: 'idle'
        });
    }
    
    return context;
}

/**
 * @route   POST /audit/execute/:eventId/check-in
 * @desc    Check in to audit event (proxies to CRM)
 * @access  Private (Audit App only)
 */
exports.checkInAudit = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { location } = req.body; // { latitude, longitude, accuracy }
        
        // Defensive logging (non-blocking, for audit trails and debugging)
        console.info('[AuditExecute]', {
            action: 'CHECK_IN',
            eventId,
            auditorId: req.user._id,
            app: req.appKey || 'AUDIT',
            timestamp: new Date().toISOString()
        });
        
        // Validate ownership
        const ownershipCheck = await validateEventOwnership(
            eventId,
            req.user._id,
            req.user.organizationId
        );
        
        if (!ownershipCheck.valid) {
            return res.status(ownershipCheck.error.status).json({
                success: false,
                message: ownershipCheck.error.message
            });
        }
        
        const event = ownershipCheck.event;
        
        // Validate location is provided
        if (!location || !location.latitude || !location.longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location is required for check-in'
            });
        }
        
        // Create a proxy request object for CRM controller
        // Use event._id or eventId (CRM handles both)
        const proxyReq = {
            ...req,
            params: { id: event._id.toString() },
            body: { location }
        };
        
        // Create a proxy response object to capture CRM response
        let crmResponse = null;
        let crmResponseStatus = 200;
        const proxyRes = {
            status: (code) => {
                crmResponseStatus = code;
                return proxyRes;
            },
            json: (data) => {
                crmResponse = data;
                return proxyRes;
            }
        };
        
        // Call CRM checkIn function
        await crmEventController.checkIn(proxyReq, proxyRes);
        
        // If CRM call failed, return error
        if (crmResponseStatus !== 200 || !crmResponse?.success) {
            return res.status(crmResponseStatus).json(crmResponse || {
                success: false,
                message: 'Check-in failed'
            });
        }
        
        // Update AuditExecutionContext
        const assignment = await AuditAssignment.findOne({ eventId: event._id });
        if (assignment) {
            const context = await getOrCreateExecutionContext(
                event._id,
                assignment._id,
                req.user._id,
                req.user.organizationId
            );
            
            await context.startExecution({
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || null,
                address: location.address || null
            });
        }
        
        // Refresh event to get updated auditState
        const updatedEvent = await Event.findById(event._id)
            .select('eventId eventName auditState status checkIn')
            .lean();
        
        res.status(200).json({
            success: true,
            message: 'Checked in successfully.',
            data: {
                event: updatedEvent,
                executionContext: {
                    checkedInAt: new Date(),
                    executionStatus: 'in_progress'
                }
            }
        });
    } catch (error) {
        console.error('Error in checkInAudit:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking in to audit.',
            error: error.message
        });
    }
};

/**
 * @route   POST /audit/execute/:eventId/submit
 * @desc    Submit audit form (proxies to CRM)
 * @access  Private (Audit App only)
 */
exports.submitAudit = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { formResponseId, orgIndex } = req.body;
        
        // Defensive logging (non-blocking, for audit trails and debugging)
        console.info('[AuditExecute]', {
            action: 'SUBMIT',
            eventId,
            auditorId: req.user._id,
            formResponseId,
            app: req.appKey || 'AUDIT',
            timestamp: new Date().toISOString()
        });
        
        // Validate ownership
        const ownershipCheck = await validateEventOwnership(
            eventId,
            req.user._id,
            req.user.organizationId
        );
        
        if (!ownershipCheck.valid) {
            return res.status(ownershipCheck.error.status).json({
                success: false,
                message: ownershipCheck.error.message
            });
        }
        
        const event = ownershipCheck.event;
        
        // Validate formResponseId
        if (!formResponseId) {
            return res.status(400).json({
                success: false,
                message: 'Form response ID is required'
            });
        }
        
        // Create proxy request for CRM controller
        // Use event._id (CRM handles both _id and eventId)
        const proxyReq = {
            ...req,
            params: { id: event._id.toString() },
            body: { formResponseId, orgIndex }
        };
        
        // Create proxy response to capture CRM response
        let crmResponse = null;
        let crmResponseStatus = 200;
        const proxyRes = {
            status: (code) => {
                crmResponseStatus = code;
                return proxyRes;
            },
            json: (data) => {
                crmResponse = data;
                return proxyRes;
            }
        };
        
        // Call CRM submitAudit function
        await crmEventController.submitAudit(proxyReq, proxyRes);
        
        // If CRM call failed, return error
        if (crmResponseStatus !== 200 || !crmResponse?.success) {
            return res.status(crmResponseStatus).json(crmResponse || {
                success: false,
                message: 'Audit submission failed'
            });
        }
        
        // Update AuditExecutionContext
        const assignment = await AuditAssignment.findOne({ eventId: event._id });
        if (assignment) {
            const context = await AuditExecutionContext.findOne({
                eventId: event._id,
                executedBy: req.user._id
            });
            
            if (context) {
                await context.markSubmitted();
            }
        }
        
        // Update assignment auditState (sync from CRM)
        if (assignment && crmResponse.data) {
            assignment.auditState = crmResponse.data.auditState || event.auditState;
            await assignment.save();
        }
        
        // Refresh event to get updated state
        const updatedEvent = await Event.findById(event._id)
            .select('eventId eventName auditState status')
            .lean();
        
        res.status(200).json({
            success: true,
            message: crmResponse.message || 'Audit submitted successfully.',
            data: {
                event: updatedEvent,
                requiresCorrective: crmResponse.requiresCorrective || false,
                executionContext: {
                    executionStatus: 'submitted',
                    checkedOutAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error in submitAudit:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting audit.',
            error: error.message
        });
    }
};

/**
 * @route   POST /audit/execute/:eventId/approve
 * @desc    Approve audit (proxies to CRM)
 * @access  Private (Audit App only)
 */
exports.approveAudit = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Defensive logging (non-blocking, for audit trails and debugging)
        console.info('[AuditExecute]', {
            action: 'APPROVE',
            eventId,
            auditorId: req.user._id,
            app: req.appKey || 'AUDIT',
            timestamp: new Date().toISOString()
        });
        
        // Validate ownership
        const ownershipCheck = await validateEventOwnership(
            eventId,
            req.user._id,
            req.user.organizationId
        );
        
        if (!ownershipCheck.valid) {
            return res.status(ownershipCheck.error.status).json({
                success: false,
                message: ownershipCheck.error.message
            });
        }
        
        const event = ownershipCheck.event;
        
        // Validate current state
        if (event.auditState !== 'needs_review') {
            return res.status(400).json({
                success: false,
                message: `Event is not in 'needs_review' state. Current state: ${event.auditState}`
            });
        }
        
        // Create proxy request for CRM controller
        // Use event._id (CRM handles both _id and eventId)
        const proxyReq = {
            ...req,
            params: { id: event._id.toString() }
        };
        
        // Create proxy response to capture CRM response
        let crmResponse = null;
        let crmResponseStatus = 200;
        const proxyRes = {
            status: (code) => {
                crmResponseStatus = code;
                return proxyRes;
            },
            json: (data) => {
                crmResponse = data;
                return proxyRes;
            }
        };
        
        // Call CRM approveAudit function
        await crmEventController.approveAudit(proxyReq, proxyRes);
        
        // If CRM call failed, return error
        if (crmResponseStatus !== 200 || !crmResponse?.success) {
            return res.status(crmResponseStatus).json(crmResponse || {
                success: false,
                message: 'Audit approval failed'
            });
        }
        
        // Update AuditAssignment - mark as closed
        const assignment = await AuditAssignment.findOne({ eventId: event._id });
        if (assignment) {
            assignment.status = 'closed';
            assignment.auditState = 'closed';
            await assignment.save();
        }
        
        // Close execution context if exists
        const context = await AuditExecutionContext.findOne({
            eventId: event._id,
            executedBy: req.user._id
        });
        if (context) {
            context.executionStatus = 'submitted'; // Already submitted, just ensure it's marked
            await context.save();
        }
        
        // Refresh event to get updated state
        const updatedEvent = await Event.findById(event._id)
            .select('eventId eventName auditState status completedAt')
            .lean();
        
        res.status(200).json({
            success: true,
            message: 'Audit approved and closed successfully.',
            data: {
                event: updatedEvent,
                assignment: {
                    status: 'closed'
                }
            }
        });
    } catch (error) {
        console.error('Error in approveAudit:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving audit.',
            error: error.message
        });
    }
};

/**
 * @route   POST /audit/execute/:eventId/reject
 * @desc    Reject audit (proxies to CRM)
 * @access  Private (Audit App only)
 */
exports.rejectAudit = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { reason } = req.body; // Optional rejection reason
        
        // Defensive logging (non-blocking, for audit trails and debugging)
        console.info('[AuditExecute]', {
            action: 'REJECT',
            eventId,
            auditorId: req.user._id,
            reason: reason ? 'provided' : 'none',
            app: req.appKey || 'AUDIT',
            timestamp: new Date().toISOString()
        });
        
        // Validate ownership
        const ownershipCheck = await validateEventOwnership(
            eventId,
            req.user._id,
            req.user.organizationId
        );
        
        if (!ownershipCheck.valid) {
            return res.status(ownershipCheck.error.status).json({
                success: false,
                message: ownershipCheck.error.message
            });
        }
        
        const event = ownershipCheck.event;
        
        // Validate current state
        if (event.auditState !== 'needs_review') {
            return res.status(400).json({
                success: false,
                message: `Event is not in 'needs_review' state. Current state: ${event.auditState}`
            });
        }
        
        // Create proxy request for CRM controller
        const proxyReq = {
            ...req,
            params: { id: eventId },
            body: { reason }
        };
        
        // Create proxy response to capture CRM response
        let crmResponse = null;
        let crmResponseStatus = 200;
        const proxyRes = {
            status: (code) => {
                crmResponseStatus = code;
                return proxyRes;
            },
            json: (data) => {
                crmResponse = data;
                return proxyRes;
            }
        };
        
        // Call CRM rejectAudit function
        await crmEventController.rejectAudit(proxyReq, proxyRes);
        
        // If CRM call failed, return error
        if (crmResponseStatus !== 200 || !crmResponse?.success) {
            return res.status(crmResponseStatus).json(crmResponse || {
                success: false,
                message: 'Audit rejection failed'
            });
        }
        
        // Keep AuditAssignment.status = active (can be retried)
        const assignment = await AuditAssignment.findOne({ eventId: event._id });
        if (assignment) {
            assignment.auditState = 'rejected';
            // Keep status as 'active' so auditor can retry
            await assignment.save();
        }
        
        // Refresh event to get updated state
        const updatedEvent = await Event.findById(event._id)
            .select('eventId eventName auditState status')
            .lean();
        
        res.status(200).json({
            success: true,
            message: crmResponse.message || 'Audit rejected. Corrective actions reopened.',
            data: {
                event: updatedEvent,
                reopenedCorrectiveActions: crmResponse.reopenedCount || 0,
                assignment: {
                    status: 'active' // Remains active for retry
                }
            }
        });
    } catch (error) {
        console.error('Error in rejectAudit:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting audit.',
            error: error.message
        });
    }
};

