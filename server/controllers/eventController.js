const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventTracking = require('../models/EventTracking');
const EventOrder = require('../models/EventOrder');
const User = require('../models/User');
const geoValidationService = require('../services/geoValidationService');
const ModuleDefinition = require('../models/ModuleDefinition');
const { getFieldDependencyState } = require('../utils/dependencyEvaluation');

const AUDIT_EVENT_TYPES = ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'];

async function validateAuditUserRoleScopes({
    eventType,
    requesterOrgId,
    relatedToId,
    auditorUserId,
    reviewerUserId,
    correctiveOwnerUserId,
    allowSelfReview
}) {
    if (!AUDIT_EVENT_TYPES.includes(eventType)) return;

    const requesterOrg = String(requesterOrgId);
    const targetOrg = relatedToId ? String(relatedToId) : null;

    const normalizeId = (v) => {
        if (!v) return null;
        if (typeof v === 'object' && v._id) return String(v._id);
        return String(v);
    };

    const isSingleOrgAudit = (eventType === 'Internal Audit' || eventType === 'External Audit — Single Org');
    if (isSingleOrgAudit && !targetOrg) {
        const err = new Error('relatedToId is required for single-organization audit events.');
        err.statusCode = 400;
        err.code = 'AUDIT_ORG_REQUIRED';
        throw err;
    }

    // Internal Audit must always be scoped to the requester's organization
    if (eventType === 'Internal Audit' && targetOrg && targetOrg !== requesterOrg) {
        const err = new Error('Internal Audit must be scoped to the current organization.');
        err.statusCode = 400;
        err.code = 'INTERNAL_AUDIT_ORG_MISMATCH';
        throw err;
    }

    const idsToFetch = [auditorUserId, reviewerUserId, correctiveOwnerUserId].map(normalizeId).filter(Boolean);
    const users = await User.find({ _id: { $in: idsToFetch } })
        .select('_id organizationId status firstName lastName email')
        .lean();
    const byId = new Map(users.map(u => [String(u._id), u]));

    const getOrgId = (id) => byId.get(normalizeId(id))?.organizationId ? String(byId.get(normalizeId(id)).organizationId) : null;
    const isActive = (id) => byId.get(normalizeId(id))?.status === 'active';

    const assertUser = (id, label) => {
        if (!id) return;
        const u = byId.get(normalizeId(id));
        if (!u) {
            const err = new Error(`${label} user not found.`);
            err.statusCode = 400;
            err.code = 'USER_NOT_FOUND';
            throw err;
        }
        if (!isActive(id)) {
            const err = new Error(`${label} must be an active user.`);
            err.statusCode = 400;
            err.code = 'USER_INACTIVE';
            throw err;
        }
    };

    assertUser(auditorUserId, 'Auditor');
    assertUser(reviewerUserId, 'Reviewer');
    assertUser(correctiveOwnerUserId, 'Corrective Owner');

    const auditorOrg = auditorUserId ? getOrgId(auditorUserId) : null;
    const reviewerOrg = reviewerUserId ? getOrgId(reviewerUserId) : null;
    const correctiveOrg = correctiveOwnerUserId ? getOrgId(correctiveOwnerUserId) : null;

    const isInternal = (orgId) => orgId && orgId === requesterOrg;
    const isTargetOrg = (orgId) => targetOrg && orgId && orgId === targetOrg;

    // Reviewer: always internal when provided (and required for External Audit — Single Org)
    if (reviewerUserId && !isInternal(reviewerOrg)) {
        const err = new Error('Reviewer must be an internal user.');
        err.statusCode = 400;
        err.code = 'REVIEWER_NOT_INTERNAL';
        throw err;
    }

    // Internal Audit: all roles must belong to relatedToId (which equals requester org)
    if (eventType === 'Internal Audit') {
        if (auditorUserId && !isTargetOrg(auditorOrg)) {
            const err = new Error('Auditor must belong to the audit Organization.');
            err.statusCode = 400;
            err.code = 'AUDITOR_SCOPE_INVALID';
            throw err;
        }
        if (reviewerUserId && !isTargetOrg(reviewerOrg)) {
            const err = new Error('Reviewer must belong to the audit Organization.');
            err.statusCode = 400;
            err.code = 'REVIEWER_SCOPE_INVALID';
            throw err;
        }
        if (correctiveOwnerUserId && !isTargetOrg(correctiveOrg)) {
            const err = new Error('Corrective Owner must belong to the audit Organization.');
            err.statusCode = 400;
            err.code = 'CORRECTIVE_OWNER_SCOPE_INVALID';
            throw err;
        }
    }

    // Corrective Owner:
    // - For single-org audits: must belong to selected Organization (relatedToId)
    // - For route audits (External Audit Beat): default to internal users only (safe)
    if (correctiveOwnerUserId) {
        if (isSingleOrgAudit) {
            if (!isTargetOrg(correctiveOrg)) {
                const err = new Error('Corrective Owner must belong to the selected Organization.');
                err.statusCode = 400;
                err.code = 'CORRECTIVE_OWNER_SCOPE_INVALID';
                throw err;
            }
        } else {
            if (!isInternal(correctiveOrg)) {
                const err = new Error('Corrective Owner must be an internal user for this audit type.');
                err.statusCode = 400;
                err.code = 'CORRECTIVE_OWNER_NOT_INTERNAL';
                throw err;
            }
        }
    }

    // Auditor selection scope:
    // - Internal Audit: internal users only
    // - External Audit — Single Org: internal OR selected Organization users
    // - External Audit Beat: internal users only (by default)
    if (auditorUserId) {
        if (eventType === 'External Audit — Single Org') {
            if (!isInternal(auditorOrg) && !isTargetOrg(auditorOrg)) {
                const err = new Error('Auditor must be an internal user or a user belonging to the selected Organization.');
                err.statusCode = 400;
                err.code = 'AUDITOR_SCOPE_INVALID';
                throw err;
            }
        } else {
            if (!isInternal(auditorOrg)) {
                const err = new Error('Auditor must be an internal user for this audit type.');
                err.statusCode = 400;
                err.code = 'AUDITOR_NOT_INTERNAL';
                throw err;
            }
        }
    }

    // Self-review constraints (backend guard; model enforces too)
    const allow = allowSelfReview === true;
    if (auditorUserId && reviewerUserId && String(auditorUserId) === String(reviewerUserId) && !allow) {
        const err = new Error('Reviewer cannot be the same as Auditor unless allowSelfReview is enabled.');
        err.statusCode = 400;
        err.code = 'SELF_REVIEW_FORBIDDEN';
        throw err;
    }
}

// Helper function to normalize status to uppercase enum values
const normalizeEventStatus = (status) => {
    if (!status || typeof status !== 'string') return status;
    
    // Map common variations to correct uppercase enum values
    const statusMap = {
        'planned': 'PLANNED',
        'started': 'STARTED',
        'checked_in': 'CHECKED_IN',
        'checked-in': 'CHECKED_IN',
        'in_progress': 'IN_PROGRESS',
        'in-progress': 'IN_PROGRESS',
        'paused': 'PAUSED',
        'checked_out': 'CHECKED_OUT',
        'checked-out': 'CHECKED_OUT',
        'submitted': 'SUBMITTED',
        'pending_corrective': 'PENDING_CORRECTIVE',
        'pending-corrective': 'PENDING_CORRECTIVE',
        'needs_review': 'NEEDS_REVIEW',
        'needs-review': 'NEEDS_REVIEW',
        'approved': 'APPROVED',
        'rejected': 'REJECTED',
        'closed': 'CLOSED'
    };
    
    const normalized = status.trim().toUpperCase().replace(/-/g, '_');
    return statusMap[status.toLowerCase().replace(/_/g, '-')] || normalized;
};

