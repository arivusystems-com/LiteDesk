const Form = require('../models/Form');
const FormResponse = require('../models/FormResponse');
const Task = require('../models/Task');
const mongoose = require('mongoose');
const formProcessingService = require('../services/formProcessingService');

// @desc    Submit form response (public or authenticated)
// @route   POST /api/public/forms/:slug/submit OR POST /api/forms/:id/submit
// @access  Public (for public forms) or Private
exports.submitForm = async (req, res) => {
    try {
        let form;
        let organizationId;
        
        // Determine if this is a public submission or authenticated
        if (req.params.slug) {
            // Public form submission - allow both Active and Draft for preview
            form = await Form.findOne({
                'publicLink.slug': req.params.slug,
                'publicLink.enabled': true,
                status: { $in: ['Active', 'Draft'] } // Allow Draft for preview
            });
            
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found or not available.'
                });
            }
            
            // Check expiry
            if (form.expiryDate && new Date() > form.expiryDate) {
                return res.status(410).json({
                    success: false,
                    message: 'This form has expired.'
                });
            }
            
            organizationId = form.organizationId;
            if (!organizationId) {
                return res.status(500).json({
                    success: false,
                    message: 'Form organization ID is missing.'
                });
            }
        } else {
            // Authenticated form submission
            form = await Form.findOne({
                _id: req.params.id,
                organizationId: req.user.organizationId,
                status: 'Active'
            });
            
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found or access denied.'
                });
            }
            
            organizationId = req.user.organizationId;
        }
        
        const { responseDetails, linkedTo, eventId } = req.body;
        
        // Validate response details
        if (!responseDetails || !Array.isArray(responseDetails) || responseDetails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Response details are required.'
            });
        }
        
        // If eventId is provided, link to event
        let finalLinkedTo = linkedTo;
        if (eventId) {
            finalLinkedTo = {
                type: 'Event',
                id: eventId
            };
        }
        
        // Process submission using service
        const processedResponse = await formProcessingService.processSubmission({
            form,
            responseDetails,
            linkedTo: finalLinkedTo,
            organizationId,
            submittedBy: req.user ? req.user._id : null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
        });
        
        // If eventId provided, update event metadata with form response ID
        if (eventId && processedResponse && processedResponse._id) {
            try {
                const Event = require('../models/Event');
                const event = await Event.findOne({
                    $or: [
                        { _id: eventId },
                        { eventId: eventId }
                    ],
                    organizationId: organizationId
                });
                
                if (event) {
                    if (!event.metadata) {
                        event.metadata = {};
                    }
                    if (!event.metadata.formResponses) {
                        event.metadata.formResponses = [];
                    }
                    if (!event.metadata.formResponses.includes(processedResponse._id.toString())) {
                        event.metadata.formResponses.push(processedResponse._id.toString());
                    }
                    await event.save();
                }
            } catch (err) {
                console.error('Error updating event metadata:', err);
                // Don't fail the form submission if event update fails
            }
        }
        
        res.status(201).json({
            success: true,
            data: processedResponse,
            message: 'Form submitted successfully'
        });
    } catch (error) {
        console.error('Submit form error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting form.',
            error: error.message
        });
    }
};

