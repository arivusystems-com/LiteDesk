/**
 * ============================================================================
 * AUDIT APP: Audit Read Controller (Read-Only APIs)
 * ============================================================================
 * 
 * Purpose:
 * - Read-only APIs for Audit App auditor workspace
 * - View assigned audits, execution context, and timeline
 * - No state mutations
 * - No workflow logic
 * 
 * Core Principles:
 * - CRM remains single source of truth
 * - Ownership-based access only (eventOwnerId === req.user._id)
 * - Use Audit App models only
 * - Reference CRM models via IDs
 * - No CRM permissions required
 * 
 * See AUDIT_READ_APIS.md for API documentation.
 * ============================================================================
 */

const AuditAssignment = require('../models/AuditAssignment');
const AuditExecutionContext = require('../models/AuditExecutionContext');
const AuditTimeline = require('../models/AuditTimeline');
const Event = require('../models/Event');

/**
 * Helper: Validate assignment ownership
 */
async function validateAssignmentOwnership(eventId, userId, organizationId) {
    let eventObjectId = null;
    
    // Determine if eventId is MongoDB _id or UUID eventId
    if (eventId.match(/^[0-9a-f]{24}$/i)) {
        // It's a MongoDB _id
        eventObjectId = eventId;
    } else {
        // It's a UUID eventId - find the Event first
        const event = await Event.findOne({ 
            eventId, 
            organizationId 
        }).select('_id').lean();
        
        if (!event) {
            return { 
                valid: false, 
                error: { 
                    status: 404, 
                    message: 'Event not found.' 
                } 
            };
        }
        eventObjectId = event._id;
    }
    
    // Find assignment by eventId (MongoDB _id) and auditor
    const assignment = await AuditAssignment.findOne({
        eventId: eventObjectId,
        auditorId: userId,
        organizationId
    }).lean();
    
    if (!assignment) {
        return {
            valid: false,
            error: {
                status: 404,
                message: 'Assignment not found or access denied.'
            }
        };
    }
    
    return { valid: true, assignment, eventObjectId };
}

/**
 * @route   GET /audit/assignments
 * @desc    List all audits assigned to the logged-in auditor
 * @access  Private (Audit App only)
 */
