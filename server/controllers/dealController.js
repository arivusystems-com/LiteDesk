const Deal = require('../models/Deal');
const DealComment = require('../models/DealComment');
const People = require('../models/People');
const mongoose = require('mongoose');
const { getFileUrl } = require('../middleware/uploadMiddleware');
const { processCommentMentions } = require('../services/commentMentionNotifications');
const {
  computeAndSetDerivedStatus,
  hasConfiguration,
  hasLifecycleOrTypeChanged,
  validateStatusWriteProtection
} = require('../services/derivedStatusService');
const { validateStageInPipeline, validateDealRelationships } = require('../services/systemInvariants');
const {
  syncLegacyToRoleBased,
  syncRoleBasedToLegacy
} = require('../services/dealRelationshipService');
const { getDefaultPipelineSettings } = require('./moduleController');

const DESCRIPTION_VERSION_RETENTION_DAYS = 365;

const getActorDisplayName = (user) => {
        if (!user) return 'Unknown User';
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return fullName || user.username || user.email || String(user._id || 'Unknown User');
};

const DEAL_FIELD_LABELS = {
    name: 'name',
    amount: 'amount',
    currency: 'currency',
    pipeline: 'pipeline',
    stage: 'stage',
    probability: 'probability',
    expectedCloseDate: 'expected close date',
    actualCloseDate: 'actual close date',
    contactId: 'contact',
    accountId: 'organization',
    ownerId: 'owner',
    description: 'description',
    type: 'type',
    source: 'source',
    nextStep: 'next step',
    status: 'status',
    lostReason: 'lost reason',
    tags: 'tags',
    priority: 'priority',
    nextFollowUpDate: 'next follow-up date'
};

const normalizeDealComparableValue = (value) => {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return value.toISOString();

    if (typeof value === 'object' && typeof value.toObject === 'function') {
        try {
            return normalizeDealComparableValue(value.toObject({
                depopulate: true,
                virtuals: false,
                getters: false,
                flattenMaps: true
            }));
        } catch (_) {}
    }

    if (Array.isArray(value)) return value.map(normalizeDealComparableValue);
    if (typeof value === 'object') {
        if (typeof value.toHexString === 'function') return String(value.toHexString());
        if (value._bsontype === 'ObjectID' || value._bsontype === 'ObjectId') return String(value);

        const normalized = {};
        Object.keys(value).sort().forEach((key) => {
            if (key === '__v') return;
            normalized[key] = normalizeDealComparableValue(value[key]);
        });
        return normalized;
    }

    return value;
};

const areDealFieldValuesEqual = (a, b) => (
    JSON.stringify(normalizeDealComparableValue(a)) === JSON.stringify(normalizeDealComparableValue(b))
);

const formatDealDateForLog = (value) => {
    if (!value) return 'Empty';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Empty';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatDealEntityValueForLog = (value) => {
    if (!value) return 'Empty';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        return value.name
            || [value.first_name, value.last_name].filter(Boolean).join(' ').trim()
            || [value.firstName, value.lastName].filter(Boolean).join(' ').trim()
            || value.email
            || String(value._id || value.id || 'Empty');
    }
    return String(value);
};

const formatDealFieldValueForLog = (field, value, userNameById = {}) => {
    if (value === undefined || value === null || value === '') return 'Empty';

    switch (field) {
        case 'amount': {
            const num = Number(value);
            return Number.isFinite(num) ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : String(value);
        }
        case 'probability': {
            const num = Number(value);
            return Number.isFinite(num) ? `${Math.round(num)}%` : String(value);
        }
        case 'expectedCloseDate':
        case 'actualCloseDate':
        case 'nextFollowUpDate':
            return formatDealDateForLog(value);
        case 'ownerId': {
            const rawId = typeof value === 'object' ? (value._id || value.id) : value;
            const id = rawId ? String(rawId) : '';
            if (id && userNameById[id]) return userNameById[id];
            return formatDealEntityValueForLog(value);
        }
        case 'contactId':
        case 'accountId':
            return formatDealEntityValueForLog(value);
        case 'tags':
            return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Empty';
        case 'dealPeople':
        case 'dealOrganizations':
            return Array.isArray(value) ? `${value.length} linked` : 'Empty';
        default:
            return String(value);
    }
};

const buildDealFieldChangeLogEntry = ({ actorName, actorId, field, oldValue, newValue, userNameById = {} }) => {
    const from = formatDealFieldValueForLog(field, oldValue, userNameById);
    const to = formatDealFieldValueForLog(field, newValue, userNameById);
    if (from === to) return null;

    return {
        user: actorName,
        userId: actorId,
        action: field === 'stage' ? 'changed stage' : 'field_changed',
        details: {
            field,
            fieldLabel: DEAL_FIELD_LABELS[field] || field,
            from,
            to
        },
        timestamp: new Date()
    };
};