// @desc    Get all responses for an organization (across all forms)
// @route   GET /api/responses
// @access  Private
exports.getAllResponses = async (req, res) => {
    try {
        const query = {
            organizationId: req.user.organizationId
        };
        
        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Filter out archived/invalidated by default (unless explicitly requested)
        // Handle cases where fields might not exist in older documents
        const archiveInvalidateConditions = [];
        if (req.query.includeArchived !== 'true') {
            archiveInvalidateConditions.push({
                $or: [
                    { archived: { $exists: false } },
                    { archived: false },
                    { archived: null }
                ]
            });
        }
        if (req.query.includeInvalidated !== 'true') {
            archiveInvalidateConditions.push({
                $or: [
                    { invalidated: { $exists: false } },
                    { invalidated: false },
                    { invalidated: null }
                ]
            });
        }
        if (archiveInvalidateConditions.length > 0) {
            query.$and = (query.$and || []).concat(archiveInvalidateConditions);
        }
        
        // Get filters
        if (req.query.reviewStatus) {
            query.reviewStatus = req.query.reviewStatus;
        }
        if (req.query.executionStatus) {
            query.executionStatus = req.query.executionStatus;
        }
        // Backward compatibility: support old 'status' parameter
        if (req.query.status && !req.query.reviewStatus) {
            query.reviewStatus = req.query.status;
        }
        if (req.query.formId) {
            query.formId = req.query.formId;
        }
        if (req.query.linkedToType) {
            query['linkedTo.type'] = req.query.linkedToType;
        }
        if (req.query.linkedToId) {
            query['linkedTo.id'] = req.query.linkedToId;
        }
        
        // Date range filter
        if (req.query.fromDate || req.query.toDate) {
            query.submittedAt = {};
            if (req.query.fromDate) {
                query.submittedAt.$gte = new Date(req.query.fromDate);
            }
            if (req.query.toDate) {
                query.submittedAt.$lte = new Date(req.query.toDate);
            }
        }
        
        // Sorting
        const sortBy = req.query.sortBy || 'submittedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };
        
        // Execute query - handle populate errors gracefully
        let responses;
        try {
            responses = await FormResponse.find(query)
                .populate('formId', 'name formId formType')
                .populate('submittedBy', 'firstName lastName email')
                .populate('linkedTo.id')
                .sort(sort)
                .limit(limit)
                .skip(skip);
        } catch (populateError) {
            console.error('Populate error in getAllResponses:', populateError);
            // Try without populate if there's an error
            responses = await FormResponse.find(query)
                .sort(sort)
                .limit(limit)
                .skip(skip);
        }
        
        const total = await FormResponse.countDocuments(query);
        
        // Get statistics (exclude archived/invalidated unless explicitly requested)
        const statsMatch = { organizationId: req.user.organizationId };
        const statsArchiveInvalidateConditions = [];
        if (req.query.includeArchived !== 'true') {
            statsArchiveInvalidateConditions.push({
                $or: [
                    { archived: { $exists: false } },
                    { archived: false },
                    { archived: null }
                ]
            });
        }
        if (req.query.includeInvalidated !== 'true') {
            statsArchiveInvalidateConditions.push({
                $or: [
                    { invalidated: { $exists: false } },
                    { invalidated: false },
                    { invalidated: null }
                ]
            });
        }
        if (statsArchiveInvalidateConditions.length > 0) {
            statsMatch.$and = statsArchiveInvalidateConditions;
        }
        
        const stats = await FormResponse.aggregate([
            { $match: statsMatch },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$reviewStatus', 'Pending Corrective Action'] }, 1, 0] } },
                    needsReview: { $sum: { $cond: [{ $eq: ['$reviewStatus', 'Needs Auditor Review'] }, 1, 0] } },
                    approved: { $sum: { $cond: [{ $eq: ['$reviewStatus', 'Approved'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$reviewStatus', 'Rejected'] }, 1, 0] } },
                    closed: { $sum: { $cond: [{ $eq: ['$reviewStatus', 'Closed'] }, 1, 0] } },
                    notStarted: { $sum: { $cond: [{ $eq: ['$executionStatus', 'Not Started'] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ['$executionStatus', 'In Progress'] }, 1, 0] } },
                    submitted: { $sum: { $cond: [{ $eq: ['$executionStatus', 'Submitted'] }, 1, 0] } }
                }
            }
        ]);
        
        const statistics = stats[0] || {
            total: 0,
            pending: 0,
            needsReview: 0,
            approved: 0,
            rejected: 0,
            closed: 0
        };
        
        res.status(200).json({
            success: true,
            data: responses,
            pagination: {
                currentPage: page,
                limit,
                totalResponses: total,
                totalPages: Math.ceil(total / limit)
            },
            statistics
        });
    } catch (error) {
        console.error('Get all responses error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching responses.',
            error: error.message
        });
    }
};

// @desc    Get all responses for a form
// @route   GET /api/forms/:id/responses
// @access  Private
exports.getResponses = async (req, res) => {
    try {
        const form = await Form.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found or access denied.'
            });
        }
        
        const query = {
            formId: req.params.id,
            organizationId: req.user.organizationId
        };
        
        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Filter out archived/invalidated by default (unless explicitly requested)
        // Handle cases where fields might not exist in older documents
        const archiveInvalidateConditions = [];
        if (req.query.includeArchived !== 'true') {
            archiveInvalidateConditions.push({
                $or: [
                    { archived: { $exists: false } },
                    { archived: false },
                    { archived: null }
                ]
            });
        }
        if (req.query.includeInvalidated !== 'true') {
            archiveInvalidateConditions.push({
                $or: [
                    { invalidated: { $exists: false } },
                    { invalidated: false },
                    { invalidated: null }
                ]
            });
        }
        if (archiveInvalidateConditions.length > 0) {
            query.$and = (query.$and || []).concat(archiveInvalidateConditions);
        }
        
        // Get filters
        if (req.query.reviewStatus) {
            query.reviewStatus = req.query.reviewStatus;
        }
        if (req.query.executionStatus) {
            query.executionStatus = req.query.executionStatus;
        }
        // Backward compatibility: support old 'status' parameter
        if (req.query.status && !req.query.reviewStatus) {
            query.reviewStatus = req.query.status;
        }
        if (req.query.linkedToType) {
            query['linkedTo.type'] = req.query.linkedToType;
        }
        if (req.query.linkedToId) {
            query['linkedTo.id'] = req.query.linkedToId;
        }
        
        // Date range filter
        if (req.query.fromDate || req.query.toDate) {
            query.submittedAt = {};
            if (req.query.fromDate) {
                query.submittedAt.$gte = new Date(req.query.fromDate);
            }
            if (req.query.toDate) {
                query.submittedAt.$lte = new Date(req.query.toDate);
            }
        }
        
        // Sorting
        const sortBy = req.query.sortBy || 'submittedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };
        
        // Execute query
        const responses = await FormResponse.find(query)
            .populate('submittedBy', 'firstName lastName email')
            .populate('linkedTo.id')
            .sort(sort)
            .limit(limit)
            .skip(skip);
        
        const total = await FormResponse.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: responses,
            pagination: {
                currentPage: page,
                limit,
                totalResponses: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get responses error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching responses.',
            error: error.message
        });
    }
};