// Get all events (with date range filtering for calendar)
exports.getEvents = async (req, res) => {
    try {
        const { 
            startDateTime, 
            endDateTime,
            eventType, 
            status, 
            search,
            relatedType,
            relatedId,
            includeRelated = 'false',
            page = 1, 
            limit = 100,
            sortBy = 'startDateTime',
            sortOrder = 'asc'
        } = req.query;
        
        const query = { organizationId: req.user.organizationId };
        
        // Date range filter
        if (startDateTime || endDateTime) {
            query.startDateTime = {};
            if (startDateTime) query.startDateTime.$gte = new Date(startDateTime);
            if (endDateTime) query.startDateTime.$lte = new Date(endDateTime);
        }
        
        // Event type filter
        if (eventType) {
            query.eventType = eventType;
        }
        
        // Status filter (system-controlled: Planned, Completed, Cancelled)
        if (status) {
            // Normalize status to match new enum values
            const normalizedStatus = status.trim();
            const validStatuses = ['Planned', 'Completed', 'Cancelled'];
            if (validStatuses.includes(normalizedStatus)) {
                query.status = normalizedStatus;
            } else {
                // Try to map legacy statuses for backward compatibility
                const legacyMap = {
                    'PLANNED': 'Planned',
                    'STARTED': 'Planned',
                    'CHECKED_IN': 'Planned',
                    'IN_PROGRESS': 'Planned',
                    'PAUSED': 'Planned',
                    'CHECKED_OUT': 'Planned',
                    'SUBMITTED': 'Planned',
                    'PENDING_CORRECTIVE': 'Planned',
                    'NEEDS_REVIEW': 'Planned',
                    'REJECTED': 'Planned',
                    'APPROVED': 'Completed',
                    'CLOSED': 'Completed',
                    'COMPLETED': 'Completed',
                    'CANCELLED': 'Cancelled',
                    'CANCELED': 'Cancelled'
                };
                if (legacyMap[normalizedStatus.toUpperCase()]) {
                    query.status = legacyMap[normalizedStatus.toUpperCase()];
                }
            }
        }
        
        // Related organization filter
        if (relatedId) {
            query.relatedToId = relatedId;
        }
        
        // Search filter
        if (search) {
            const searchConditions = [
                { eventName: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
            
            // If we already have an $or from related records, combine them with $and
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchConditions }
                ];
                delete query.$or;
            } else {
                query.$or = searchConditions;
            }
        }
        
        // Sort order
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Fetch events
        const events = await Event.find(query)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('auditorId', 'firstName lastName email')
            .populate('reviewerId', 'firstName lastName email')
            .populate('correctiveOwnerId', 'firstName lastName email')
            .populate('linkedFormId', 'name formId formType status')
            .populate('relatedToId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('modifiedBy', 'firstName lastName')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();
        
        const count = await Event.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: events,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching events.', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get a single event by ID (supports both _id and eventId)
exports.getEventById = async (req, res) => {
    try {
        const query = { organizationId: req.user.organizationId };
        
        // Support both MongoDB _id and eventId UUID
        if (req.params.id.match(/^[0-9a-f]{24}$/i)) {
            query._id = req.params.id;
        } else {
            query.eventId = req.params.id;
        }
        
        let event = await Event.findOne(query)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('auditorId', 'firstName lastName email')
            .populate('reviewerId', 'firstName lastName email')
            .populate('correctiveOwnerId', 'firstName lastName email')
            .populate('linkedFormId', 'name formId formType status')
            .populate('relatedToId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('modifiedBy', 'firstName lastName')
            .populate('auditHistory.actorUserId', 'firstName lastName email')
            .lean();
        
        if (!event) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found.' 
            });
        }
        
        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching event.', 
            error: error.message 
        });
    }
};