exports.listAssignments = async (req, res) => {
    try {
        const {
            auditState,
            auditType,
            status = 'active',
            sortBy = 'dueAt',
            sortOrder = 'asc',
            page = 1,
            limit = 50
        } = req.query;
        
        // Build query - filter by auditor and organization
        const query = {
            auditorId: req.user._id,
            organizationId: req.user.organizationId
        };
        
        // Apply filters
        if (status) {
            query.status = status;
        }
        if (auditState) {
            query.auditState = auditState;
        }
        if (auditType) {
            query.auditType = auditType;
        }
        
        // Build sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Fetch assignments
        const assignments = await AuditAssignment.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        
        const total = await AuditAssignment.countDocuments(query);
        
        // Format response
        const formattedAssignments = assignments.map(assignment => ({
            assignmentId: assignment._id,
            eventId: assignment.eventId,
            auditType: assignment.auditType,
            auditState: assignment.auditState,
            scheduledAt: assignment.scheduledAt,
            dueAt: assignment.dueAt,
            status: assignment.status,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt
        }));
        
        res.status(200).json({
            success: true,
            data: {
                assignments: formattedAssignments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error listing assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignments.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @route   GET /audit/assignments/:eventId
 * @desc    Get audit detail view (assignment + event + execution context)
 * @access  Private (Audit App only)
 */
exports.getAssignmentDetail = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate ownership
        const ownershipCheck = await validateAssignmentOwnership(
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
        
        const assignment = ownershipCheck.assignment;
        const eventObjectId = ownershipCheck.eventObjectId || assignment.eventId;
        
        // Fetch minimal event data (read-only)
        let event = null;
        if (eventObjectId) {
            event = await Event.findById(eventObjectId)
                .select('_id eventId auditState eventType startDateTime endDateTime relatedToId location geoRequired')
                .populate('relatedToId', 'name')
                .lean();
        }
        
        // Fetch execution context if exists
        const executionContext = await AuditExecutionContext.findOne({
            eventId: eventObjectId,
            executedBy: req.user._id
        })
        .select('executionStatus checkedInAt checkedOutAt geo')
        .lean();
        
        // Format response
        res.status(200).json({
            success: true,
            data: {
                assignment: {
                    assignmentId: assignment._id,
                    eventId: assignment.eventId,
                    auditType: assignment.auditType,
                    auditState: assignment.auditState,
                    scheduledAt: assignment.scheduledAt,
                    dueAt: assignment.dueAt,
                    status: assignment.status
                },
                event: event ? {
                    id: event._id,
                    eventId: event.eventId,
                    auditState: event.auditState,
                    eventType: event.eventType,
                    startDateTime: event.startDateTime,
                    endDateTime: event.endDateTime,
                    relatedToId: event.relatedToId,
                    location: event.location,
                    geoRequired: event.geoRequired,
                    relatedOrganization: event.relatedToId ? {
                        _id: event.relatedToId._id,
                        name: event.relatedToId.name
                    } : null
                } : null,
                executionContext: executionContext ? {
                    executionStatus: executionContext.executionStatus,
                    checkedInAt: executionContext.checkedInAt,
                    checkedOutAt: executionContext.checkedOutAt,
                    geo: executionContext.geo
                } : null
            }
        });
    } catch (error) {
        console.error('Error fetching assignment detail:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignment details.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @route   GET /audit/assignments/:eventId/timeline
 * @desc    Get audit timeline (read-only history)
 * @access  Private (Audit App only)
 */
exports.getTimeline = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate ownership
        const ownershipCheck = await validateAssignmentOwnership(
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
        
        // Get event _id for timeline query
        const eventObjectId = ownershipCheck.eventObjectId || ownershipCheck.assignment.eventId;
        
        // Fetch timeline entries (sorted chronologically)
        const timeline = await AuditTimeline.find({
            eventId: eventObjectId,
            organizationId: req.user.organizationId
        })
        .sort({ createdAt: 1 }) // ASC - chronological
        .populate('actorId', 'firstName lastName email')
        .lean();
        
        // Format response
        const formattedTimeline = timeline.map(entry => ({
            action: entry.action,
            fromState: entry.fromState,
            toState: entry.toState,
            actor: entry.actorId ? {
                _id: entry.actorId._id,
                firstName: entry.actorId.firstName,
                lastName: entry.actorId.lastName,
                email: entry.actorId.email
            } : null,
            createdAt: entry.createdAt,
            meta: entry.meta || {}
        }));
        
        res.status(200).json({
            success: true,
            data: {
                timeline: formattedTimeline
            }
        });
    } catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching timeline.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @route   GET /audit/assignments/:eventId/execution-status
 * @desc    Get execution status helper (for UI state decisions)
 * @access  Private (Audit App only)
 * 
 * Note: Logic is DERIVED, not enforced.
 * Actual enforcement happens in execution endpoints.
 */
exports.getExecutionStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate ownership
        const ownershipCheck = await validateAssignmentOwnership(
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
        
        const assignment = ownershipCheck.assignment;
        
        // Get event _id for execution context query
        const eventObjectId = ownershipCheck.eventObjectId || assignment.eventId;
        
        // Fetch execution context if exists
        const executionContext = await AuditExecutionContext.findOne({
            eventId: eventObjectId,
            executedBy: req.user._id
        })
        .select('executionStatus checkedInAt checkedOutAt')
        .lean();
        
        // Derive UI state (for button visibility, etc.)
        // This is UX logic only - actual enforcement is in execution endpoints
        const auditState = assignment.auditState;
        const executionStatus = executionContext?.executionStatus || 'idle';
        
        // Determine available actions based on state
        const canCheckIn = auditState === 'Ready to start' && executionStatus !== 'in_progress';
        const canSubmit = auditState === 'checked_in' && executionStatus === 'in_progress';
        const canApprove = auditState === 'needs_review';
        const canReject = auditState === 'needs_review';
        
        res.status(200).json({
            success: true,
            data: {
                auditState,
                executionStatus,
                canCheckIn,
                canSubmit,
                canApprove,
                canReject,
                checkedInAt: executionContext?.checkedInAt || null,
                checkedOutAt: executionContext?.checkedOutAt || null
            }
        });
    } catch (error) {
        console.error('Error fetching execution status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching execution status.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