// @desc    Get single response
// @route   GET /api/forms/:id/responses/:responseId
// @access  Private
exports.getResponseById = async (req, res) => {
    try {
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('submittedBy', 'firstName lastName email')
        .populate('linkedTo.id')
        .populate('correctiveActions.managerAction.addedBy', 'firstName lastName email')
        .populate('correctiveActions.auditorVerification.verifiedBy', 'firstName lastName email')
        .populate('finalReport.previousResponseId');
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Get response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching response.',
            error: error.message
        });
    }
};

// @desc    Update response status
// @route   PATCH /api/forms/:id/responses/:responseId/status
// @access  Private
// @deprecated Status is now computed automatically. Use approve/reject endpoints instead.
exports.updateResponseStatus = async (req, res) => {
    try {
        // Status is now computed automatically based on business rules
        // This endpoint is deprecated but kept for backwards compatibility
        // Only 'Rejected' status can be set manually, all other statuses are computed
        const { status } = req.body;
        
        const validStatuses = ['Pending Corrective Action', 'Needs Auditor Review', 'Approved', 'Rejected', 'Closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review status.'
            });
        }
        
        // Only allow setting 'Rejected' status manually, all others are computed
        if (status !== 'Rejected') {
            return res.status(400).json({
                success: false,
                message: 'Status is computed automatically. Only "Rejected" status can be set manually. Use approve/reject endpoints instead.'
            });
        }
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        if (response.executionStatus === 'Submitted') {
            // Only allow Rejected status to be set manually
            response.reviewStatus = 'Rejected';
            response.approved = false; // Reset approval if rejecting
        } else {
            return res.status(400).json({
                success: false,
                message: 'Review status can only be updated after response is submitted.'
            });
        }
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
        .populate('submittedBy', 'firstName lastName email');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Response status updated successfully'
        });
    } catch (error) {
        console.error('Update response status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating response status.',
            error: error.message
        });
    }
};