// Create a new event
exports.createEvent = async (req, res) => {
    try {
        console.log('Creating event with data:', JSON.stringify(req.body, null, 2));
        
        // ===== STRIP STATUS FROM CLIENT REQUESTS =====
        // Status is system-controlled and cannot be set by clients
        if (req.body.status !== undefined) {
            console.warn(`⚠️  Client attempted to set status "${req.body.status}" on event creation. Status will be set to "Planned" by system.`);
            delete req.body.status;
        }
        
        const isAuditType = AUDIT_EVENT_TYPES.includes(req.body?.eventType);

        // For audit events, use explicit `auditorId` as the source of truth.
        // (eventOwnerId is hidden in audit UX; we still mirror auditorId into eventOwnerId for ownership.)
        const auditorSelection = isAuditType ? (req.body.auditorId || null) : null;

        const eventData = {
            ...req.body,
            organizationId: req.user.organizationId,
            // IMPORTANT: do not auto-assign audit roles.
            // For non-audit events, we keep the convenience default for eventOwnerId.
            eventOwnerId: isAuditType ? auditorSelection : (req.body.eventOwnerId || req.user._id),
            // Keep explicit auditorId stored for audit events (no defaults).
            auditorId: isAuditType ? auditorSelection : (req.body.auditorId || null),
            createdBy: req.user._id,
            modifiedBy: req.user._id
            // status will be set to "Planned" by model default and pre-save hook
            // Explicitly set to undefined so model default applies
        };

        // Internal Audit: relatedToId is locked to the current user's organization
        if (eventData.eventType === 'Internal Audit') {
            const desired = String(req.user.organizationId);
            if (req.body.relatedToId && String(req.body.relatedToId) !== desired) {
                return res.status(400).json({
                    success: false,
                    message: 'Internal Audit organization is locked and cannot be changed.',
                    code: 'INTERNAL_AUDIT_ORG_LOCKED'
                });
            }
            eventData.relatedToId = req.user.organizationId;
        }
        
        // Explicitly ensure status is not in eventData (let model default handle it)
        delete eventData.status;
        
        // Normalize eventType if provided
        if (eventData.eventType && typeof eventData.eventType === 'string') {
            eventData.eventType = eventData.eventType.charAt(0).toUpperCase() + eventData.eventType.slice(1);
        }
        
        // For audit events, enforce role constraints and user scope rules (do not rely on UI)
        if (isAuditType) {
            const inferredAllowSelfReview =
                eventData.allowSelfReview === true ||
                (eventData.allowSelfReview === undefined && eventData.eventType === 'Internal Audit');

            // Requiredness is dependency-driven; but we must always have an Auditor + Corrective Owner,
            // and for External Audit — Single Org we require a Reviewer and Organization.
            const missing = [];
            if (!eventData.auditorId) missing.push('auditorId');
            if (!eventData.correctiveOwnerId) missing.push('correctiveOwnerId');
            if (eventData.eventType === 'Internal Audit' && !eventData.relatedToId) missing.push('relatedToId');
            if (eventData.eventType === 'External Audit — Single Org' && !eventData.reviewerId) missing.push('reviewerId');
            if (eventData.eventType === 'External Audit — Single Org' && !eventData.relatedToId) missing.push('relatedToId');
            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required audit field(s): ${missing.join(', ')}`,
                    code: 'AUDIT_FIELD_REQUIRED'
                });
            }

            await validateAuditUserRoleScopes({
                eventType: eventData.eventType,
                requesterOrgId: req.user.organizationId,
                relatedToId: eventData.relatedToId,
                auditorUserId: eventData.auditorId,
                reviewerUserId: eventData.reviewerId,
                correctiveOwnerUserId: eventData.correctiveOwnerId,
                allowSelfReview: inferredAllowSelfReview
            });
        }

        const moduleDefForClear = await ModuleDefinition.findOne({
            key: 'events',
            organizationId: req.user.organizationId
        });
        
        if (moduleDefForClear && moduleDefForClear.fields && eventData.eventType) {
            // Clear allowSelfReview if it shouldn't be visible for this eventType (dependency-driven)
            const allowSelfReviewField = moduleDefForClear.fields.find(f =>
                f.key && f.key.toLowerCase() === 'allowselfreview'
            );
            if (allowSelfReviewField) {
                const depState = getFieldDependencyState(allowSelfReviewField, eventData);
                if (!depState.visible) {
                    eventData.allowSelfReview = false;
                }
            }

            // Clear reviewerId if it shouldn't be visible for this eventType (dependency-driven)
            const reviewerField = moduleDefForClear.fields.find(f =>
                f.key && f.key.toLowerCase() === 'reviewerid'
            );
            if (reviewerField) {
                const depState = getFieldDependencyState(reviewerField, eventData);
                if (!depState.visible) {
                    eventData.reviewerId = null;
                }
            }

            // Clear correctiveOwnerId if it shouldn't be visible for this eventType (dependency-driven)
            const correctiveOwnerField = moduleDefForClear.fields.find(f =>
                f.key && f.key.toLowerCase() === 'correctiveownerid'
            );
            if (correctiveOwnerField) {
                const depState = getFieldDependencyState(correctiveOwnerField, eventData);
                if (!depState.visible) {
                    eventData.correctiveOwnerId = null;
                }
            }
        }
        
        // If linkedFormId is provided, check if form is Ready and activate it
        // Also handle empty strings by converting to null
        if (eventData.linkedFormId === '' || eventData.linkedFormId === null || eventData.linkedFormId === undefined) {
            eventData.linkedFormId = null;
        }
        
        if (eventData.linkedFormId) {
            console.log('[createEvent] Processing linkedFormId:', eventData.linkedFormId);
            const Form = require('../models/Form');
            const linkedForm = await Form.findOne({
                _id: eventData.linkedFormId,
                organizationId: req.user.organizationId
            });
            
            if (!linkedForm) {
                console.warn('[createEvent] Linked form not found:', eventData.linkedFormId);
                // Don't fail, just log warning - form might have been deleted
            } else if (linkedForm.status === 'Ready') {
                // Automatically activate the form when linked to an event
                linkedForm.status = 'Active';
                linkedForm.modifiedBy = req.user._id;
                await linkedForm.save();
                console.log(`Form ${linkedForm._id} automatically activated from Ready to Active`);
            }
            
            // Set formAssignment if not already provided
            // Default: assign to event owner, due date is event end date
            if (!eventData.formAssignment || !eventData.formAssignment.assignedAuditor) {
                eventData.formAssignment = {
                    assignedAuditor: eventData.eventOwnerId || req.user._id,
                    dueDate: eventData.endDateTime || null,
                    assignedAt: new Date()
                };
                console.log('[createEvent] Auto-set formAssignment:', eventData.formAssignment);
            }
        } else {
            console.log('[createEvent] No linkedFormId provided, setting to null');
            eventData.linkedFormId = null;
            // Clear formAssignment if no form is linked
            eventData.formAssignment = null;
        }
        
        console.log('[createEvent] Final eventData.linkedFormId:', eventData.linkedFormId);
        
        // Validate field dependencies (configurable, not hardcoded)
        // NOTE: legacy plural corrective owners removed; corrective accountability is enforced via `correctiveOwnerId`.
        
        const event = new Event(eventData);
        await event.save();
        
        console.log('Event saved successfully with ID:', event._id, 'eventId:', event.eventId);
        
        const populatedEvent = await Event.findById(event._id)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('modifiedBy', 'firstName lastName')
            .populate('linkedFormId', 'name formId formType status');
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully.',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error creating event - Full error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
        
        res.status(400).json({ 
            success: false,
            message: 'Error creating event.', 
            error: error.message,
            validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })) : null
        });
    }
};

// Update an event
exports.updateEvent = async (req, res) => {
    try {
        // Prevent changing organizationId, createdBy, createdTime, eventId
        delete req.body.organizationId;
        delete req.body.createdBy;
        delete req.body.createdTime;
        delete req.body._id;
        delete req.body.__v;
        delete req.body.eventId;
        
        // Build query (support both _id and eventId)
        const query = { organizationId: req.user.organizationId };
        if (req.params.id.match(/^[0-9a-f]{24}$/i)) {
            query._id = req.params.id;
        } else {
            query.eventId = req.params.id;
        }
        
        // Get current event to track changes for audit
        const currentEvent = await Event.findOne(query);
        if (!currentEvent) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found.' 
            });
        }
        
        // Disallow edits after approval or closure
        if (currentEvent.auditState === 'approved' || currentEvent.auditState === 'closed') {
            return res.status(403).json({
                success: false,
                message: 'Event cannot be edited after approval or closure.'
            });
        }
        
        // Disallow edits if event is Completed or Cancelled
        if (currentEvent.status === 'Completed' || currentEvent.status === 'Cancelled') {
            return res.status(403).json({
                success: false,
                message: `Event cannot be edited when status is "${currentEvent.status}".`
            });
        }
        
        // ===== STRIP STATUS FROM CLIENT REQUESTS =====
        // Status is system-controlled and cannot be set by clients via update
        if (req.body.status !== undefined) {
            console.warn(`⚠️  Client attempted to set status "${req.body.status}" on event update. Status change ignored. Use cancel/complete endpoints instead.`);
            delete req.body.status;
        }
        
        // Normalize eventType if provided
        if (req.body.eventType && typeof req.body.eventType === 'string') {
            req.body.eventType = req.body.eventType.charAt(0).toUpperCase() + req.body.eventType.slice(1);
        }

        // Internal Audit: relatedToId is locked to the current user's organization
        // Reject any attempt to override, and force to current org when switching to Internal Audit.
        const incomingEventType = req.body.eventType || currentEvent.eventType;
        if (incomingEventType === 'Internal Audit') {
            const desired = String(req.user.organizationId);
            if (req.body.relatedToId && String(req.body.relatedToId) !== desired) {
                return res.status(400).json({
                    success: false,
                    message: 'Internal Audit organization is locked and cannot be changed.',
                    code: 'INTERNAL_AUDIT_ORG_LOCKED'
                });
            }
            req.body.relatedToId = req.user.organizationId;
        }
        
        if (req.body.eventType && req.body.eventType !== currentEvent.eventType) {
            const moduleDefForClear = await ModuleDefinition.findOne({
                key: 'events',
                organizationId: req.user.organizationId
            });
            
            if (moduleDefForClear && moduleDefForClear.fields) {
                const allowSelfReviewField = moduleDefForClear.fields.find(f =>
                    f.key && f.key.toLowerCase() === 'allowselfreview'
                );
                if (allowSelfReviewField) {
                    const validationDataForClear = { ...currentEvent.toObject(), ...req.body };
                    const depState = getFieldDependencyState(allowSelfReviewField, validationDataForClear);
                    if (!depState.visible) {
                        req.body.allowSelfReview = false;
                    }
                }

                const reviewerField = moduleDefForClear.fields.find(f =>
                    f.key && f.key.toLowerCase() === 'reviewerid'
                );
                if (reviewerField) {
                    const validationDataForClear = { ...currentEvent.toObject(), ...req.body };
                    const depState = getFieldDependencyState(reviewerField, validationDataForClear);
                    if (!depState.visible) {
                        req.body.reviewerId = null;
                    }
                }

                const correctiveOwnerField = moduleDefForClear.fields.find(f =>
                    f.key && f.key.toLowerCase() === 'correctiveownerid'
                );
                if (correctiveOwnerField) {
                    const validationDataForClear = { ...currentEvent.toObject(), ...req.body };
                    const depState = getFieldDependencyState(correctiveOwnerField, validationDataForClear);
                    if (!depState.visible) {
                        req.body.correctiveOwnerId = null;
                    }
                }
            }
        }
        
        // Track status changes for audit
        if (req.body.status && req.body.status !== currentEvent.status) {
            currentEvent.addAuditEntry('status_changed', req.user._id, currentEvent.status, req.body.status);
        }
        
        // If linkedFormId is being updated, check if form is Ready and activate it
        if (req.body.linkedFormId !== undefined) {
            // Handle empty string or null
            if (req.body.linkedFormId === '' || req.body.linkedFormId === null) {
                req.body.linkedFormId = null;
                // Clear formAssignment if form is being unlinked
                req.body.formAssignment = null;
            } else if (req.body.linkedFormId !== currentEvent.linkedFormId?.toString()) {
                const Form = require('../models/Form');
                const linkedForm = await Form.findOne({
                    _id: req.body.linkedFormId,
                    organizationId: req.user.organizationId
                });
                
                if (linkedForm && linkedForm.status === 'Ready') {
                    // Automatically activate the form when linked to an event
                    linkedForm.status = 'Active';
                    linkedForm.modifiedBy = req.user._id;
                    await linkedForm.save();
                    console.log(`Form ${linkedForm._id} automatically activated from Ready to Active`);
                }
                
                // Set formAssignment if not already provided and form is being linked
                if (!req.body.formAssignment || !req.body.formAssignment.assignedAuditor) {
                    req.body.formAssignment = {
                        assignedAuditor: currentEvent.auditorId || currentEvent.eventOwnerId || req.user._id,
                        dueDate: req.body.endDateTime ? new Date(req.body.endDateTime) : (currentEvent.endDateTime || null),
                        assignedAt: new Date()
                    };
                    console.log('[updateEvent] Auto-set formAssignment:', req.body.formAssignment);
                }
            }
        }
        
        // Track reschedule for audit
        const oldStart = currentEvent.startDateTime;
        const oldEnd = currentEvent.endDateTime;
        const newStart = req.body.startDateTime ? new Date(req.body.startDateTime) : null;
        const newEnd = req.body.endDateTime ? new Date(req.body.endDateTime) : null;
        
        if ((newStart && oldStart && newStart.getTime() !== oldStart.getTime()) ||
            (newEnd && oldEnd && newEnd.getTime() !== oldEnd.getTime())) {
            currentEvent.addAuditEntry('rescheduled', req.user._id, {
                startDateTime: oldStart,
                endDateTime: oldEnd
            }, {
                startDateTime: newStart || oldStart,
                endDateTime: newEnd || oldEnd
            }, {
                reason: req.body.rescheduleReason || 'No reason provided'
            });
        }
        
        // Merge audit history
        const updateData = {
            ...req.body,
            modifiedBy: req.user._id,
            auditHistory: currentEvent.auditHistory
        };

        // Keep audit auditor selection consistent: auditorId is source of truth; mirror to eventOwnerId for ownership.
        const effectiveEventType = updateData.eventType || currentEvent.eventType;
        const isAuditType = AUDIT_EVENT_TYPES.includes(effectiveEventType);
        if (isAuditType) {
            const auditorSelection = updateData.auditorId || currentEvent.auditorId || currentEvent.eventOwnerId;
            if (auditorSelection) {
                updateData.auditorId = auditorSelection;
                updateData.eventOwnerId = auditorSelection;
            }
            // Ignore any client attempt to set eventOwnerId directly in audit events.
            if (updateData.eventOwnerId && updateData.auditorId && String(updateData.eventOwnerId) !== String(updateData.auditorId)) {
                updateData.eventOwnerId = updateData.auditorId;
            }
        }
        
        // Validate field dependencies (configurable, not hardcoded)
        // Merge current event data with update data for validation
        const validationData = { ...currentEvent.toObject(), ...updateData };
        // Ensure forced org is reflected in validationData too
        if (effectiveEventType === 'Internal Audit') {
            validationData.relatedToId = req.user.organizationId;
        }
        const moduleDef = await ModuleDefinition.findOne({
            key: 'events',
            organizationId: req.user.organizationId
        });
        
        if (moduleDef && moduleDef.fields) {
            // Validate dependency-driven required fields (no hardcoding of eventType logic)
            const requiredByDependency = [
                { keyLower: 'auditorid', fieldKey: 'auditorId', emptyCheck: (v) => !v },
                { keyLower: 'reviewerid', fieldKey: 'reviewerId', emptyCheck: (v) => !v },
                { keyLower: 'correctiveownerid', fieldKey: 'correctiveOwnerId', emptyCheck: (v) => !v }
            ];

            const validationErrors = [];
            for (const item of requiredByDependency) {
                const f = moduleDef.fields.find(x => x.key && x.key.toLowerCase() === item.keyLower);
                if (!f) continue;
                const depState = getFieldDependencyState(f, validationData);
                if (depState.visible && depState.required) {
                    const v = validationData[item.fieldKey];
                    if (item.emptyCheck(v)) {
                        validationErrors.push({
                            field: item.fieldKey,
                            message: `${f.label || item.fieldKey} is required.`
                        });
                    }
                }
            }

            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed.',
                    error: 'One or more required fields are missing.',
                    validationErrors
                });
            }
        }

        // Audit role scope + self-review validation (backend guard; do not rely on UI)
        if (AUDIT_EVENT_TYPES.includes(effectiveEventType)) {
            const inferredAllowSelfReview =
                validationData.allowSelfReview === true ||
                (validationData.allowSelfReview === undefined && effectiveEventType === 'Internal Audit');

            await validateAuditUserRoleScopes({
                eventType: effectiveEventType,
                requesterOrgId: req.user.organizationId,
                relatedToId: validationData.relatedToId,
                auditorUserId: validationData.eventOwnerId || validationData.auditorId,
                reviewerUserId: validationData.reviewerId,
                correctiveOwnerUserId: validationData.correctiveOwnerId,
                allowSelfReview: inferredAllowSelfReview
            });
        }
        
        const updatedEvent = await Event.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('auditorId', 'firstName lastName email')
            .populate('reviewerId', 'firstName lastName email')
            .populate('correctiveOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .populate('modifiedBy', 'firstName lastName')
            .populate('linkedFormId', 'name formId formType status');
        
        res.status(200).json({
            success: true,
            message: 'Event updated successfully.',
            data: updatedEvent
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error updating event.', 
            error: error.message 
        });
    }
};

// Delete an event (supports both _id and eventId)
exports.deleteEvent = async (req, res) => {
    try {
        const query = { organizationId: req.user.organizationId };
        
        // Support both MongoDB _id and eventId UUID
        if (req.params.id.match(/^[0-9a-f]{24}$/i)) {
            query._id = req.params.id;
        } else {
            query.eventId = req.params.id;
        }
        
        const deletedEvent = await Event.findOneAndDelete(query);
        
        if (!deletedEvent) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found.' 
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Event deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting event.', 
            error: error.message 
        });
    }
};

// Bulk delete events
exports.bulkDeleteEvents = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide an array of event IDs.' 
            });
        }
        
        // Support both _id and eventId
        const mongoIds = ids.filter(id => id.match(/^[0-9a-f]{24}$/i));
        const eventIds = ids.filter(id => !id.match(/^[0-9a-f]{24}$/i));
        
        const query = {
            organizationId: req.user.organizationId,
            $or: []
        };
        
        if (mongoIds.length > 0) {
            query.$or.push({ _id: { $in: mongoIds } });
        }
        if (eventIds.length > 0) {
            query.$or.push({ eventId: { $in: eventIds } });
        }
        
        if (query.$or.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No valid event IDs provided.' 
            });
        }
        
        const result = await Event.deleteMany(query);
        
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} event(s).`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error bulk deleting events:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting events.', 
            error: error.message 
        });
    }
};