// @desc    Create new deal
// @route   POST /api/deals
// @access  Private
exports.createDeal = async (req, res) => {
    try {
        const appKey = req.appKey || req.query.appKey || 'SALES';
        const payload = {
            ...req.body,
            organizationId: req.user.organizationId,
            ownerId: req.body.ownerId || req.user._id,
            createdBy: req.user._id,
            modifiedBy: req.user._id,
            activityLogs: [{
                user: getActorDisplayName(req.user),
                userId: req.user._id,
                action: 'created',
                details: {},
                timestamp: new Date()
            }]
        };

        const statusWriteResult = await validateStatusWriteProtection('deal', payload, appKey);
        if (statusWriteResult) {
            return res.status(400).json({
                success: false,
                code: statusWriteResult.code,
                message: statusWriteResult.message,
                errors: statusWriteResult.errors
            });
        }

        // Every deal must have pipeline and stage. Auto-assign default when missing so user is not forced to pick.
        if (!payload.pipeline || !payload.stage) {
            const defaultSettings = getDefaultPipelineSettings();
            const defaultPipeline = defaultSettings.find((p) => p.isDefault) || defaultSettings[0];
            if (defaultPipeline && Array.isArray(defaultPipeline.stages) && defaultPipeline.stages.length) {
                payload.pipeline = payload.pipeline || defaultPipeline.key;
                payload.stage = payload.stage || (defaultPipeline.stages[0].name || 'New');
            }
        }

        const stagePipelineResult = await validateStageInPipeline({
            moduleKey: 'deals',
            organizationId: req.user.organizationId,
            updateData: payload,
            appKey
        });
        if (!stagePipelineResult.valid) {
            return res.status(400).json({
                success: false,
                code: stagePipelineResult.code,
                message: stagePipelineResult.message,
                errors: stagePipelineResult.errors
            });
        }

        if (!payload.status) payload.status = 'Open';

        const newDeal = await Deal.create(payload);

        await syncLegacyToRoleBased(newDeal, req.user._id);

        const relationshipResult = await validateDealRelationships({
            moduleKey: 'deals',
            recordId: newDeal._id,
            organizationId: req.user.organizationId,
            updateData: newDeal.toObject()
        });
        if (!relationshipResult.valid) {
            await Deal.findByIdAndDelete(newDeal._id);
            return res.status(400).json({
                success: false,
                code: relationshipResult.code,
                message: relationshipResult.message,
                errors: relationshipResult.errors
            });
        }

        const computedDerivedStatus = await computeAndSetDerivedStatus('deal', newDeal, appKey);
        const configExists = await hasConfiguration('deal', appKey);
        if (configExists && computedDerivedStatus && newDeal.status !== computedDerivedStatus) {
            newDeal.status = computedDerivedStatus;
        }

        await syncRoleBasedToLegacy(newDeal);
        
        if (
            newDeal.isModified('dealPeople') ||
            newDeal.isModified('dealOrganizations') ||
            newDeal.isModified('contactId') ||
            newDeal.isModified('accountId') ||
            newDeal.isModified('derivedStatus') ||
            newDeal.isModified('status') ||
            newDeal.isModified('probability')
        ) {
            await newDeal.save();
        }

        const deal = await Deal.findById(newDeal._id)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('dealPeople.personId', 'first_name last_name email')
            .populate('dealOrganizations.organizationId', 'name');

        const { emitDealEvents } = require('../services/domainEventHelpers');
        await emitDealEvents({
            previous: null,
            current: deal?.toObject ? deal.toObject() : deal,
            appKey,
            triggeredBy: req.user?._id ?? null,
            organizationId: req.user?.organizationId ?? null
        });

        res.status(201).json({ success: true, data: deal });
    } catch (error) {
        console.error('Create deal error:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating deal.',
            error: error.message
        });
    }
};

// @desc    Get all deals
// @route   GET /api/deals
// @access  Private
exports.getDeals = async (req, res) => {
    try {
        const query = { organizationId: req.user.organizationId, deletedAt: null };
        
        // Filter by user if needed
        if (req.filterByUser) {
            query.ownerId = req.filterByUser;
        }
        
        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Get filters
        if (req.query.stage) {
            query.stage = req.query.stage;
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.priority) {
            query.priority = req.query.priority;
        }
        if (req.query.ownerId) {
            query.ownerId = req.query.ownerId;
        }
        if (req.query.contactId) {
            query.contactId = req.query.contactId;
        }
        if (req.query.accountId) {
            // Convert accountId to ObjectId if it's a valid ObjectId string
            if (mongoose.Types.ObjectId.isValid(req.query.accountId)) {
                query.accountId = new mongoose.Types.ObjectId(req.query.accountId);
            } else {
                query.accountId = req.query.accountId;
            }
        }
        if (req.query.pipeline) {
            query.pipeline = req.query.pipeline;
        }
        
        // Search functionality
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }
        
        // Date range filter
        if (req.query.fromDate || req.query.toDate) {
            query.expectedCloseDate = {};
            if (req.query.fromDate) {
                query.expectedCloseDate.$gte = new Date(req.query.fromDate);
            }
            if (req.query.toDate) {
                query.expectedCloseDate.$lte = new Date(req.query.toDate);
            }
        }
        
        // Sorting (use stage + stageOrder for pipeline/Kanban order)
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = sortBy === 'stage'
            ? { stage: sortOrder, stageOrder: 1 }
            : { [sortBy]: sortOrder };
        
        // Execute query
        const deals = await Deal.find(query)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('accountId', 'name')
            .populate('dealPeople.personId', 'first_name last_name email')
            .populate('dealOrganizations.organizationId', 'name')
            .sort(sort)
            .limit(limit)
            .skip(skip);
        
        const total = await Deal.countDocuments(query);
        
        // Get statistics
        const stats = await Deal.aggregate([
            { $match: { organizationId: req.user.organizationId, deletedAt: null } },
            {
                $group: {
                    _id: null,
                    totalDeals: { $sum: 1 },
                    activeDeals: {
                        $sum: { $cond: [{ $in: ['$status', ['Open', 'Active']] }, 1, 0] }
                    },
                    stalledDeals: {
                        $sum: { $cond: [{ $in: ['$status', ['Stalled', 'Abandoned']] }, 1, 0] }
                    },
                    wonDeals: {
                        $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
                    },
                    lostDeals: {
                        $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
                    },
                    totalValue: { $sum: '$amount' },
                    wonValue: {
                        $sum: { $cond: [{ $eq: ['$status', 'Won'] }, '$amount', 0] }
                    },
                    pipelineValue: {
                        $sum: { $cond: [{ $in: ['$status', ['Open', 'Active']] }, '$amount', 0] }
                    }
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            data: deals,
            pagination: {
                currentPage: page,
                limit,
                totalDeals: total,
                totalPages: Math.ceil(total / limit)
            },
            statistics: stats[0] || {
                totalDeals: 0,
                activeDeals: 0,
                stalledDeals: 0,
                wonDeals: 0,
                lostDeals: 0,
                totalValue: 0,
                wonValue: 0,
                pipelineValue: 0
            }
        });
    } catch (error) {
        console.error('Get deals error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching deals.', 
            error: error.message 
        });
    }
};