// @desc    Add corrective action
// @route   POST /api/forms/:id/responses/:responseId/corrective-action
// @access  Private
exports.addCorrectiveAction = async (req, res) => {
    try {
        const { questionId, comment, status } = req.body;
        
        // Handle file uploads
        const proofUrls = [];
        if (req.files && req.files.length > 0) {
            const { getFileUrl } = require('../middleware/uploadMiddleware');
            proofUrls.push(...req.files.map(file => getFileUrl(req, file.filename)));
        } else if (req.body.proof && Array.isArray(req.body.proof)) {
            // If proof URLs are already provided (from existing files)
            proofUrls.push(...req.body.proof);
        }
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Immutability check: Corrective actions can only be added to submitted responses
        if (response.executionStatus !== 'Submitted') {
            return res.status(400).json({
                success: false,
                message: 'Corrective actions can only be added to submitted responses.'
            });
        }
        
        // Find the question in response details
        const questionResponse = response.responseDetails.find(detail => detail.questionId === questionId);
        if (!questionResponse) {
            return res.status(404).json({
                success: false,
                message: 'Question not found in response.'
            });
        }
        
        // Get form to find question text
        const Form = require('../models/Form');
        const form = await Form.findById(req.params.id);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found.'
            });
        }
        
        // Find question text from form
        let questionText = '';
        for (const section of form.sections) {
            for (const subsection of section.subsections) {
                const question = subsection.questions.find(q => q.questionId === questionId);
                if (question) {
                    questionText = question.questionText;
                    break;
                }
            }
            if (questionText) break;
        }
        
        if (!questionText) {
            return res.status(404).json({
                success: false,
                message: 'Question not found in form.'
            });
        }
        
        // Find or create corrective action
        let correctiveAction = response.correctiveActions.find(action => action.questionId === questionId);
        
        if (correctiveAction) {
            // Update existing corrective action
            correctiveAction.managerAction.comment = comment || correctiveAction.managerAction.comment;
            // Merge new proof files with existing ones
            const existingProof = correctiveAction.managerAction.proof || [];
            correctiveAction.managerAction.proof = [...existingProof, ...proofUrls];
            correctiveAction.managerAction.status = status || correctiveAction.managerAction.status;
            correctiveAction.managerAction.addedBy = req.user._id;
            correctiveAction.managerAction.addedAt = new Date();
        } else {
            // Create new corrective action
            correctiveAction = {
                questionId,
                questionText: questionText,
                auditorFinding: questionResponse.answer || '',
                managerAction: {
                    comment: comment || '',
                    proof: proofUrls,
                    status: status || 'Pending',
                    addedBy: req.user._id,
                    addedAt: new Date()
                },
                auditorVerification: {
                    approved: false
                }
            };
            response.correctiveActions.push(correctiveAction);
        }
        
        // Status will be computed automatically by pre-save hook based on business rules
        // No need to manually set reviewStatus
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('correctiveActions.managerAction.addedBy', 'firstName lastName email');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Corrective action added successfully'
        });
    } catch (error) {
        console.error('Add corrective action error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding corrective action.',
            error: error.message
        });
    }
};

// @desc    Verify corrective action
// @route   POST /api/forms/:id/responses/:responseId/verify
// @access  Private
exports.verifyCorrectiveAction = async (req, res) => {
    try {
        const { questionId, approved, comment } = req.body;
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        const correctiveAction = response.correctiveActions.find(action => action.questionId === questionId);
        if (!correctiveAction) {
            return res.status(404).json({
                success: false,
                message: 'Corrective action not found.'
            });
        }
        
        // Update verification
        correctiveAction.auditorVerification.approved = approved;
        correctiveAction.auditorVerification.comment = comment || '';
        correctiveAction.auditorVerification.verifiedBy = req.user._id;
        correctiveAction.auditorVerification.verifiedAt = new Date();
        
        // Status will be computed automatically by pre-save hook based on business rules
        // No need to manually set reviewStatus
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('correctiveActions.managerAction.addedBy', 'firstName lastName email')
            .populate('correctiveActions.auditorVerification.verifiedBy', 'firstName lastName email');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Corrective action verified successfully'
        });
    } catch (error) {
        console.error('Verify corrective action error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying corrective action.',
            error: error.message
        });
    }
};

// @desc    Approve response
// @route   POST /api/forms/:id/responses/:responseId/approve
// @access  Private
exports.approveResponse = async (req, res) => {
    try {
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        if (response.executionStatus === 'Submitted') {
            // Set approved flag - status will be computed automatically by pre-save hook
            response.approved = true;
            response.approvedBy = req.user._id;
            response.approvedAt = new Date();
            // Reset rejected status if it was previously rejected
            if (response.reviewStatus === 'Rejected') {
                response.reviewStatus = null; // Will be recomputed
            }
        }
        await response.save();
        
        res.status(200).json({
            success: true,
            data: response,
            message: 'Response approved successfully'
        });
    } catch (error) {
        console.error('Approve response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving response.',
            error: error.message
        });
    }
};

// @desc    Reject response
// @route   POST /api/forms/:id/responses/:responseId/reject
// @access  Private
exports.rejectResponse = async (req, res) => {
    try {
        const { reason } = req.body;
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        if (response.executionStatus === 'Submitted') {
            // Set rejected status (this is one status that can be set manually)
            response.reviewStatus = 'Rejected';
            response.approved = false; // Reset approval when rejecting
            response.approvedBy = null;
            response.approvedAt = null;
        }
        // Could add rejection reason field if needed
        await response.save();
        
        res.status(200).json({
            success: true,
            data: response,
            message: 'Response rejected successfully'
        });
    } catch (error) {
        console.error('Reject response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting response.',
            error: error.message
        });
    }
};