// Update event status
exports.updateEventStatus = async (req, res) => {
    try {
        let { status } = req.body;
        
        // Normalize status (capitalize first letter)
        if (status) {
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        }
        
        if (!['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status value. Must be one of: Scheduled, Completed, Cancelled, Rescheduled.' 
            });
        }
        
        // Build query (support both _id and eventId)
        const query = { organizationId: req.user.organizationId };
        if (req.params.id.match(/^[0-9a-f]{24}$/i)) {
            query._id = req.params.id;
        } else {
            query.eventId = req.params.id;
        }
        
        // Get current event to track status change
        const currentEvent = await Event.findOne(query);
        if (!currentEvent) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found.' 
            });
        }
        
        const oldStatus = currentEvent.status;
        
        // Add audit entry
        currentEvent.addAuditEntry('status_changed', req.user._id, oldStatus, status);
        
        const updatedEvent = await Event.findOneAndUpdate(
            query,
            { 
                status, 
                modifiedBy: req.user._id,
                auditHistory: currentEvent.auditHistory
            },
            { new: true }
        )
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('modifiedBy', 'firstName lastName');
        
        res.status(200).json({
            success: true,
            message: 'Event status updated successfully.',
            data: updatedEvent
        });
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error updating event status.', 
            error: error.message 
        });
    }
};