// @desc    Get single deal
// @route   GET /api/deals/:id
// @access  Private
exports.getDealById = async (req, res) => {
    try {
        const deal = await Deal.findOne({ 
            _id: req.params.id, 
            organizationId: req.user.organizationId,
            deletedAt: null
        })
        .populate('contactId', 'first_name last_name email phone')
        .populate('ownerId', 'firstName lastName email')
        .populate('accountId', 'name industry')
        .populate('dealPeople.personId', 'first_name last_name email phone')
        .populate('dealOrganizations.organizationId', 'name industry')
        .populate('notes.createdBy', 'firstName lastName')
        .populate('stageHistory.changedBy', 'firstName lastName');
        
        if (!deal) {
            return res.status(404).json({ 
                success: false,
                message: 'Deal not found or access denied.' 
            });
        }
        
        const { flattenCustomFieldsForResponse } = require('../utils/customFieldsExtractor');
        res.status(200).json({
            success: true,
            data: flattenCustomFieldsForResponse(deal)
        });
    } catch (error) {
        console.error('Get deal error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching deal.', 
            error: error.message 
        });
    }
};

// @desc    Update deal
// @route   PUT /api/deals/:id
// @access  Private
exports.updateDeal = async (req, res) => {
    try {
        // Prevent changing organizationId
        delete req.body.organizationId;
        req.body.modifiedBy = req.user._id;
        
        // Validate field-level write access
        const ModuleDefinition = require('../models/ModuleDefinition');
        const { validateFieldWrite } = require('../utils/fieldAccessControl');
        
        const moduleDef = await ModuleDefinition.findOne({
            organizationId: req.user.organizationId,
            key: 'deals'
        });
        
        if (moduleDef && Array.isArray(moduleDef.fields)) {
            const fieldViolations = [];
            const fieldsToUpdate = { ...req.body };
            
            // Validate each field being updated
            for (const [fieldKey, fieldValue] of Object.entries(fieldsToUpdate)) {
                // Skip system fields and metadata
                if (['_id', '__v', 'organizationId', 'createdAt', 'updatedAt', 'modifiedBy'].includes(fieldKey)) {
                    continue;
                }
                
                const validation = validateFieldWrite(fieldKey, moduleDef.fields, req.user, 'deals');
                if (!validation.allowed) {
                    fieldViolations.push({
                        field: fieldKey,
                        reason: validation.reason
                    });
                }
            }
            
            // If any field violations, reject the entire update
            if (fieldViolations.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Field access denied',
                    code: 'FIELD_ACCESS_DENIED',
                    violations: fieldViolations
                });
            }
        }
        
        const appKey = req.appKey || req.query.appKey || 'SALES';

        const statusWriteResult = await validateStatusWriteProtection('deal', req.body, appKey);
        if (statusWriteResult) {
            return res.status(400).json({
                success: false,
                code: statusWriteResult.code,
                message: statusWriteResult.message,
                errors: statusWriteResult.errors
            });
        }

        const stagePipelineResult = await validateStageInPipeline({
            moduleKey: 'deals',
            recordId: req.params.id,
            organizationId: req.user.organizationId,
            updateData: req.body,
            appKey
        });
        if (!stagePipelineResult.valid) {
            return res.status(400).json({
                success: false,
                code: stagePipelineResult.code,
                message: stagePipelineResult.message,
                errors: stagePipelineResult.errors
            });
        }

        const shouldComputeDerivedStatus = hasLifecycleOrTypeChanged('deal', null, req.body);

        let previousDeal = null;
        if (shouldComputeDerivedStatus) {
            previousDeal = await Deal.findOne(
                { _id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
            ).lean();
        }

        let previousDescriptionForVersion = null;
        let previousDescriptionExists = false;
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'description')) {
            const existingDealForDescription = await Deal.findOne(
                { _id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
            ).select('description');
            if (existingDealForDescription) {
                previousDescriptionExists = true;
                previousDescriptionForVersion = existingDealForDescription.description;
            }
        }

        const SYSTEM_FIELDS = ['_id', '__v', 'organizationId', 'createdAt', 'updatedAt', 'modifiedBy'];
        const requestedFields = Object.keys(req.body || {}).filter((fieldKey) => !SYSTEM_FIELDS.includes(fieldKey));

        const existingDealForChanges = await Deal.findOne(
            { _id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
        ).lean();
        if (!existingDealForChanges) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied.'
            });
        }

        const oldValuesByField = requestedFields.reduce((acc, field) => {
            acc[field] = existingDealForChanges[field];
            return acc;
        }, {});

        const { buildUpdateWithCustomFields, flattenCustomFieldsForResponse } = require('../utils/customFieldsExtractor');
        const $set = buildUpdateWithCustomFields(req.body, Deal);

        const updatedDeal = await Deal.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId, deletedAt: null },
            { $set },
            { new: true, runValidators: true }
        )
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email');

        if (!updatedDeal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied.'
            });
        }

        await syncLegacyToRoleBased(updatedDeal, req.user._id);

        const relationshipResult = await validateDealRelationships({
            moduleKey: 'deals',
            recordId: req.params.id,
            organizationId: req.user.organizationId,
            updateData: updatedDeal.toObject()
        });
        if (!relationshipResult.valid) {
            return res.status(400).json({
                success: false,
                code: relationshipResult.code,
                message: relationshipResult.message,
                errors: relationshipResult.errors
            });
        }

        if (shouldComputeDerivedStatus) {
            const computedDerivedStatus = await computeAndSetDerivedStatus('deal', updatedDeal, appKey);
            const configExists = await hasConfiguration('deal', appKey);
            if (configExists && computedDerivedStatus && updatedDeal.status !== computedDerivedStatus) {
                updatedDeal.status = computedDerivedStatus;
            }
        }

        const actorName = getActorDisplayName(req.user);
        const userIdsToResolve = new Set();
        if (oldValuesByField.ownerId) {
            const oldOwnerId = typeof oldValuesByField.ownerId === 'object'
                ? (oldValuesByField.ownerId._id || oldValuesByField.ownerId.id)
                : oldValuesByField.ownerId;
            if (oldOwnerId) userIdsToResolve.add(String(oldOwnerId));
        }
        if (updatedDeal.ownerId) {
            const newOwnerId = typeof updatedDeal.ownerId === 'object'
                ? (updatedDeal.ownerId._id || updatedDeal.ownerId.id)
                : updatedDeal.ownerId;
            if (newOwnerId) userIdsToResolve.add(String(newOwnerId));
        }

        let userNameById = {};
        if (userIdsToResolve.size > 0) {
            const User = require('../models/User');
            const users = await User.find({
                _id: { $in: Array.from(userIdsToResolve) },
                organizationId: req.user.organizationId
            }).select('firstName lastName username email').lean();

            userNameById = users.reduce((acc, user) => {
                const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
                    || user.username
                    || user.email
                    || String(user._id);
                acc[String(user._id)] = displayName;
                return acc;
            }, {});
        }

        const fieldChangeLogs = [];
        requestedFields.forEach((field) => {
            const previousValue = oldValuesByField[field];
            const nextValue = updatedDeal[field];
            if (areDealFieldValuesEqual(previousValue, nextValue)) return;

            const entry = buildDealFieldChangeLogEntry({
                actorName,
                actorId: req.user._id,
                field,
                oldValue: previousValue,
                newValue: nextValue,
                userNameById
            });
            if (entry) fieldChangeLogs.push(entry);
        });

        if (fieldChangeLogs.length > 0) {
            if (!Array.isArray(updatedDeal.activityLogs)) updatedDeal.activityLogs = [];
            updatedDeal.activityLogs.push(...fieldChangeLogs);
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'description') && previousDescriptionExists) {
            if (!Array.isArray(updatedDeal.descriptionVersions)) updatedDeal.descriptionVersions = [];
            updatedDeal.descriptionVersions.push({
                content: typeof previousDescriptionForVersion === 'string' ? previousDescriptionForVersion : '',
                createdAt: new Date(),
                createdBy: req.user._id
            });
            const retentionCutoff = new Date();
            retentionCutoff.setDate(retentionCutoff.getDate() - DESCRIPTION_VERSION_RETENTION_DAYS);
            updatedDeal.descriptionVersions = updatedDeal.descriptionVersions.filter((entry) => entry?.createdAt >= retentionCutoff);
        }

        await syncRoleBasedToLegacy(updatedDeal);
        await updatedDeal.save();

        if (shouldComputeDerivedStatus) {
            const { emitDealEvents } = require('../services/domainEventHelpers');
            await emitDealEvents({
                previous: previousDeal,
                current: updatedDeal.toObject ? updatedDeal.toObject() : updatedDeal,
                appKey,
                triggeredBy: req.user?._id ?? null,
                organizationId: req.user?.organizationId ?? null
            });
        }

        const populatedDeal = await Deal.findById(updatedDeal._id)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('accountId', 'name industry')
            .populate('dealPeople.personId', 'first_name last_name email')
            .populate('dealOrganizations.organizationId', 'name');

        res.status(200).json({ success: true, data: flattenCustomFieldsForResponse(populatedDeal) });
    } catch (error) {
        console.error('Update deal error:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error updating deal.', 
            error: error.message 
        });
    }
};