// @desc    Delete response (non-audit only)
// @route   DELETE /api/forms/:id/responses/:responseId
// @access  Private
exports.deleteResponse = async (req, res) => {
    try {
        // Get response and form to check if it's an audit
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        }).populate('formId', 'formType');
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Check if form is an Audit type
        const formType = response.formId?.formType || (response.formId && typeof response.formId === 'object' ? response.formId.formType : null);
        
        // If we don't have formType from populate, fetch form directly
        let isAuditForm = false;
        if (!formType) {
            const Form = require('../models/Form');
            const form = await Form.findById(req.params.id);
            if (form && form.formType === 'Audit') {
                isAuditForm = true;
            }
        } else if (formType === 'Audit') {
            isAuditForm = true;
        }
        
        // Prevent hard delete for audit responses
        if (isAuditForm) {
            return res.status(403).json({
                success: false,
                message: 'Audit responses cannot be deleted. Use archive or invalidate instead.',
                code: 'AUDIT_DELETE_FORBIDDEN'
            });
        }
        
        // Prevent deletion of submitted responses (non-audit)
        if (response.executionStatus === 'Submitted') {
            return res.status(403).json({
                success: false,
                message: 'Submitted responses cannot be deleted. Use archive or invalidate instead.',
                code: 'SUBMITTED_DELETE_FORBIDDEN'
            });
        }
        
        // If response is linked to an event, clean up event metadata
        if (response.linkedTo && response.linkedTo.type === 'Event') {
            try {
                const Event = require('../models/Event');
                const event = await Event.findOne({
                    $or: [
                        { _id: response.linkedTo.id },
                        { eventId: response.linkedTo.id }
                    ],
                    organizationId: req.user.organizationId
                });
                
                if (event && event.metadata && event.metadata.formResponses) {
                    event.metadata.formResponses = event.metadata.formResponses.filter(
                        id => id.toString() !== response._id.toString()
                    );
                    await event.save();
                }
            } catch (err) {
                console.error('Error cleaning up event metadata:', err);
                // Continue with deletion even if cleanup fails
            }
        }
        
        const result = await FormResponse.findOneAndDelete({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        res.status(200).json({
            success: true,
            message: 'Response deleted successfully'
        });
    } catch (error) {
        console.error('Delete response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting response.',
            error: error.message
        });
    }
};