// Get events statistics
exports.getEventStats = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        
        // Total events
        const totalEvents = await Event.countDocuments({ organizationId });
        
        // Upcoming events (today onwards)
        const upcomingEvents = await Event.countDocuments({
            organizationId,
            startDateTime: { $gte: new Date() },
            status: 'Scheduled'
        });
        
        // Today's events
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const todayEvents = await Event.countDocuments({
            organizationId,
            startDateTime: { $gte: startOfToday, $lte: endOfToday }
        });
        
        // This week's events
        const day = now.getDay();
        const diff = now.getDate() - day; // Sunday is 0
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
        const weekEvents = await Event.countDocuments({
            organizationId,
            startDateTime: { $gte: startOfWeek, $lte: endOfWeek }
        });
        
        // Events by type
        const eventsByType = await Event.aggregate([
            { $match: { organizationId } },
            { $group: { _id: '$eventType', count: { $sum: 1 } } }
        ]);
        
        // Events by status
        const eventsByStatus = await Event.aggregate([
            { $match: { organizationId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                total: totalEvents,
                upcoming: upcomingEvents,
                today: todayEvents,
                thisWeek: weekEvents,
                byType: eventsByType.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                byStatus: eventsByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching event statistics.', 
            error: error.message 
        });
    }
};

// Add note to event
exports.addNote = async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Note text is required'
            });
        }
        
        // Build query (support both _id and eventId)
        const query = { organizationId: req.user.organizationId };
        if (req.params.id.match(/^[0-9a-f]{24}$/i)) {
            query._id = req.params.id;
        } else {
            query.eventId = req.params.id;
        }
        
        // Get current event
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found.' 
            });
        }
        
        // Update notes field (append to existing notes)
        const existingNotes = event.notes || '';
        const newNoteText = existingNotes 
            ? `${existingNotes}\n\n[${new Date().toLocaleString()}] ${text.trim()}`
            : text.trim();
        
        event.notes = newNoteText;
        
        // Add audit entry for note addition
        event.addAuditEntry('note_added', req.user._id, null, null, {
            noteText: text.trim().substring(0, 100) // Store first 100 chars in metadata
        });
        
        // Update modifiedBy and modifiedTime
        event.modifiedBy = req.user._id;
        event.modifiedTime = new Date();
        
        await event.save();
        
        const populatedEvent = await Event.findById(event._id)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .populate('modifiedBy', 'firstName lastName');
        
        res.status(200).json({
            success: true,
            message: 'Note added successfully.',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error adding note.', 
            error: error.message 
        });
    }
};

// Export events to CSV
exports.exportEvents = async (req, res) => {
    try {
        const events = await Event.find({ 
            organizationId: req.user.organizationId 
        })
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .sort({ startDateTime: -1 })
            .lean();
        
        const csvData = events.map(event => ({
            eventId: event.eventId,
            eventName: event.eventName,
            eventType: event.eventType,
            status: event.status,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            location: event.location,
            notes: event.notes || '',
            eventOwner: event.eventOwnerId ? 
                `${event.eventOwnerId.firstName} ${event.eventOwnerId.lastName}` : '',
            relatedOrganization: event.relatedToId ? event.relatedToId.name : '',
            recurrence: event.recurrence || '',
            visibility: event.visibility || 'Internal',
            createdTime: event.createdTime,
            modifiedTime: event.modifiedTime
        }));
        
        res.status(200).json({
            success: true,
            data: csvData
        });
    } catch (error) {
        console.error('Error exporting events:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error exporting events.', 
            error: error.message 
        });
    }
};

// ===== EXECUTION WORKFLOW APIs =====

// Start Event Execution
exports.startEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { location } = req.body; // Optional: {latitude, longitude, accuracy}
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Validate event can be started
        if (event.status !== 'PLANNED' && event.status !== 'Scheduled') {
            return res.status(400).json({
                success: false,
                message: `Event cannot be started. Current status: ${event.status}`
            });
        }
        
        // If GEO required, validate location
        if (event.geoRequired) {
            if (!location || !location.latitude || !location.longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Location is required for GEO-enabled events'
                });
            }
            
            // If event location is not configured, use user's location as initial event location
            if (!event.geoLocation || !event.geoLocation.latitude || !event.geoLocation.longitude) {
                event.geoLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    radius: event.geoLocation?.radius || 100, // Use existing radius or default to 100m
                    accuracy: location.accuracy || null
                };
            } else {
                // Validate user location against event location
                const validation = geoValidationService.validateLocation(
                    event.geoLocation,
                    location
                );
                
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.message,
                        distance: validation.distance
                    });
                }
            }
            
            // Update geoLocation with current accuracy if available
            if (location.accuracy) {
                event.geoLocation.accuracy = location.accuracy;
            }
        }
        
        // Status remains 'Planned' during execution (system-controlled)
        // Only transitions to 'Completed' or 'Cancelled' via explicit actions
        event.executionStartTime = new Date();
        // Note: For audit events, auditState is managed separately (Ready to start -> checked_in -> submitted)
        // Do not change auditState here
        
        // Add audit entry for execution start
        event.addAuditEntry('status_changed', req.user._id, null, 'execution_started', {
            location: location,
            deviceInfo: req.headers['user-agent'],
            executionStartTime: event.executionStartTime
        });
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        // Create tracking entry
        if (event.geoRequired && location) {
            await EventTracking.create({
                eventId: event._id,
                organizationId: event.organizationId,
                userId: req.user._id,
                entryType: 'GPS_POINT',
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy
                },
                timestamp: new Date(),
                deviceInfo: {
                    userAgent: req.headers['user-agent']
                }
            });
        }
        
        const populatedEvent = await Event.findById(event._id)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('linkedFormId', 'name formId formType status');
        
        res.status(200).json({
            success: true,
            message: 'Event started successfully.',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error starting event:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting event.',
            error: error.message
        });
    }
};