// @desc    Delete deal (move to trash)
// @route   DELETE /api/deals/:id
// @access  Private
exports.deleteDeal = async (req, res) => {
    try {
        const deletionService = require('../services/deletionService');
        const result = await deletionService.moveToTrash({
            moduleKey: 'deals',
            recordId: req.params.id,
            organizationId: req.user.organizationId,
            userId: req.user._id,
            appKey: 'SALES',
            reason: req.body?.reason,
            cascadeConfirmed: !!req.body?.cascadeConfirmed
        });

        if (!result.ok) {
            if (result.blocked) {
                return res.status(400).json({
                    success: false,
                    blocked: true,
                    dependencies: result.dependencies,
                    message: result.message
                });
            }
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to delete deal.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Deal moved to trash',
            retentionExpiresAt: result.retentionExpiresAt
        });
    } catch (error) {
        console.error('Delete deal error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting deal.',
            error: error.message
        });
    }
};

// @desc    Add note to deal
// @route   POST /api/deals/:id/notes
// @access  Private
exports.addNote = async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Note text is required'
            });
        }
        
        const deal = await Deal.findOneAndUpdate(
            { 
                _id: req.params.id, 
                organizationId: req.user.organizationId,
                deletedAt: null
            },
            {
                $push: {
                    notes: {
                        text: text.trim(),
                        createdBy: req.user._id,
                        createdAt: new Date()
                    }
                },
                $set: {
                    lastActivityDate: new Date(),
                    modifiedBy: req.user._id
                }
            },
            { new: true, runValidators: true }
        )
        .populate('contactId', 'first_name last_name email')
        .populate('ownerId', 'firstName lastName email')
        .populate('notes.createdBy', 'firstName lastName');
        
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        try {
            await Deal.updateOne(
                {
                    _id: req.params.id,
                    organizationId: req.user.organizationId,
                    deletedAt: null
                },
                {
                    $push: {
                        activityLogs: {
                            user: getActorDisplayName(req.user),
                            userId: req.user?._id || null,
                            action: 'added a note',
                            details: {
                                notePreview: text.trim().slice(0, 120)
                            },
                            timestamp: new Date()
                        }
                    }
                }
            );
        } catch (activityLogError) {
            console.warn('Deal addNote: activity log append failed (note saved):', activityLogError?.message || activityLogError);
        }
        
        res.status(200).json({
            success: true,
            data: deal
        });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding note',
            error: error.message
        });
    }
};