// @desc    Export responses
// @route   GET /api/forms/:id/responses/export
// @access  Private
exports.exportResponses = async (req, res) => {
    try {
        const form = await Form.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found or access denied.'
            });
        }
        
        const responses = await FormResponse.find({
            formId: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('submittedBy', 'firstName lastName email')
        .sort({ submittedAt: -1 });
        
        // Convert to CSV format (simplified - in production, use a CSV library)
        const csvRows = [];
        
        // Header row
        const headers = ['Response ID', 'Submitted By', 'Submitted At', 'Execution Status', 'Review Status', 'Compliance %', 'Rating', 'Final Score'];
        csvRows.push(headers.join(','));
        
        // Data rows
        responses.forEach(response => {
            const row = [
                response.responseId,
                response.submittedBy ? `${response.submittedBy.firstName} ${response.submittedBy.lastName}` : 'N/A',
                response.submittedAt.toISOString(),
                response.executionStatus || 'N/A',
                response.reviewStatus || 'N/A',
                response.kpis.compliancePercentage,
                response.kpis.rating,
                response.kpis.finalScore
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=form-responses-${form.formId}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export responses error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting responses.',
            error: error.message
        });
    }
};

// @desc    Get response comparison
// @route   GET /api/forms/:id/responses/:responseId/compare
// @access  Private
exports.getResponseComparison = async (req, res) => {
    try {
        const { previousResponseId, compareWith = 'last_audit' } = req.query;
        
        const currentResponse = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!currentResponse) {
            return res.status(404).json({
                success: false,
                message: 'Current response not found or access denied.'
            });
        }
        
        let previousResponse = null;
        
        if (previousResponseId) {
            // Compare with specific response
            previousResponse = await FormResponse.findOne({
                _id: previousResponseId,
                formId: req.params.id,
                organizationId: req.user.organizationId
            });
        } else if (compareWith === 'last_audit') {
            // Get most recent response before current one
            previousResponse = await FormResponse.findOne({
                formId: req.params.id,
                organizationId: req.user.organizationId,
                submittedAt: { $lt: currentResponse.submittedAt }
            })
            .sort({ submittedAt: -1 });
        } else if (compareWith === 'average') {
            // Calculate average from all previous responses
            const previousResponses = await FormResponse.find({
                formId: req.params.id,
                organizationId: req.user.organizationId,
                submittedAt: { $lt: currentResponse.submittedAt }
            })
            .sort({ submittedAt: -1 })
            .limit(10);
            
            if (previousResponses.length > 0) {
                // Create an average response object
                const avgKpis = {
                    compliancePercentage: previousResponses.reduce((sum, r) => sum + (r.kpis?.compliancePercentage || 0), 0) / previousResponses.length,
                    finalScore: previousResponses.reduce((sum, r) => sum + (r.kpis?.finalScore || 0), 0) / previousResponses.length,
                    rating: previousResponses.reduce((sum, r) => sum + (r.kpis?.rating || 0), 0) / previousResponses.length,
                    totalPassed: previousResponses.reduce((sum, r) => sum + (r.kpis?.totalPassed || 0), 0) / previousResponses.length,
                    totalFailed: previousResponses.reduce((sum, r) => sum + (r.kpis?.totalFailed || 0), 0) / previousResponses.length
                };
                
                // Calculate average section scores
                const avgSectionScores = {};
                const sectionScoresMap = {};
                previousResponses.forEach(r => {
                    if (r.sectionScores && typeof r.sectionScores === 'object') {
                        Object.entries(r.sectionScores).forEach(([sectionId, score]) => {
                            if (!sectionScoresMap[sectionId]) {
                                sectionScoresMap[sectionId] = [];
                            }
                            sectionScoresMap[sectionId].push(score);
                        });
                    }
                });
                
                Object.entries(sectionScoresMap).forEach(([sectionId, scores]) => {
                    avgSectionScores[sectionId] = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
                });
                
                previousResponse = {
                    _id: 'average',
                    kpis: avgKpis,
                    sectionScores: avgSectionScores,
                    submittedAt: previousResponses[0].submittedAt // Use most recent date
                };
            }
        }
        
        if (!previousResponse) {
            return res.status(200).json({
                success: true,
                data: {
                    current: currentResponse,
                    previous: null,
                    comparison: null,
                    message: 'No previous response found for comparison'
                }
            });
        }
        
        // Calculate comparison metrics
        const comparison = {
            overallScore: {
                current: currentResponse.kpis?.finalScore || 0,
                previous: previousResponse.kpis?.finalScore || 0,
                difference: (currentResponse.kpis?.finalScore || 0) - (previousResponse.kpis?.finalScore || 0)
            },
            complianceChange: (currentResponse.kpis?.compliancePercentage || 0) - (previousResponse.kpis?.compliancePercentage || 0),
            ratingChange: (currentResponse.kpis?.rating || 0) - (previousResponse.kpis?.rating || 0),
            scoreChange: (currentResponse.kpis?.finalScore || 0) - (previousResponse.kpis?.finalScore || 0),
            passedChange: (currentResponse.kpis?.totalPassed || 0) - (previousResponse.kpis?.totalPassed || 0),
            failedChange: (currentResponse.kpis?.totalFailed || 0) - (previousResponse.kpis?.totalFailed || 0)
        };
        
        // Calculate section-level comparison
        const sectionComparison = {};
        if (currentResponse.sectionScores && previousResponse.sectionScores) {
            const allSectionIds = new Set([
                ...Object.keys(currentResponse.sectionScores),
                ...Object.keys(previousResponse.sectionScores)
            ]);
            
            allSectionIds.forEach(sectionId => {
                const current = currentResponse.sectionScores[sectionId] || 0;
                const previous = previousResponse.sectionScores[sectionId] || 0;
                sectionComparison[sectionId] = {
                    current,
                    previous,
                    difference: current - previous
                };
            });
        }
        
        // Get trends data
        const reportGenerationService = require('../services/reportGenerationService');
        const trends = await reportGenerationService.buildTrendsChart(req.params.id, 5);
        
        res.status(200).json({
            success: true,
            data: {
                current: currentResponse,
                previous: previousResponse,
                comparison,
                sectionComparison,
                trends
            }
        });
    } catch (error) {
        console.error('Get response comparison error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching response comparison.',
            error: error.message
        });
    }
};