// Check-In (GEO mode)
exports.checkIn = async (req, res) => {
    try {
        const { id } = req.params;
        const { location, orgIndex } = req.body; // orgIndex for multi-org routes
        
        if (!location || !location.latitude || !location.longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location is required for check-in'
            });
        }
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        if (!event.geoRequired) {
            return res.status(400).json({
                success: false,
                message: 'This event does not require GEO check-in'
            });
        }
        
        // For multi-org routes, validate orgIndex
        let targetLocation = event.geoLocation;
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (!org) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization index'
                });
            }
            // Use org-specific location if available
            // For now, use event location
        }
        
        // If event location is not configured, use user's location as initial event location
        // This allows check-in even if the event location wasn't set during creation
        if (!event.geoLocation || !event.geoLocation.latitude || !event.geoLocation.longitude) {
            event.geoLocation = {
                latitude: location.latitude,
                longitude: location.longitude,
                radius: event.geoLocation?.radius || 100, // Use existing radius or default to 100m
                accuracy: location.accuracy || null
            };
            targetLocation = event.geoLocation;
            // Note: event will be saved at the end of this function
        }
        
        // Validate location
        const validation = geoValidationService.validateLocation(targetLocation, location);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message,
                distance: validation.distance
            });
        }
        
        // Check GPS accuracy
        const accuracyCheck = geoValidationService.checkAccuracy(location.accuracy);
        if (!accuracyCheck.acceptable) {
            return res.status(400).json({
                success: false,
                message: accuracyCheck.message
            });
        }
        
        // Update event
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (org) {
                org.checkIn = {
                    timestamp: new Date(),
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    }
                };
                org.status = 'IN_PROGRESS';
                event.currentOrgIndex = orgIndex;
            }
        } else {
            event.checkIn = {
                timestamp: new Date(),
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy
                },
                userId: req.user._id
            };
        }
        
        // Status remains 'Planned' during execution (system-controlled)
        // Update audit state for audit events
        if (event.auditState && ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.eventType)) {
            event.auditState = 'checked_in';
        }
        
        event.addAuditEntry('status_changed', req.user._id, null, 'checked_in', {
            location: location,
            orgIndex: orgIndex
        });
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        // Create tracking entry
        await EventTracking.create({
            eventId: event._id,
            organizationId: event.organizationId,
            userId: req.user._id,
            orgIndex: orgIndex || null,
            entryType: 'CHECK_IN',
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy
            },
            timestamp: new Date(),
            deviceInfo: {
                userAgent: req.headers['user-agent']
            }
        });
        
        // Event → Response execution handoff
        // If event has an assigned form, create/update response
        let formResponse = null;
        let formResponseId = null;
        
        if (event.linkedFormId) {
            try {
                const FormResponse = require('../models/FormResponse');
                const Form = require('../models/Form');
                
                // Verify form exists and is active
                const form = await Form.findOne({
                    _id: event.linkedFormId,
                    organizationId: event.organizationId,
                    status: 'Active'
                });
                
                if (form) {
                    // Check if response already exists for this event
                    formResponse = await FormResponse.findOne({
                        formId: event.linkedFormId,
                        organizationId: event.organizationId,
                        'linkedTo.type': 'Event',
                        'linkedTo.id': event._id,
                        executionStatus: { $in: ['Not Started', 'In Progress'] }
                    });
                    
                    if (!formResponse) {
                        // Create new response record
                        console.log('[checkIn] Creating new form response for event:', {
                            eventId: event._id,
                            eventIdField: event.eventId,
                            formId: event.linkedFormId,
                            organizationId: event.organizationId
                        });
                        
                        formResponse = new FormResponse({
                            formId: event.linkedFormId,
                            organizationId: event.organizationId,
                            submittedBy: req.user._id,
                            submittedAt: new Date(),
                            linkedTo: {
                                type: 'Event',
                                id: event._id // Use event._id (ObjectId) for consistent lookup
                            },
                            executionStatus: 'In Progress',
                            reviewStatus: null, // Review status only applies after submission
                            ipAddress: req.ip || req.connection.remoteAddress,
                            userAgent: req.get('user-agent')
                        });
                        
                        await formResponse.save();
                        console.log('[checkIn] ✅ Created form response:', {
                            responseId: formResponse._id,
                            linkedToId: formResponse.linkedTo.id,
                            linkedToIdType: typeof formResponse.linkedTo.id
                        });
                        
                        // Update event metadata with form response ID
                        if (!event.metadata) {
                            event.metadata = {};
                        }
                        if (!event.metadata.formResponses) {
                            event.metadata.formResponses = [];
                        }
                        if (!event.metadata.formResponses.includes(formResponse._id.toString())) {
                            event.metadata.formResponses.push(formResponse._id.toString());
                        }
                        await event.save();
                    } else {
                        // Update existing response to In Progress if it was Not Started
                        if (formResponse.executionStatus === 'Not Started') {
                            formResponse.executionStatus = 'In Progress';
                            await formResponse.save();
                        }
                    }
                    
                    formResponseId = formResponse._id.toString();
                }
            } catch (formError) {
                console.error('Error creating form response during check-in:', formError);
                // Don't fail check-in if form response creation fails
                // Log error but continue with check-in success
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Checked in successfully.',
            data: event,
            warning: accuracyCheck.warning ? accuracyCheck.message : null,
            formResponseId: formResponseId, // Include response ID for frontend redirect
            hasForm: !!event.linkedFormId
        });
    } catch (error) {
        console.error('Error checking in:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking in.',
            error: error.message
        });
    }
};

// Check-Out (GEO mode)
exports.checkOut = async (req, res) => {
    try {
        const { id } = req.params;
        const { location, orgIndex } = req.body;
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Allow checkout for both GEO and non-GEO events (after form submission)
        // For non-GEO events, checkout is allowed when status is CHECKOUT_PENDING
        if (!event.geoRequired && event.status !== 'CHECKOUT_PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Check-out is only available after form submission'
            });
        }
        
        // Update event
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (org) {
                org.checkOut = {
                    timestamp: new Date(),
                    location: location ? {
                        latitude: location.latitude,
                        longitude: location.longitude
                    } : null
                };
                org.status = 'COMPLETED';
                org.completedAt = new Date();
            }
        } else {
            event.checkOut = {
                timestamp: new Date(),
                location: location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy
                } : null,
                userId: req.user._id
            };
        }
        
        // Status remains 'Planned' during execution (system-controlled)
        // Only transitions to 'Completed' or 'Cancelled' via explicit actions
        event.modifiedBy = req.user._id;
        
        // Calculate execution duration (time from check-in to check-out, or from start to check-out)
        const checkoutTime = new Date();
        if (event.checkIn && event.checkIn.timestamp) {
            // Calculate from check-in to check-out
            const timeSpent = Math.floor((checkoutTime - event.checkIn.timestamp) / 1000);
            event.timeSpent = (event.timeSpent || 0) + timeSpent;
        } else if (event.executionStartTime) {
            // Calculate from execution start to check-out
            const timeSpent = Math.floor((checkoutTime - event.executionStartTime) / 1000);
            event.timeSpent = (event.timeSpent || 0) + timeSpent;
        }
        
        // Set execution end time
        event.executionEndTime = checkoutTime;
        
        event.addAuditEntry('status_changed', req.user._id, previousStatus, 'CHECKED_OUT', {
            location: location,
            orgIndex: orgIndex
        });
        
        await event.save();
        
        // Create tracking entry
        if (location) {
            await EventTracking.create({
                eventId: event._id,
                organizationId: event.organizationId,
                userId: req.user._id,
                orgIndex: orgIndex || null,
                entryType: 'CHECK_OUT',
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy
                },
                timestamp: new Date(),
                deviceInfo: {
                    userAgent: req.headers['user-agent']
                }
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Checked out successfully.',
            data: event
        });
    } catch (error) {
        console.error('Error checking out:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking out.',
            error: error.message
        });
    }
};