// @desc    Update note on deal
// @route   PUT /api/deals/:id/notes/:noteId
// @access  Private
exports.updateDealNote = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !String(text).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Note text is required'
            });
        }

        const deal = await Deal.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            deletedAt: null
        });

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const note = (deal.notes || []).find((entry) => String(entry?._id) === String(req.params.noteId));
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        const currentUserId = String(req.user?._id || '');
        const noteAuthorId = String(note.createdBy || '');
        if (!currentUserId || !noteAuthorId || currentUserId !== noteAuthorId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own notes'
            });
        }

        note.text = String(text).trim();
        note.editedAt = new Date();
        note.editedBy = req.user._id;
        deal.modifiedBy = req.user._id;
        deal.lastActivityDate = new Date();

        if (!Array.isArray(deal.activityLogs)) deal.activityLogs = [];
        deal.activityLogs.push({
            user: getActorDisplayName(req.user),
            userId: req.user?._id || null,
            action: 'edited a note',
            details: {
                noteId: String(note._id)
            },
            timestamp: new Date()
        });

        await deal.save();

        const populatedDeal = await Deal.findById(deal._id)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('notes.createdBy', 'firstName lastName email');

        res.status(200).json({
            success: true,
            data: populatedDeal
        });
    } catch (error) {
        console.error('Update deal note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating note',
            error: error.message
        });
    }
};

// @desc    Get activity logs for a deal
// @route   GET /api/deals/:id/activity-logs
// @access  Private
exports.getActivityLogs = async (req, res) => {
    try {
        const deal = await Deal.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            deletedAt: null
        }).select('activityLogs');

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const logs = (deal.activityLogs || []).sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        const User = require('../models/User');
        const userIds = [...new Set(logs.map(log => log.userId).filter(id => id))];

        let usersMap = {};
        if (userIds.length > 0) {
            const users = await User.find({ _id: { $in: userIds } })
                .select('firstName lastName username email')
                .lean();

            usersMap = users.reduce((acc, user) => {
                acc[user._id.toString()] = user;
                return acc;
            }, {});
        }

        const enrichedLogs = logs.map(log => {
            const enrichedLog = { ...log.toObject ? log.toObject() : log };
            if (log.userId && usersMap[log.userId.toString()]) {
                const user = usersMap[log.userId.toString()];
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

                if (typeof enrichedLog.user === 'string' && /^[0-9a-fA-F]{24}$/.test(enrichedLog.user)) {
                    enrichedLog.user = fullName || user.username || user.email || 'Unknown User';
                } else if (!enrichedLog.user || enrichedLog.user === '') {
                    enrichedLog.user = fullName || user.username || user.email || 'Unknown User';
                }
            } else if (typeof enrichedLog.user === 'string' && /^[0-9a-fA-F]{24}$/.test(enrichedLog.user)) {
                enrichedLog.user = 'Unknown User';
            }

            return enrichedLog;
        });

        res.status(200).json({
            success: true,
            data: enrichedLogs
        });
    } catch (error) {
        console.error('Get deal activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity logs',
            error: error.message
        });
    }
};

// @desc    Get deal description version history
// @route   GET /api/deals/:id/description-versions
// @access  Private
exports.getDescriptionVersions = async (req, res) => {
    try {
        const deal = await Deal.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            deletedAt: null
        }).select('description descriptionVersions').lean();

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const versions = (deal.descriptionVersions || [])
            .map((version) => ({
                content: version.content,
                createdAt: version.createdAt,
                createdBy: version.createdBy
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const User = require('../models/User');
        const createdByIds = [...new Set(versions.map((version) => version.createdBy).filter(Boolean))];
        const createdByMap = {};
        if (createdByIds.length > 0) {
            const users = await User.find({
                _id: { $in: createdByIds },
                organizationId: req.user.organizationId
            })
                .select('firstName lastName')
                .lean();

            users.forEach((user) => {
                const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                createdByMap[String(user._id)] = name || 'Unknown';
            });
        }

        const list = versions.map((version) => ({
            content: version.content,
            createdAt: version.createdAt,
            createdBy: version.createdBy ? createdByMap[String(version.createdBy)] || 'Unknown' : 'Unknown',
            createdById: version.createdBy
        }));

        return res.status(200).json({
            success: true,
            data: {
                currentDescription: deal.description || '',
                versions: list
            }
        });
    } catch (error) {
        console.error('Get deal description versions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching description versions',
            error: error.message
        });
    }
};