// @desc    Generate report
// @route   POST /api/forms/:id/responses/:responseId/generate-report
// @access  Private
exports.generateReport = async (req, res) => {
    try {
        const reportGenerationService = require('../services/reportGenerationService');
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('formId')
        .populate('submittedBy', 'firstName lastName email');
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Validate status - only allow report generation for Approved or Closed statuses
        const reviewStatus = response.reviewStatus || response.status;
        if (reviewStatus === 'Pending Corrective Action' || reviewStatus === 'Needs Auditor Review') {
            return res.status(400).json({
                success: false,
                message: 'Report can be generated after the response is approved.'
            });
        }
        
        if (reviewStatus !== 'Approved' && reviewStatus !== 'Closed') {
            return res.status(400).json({
                success: false,
                message: 'Report can only be generated for approved or closed responses.'
            });
        }
        
        // Generate report data
        const reportData = await reportGenerationService.generateReport(response._id);
        
        // Add corrective actions if available
        if (response.correctiveActions && response.correctiveActions.length > 0) {
            reportData.correctiveActions = reportGenerationService.buildCorrectiveActionsSection(response.correctiveActions).actions;
        }
        
        // Generate PDF
        let reportUrl = null;
        try {
            reportUrl = await reportGenerationService.exportToPDF(reportData, req.user.organizationId.toString());
            reportData.reportUrl = reportUrl;
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            // Continue without PDF if generation fails
        }
        
        // Update response with report URL
        response.reportGenerated = true;
        response.reportUrl = reportUrl;
        await response.save();
        
        res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            data: reportData
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating report.',
            error: error.message
        });
    }
};

// @desc    Export report to Excel
// @route   POST /api/forms/:id/responses/:responseId/export-excel
// @access  Private
exports.exportExcel = async (req, res) => {
    try {
        const reportGenerationService = require('../services/reportGenerationService');
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('formId')
        .populate('submittedBy', 'firstName lastName email');
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Validate status - only allow report generation for Approved or Closed statuses
        const reviewStatus = response.reviewStatus || response.status;
        if (reviewStatus === 'Pending Corrective Action' || reviewStatus === 'Needs Auditor Review') {
            return res.status(400).json({
                success: false,
                message: 'Report can be generated after the response is approved.'
            });
        }
        
        if (reviewStatus !== 'Approved' && reviewStatus !== 'Closed') {
            return res.status(400).json({
                success: false,
                message: 'Report can only be generated for approved or closed responses.'
            });
        }
        
        // Generate report data
        const reportData = await reportGenerationService.generateReport(response._id);
        
        // Add corrective actions if available
        if (response.correctiveActions && response.correctiveActions.length > 0) {
            reportData.correctiveActions = reportGenerationService.buildCorrectiveActionsSection(response.correctiveActions).actions;
        }
        
        // Generate Excel
        let excelUrl = null;
        try {
            excelUrl = await reportGenerationService.exportToExcel(reportData, req.user.organizationId.toString());
        } catch (excelError) {
            console.error('Excel generation error:', excelError);
            return res.status(500).json({
                success: false,
                message: 'Error generating Excel report.',
                error: excelError.message
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Excel report generated successfully',
            data: {
                excelUrl,
                reportData
            }
        });
    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting Excel report.',
            error: error.message
        });
    }
};