// Submit Audit Form
exports.submitAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const { formResponseId, orgIndex } = req.body;
        
        if (!formResponseId) {
            return res.status(400).json({
                success: false,
                message: 'Form response ID is required'
            });
        }
        
        const FormResponse = require('../models/FormResponse');
        
        // Verify form response exists and belongs to event's form
        const formResponse = await FormResponse.findOne({
            _id: formResponseId,
            organizationId: req.user.organizationId
        });
        
        if (!formResponse) {
            return res.status(404).json({
                success: false,
                message: 'Form response not found'
            });
        }
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Validate event type
        if (!['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.eventType)) {
            return res.status(400).json({
                success: false,
                message: 'This event type does not support audit submission'
            });
        }
        
        // Validate form response belongs to event's linked form
        if (formResponse.formId.toString() !== event.linkedFormId?.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Form response does not match event\'s linked form'
            });
        }
        
        // Validate check-in for GEO events
        if (event.geoRequired) {
            if (event.isMultiOrg && orgIndex !== undefined) {
                const org = event.orgList.find(o => o.sequence === orgIndex);
                if (!org || !org.checkIn || !org.checkIn.timestamp) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please check in before submitting audit'
                    });
                }
            } else {
                if (!event.checkIn || !event.checkIn.timestamp) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please check in before submitting audit'
                    });
                }
            }
        }
        
        // Check if form response has failures (needs corrective action)
        const hasFailures = formResponse.responseDetails?.some(detail => detail.passFail === 'Fail');
        
        // Automatically create corrective actions for all failed questions
        if (hasFailures) {
            const Form = require('../models/Form');
            const form = await Form.findById(event.linkedFormId);
            
            if (form) {
                // Helper function to find question in form structure
                const findQuestionInForm = (form, questionId) => {
                    if (!form.sections || !Array.isArray(form.sections)) {
                        return { question: null, section: null, subsection: null };
                    }
                    
                    for (const section of form.sections) {
                        // Check section-level questions
                        if (section.questions && Array.isArray(section.questions)) {
                            for (const question of section.questions) {
                                if (question.questionId === questionId) {
                                    return { question, section, subsection: null };
                                }
                            }
                        }
                        
                        // Check subsection-level questions
                        if (section.subsections && Array.isArray(section.subsections)) {
                            for (const subsection of section.subsections) {
                                if (subsection.questions && Array.isArray(subsection.questions)) {
                                    for (const question of subsection.questions) {
                                        if (question.questionId === questionId) {
                                            return { question, section, subsection };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    return { question: null, section: null, subsection: null };
                };
                
                // Get all failed questions
                const failedQuestions = formResponse.responseDetails.filter(detail => detail.passFail === 'Fail');
                
                // Initialize correctiveActions array if it doesn't exist
                if (!formResponse.correctiveActions) {
                    formResponse.correctiveActions = [];
                }
                
                // Create corrective action for each failed question
                for (const failedDetail of failedQuestions) {
                    // Check if corrective action already exists for this question
                    const existingAction = formResponse.correctiveActions.find(
                        action => action.questionId === failedDetail.questionId
                    );
                    
                    if (!existingAction) {
                        // Find question in form to get question text and section info
                        const { question, section } = findQuestionInForm(form, failedDetail.questionId);
                        
                        // Create new corrective action
                        const correctiveAction = {
                            eventId: event._id,
                            responseId: formResponse._id,
                            sectionId: failedDetail.sectionId || (section ? section.sectionId : null),
                            questionId: failedDetail.questionId,
                            questionText: question ? question.questionText : 'Unknown Question',
                            auditorFinding: failedDetail.answer ? String(failedDetail.answer) : '',
                            managerAction: {
                                comment: '',
                                proof: [],
                                status: 'open',
                                addedBy: null,
                                addedAt: null
                            },
                            auditorVerification: {
                                approved: false,
                                comment: '',
                                verifiedBy: null,
                                verifiedAt: null
                            }
                        };
                        
                        formResponse.correctiveActions.push(correctiveAction);
                    }
                }
                
                // Save form response with corrective actions
                await formResponse.save();
                
                // Notify the single corrective owner (explicit accountability)
                if (event.correctiveOwnerId) {
                    const User = require('../models/User');
                    const owner = await User.findById(event.correctiveOwnerId).select('email firstName lastName').lean();
                    // TODO: Implement notification service
                    console.log(`[Corrective Action] Created ${failedQuestions.length} corrective action(s) for event ${event.eventId}. Corrective Owner:`,
                        owner?.email || String(event.correctiveOwnerId));
                } else {
                    console.warn('[Corrective Action] Event has failures but no correctiveOwnerId set:', {
                        eventId: event._id,
                        eventIdField: event.eventId
                    });
                }
            }
        }
        
        // Update audit state - always set to submitted, then auto check-out
        event.auditState = 'submitted';
        
        // Auto check-out the event on form submission
        const checkoutTime = new Date();
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (org) {
                org.checkOut = {
                    timestamp: checkoutTime,
                    location: org.checkIn?.location || null
                };
            }
        } else {
            event.checkOut = {
                timestamp: checkoutTime,
                location: event.checkIn?.location || null,
                userId: req.user._id
            };
        }
        
        // Calculate execution duration
        if (event.checkIn && event.checkIn.timestamp) {
            const timeSpent = Math.floor((checkoutTime - event.checkIn.timestamp) / 1000);
            event.timeSpent = (event.timeSpent || 0) + timeSpent;
        }
        event.executionEndTime = checkoutTime;
        
        // Update auditState based on failures (status remains 'Planned' during workflow)
        if (hasFailures && formResponse.status === 'Pending Corrective Action') {
            event.auditState = 'pending_corrective';
            // Status remains 'Planned' - will transition to 'Completed' when audit workflow completes
        } else {
            // No failures - go directly to needs_review (auditor can approve/reject)
            // This allows auditor to review even when there are no failures
            event.auditState = 'needs_review';
            // Status remains 'Planned' - will transition to 'Completed' when approved
        }
        
        // Ensure correctiveOwnerId exists for audit events with failures
        if (hasFailures && !event.correctiveOwnerId) {
            console.warn('[submitAudit] Event has failures but no correctiveOwnerId set:', {
                eventId: event._id,
                eventIdField: event.eventId
            });
        }
        
        // Link form response to event (store in metadata)
        if (!event.metadata) {
            event.metadata = {};
        }
        if (!event.metadata.formResponses) {
            event.metadata.formResponses = [];
        }
        if (!event.metadata.formResponses.includes(formResponseId)) {
            event.metadata.formResponses.push(formResponseId);
        }
        
        // For multi-org, mark current org as completed
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (org) {
                org.status = 'COMPLETED';
                org.completedAt = new Date();
            }
        }
        
        event.addAuditEntry('status_changed', req.user._id, 'checked_in', event.auditState, {
            formResponseId: formResponseId,
            orgIndex: orgIndex,
            hasFailures: hasFailures,
            autoCheckedOut: true
        });
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        res.status(200).json({
            success: true,
            message: hasFailures 
                ? 'Audit submitted. Corrective actions required.' 
                : 'Audit submitted successfully.',
            data: event,
            requiresCorrective: hasFailures
        });
    } catch (error) {
        console.error('Error submitting audit:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting audit.',
            error: error.message
        });
    }
};

// Approve Audit
exports.approveAudit = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Validate event type
        if (!['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.eventType)) {
            return res.status(400).json({
                success: false,
                message: 'This event type does not support audit approval.'
            });
        }
        
        // Validate current state
        if (event.auditState !== 'needs_review') {
            return res.status(400).json({
                success: false,
                message: `Event is not in 'needs_review' state. Current state: ${event.auditState}`
            });
        }
        
        // Authorization: Only event owner (auditor) can approve
        if (event.eventOwnerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the event owner (auditor) can approve this audit.'
            });
        }
        
        // Get all form responses linked to this event
        const FormResponse = require('../models/FormResponse');
        const eventResponses = await FormResponse.find({
            'linkedTo.type': 'Event',
            'linkedTo.id': event._id,
            organizationId: req.user.organizationId
        });
        
        // Update event state: approved -> immediately closed -> Completed
        const previousState = event.auditState;
        const previousStatus = event.status;
        event.auditState = 'approved';
        event.modifiedBy = req.user._id;
        
        // Immediately transition to closed
        event.auditState = 'closed';
        
        // Set status to Completed (system-controlled transition)
        event.status = 'Completed';
        event.completedAt = new Date();
        
        await event.save();
        
        // Make all form responses read-only by marking them as approved and closed
        for (const response of eventResponses) {
            if (response.executionStatus === 'Submitted') {
                response.approved = true;
                response.approvedBy = req.user._id;
                response.approvedAt = new Date();
                // Set review status to Closed
                response.reviewStatus = 'Closed';
                await response.save();
            }
        }
        
        // Add audit entry for status change
        event.addAuditEntry('status_changed', req.user._id, previousStatus, 'Completed', {
            action: 'approved',
            approvedBy: req.user._id,
            auditState: 'closed',
            completedAt: event.completedAt
        });
        await event.save();
        
        const populatedEvent = await Event.findById(event._id)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .populate('modifiedBy', 'firstName lastName');
        
        res.status(200).json({
            success: true,
            message: 'Audit approved and closed successfully.',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error approving audit:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving audit.',
            error: error.message
        });
    }
};