// @desc    Restore a deal description version
// @route   POST /api/deals/:id/description-versions/restore
// @body    { versionIndex: number }
// @access  Private
exports.restoreDescriptionVersion = async (req, res) => {
    try {
        const deal = await Deal.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            deletedAt: null
        });

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const { versionIndex } = req.body;
        if (typeof versionIndex !== 'number' || versionIndex < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid versionIndex'
            });
        }

        const versions = (deal.descriptionVersions || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const version = versions[versionIndex];
        if (!version) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        const previousDescription = deal.description;
        deal.description = version.content || '';
        if (!Array.isArray(deal.descriptionVersions)) {
            deal.descriptionVersions = [];
        }
        if (previousDescription !== undefined && previousDescription !== null) {
            deal.descriptionVersions.push({
                content: typeof previousDescription === 'string' ? previousDescription : '',
                createdAt: new Date(),
                createdBy: req.user._id
            });
        }

        if (!Array.isArray(deal.activityLogs)) deal.activityLogs = [];
        deal.activityLogs.push({
            user: getActorDisplayName(req.user),
            userId: req.user?._id || null,
            action: 'restored description version',
            details: {
                field: 'description',
                from: previousDescription ?? '',
                to: deal.description ?? ''
            },
            timestamp: new Date()
        });

        const retentionCutoff = new Date();
        retentionCutoff.setDate(retentionCutoff.getDate() - DESCRIPTION_VERSION_RETENTION_DAYS);
        deal.descriptionVersions = deal.descriptionVersions.filter((entry) => entry?.createdAt >= retentionCutoff);

        await deal.save();

        const populatedDeal = await Deal.findById(deal._id)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('accountId', 'name industry')
            .populate('dealPeople.personId', 'first_name last_name email')
            .populate('dealOrganizations.organizationId', 'name');

        return res.status(200).json({
            success: true,
            data: populatedDeal
        });
    } catch (error) {
        console.error('Restore deal description version error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error restoring description version',
            error: error.message
        });
    }
};

// @desc    Add activity log to a deal
// @route   POST /api/deals/:id/activity-logs
// @access  Private
exports.addActivityLog = async (req, res) => {
    try {
        const { user, action, details } = req.body;

        if (!user || !action) {
            return res.status(400).json({
                success: false,
                message: 'User and action are required'
            });
        }

        const deal = await Deal.findOneAndUpdate(
            {
                _id: req.params.id,
                organizationId: req.user.organizationId,
                deletedAt: null
            },
            {
                $push: {
                    activityLogs: {
                        user,
                        userId: req.user?._id || null,
                        action,
                        details: details || null,
                        timestamp: new Date()
                    }
                },
                $set: {
                    lastActivityDate: new Date(),
                    modifiedBy: req.user._id
                }
            },
            { new: true, runValidators: true }
        );

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const newLog = deal.activityLogs[deal.activityLogs.length - 1];

        res.status(200).json({
            success: true,
            data: newLog
        });
    } catch (error) {
        console.error('Add deal activity log error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding activity log',
            error: error.message
        });
    }
};

// @desc    Get pipeline summary
// @route   GET /api/deals/pipeline/summary
// @access  Private
exports.getPipelineSummary = async (req, res) => {
    try {
        const summary = await Deal.aggregate([
            { 
                $match: { 
                    organizationId: req.user.organizationId,
                    status: { $in: ['Open', 'Active'] },
                    deletedAt: null
                } 
            },
            {
                $group: {
                    _id: '$stage',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$amount' },
                    avgProbability: { $avg: '$probability' },
                    deals: { 
                        $push: {
                            id: '$_id',
                            name: '$name',
                            amount: '$amount',
                            probability: '$probability',
                            expectedCloseDate: '$expectedCloseDate'
                        }
                    }
                }
            },
            {
                $project: {
                    stage: '$_id',
                    count: 1,
                    totalValue: 1,
                    weightedValue: { 
                        $multiply: ['$totalValue', { $divide: ['$avgProbability', 100] }] 
                    },
                    avgProbability: 1,
                    deals: 1
                }
            },
            { $sort: { stage: 1 } }
        ]);
        
        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Get pipeline summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pipeline summary',
            error: error.message
        });
    }
};