// @desc    Generate comprehensive PDF report (world-class audit report)
// @route   POST /api/forms/:id/responses/:responseId/generate-comprehensive-report
// @access  Private
exports.generateComprehensiveReport = async (req, res) => {
    try {
        console.log('Generate comprehensive report called for form:', req.params.id, 'response:', req.params.responseId);
        const enhancedPdfReportService = require('../services/enhancedPdfReportService');
        const reportTemplateService = require('../services/reportTemplateService');
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('formId')
        .populate('submittedBy', 'firstName lastName email')
        .populate('organizationId', 'name');

        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }

        // Validate status - only allow report generation for Approved or Closed statuses
        const reviewStatus = response.reviewStatus || response.status;
        if (reviewStatus === 'Pending Corrective Action' || reviewStatus === 'Needs Auditor Review') {
            return res.status(400).json({
                success: false,
                message: 'Report can be generated after the response is approved.'
            });
        }
        
        if (reviewStatus !== 'Approved' && reviewStatus !== 'Closed') {
            return res.status(400).json({
                success: false,
                message: 'Report can only be generated for approved or closed responses.'
            });
        }

        // Validate that formId exists and is populated
        if (!response.formId) {
            console.error('FormId is null/undefined for response:', req.params.responseId);
            return res.status(400).json({
                success: false,
                message: 'Form data not found. Cannot generate report.'
            });
        }
        
        // Check if formId is populated (has a name property) - if not, populate it
        if (typeof response.formId === 'object' && !response.formId.name) {
            console.log('FormId not fully populated, fetching form...');
            const formIdToFetch = response.formId._id || response.formId || req.params.id;
            const form = await Form.findById(formIdToFetch);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found. Cannot generate report.'
                });
            }
            response.formId = form;
        } else if (typeof response.formId !== 'object') {
            // formId is just an ObjectId string, populate it
            console.log('FormId is just an ObjectId string, populating...');
            const form = await Form.findById(response.formId);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found. Cannot generate report.'
                });
            }
            response.formId = form;
        }

        // Validate that organizationId exists
        if (!response.organizationId) {
            console.error('OrganizationId is null/undefined for response:', req.params.responseId);
            return res.status(400).json({
                success: false,
                message: 'Organization data not found. Cannot generate report.'
            });
        }

        // Get template configuration from request body or use default
        const customTemplate = req.body.templateConfig || {};
        const templateConfig = reportTemplateService.mergeTemplate(customTemplate);
        
        // Validate template
        const validation = reportTemplateService.validateTemplate(templateConfig);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template configuration',
                errors: validation.errors
            });
        }

        // Set defaults from response if not provided
        if (!templateConfig.hotelName && response.formId.name) {
            templateConfig.hotelName = response.formId.name;
        }
        if (!templateConfig.checkInDate) {
            templateConfig.checkInDate = response.submittedAt;
        }
        if (!templateConfig.checkOutDate) {
            templateConfig.checkOutDate = response.submittedAt;
        }

        // Generate comprehensive PDF report
        const options = {
            organizationId: req.user.organizationId.toString(),
            templateConfig,
            includeComparison: req.body.includeComparison || false,
            previousResponseId: req.body.previousResponseId || null
        };

        console.log('Calling enhancedPdfReportService.generateComprehensiveReport with response ID:', response._id);
        const pdfUrl = await enhancedPdfReportService.generateComprehensiveReport(
            response._id,
            options
        );
        console.log('PDF URL generated:', pdfUrl);

        // Update response with report URL
        response.reportGenerated = true;
        response.reportUrl = pdfUrl;
        if (!response.finalReport) {
            response.finalReport = {};
        }
        response.finalReport.reportUrl = pdfUrl;
        response.finalReport.generatedAt = new Date();
        response.finalReport.includesComparison = options.includeComparison;
        if (options.previousResponseId) {
            response.finalReport.previousResponseId = options.previousResponseId;
        }
        await response.save();

        res.status(200).json({
            success: true,
            message: 'Comprehensive report generated successfully',
            data: {
                reportUrl: pdfUrl,
                responseId: response._id,
                formId: (response.formId && response.formId._id) ? response.formId._id : req.params.id,
                generatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Generate comprehensive report error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            params: {
                formId: req.params.id,
                responseId: req.params.responseId
            }
        });
        res.status(500).json({
            success: false,
            message: 'Error generating comprehensive report.',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Archive response (for audit integrity)
// @route   POST /api/forms/:id/responses/:responseId/archive
// @access  Private
exports.archiveResponse = async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Archive reason is required.'
            });
        }
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Archive the response
        response.archived = true;
        response.archivedAt = new Date();
        response.archivedBy = req.user._id;
        response.archiveReason = reason.trim();
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('archivedBy', 'firstName lastName email')
            .populate('formId', 'name formId formType');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Response archived successfully'
        });
    } catch (error) {
        console.error('Archive response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error archiving response.',
            error: error.message
        });
    }
};

// @desc    Invalidate response (for audit integrity)
// @route   POST /api/forms/:id/responses/:responseId/invalidate
// @access  Private
exports.invalidateResponse = async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalidation reason is required.'
            });
        }
        
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Invalidate the response
        response.invalidated = true;
        response.invalidatedAt = new Date();
        response.invalidatedBy = req.user._id;
        response.invalidationReason = reason.trim();
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('invalidatedBy', 'firstName lastName email')
            .populate('formId', 'name formId formType');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Response invalidated successfully'
        });
    } catch (error) {
        console.error('Invalidate response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error invalidating response.',
            error: error.message
        });
    }
};

// @desc    Restore archived/invalidated response
// @route   POST /api/forms/:id/responses/:responseId/restore
// @access  Private
exports.restoreResponse = async (req, res) => {
    try {
        const response = await FormResponse.findOne({
            _id: req.params.responseId,
            formId: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Response not found or access denied.'
            });
        }
        
        // Restore the response
        response.archived = false;
        response.archivedAt = null;
        response.archivedBy = null;
        response.archiveReason = null;
        response.invalidated = false;
        response.invalidatedAt = null;
        response.invalidatedBy = null;
        response.invalidationReason = null;
        
        await response.save();
        
        const updatedResponse = await FormResponse.findById(response._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('formId', 'name formId formType');
        
        res.status(200).json({
            success: true,
            data: updatedResponse,
            message: 'Response restored successfully'
        });
    } catch (error) {
        console.error('Restore response error:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring response.',
            error: error.message
        });
    }
};