// Reject Audit
exports.rejectAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body; // Optional rejection reason
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Validate event type
        if (!['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.eventType)) {
            return res.status(400).json({
                success: false,
                message: 'This event type does not support audit rejection.'
            });
        }
        
        // Validate current state
        if (event.auditState !== 'needs_review') {
            return res.status(400).json({
                success: false,
                message: `Event is not in 'needs_review' state. Current state: ${event.auditState}`
            });
        }
        
        // Authorization: Only event owner (auditor) can reject
        if (event.eventOwnerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the event owner (auditor) can reject this audit.'
            });
        }
        
        // Get all form responses linked to this event
        const FormResponse = require('../models/FormResponse');
        const eventResponses = await FormResponse.find({
            'linkedTo.type': 'Event',
            'linkedTo.id': event._id,
            organizationId: req.user.organizationId
        });
        
        // Reopen all corrective actions (set status back to 'open')
        let reopenedCount = 0;
        for (const response of eventResponses) {
            if (response.correctiveActions && Array.isArray(response.correctiveActions)) {
                for (const correctiveAction of response.correctiveActions) {
                    if (correctiveAction.eventId && 
                        correctiveAction.eventId.toString() === event._id.toString() &&
                        correctiveAction.managerAction.status === 'completed') {
                        correctiveAction.managerAction.status = 'open';
                        // Clear verification
                        correctiveAction.auditorVerification.approved = false;
                        correctiveAction.auditorVerification.comment = '';
                        correctiveAction.auditorVerification.verifiedBy = null;
                        correctiveAction.auditorVerification.verifiedAt = null;
                        reopenedCount++;
                    }
                }
                await response.save();
            }
        }
        
        // Update event state
        // Status remains 'Planned' when rejected (can be retried)
        const previousState = event.auditState;
        event.auditState = 'rejected';
        event.modifiedBy = req.user._id;
        await event.save();
        
        // Add audit entry
        event.addAuditEntry('status_changed', req.user._id, previousState, 'rejected', {
            action: 'rejected',
            rejectedBy: req.user._id,
            reason: reason || 'No reason provided',
            reopenedCorrectiveActions: reopenedCount
        });
        await event.save();
        
        // Notify corrective owner
        if (event.correctiveOwnerId) {
            const User = require('../models/User');
            const owner = await User.findById(event.correctiveOwnerId).select('email firstName lastName').lean();
            // TODO: Implement notification service
            console.log(`[Audit Rejection] Event ${event.eventId} rejected. Reopened ${reopenedCount} corrective action(s). Corrective Owner:`,
                owner?.email || String(event.correctiveOwnerId));
        }
        
        const populatedEvent = await Event.findById(event._id)
            .populate('eventOwnerId', 'firstName lastName email')
            .populate('relatedToId', 'name')
            .populate('modifiedBy', 'firstName lastName');
        
        res.status(200).json({
            success: true,
            message: `Audit rejected. ${reopenedCount} corrective action(s) reopened.`,
            data: populatedEvent,
            reopenedCount: reopenedCount
        });
    } catch (error) {
        console.error('Error rejecting audit:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting audit.',
            error: error.message
        });
    }
};

// Move to Next Org (Multi-org routes)
exports.moveToNextOrg = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        if (!event.isMultiOrg) {
            return res.status(400).json({
                success: false,
                message: 'This is not a multi-organization route event'
            });
        }
        
        const currentIndex = event.currentOrgIndex || 0;
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= event.orgList.length) {
            return res.status(400).json({
                success: false,
                message: 'All organizations in route have been visited'
            });
        }
        
        event.currentOrgIndex = nextIndex;
        event.modifiedBy = req.user._id;
        
        event.addAuditEntry('status_changed', req.user._id, 
            `Org ${currentIndex}`, `Org ${nextIndex}`, {
            action: 'MOVE_TO_NEXT_ORG'
        });
        
        await event.save();
        
        res.status(200).json({
            success: true,
            message: 'Moved to next organization.',
            data: event,
            currentOrg: event.orgList[nextIndex]
        });
    } catch (error) {
        console.error('Error moving to next org:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving to next organization.',
            error: error.message
        });
    }
};

// Create Order (Field Sales Beat)
exports.createOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderData, orgIndex } = req.body;
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        if (event.eventType !== 'Field Sales Beat') {
            return res.status(400).json({
                success: false,
                message: 'Orders can only be created for Field Sales Beat events'
            });
        }
        
        // Validate check-in if GEO required
        if (event.geoRequired) {
            if (event.isMultiOrg && orgIndex !== undefined) {
                const org = event.orgList.find(o => o.sequence === orgIndex);
                if (!org || !org.checkIn || !org.checkIn.timestamp) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please check in before creating order'
                    });
                }
            } else {
                if (!event.checkIn || !event.checkIn.timestamp) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please check in before creating order'
                    });
                }
            }
        }
        
        // Determine target org
        let targetOrgId = event.relatedToId; // Single org
        if (event.isMultiOrg && orgIndex !== undefined) {
            const org = event.orgList.find(o => o.sequence === orgIndex);
            if (!org) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization index'
                });
            }
            targetOrgId = org.organizationId;
        }
        
        // Create order
        const order = await EventOrder.create({
            eventId: event._id,
            organizationId: event.organizationId,
            targetOrgId: targetOrgId,
            orderType: 'ORDER',
            orderData: orderData,
            amount: orderData.amount || null,
            currency: orderData.currency || 'USD',
            status: 'CONFIRMED',
            createdBy: req.user._id
        });
        
        // Update KPI actuals
        event.kpiActuals = event.kpiActuals || {};
        event.kpiActuals.orderCount = (event.kpiActuals.orderCount || 0) + 1;
        event.kpiActuals.orderValue = (event.kpiActuals.orderValue || 0) + (orderData.amount || 0);
        event.kpiActuals.ordersCreated = (event.kpiActuals.ordersCreated || 0) + 1;
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully.',
            data: order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order.',
            error: error.message
        });
    }
};

// Complete Event - System-controlled status transition
exports.completeEvent = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Cannot complete if already cancelled
        if (event.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot complete a cancelled event.'
            });
        }
        
        // Already completed
        if (event.status === 'Completed') {
            return res.status(200).json({
                success: true,
                message: 'Event is already completed.',
                data: event
            });
        }
        
        // Validate all orgs completed for multi-org routes
        if (event.isMultiOrg) {
            const incompleteOrgs = event.orgList.filter(o => o.status !== 'COMPLETED');
            if (incompleteOrgs.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Please complete all organizations in route. ${incompleteOrgs.length} remaining.`
                });
            }
        }
        
        const oldStatus = event.status;
        
        // Update status to Completed
        event.status = 'Completed';
        event.completedAt = new Date();
        event.executionEndTime = new Date();
        
        // For audit events, also set auditState to closed if not already
        if (event.auditState && event.auditState !== 'closed') {
            event.auditState = 'closed';
        }
        
        // Add audit entry
        event.addAuditEntry('status_changed', req.user._id, oldStatus, 'Completed', {
            reason: 'Event manually completed',
            completedAt: event.completedAt
        });
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        res.status(200).json({
            success: true,
            message: 'Event completed successfully.',
            data: event
        });
    } catch (error) {
        console.error('Error completing event:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing event.',
            error: error.message
        });
    }
};

// Cancel Event - System-controlled status transition
exports.cancelEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body; // Optional cancellation reason
        
        const query = { organizationId: req.user.organizationId };
        if (id.match(/^[0-9a-f]{24}$/i)) {
            query._id = id;
        } else {
            query.eventId = id;
        }
        
        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }
        
        // Authorization: Only event owner or admin can cancel
        const isOwner = event.eventOwnerId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'Admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only event owner or admin can cancel this event.'
            });
        }
        
        // Cannot cancel if already completed
        if (event.status === 'Completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed event.'
            });
        }
        
        // Already cancelled
        if (event.status === 'Cancelled') {
            return res.status(200).json({
                success: true,
                message: 'Event is already cancelled.',
                data: event
            });
        }
        
        const oldStatus = event.status;
        
        // Update status to Cancelled
        event.status = 'Cancelled';
        event.cancelledAt = new Date();
        event.cancelledBy = req.user._id;
        if (reason) {
            event.cancellationReason = reason.substring(0, 500); // Enforce max length
        }
        
        // Add audit entry
        event.addAuditEntry('status_changed', req.user._id, oldStatus, 'Cancelled', {
            reason: reason || 'Event cancelled',
            cancelledAt: event.cancelledAt,
            cancelledBy: req.user._id
        });
        
        event.modifiedBy = req.user._id;
        await event.save();
        
        res.status(200).json({
            success: true,
            message: 'Event cancelled successfully.',
            data: event
        });
    } catch (error) {
        console.error('Error cancelling event:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling event.',
            error: error.message
        });
    }
};