// @desc    Update deal stage
// @route   PATCH /api/deals/:id/stage
// @access  Private
exports.updateStage = async (req, res) => {
    try {
        const { stage, order } = req.body;
        const appKey = req.appKey || req.query.appKey || 'SALES';

        const deal = await Deal.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            deletedAt: null
        });

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found or access denied'
            });
        }

        const stagePipelineResult = await validateStageInPipeline({
            moduleKey: 'deals',
            recordId: req.params.id,
            organizationId: req.user.organizationId,
            updateData: { stage, pipeline: deal.pipeline },
            appKey
        });
        if (!stagePipelineResult.valid) {
            return res.status(400).json({
                success: false,
                code: stagePipelineResult.code,
                message: stagePipelineResult.message,
                errors: stagePipelineResult.errors
            });
        }

        const previousSnapshot = deal.toObject ? deal.toObject() : { ...deal };
        const stageChanged = deal.stage !== stage;

        deal.stage = stage;
        if (typeof order === 'number' && order >= 0) {
            deal.stageOrder = order;
        }
        if (stageChanged) {
            if (!Array.isArray(deal.stageHistory)) deal.stageHistory = [];
            const historyEntry = { stage, changedAt: new Date() };
            if (req.user && req.user._id) historyEntry.changedBy = req.user._id;
            deal.stageHistory.push(historyEntry);

            if (!Array.isArray(deal.activityLogs)) deal.activityLogs = [];
            deal.activityLogs.push({
                user: getActorDisplayName(req.user),
                userId: req.user?._id || null,
                action: 'changed stage',
                details: {
                    field: 'stage',
                    from: previousSnapshot?.stage ?? null,
                    to: stage
                },
                timestamp: new Date()
            });
        }
        deal.modifiedBy = req.user?._id ?? null;

        const computedDerivedStatus = await computeAndSetDerivedStatus('deal', deal, appKey);
        const configExists = await hasConfiguration('deal', appKey);
        if (configExists && computedDerivedStatus && deal.status !== computedDerivedStatus) {
            deal.status = computedDerivedStatus;
        }
        await deal.save();

        // Renormalize stageOrder so the moved deal is at index `order` and the rest are 0,1,2,...
        const inStage = await Deal.find({
            organizationId: req.user.organizationId,
            stage: deal.stage,
            deletedAt: null
        })
            .sort({ stageOrder: 1, _id: 1 })
            .select('_id')
            .lean();
        const movedId = deal._id.toString();
        if (typeof order === 'number' && order >= 0 && inStage.length > 0) {
            const idx = inStage.findIndex((d) => d._id.toString() === movedId);
            if (idx !== -1) {
                const [moved] = inStage.splice(idx, 1);
                const newIndex = Math.min(order, inStage.length);
                inStage.splice(newIndex, 0, moved);
            }
        }
        for (let i = 0; i < inStage.length; i++) {
            await Deal.updateOne(
                { _id: inStage[i]._id, organizationId: req.user.organizationId },
                { $set: { stageOrder: i } }
            );
        }

        try {
            const { emitDealEvents } = require('../services/domainEventHelpers');
            await emitDealEvents({
                previous: previousSnapshot,
                current: deal.toObject ? deal.toObject() : deal,
                appKey,
                triggeredBy: req.user?._id ?? null,
                organizationId: req.user?.organizationId ?? null
            });
        } catch (emitErr) {
            console.error('Update stage: emitDealEvents failed (stage was saved):', emitErr);
        }

        const updatedDeal = await Deal.findById(deal._id)
            .populate('contactId', 'first_name last_name email')
            .populate('ownerId', 'firstName lastName email')
            .populate('dealPeople.personId', 'first_name last_name email')
            .populate('dealOrganizations.organizationId', 'name');

        res.status(200).json({ success: true, data: updatedDeal });
    } catch (error) {
        console.error('Update stage error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating stage',
            error: error.message
        });
    }
};

// =====================
// Deal Comment Methods
// =====================

const normalizeReactionEmoji = (value) => String(value || '').trim();

const toReactionUserPayload = (user) => {
  if (!user) return null;
  const rawId = typeof user === 'object' ? (user._id || user.id) : user;
  if (!rawId) return null;
  const id = String(rawId);
  if (typeof user !== 'object') {
    return { id, name: 'Unknown', avatar: '' };
  }
  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || user.username || user.email || 'Unknown';
  return {
    id,
    name,
    avatar: user.avatar || ''
  };
};

const buildDealCommentResponse = (comment, currentUserId = null) => {
  const currentUserIdString = currentUserId ? String(currentUserId) : null;
  const reactions = Array.isArray(comment?.reactions) ? comment.reactions : [];

  const summarizedReactions = reactions
    .map((reaction) => {
      const emoji = normalizeReactionEmoji(reaction?.emoji);
      if (!emoji) return null;

      const users = Array.isArray(reaction?.users) ? reaction.users : [];
      const dedupedUsers = [];
      const seenUserIds = new Set();
      users.forEach((user) => {
        const payload = toReactionUserPayload(user);
        if (!payload || seenUserIds.has(payload.id)) return;
        seenUserIds.add(payload.id);
        dedupedUsers.push(payload);
      });

      return {
        emoji,
        count: dedupedUsers.length,
        userIds: dedupedUsers.map((user) => user.id),
        reactors: dedupedUsers
      };
    })
    .filter((reaction) => reaction && reaction.count > 0);

  const myReactions = currentUserIdString
    ? summarizedReactions
      .filter((reaction) => reaction.userIds.includes(currentUserIdString))
      .map((reaction) => reaction.emoji)
    : [];

  const reactionSummary = summarizedReactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = reaction.count;
    return acc;
  }, {});

  return {
    _id: comment._id,
    content: comment.content,
    author: comment.author,
    parentCommentId: comment.parentCommentId || null,
    attachments: comment.attachments || [],
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    editedAt: comment.editedAt,
    reactions: summarizedReactions.map(({ emoji, count, reactors }) => ({ emoji, count, reactors })),
    reactionSummary,
    myReactions,
    likesCount: reactionSummary['👍'] || 0
  };
};
exports.buildDealCommentResponse = buildDealCommentResponse;

// @desc    Get comments for a deal
// @route   GET /api/deals/:id/comments
// @access  Private
exports.getDealComments = async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      deletedAt: null
    });
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const comments = await DealComment.find({ dealId: req.params.id })
      .populate('author', 'firstName lastName email avatar username')
      .populate('reactions.users', 'firstName lastName email avatar username')
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: comments.map((comment) => buildDealCommentResponse(comment, req.user?._id))
    });
  } catch (error) {
    console.error('Get deal comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// @desc    Upload a file for a deal comment attachment
// @route   POST /api/deals/:id/comment-attachments
// @access  Private
exports.uploadDealCommentAttachment = async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      deletedAt: null
    });
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = getFileUrl(req, req.file.filename);
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload deal comment attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading attachment',
      error: error.message
    });
  }
};

// @desc    Create a comment on a deal
// @route   POST /api/deals/:id/comments
// @access  Private
exports.createDealComment = async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      deletedAt: null
    });
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const { content, attachments, parentCommentId } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(a => a && typeof a.url === 'string' && typeof a.filename === 'string').slice(0, 10)
      : [];

    let validatedParentCommentId = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ success: false, message: 'Invalid parent comment id' });
      }
      const parentComment = await DealComment.findOne({
        _id: parentCommentId,
        dealId: req.params.id,
        organizationId: req.user.organizationId
      }).select('_id');
      if (!parentComment) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }
      validatedParentCommentId = parentComment._id;
    }

    const comment = await DealComment.create({
      dealId: req.params.id,
      organizationId: req.user.organizationId,
      content: content.trim(),
      author: req.user._id,
      parentCommentId: validatedParentCommentId,
      attachments: validAttachments
    });

    const populated = await DealComment.findById(comment._id)
      .populate('author', 'firstName lastName email avatar username')
      .populate('reactions.users', 'firstName lastName email avatar username')
      .lean();

    // Notify @mentioned users (fire-and-forget)
    const author = populated.author;
    const authorName = author
      ? [author.firstName, author.lastName].filter(Boolean).join(' ') || author.username || 'Someone'
      : 'Someone';
    processCommentMentions({
      organizationId: String(req.user.organizationId),
      appKey: req.appKey || 'SALES',
      taskId: String(req.params.id),
      taskTitle: deal.name || 'Deal',
      commentId: String(comment._id),
      commentContent: content.trim(),
      authorId: String(req.user._id),
      authorName
    }).catch((err) => console.error('Deal comment mention notifications error:', err));

    res.status(201).json({
      success: true,
      data: buildDealCommentResponse(populated, req.user?._id)
    });
  } catch (error) {
    console.error('Create deal comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
};

// @desc    Update a comment
// @route   PUT /api/deals/:id/comments/:commentId
// @access  Private
exports.updateDealComment = async (req, res) => {
  try {
    const { id: dealId, commentId } = req.params;
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    if (deal.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const comment = await DealComment.findOne({ _id: commentId, dealId });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments' });
    }

    const rawContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const hasAttachmentsPayload = Array.isArray(req.body?.attachments);
    const validAttachments = hasAttachmentsPayload
      ? req.body.attachments
        .filter((a) => a && typeof a.url === 'string' && typeof a.filename === 'string')
        .slice(0, 10)
      : comment.attachments;

    if (!rawContent && (!Array.isArray(validAttachments) || validAttachments.length === 0)) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    comment.content = rawContent || 'Attached file(s)';
    if (hasAttachmentsPayload) {
      comment.attachments = validAttachments;
    }
    comment.editedAt = new Date();
    await comment.save();

    const populated = await DealComment.findById(comment._id)
      .populate('author', 'firstName lastName email avatar username')
      .populate('reactions.users', 'firstName lastName email avatar username')
      .lean();

    const author = populated.author;
    const authorName = author
      ? [author.firstName, author.lastName].filter(Boolean).join(' ') || author.username || 'Someone'
      : 'Someone';
    processCommentMentions({
      organizationId: String(req.user.organizationId),
      appKey: req.appKey || 'SALES',
      taskId: String(dealId),
      taskTitle: deal.name || 'Deal',
      commentId: String(comment._id),
      commentContent: comment.content,
      authorId: String(req.user._id),
      authorName
    }).catch((err) => console.error('Deal comment mention notifications error:', err));

    res.json({
      success: true,
      data: buildDealCommentResponse(populated, req.user?._id)
    });
  } catch (error) {
    console.error('Update deal comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

// @desc    Toggle an emoji reaction for a deal comment
// @route   POST /api/deals/:id/comments/:commentId/reactions
// @access  Private
exports.toggleDealCommentReaction = async (req, res) => {
  try {
    const { id: dealId, commentId } = req.params;
    const emoji = normalizeReactionEmoji(req.body?.emoji);

    if (!emoji || emoji.length > 16) {
      return res.status(400).json({
        success: false,
        message: 'A valid emoji is required'
      });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    if (deal.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const comment = await DealComment.findOne({ _id: commentId, dealId });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (!Array.isArray(comment.reactions)) {
      comment.reactions = [];
    }

    const currentUserId = String(req.user._id);
    let reaction = comment.reactions.find((entry) => normalizeReactionEmoji(entry?.emoji) === emoji);

    if (!reaction) {
      comment.reactions.push({
        emoji,
        users: [req.user._id]
      });
    } else {
      const userIndex = reaction.users.findIndex((userId) => String(userId) === currentUserId);
      if (userIndex >= 0) {
        reaction.users.splice(userIndex, 1);
      } else {
        reaction.users.push(req.user._id);
      }

      if (!reaction.users.length) {
        comment.reactions = comment.reactions.filter((entry) => String(entry._id) !== String(reaction._id));
      }
    }

    comment.markModified('reactions');
    await comment.save();

    const populated = await DealComment.findById(comment._id)
      .populate('author', 'firstName lastName email avatar username')
      .populate('reactions.users', 'firstName lastName email avatar username')
      .lean();

    res.json({
      success: true,
      data: buildDealCommentResponse(populated, req.user?._id)
    });
  } catch (error) {
    console.error('Toggle deal comment reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling reaction',
      error: error.message
    });
  }
};

// @desc    Delete a deal comment
// @route   DELETE /api/deals/:id/comments/:commentId
// @access  Private
exports.deleteDealComment = async (req, res) => {
  try {
    const { id: dealId, commentId } = req.params;
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    if (deal.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const comment = await DealComment.findOne({ _id: commentId, dealId });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    await DealComment.findByIdAndDelete(commentId);

    res.json({
      success: true,
      data: { _id: commentId }
    });
  } catch (error) {
    console.error('Delete deal comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

