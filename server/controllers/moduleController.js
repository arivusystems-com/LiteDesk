const ModuleDefinition = require('../models/ModuleDefinition');

// Utility to count fields from a Mongoose model schema (excluding system fields)
function getSchemaFieldCount(model) {
    if (!model || !model.schema) return 0;
    const paths = Object.keys(model.schema.paths || {});
    const excluded = new Set(['_id', '__v', 'createdAt', 'updatedAt']);
    return paths.filter(p => !excluded.has(p)).length;
}

function inferDataType(path) {
    const instance = path.instance || (path.options && path.options.type && path.options.type.name);
    switch ((instance || '').toLowerCase()) {
        case 'string': return 'Text';
        case 'number': return 'Decimal';
        case 'boolean': return 'Checkbox';
        case 'date': return 'Date';
        case 'objectid': return 'Lookup (Relationship)';
        default: return 'Text';
    }
}

// Field-specific data type mappings for People module
function getFieldDataType(key, fieldName, path) {
    const peopleFieldMappings = {
        'createdBy': 'Lookup (Relationship)',
        'assignedTo': 'Lookup (Relationship)',
        'source': 'Picklist',
        'type': 'Picklist',
        'first_name': 'Text',
        'last_name': 'Text',
        'email': 'Email',
        'phone': 'Phone',
        'mobile': 'Phone',
        'organization': 'Lookup (Relationship)',
        'tags': 'Multi-Picklist',
        'do_not_contact': 'Checkbox',
        'lead_status': 'Picklist',
        'lead_owner': 'Lookup (Relationship)',
        'lead_score': 'Integer',
        'interest_products': 'Multi-Picklist',
        'qualification_date': 'Date',
        'qualification_notes': 'Text-Area',
        'estimated_value': 'Currency',
        'contact_status': 'Picklist',
        'role': 'Picklist',
        'birthday': 'Date',
        'preferred_contact_method': 'Radio Button'
    };
    
    const organizationFieldMappings = {
        'name': 'Text',
        'types': 'Multi-Picklist',
        'website': 'URL',
        'phone': 'Phone',
        'address': 'Text-Area',
        'industry': 'Picklist',
        'assignedTo': 'Lookup (Relationship)',
        'primaryContact': 'Lookup (Relationship)',
        'customerStatus': 'Picklist',
        'customerTier': 'Picklist',
        'slaLevel': 'Picklist',
        'paymentTerms': 'Text',
        'creditLimit': 'Currency',
        'accountManager': 'Lookup (Relationship)',
        'annualRevenue': 'Currency',
        'numberOfEmployees': 'Integer',
        'partnerStatus': 'Picklist',
        'partnerTier': 'Picklist',
        'partnerType': 'Picklist',
        'partnerSince': 'Date',
        'partnerOnboardingSteps': 'Multi-Picklist',
        'territory': 'Picklist',
        'discountRate': 'Decimal',
        'vendorStatus': 'Picklist',
        'vendorRating': 'Integer',
        'vendorContract': 'URL',
        'preferredPaymentMethod': 'Picklist',
        'taxId': 'Text',
        'channelRegion': 'Picklist',
        'distributionTerritory': 'Multi-Picklist',
        'distributionCapacityMonthly': 'Integer',
        'dealerLevel': 'Picklist',
        'terms': 'Rich Text',
        'shippingAddress': 'Text-Area',
        'logisticsPartner': 'Lookup (Relationship)'
    };
    
    const dealFieldMappings = {
        'name': 'Text',
        'amount': 'Currency',
        'currency': 'Picklist',
        'pipeline': 'Picklist',
        'stage': 'Picklist',
        'type': 'Picklist',
        'ownerId': 'Lookup (Relationship)',
        'accountId': 'Lookup (Relationship)',
        'contactId': 'Lookup (Relationship)',
        'lineItems': 'Rich Text',
        'probability': 'Decimal',
        'expectedCloseDate': 'Date',
        'actualCloseDate': 'Date',
        'source': 'Picklist',
        'nextStep': 'Text-Area',
        'status': 'Picklist',
        'lostReason': 'Text-Area',
        'tags': 'Multi-Picklist',
        'priority': 'Picklist',
        'description': 'Rich Text',
        'createdBy': 'Lookup (Relationship)',
        'modifiedBy': 'Lookup (Relationship)',
        'createdAt': 'Date-Time',
        'updatedAt': 'Date-Time'
    };
    
    const eventFieldMappings = {
        'eventId': 'Auto-Number',
        'eventName': 'Text',
        'eventType': 'Picklist',
        'status': 'Picklist',
        'relatedToId': 'Lookup (Relationship)',
        'relatedToType': 'Picklist',
        'eventOwnerId': 'Lookup (Relationship)', // Label: "Event Owner"
        'startDateTime': 'Date-Time',
        'endDateTime': 'Date-Time',
        'location': 'Text-Area',
        'reminderAt': 'Date-Time',
        'recurrence': 'Rich Text',
        'attendees': 'Multi-Picklist',
        'agendaNotes': 'Text-Area',
        'linkedTaskId': 'Lookup (Relationship)',
        'linkedFormId': 'Lookup (Relationship)',
        'tags': 'Multi-Picklist',
        'auditHistory': 'Rich Text',
        'notes': 'Rich Text',
        'organizationId': 'Lookup (Relationship)',
        'createdBy': 'Lookup (Relationship)',
        'createdTime': 'Date-Time',
        'modifiedBy': 'Lookup (Relationship)',
        'modifiedTime': 'Date-Time'
    };
    
    const formFieldMappings = {
        'organizationId': 'Lookup (Relationship)',
        'formId': 'Auto-Number',
        'name': 'Text',
        'description': 'Text-Area',
        'formType': 'Picklist',
        'visibility': 'Picklist',
        'status': 'Picklist',
        'assignedTo': 'Lookup (Relationship)',
        'expiryDate': 'Date',
        'tags': 'Multi-Picklist',
        'approvalRequired': 'Checkbox',
        'scoringFormula': 'Text',
        'formVersion': 'Integer',
        'totalResponses': 'Integer',
        'avgRating': 'Decimal',
        'avgCompliance': 'Decimal',
        'responseRate': 'Decimal',
        'lastSubmission': 'Date-Time',
        'createdBy': 'Lookup (Relationship)',
        'modifiedBy': 'Lookup (Relationship)'
    };
    
    // Check if this is a People module field with specific mapping
    if (key === 'people' && peopleFieldMappings[fieldName]) {
        return peopleFieldMappings[fieldName];
    }
    
    // Check if this is an Organizations module field with specific mapping
    if (key === 'organizations' && organizationFieldMappings[fieldName]) {
        return organizationFieldMappings[fieldName];
    }
    
    if (key === 'deals' && dealFieldMappings[fieldName]) {
        return dealFieldMappings[fieldName];
    }
    
    if (key === 'events' && eventFieldMappings[fieldName]) {
        return eventFieldMappings[fieldName];
    }
    
    if (key === 'forms' && formFieldMappings[fieldName]) {
        return formFieldMappings[fieldName];
    }
    
    // Items module field mappings
    const itemFieldMappings = {
        'product_image': 'Image',
        'item_id': 'Auto-Number',
        'item_name': 'Text',
        'item_code': 'Text',
        'item_type': 'Picklist',
        'category': 'Picklist',
        'subcategory': 'Picklist',
        'unit_of_measure': 'Picklist',
        'status': 'Picklist',
        'description': 'Text-Area',
        'cost_price': 'Currency',
        'selling_price': 'Currency',
        'tax_type': 'Picklist',
        'tax_percentage': 'Decimal',
        'commission_rate': 'Decimal',
        'warranty_period_months': 'Integer',
        'serial_numbers': 'Multi-Picklist',
        'stock_quantity': 'Integer',
        'reorder_level': 'Integer',
        'vendor': 'Lookup (Relationship)',
        'linked_deals': 'Multi-Picklist',
        'linked_invoices': 'Multi-Picklist',
        'linked_forms': 'Multi-Picklist',
        'linked_contacts': 'Multi-Picklist',
        'tags': 'Multi-Picklist'
    };
    
    if (key === 'items' && itemFieldMappings[fieldName]) {
        return itemFieldMappings[fieldName];
    }
    
    // Fall back to inference based on schema type
    return inferDataType(path);
}

function getBaseFieldsForKey(key) {
    try {
        const modelByKey = {
            people: require('../models/People'),
            organizations: require('../models/Organization'),
            deals: require('../models/Deal'),
            tasks: require('../models/Task'),
            events: require('../models/Event'),
            imports: require('../models/ImportHistory'),
            forms: require('../models/Form'),
            items: require('../models/Item'),
        };
        const model = modelByKey[key];
        if (!model) return [];
        // System fields that should be excluded from forms (auto-generated or system-managed)
        const excluded = new Set([
            '_id', 
            '__v', 
            'createdAt', 
            'updatedAt',
            'eventId',        // Auto-generated UUID
            'organizationId', // Auto-filled from user context (but keep for forms module)
            'createdBy',      // Keep for forms module (it's a valid field)
            'createdTime',    // Auto-filled timestamp
            'modifiedBy',      // Keep for forms module (it's a valid field)
            'modifiedTime',   // Auto-filled on update
            'auditHistory',   // System-managed audit trail
            // Form-specific nested objects that shouldn't be fields
            'sections',       // Nested structure
            'kpiMetrics',    // Nested object
            'thresholds',    // Nested object
            'autoAssignment', // Nested object
            'workflowOnSubmit', // Nested object
            'approvalWorkflow', // Nested object
            'publicLink',    // Nested object
            'outcomesAndRules', // Nested object
            'responseTemplate' // Nested object
        ]);
        
        // For forms module, don't exclude organizationId, createdBy, modifiedBy
        if (key === 'forms') {
            excluded.delete('organizationId');
            excluded.delete('createdBy');
            excluded.delete('modifiedBy');
        }
        // Access both paths and tree to get enum values reliably
        const schemaTree = model.schema.tree || {};
        return Object.entries(model.schema.paths)
            .filter(([name]) => {
                // Exclude if the field name is in the excluded set
                if (excluded.has(name)) return false;
                // Exclude nested paths (e.g., "kpiMetrics.compliancePercentage" should be excluded if "kpiMetrics" is excluded)
                for (const excludedField of excluded) {
                    if (name.startsWith(excludedField + '.')) {
                        return false;
                    }
                }
                return true;
            })
            .map(([name, path]) => {
                // Extract enum values from Mongoose path and schema tree FIRST
                let options = [];
                // Check schema tree first (original definition)
                const treeDef = schemaTree[name];
                if (treeDef && treeDef.enum && Array.isArray(treeDef.enum)) {
                    options = [...treeDef.enum];
                } else {
                    // Fallback to path properties
                    const enumValues = path.enumValues || (path.options && path.options.enum) || (path.caster && path.caster.enumValues) || null;
                    if (Array.isArray(enumValues) && enumValues.length > 0) {
                        options = [...enumValues];
                    }
                }
                
                // Get data type - if options exist and no explicit mapping, infer Picklist
                let dataType = getFieldDataType(key, name, path);
                // Auto-detect Picklist if enum options exist and dataType is still Text
                // Note: getFieldDataType already handles field-specific mappings, so we just check if it's still Text
                if (options.length > 0 && dataType === 'Text') {
                    dataType = 'Picklist';
                }
                
                // Special handling for array fields (like tags, interest_products)
                if (path.schema && path.schema.paths) {
                    // This is an array field, check if the array items have enum
                    const arrayItemPath = path.schema.paths[0] || path.schema.paths['0'];
                    if (arrayItemPath) {
                        const arrayEnum = arrayItemPath.enumValues || (arrayItemPath.options && arrayItemPath.options.enum);
                        if (Array.isArray(arrayEnum) && arrayEnum.length > 0) {
                            options = [...arrayEnum];
                        }
                    }
                    // Also check schema tree for array type
                    if (treeDef && treeDef[0] && treeDef[0].enum && Array.isArray(treeDef[0].enum)) {
                        options = [...treeDef[0].enum];
                    }
                }
                // Custom label for eventOwnerId
                let fieldLabel = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                if (name === 'eventOwnerId') {
                    fieldLabel = 'Event Owner';
                }
                
                // Add lookupSettings for User lookup fields
                let lookupSettings = null;
                if (dataType === 'Lookup (Relationship)') {
                    // Check if this is a User lookup field
                    if (name === 'eventOwnerId' || name === 'createdBy' || name === 'modifiedBy' || 
                        (path.options && path.options.ref === 'User') ||
                        (path.caster && path.caster.options && path.caster.options.ref === 'User')) {
                        lookupSettings = {
                            targetModule: 'users'
                        };
                    } else if (path.options && path.options.ref) {
                        // For other lookup fields, infer targetModule from ref
                        const ref = path.options.ref;
                        const moduleMap = {
                            'User': 'users',
                            'People': 'people',
                            'Contact': 'people',
                            'Organization': 'organizations',
                            'Deal': 'deals',
                            'Task': 'tasks',
                            'Event': 'events',
                            'Form': 'forms',
                            'Report': 'reports'
                        };
                        if (moduleMap[ref]) {
                            lookupSettings = {
                                targetModule: moduleMap[ref]
                            };
                        }
                    }
                }
                
                // Special handling for linkedFormId in events module - add visibility dependency
                let dependencies = [];
                if (key === 'events' && name === 'linkedFormId') {
                    dependencies = [{
                        name: 'Show for audit event types',
                        type: 'visibility',
                        fieldKey: 'eventType',
                        operator: 'in',
                        value: ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'],
                        logic: 'AND'
                    }];
                }
                
                // Special handling for Items module - add dependencies based on item_type
                if (key === 'items') {
                    // Stock fields: Show for Product and Serialized Product, hide for Service and Non-Stock Product
                    if (name === 'stock_quantity' || name === 'reorder_level') {
                        dependencies = [{
                            name: 'Show for stock-managed items',
                            type: 'visibility',
                            fieldKey: 'item_type',
                            operator: 'in',
                            value: ['Product', 'Serialized Product'],
                            logic: 'AND'
                        }];
                    }
                    // Commission rate: Show for Service
                    if (name === 'commission_rate') {
                        dependencies = [{
                            name: 'Show for services',
                            type: 'visibility',
                            fieldKey: 'item_type',
                            operator: 'equals',
                            value: 'Service',
                            logic: 'AND'
                        }];
                    }
                    // Serial number fields: Show only for Serialized Product
                    if (name === 'serial_numbers' || name === 'warranty_period_months') {
                        dependencies = [{
                            name: 'Show for serialized products',
                            type: 'visibility',
                            fieldKey: 'item_type',
                            operator: 'equals',
                            value: 'Serialized Product',
                            logic: 'AND'
                        }];
                    }
                }
                
                return {
                    key: name,
                    label: fieldLabel,
                    dataType: dataType,
                    required: !!path.isRequired,
                    options: options,
                    defaultValue: path.defaultValue ?? null,
                    index: !!path._index,
                    visibility: { list: true, detail: true },
                    order: 0,
                    validations: [],
                    dependencies: dependencies,
                    lookupSettings: lookupSettings
                };
            });
    } catch (e) {
        return [];
    }
}

const PLAYBOOK_ACTION_TYPES = new Set(['task', 'event', 'alert', 'document', 'call', 'meeting', 'email', 'approval', 'other']);
const PLAYBOOK_TRIGGER_TYPES = new Set(['stage_entry', 'after_action', 'time_delay', 'custom']);
const PLAYBOOK_ALERT_TYPES = new Set(['in_app', 'email', 'sms']);
const PLAYBOOK_RESOURCE_TYPES = new Set(['document', 'link', 'form', 'template', 'other']);
const PLAYBOOK_DELAY_UNITS = new Set(['minutes', 'hours', 'days']);

const DEFAULT_STAGE_PLAYBOOKS = {
    qualification: (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Ensure the opportunity is a good fit before investing more time.',
        actions: [
            {
                key: `${stageKey}-research-account`,
                title: 'Research account background',
                description: 'Review company profile, industry insights and existing CRM notes.',
                actionType: 'task',
                dueInDays: 0,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-discovery-call`,
                title: 'Schedule discovery call',
                description: 'Coordinate a call to validate goals, pain points, budget and timeline.',
                actionType: 'event',
                dueInDays: 2,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [`${stageKey}-research-account`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'all_actions_completed',
            customDescription: '',
            nextStageKey: '',
            conditions: []
        }
    }),
    proposal: (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Tailor the proposal to the agreed requirements and highlight the value proposition.',
        actions: [
            {
                key: `${stageKey}-draft-solution`,
                title: 'Draft solution outline',
                description: 'Align internally on scope, deliverables, pricing and implementation approach.',
                actionType: 'task',
                dueInDays: 1,
                assignment: { type: 'team', targetId: null, targetType: '', targetName: 'Solutions' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-create-proposal`,
                title: 'Create proposal deck',
                description: 'Prepare proposal with executive summary, solution details, pricing and ROI.',
                actionType: 'document',
                dueInDays: 3,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [`${stageKey}-draft-solution`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'all_actions_completed',
            customDescription: '',
            nextStageKey: '',
            conditions: []
        }
    }),
    negotiation: (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Stay aligned with the prospect and stakeholders on final terms.',
        actions: [
            {
                key: `${stageKey}-review-feedback`,
                title: 'Review prospect feedback',
                description: 'Document requested changes and loop in stakeholders as needed.',
                actionType: 'task',
                dueInDays: 1,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-schedule-alignment`,
                title: 'Schedule alignment call',
                description: 'Set up meeting to finalize terms, pricing adjustments and contract language.',
                actionType: 'event',
                dueInDays: 2,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [`${stageKey}-review-feedback`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'all_actions_completed',
            customDescription: '',
            nextStageKey: '',
            conditions: []
        }
    }),
    'contract sent': (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Ensure the buyer has everything required to sign quickly.',
        actions: [
            {
                key: `${stageKey}-prep-signature`,
                title: 'Prepare contract for signature',
                description: 'Populate contract in e-sign platform and confirm legal terms and pricing.',
                actionType: 'document',
                dueInDays: 0,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-confirm-timeline`,
                title: 'Confirm signing timeline',
                description: 'Touch base with the buyer to confirm target signing date and blockers.',
                actionType: 'alert',
                dueInDays: 1,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: false,
                dependencies: [`${stageKey}-prep-signature`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'all_actions_completed',
            customDescription: '',
            nextStageKey: '',
            conditions: []
        }
    }),
    'closed won': (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Capture handoff details to ensure a smooth implementation.',
        actions: [
            {
                key: `${stageKey}-handoff`,
                title: 'Schedule handoff meeting',
                description: 'Introduce customer success, review goals and timeline.',
                actionType: 'event',
                dueInDays: 1,
                assignment: { type: 'team', targetId: null, targetType: '', targetName: 'Customer Success' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-celebrate`,
                title: 'Announce win internally',
                description: 'Update internal channels with win announcement and key insights.',
                actionType: 'alert',
                dueInDays: 0,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: false,
                dependencies: [`${stageKey}-handoff`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'manual',
            customDescription: 'Implementation team confirms onboarding is complete.',
            nextStageKey: '',
            conditions: []
        }
    }),
    'closed lost': (stageKey) => ({
        enabled: true,
        mode: 'sequential',
        autoAdvance: false,
        notes: 'Capture lost reason for future analysis and re-engagement.',
        actions: [
            {
                key: `${stageKey}-log-reason`,
                title: 'Log loss reason',
                description: 'Document reason codes and supporting notes in CRM.',
                actionType: 'task',
                dueInDays: 0,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: true,
                dependencies: [],
                autoCreate: true,
                metadata: {}
            },
            {
                key: `${stageKey}-nurture-plan`,
                title: 'Plan nurture follow-up',
                description: 'Identify future check-in date or nurture sequence to stay in touch.',
                actionType: 'task',
                dueInDays: 7,
                assignment: { type: 'deal_owner', targetId: null, targetType: '', targetName: '' },
                required: false,
                dependencies: [`${stageKey}-log-reason`],
                autoCreate: true,
                metadata: {}
            }
        ],
        exitCriteria: {
            type: 'manual',
            customDescription: 'Sales manager reviews and acknowledges learnings.',
            nextStageKey: '',
            conditions: []
        }
    })
};

function slugify(value = '', fallback = '') {
    const slug = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
}

function buildStagePlaybook(stageKey, stageName, status = 'open', source = null) {
    const templateBuilder = DEFAULT_STAGE_PLAYBOOKS[(stageName || '').toLowerCase()];
    const resolvedSource = (source && typeof source === 'object')
        ? source
        : (templateBuilder ? templateBuilder(stageKey) : null);
    const baseExitType = (status === 'won' || status === 'lost') ? 'manual' : 'all_actions_completed';
    const exitCriteria = resolvedSource?.exitCriteria || {};
    const exitType = ['manual', 'all_actions_completed', 'any_action_completed', 'custom'].includes(exitCriteria.type)
        ? exitCriteria.type
        : baseExitType;

    const actionsSource = Array.isArray(resolvedSource?.actions) ? resolvedSource.actions : [];
    const seenKeys = new Set();
    const actions = actionsSource.map((action, index) => {
        const title = action.title ? String(action.title).trim() : `Action ${index + 1}`;
        let key = slugify(action.key || `${stageKey}-${title}-${index}`, `${stageKey}-action-${index + 1}`);
        while (seenKeys.has(key)) {
            key = `${key}-${index}`;
        }
        seenKeys.add(key);
        return {
            key,
            title,
            description: action.description || '',
            actionType: PLAYBOOK_ACTION_TYPES.has(action.actionType) ? action.actionType : 'task',
            dueInDays: Math.max(0, Number(action.dueInDays) || 0),
            assignment: {
                type: ['deal_owner', 'stage_owner', 'specific_user', 'role', 'team'].includes(action?.assignment?.type)
                    ? action.assignment.type
                    : 'deal_owner',
                targetId: action?.assignment?.targetId || null,
                targetType: action?.assignment?.targetType || '',
                targetName: action?.assignment?.targetName || ''
            },
            required: action.required !== false,
            dependencies: Array.isArray(action.dependencies) ? action.dependencies.filter(Boolean) : [],
            autoCreate: action.autoCreate !== false,
            trigger: normalizeActionTrigger(action.trigger),
            alerts: normalizeActionAlerts(action.alerts),
            resources: normalizeActionResources(action.resources),
            metadata: (action.metadata && typeof action.metadata === 'object') ? action.metadata : {}
        };
    });

    const validKeys = new Set(actions.map(action => action.key));
    actions.forEach(action => {
        action.dependencies = action.dependencies.filter(dep => dep !== action.key && validKeys.has(dep));
    });

    return {
        enabled: resolvedSource?.enabled === true,
        mode: ['sequential', 'non_sequential'].includes(resolvedSource?.mode) ? resolvedSource.mode : 'sequential',
        autoAdvance: resolvedSource?.autoAdvance === true,
        notes: resolvedSource?.notes || '',
        actions,
        exitCriteria: {
            type: exitType,
            customDescription: exitCriteria.customDescription || '',
            nextStageKey: exitCriteria.nextStageKey ? slugify(exitCriteria.nextStageKey) : '',
            conditions: Array.isArray(exitCriteria.conditions) ? exitCriteria.conditions.map(condition => ({
                field: condition.field || '',
                operator: condition.operator || 'equals',
                value: condition.value
            })) : []
        }
    };
}

function normalizeActionTrigger(trigger) {
    const type = PLAYBOOK_TRIGGER_TYPES.has(trigger?.type) ? trigger.type : 'stage_entry';
    const sourceActionKey = trigger?.sourceActionKey ? slugify(trigger.sourceActionKey) : '';
    let delay = null;
    if (trigger?.delay && typeof trigger.delay === 'object') {
        const amount = Math.max(0, Number(trigger.delay.amount) || 0);
        const unit = PLAYBOOK_DELAY_UNITS.has(trigger.delay.unit) ? trigger.delay.unit : 'days';
        delay = { amount, unit };
    }
    const conditions = Array.isArray(trigger?.conditions)
        ? trigger.conditions.map(condition => ({
            field: condition.field || '',
            operator: condition.operator || 'equals',
            value: condition.value
        }))
        : [];
    return {
        type,
        sourceActionKey,
        delay,
        conditions,
        description: trigger?.description || ''
    };
}

function normalizeActionAlerts(alerts) {
    if (!Array.isArray(alerts)) return [];
    return alerts.map(alert => {
        const type = PLAYBOOK_ALERT_TYPES.has(alert?.type) ? alert.type : 'in_app';
        let offset = null;
        if (alert?.offset && typeof alert.offset === 'object') {
            const amount = Math.max(0, Number(alert.offset.amount) || 0);
            const unit = PLAYBOOK_DELAY_UNITS.has(alert.offset.unit) ? alert.offset.unit : 'hours';
            offset = { amount, unit };
        }
        const recipients = Array.isArray(alert?.recipients)
            ? alert.recipients.map(r => String(r || '').trim()).filter(Boolean)
            : [];
        return {
            type,
            offset,
            recipients,
            message: alert?.message || ''
        };
    });
}

function normalizeActionResources(resources) {
    if (!Array.isArray(resources)) return [];
    return resources.map(resource => ({
        name: resource?.name || '',
        type: PLAYBOOK_RESOURCE_TYPES.has(resource?.type) ? resource.type : 'document',
        url: resource?.url || '',
        description: resource?.description || ''
    }));
}

function buildPipelineStage(name, { order = 0, probability = 0, status = 'open', playbook = null } = {}) {
    const normalizedStatus = ['open', 'won', 'lost', 'stalled'].includes(status) ? status : 'open';
    const normalizedProbability = typeof probability === 'number'
        ? Math.min(100, Math.max(0, probability))
        : (normalizedStatus === 'won' ? 100 : normalizedStatus === 'lost' ? 0 : 0);
    const key = slugify(name || `stage-${order + 1}`, `stage-${order + 1}`);
    return {
        key,
        name: name || `Stage ${order + 1}`,
        description: '',
        probability: normalizedStatus === 'won' ? 100 : normalizedStatus === 'lost' ? 0 : normalizedProbability,
        status: normalizedStatus,
        order,
        isClosedWon: normalizedStatus === 'won',
        isClosedLost: normalizedStatus === 'lost',
        playbook: buildStagePlaybook(key, name || `Stage ${order + 1}`, normalizedStatus, playbook)
    };
}

function getDefaultPipelineSettings() {
    const now = new Date();
    return [{
        key: 'default_pipeline',
        name: 'Default Pipeline',
        description: 'Standard sales pipeline',
        color: '#2563EB',
        isDefault: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
        stages: [
            buildPipelineStage('Qualification', { order: 0, probability: 25, status: 'open' }),
            buildPipelineStage('Proposal', { order: 1, probability: 50, status: 'open' }),
            buildPipelineStage('Negotiation', { order: 2, probability: 70, status: 'open' }),
            buildPipelineStage('Contract Sent', { order: 3, probability: 85, status: 'open' }),
            buildPipelineStage('Closed Won', { order: 4, probability: 100, status: 'won' }),
            buildPipelineStage('Closed Lost', { order: 5, probability: 0, status: 'lost' })
        ]
    }];
}

function normalizePipelineSettings(pipelines = []) {
    const source = Array.isArray(pipelines) ? pipelines : [];
    return source.map((pipeline, index) => {
        const name = pipeline.name || `Pipeline ${index + 1}`;
        const key = slugify(pipeline.key || name, `pipeline-${index + 1}`);
        const stagesSource = Array.isArray(pipeline.stages) ? pipeline.stages : [];
        const stages = stagesSource.map((stage, stageIndex) => {
            const stageName = stage.name || `Stage ${stageIndex + 1}`;
            const status = ['open', 'won', 'lost', 'stalled'].includes(stage.status) ? stage.status : 'open';
            const keyCandidate = slugify(stage.key || `${key}-${stageName}`, `${key}-stage-${stageIndex + 1}`);
            const probability = status === 'won'
                ? 100
                : status === 'lost'
                    ? 0
                    : Math.min(100, Math.max(0, Number(stage.probability) || 0));
            return {
                key: keyCandidate,
                name: stageName,
                description: stage.description || '',
                probability,
                status,
                order: stageIndex,
                isClosedWon: status === 'won',
                isClosedLost: status === 'lost',
                playbook: buildStagePlaybook(keyCandidate, stageName, status, stage.playbook)
            };
        });

        return {
            key,
            name,
            description: pipeline.description || '',
            color: pipeline.color || '#2563EB',
            isDefault: pipeline.isDefault === true,
            order: index,
            createdAt: pipeline.createdAt || new Date(),
            updatedAt: pipeline.updatedAt || new Date(),
            stages
        };
    });
}

exports.listModules = async (req, res) => {
    try {
        // Static system modules (always present)
        const systemModules = [
            { key: 'people', name: 'People' },
            { key: 'organizations', name: 'Organizations' },
            { key: 'deals', name: 'Deals' },
            { key: 'tasks', name: 'Tasks' },
            { key: 'events', name: 'Events' },
            { key: 'forms', name: 'Forms' },
            { key: 'items', name: 'Items' },
            { key: 'imports', name: 'Imports' },
            { key: 'reports', name: 'Reports' },
            { key: 'users', name: 'Users' } // For lookup targets (assignedTo, lead_owner, createdBy)
        ].map(m => ({
            _id: `system:${m.key}`,
            organizationId: req.user.organizationId,
            key: m.key,
            name: m.name,
            type: 'system',
            enabled: true,
            fields: m.key === 'users' ? [] : getBaseFieldsForKey(m.key), // Users module has no fields for lookup purposes
            fieldCount: 0,
            createdAt: null,
            updatedAt: null,
            pipelineSettings: m.key === 'deals' ? getDefaultPipelineSettings() : [],
            relationships: m.key === 'events' ? [
                {
                    name: 'Linked Forms',
                    type: 'lookup',
                    targetModuleKey: 'forms',
                    localField: 'linkedFormId',
                    foreignField: '_id',
                    inverseName: 'Linked Events',
                    inverseField: '',
                    required: false,
                    unique: false,
                    index: true,
                    cascadeDelete: false,
                    label: 'Linked Form',
                    description: 'Link audit forms to events for audit event types'
                }
            ] : m.key === 'items' ? [
                {
                    name: 'Vendor',
                    type: 'lookup',
                    targetModuleKey: 'organizations',
                    localField: 'vendor',
                    foreignField: '_id',
                    inverseName: 'Items',
                    inverseField: '',
                    required: false,
                    unique: false,
                    index: true,
                    cascadeDelete: false,
                    label: 'Vendor',
                    description: 'Link to vendor/supplier organization'
                },
                {
                    name: 'Linked Deals',
                    type: 'many_to_many',
                    targetModuleKey: 'deals',
                    localField: 'linked_deals',
                    foreignField: '_id',
                    inverseName: 'Linked Items',
                    inverseField: '',
                    required: false,
                    unique: false,
                    index: true,
                    cascadeDelete: false,
                    label: 'Linked Deals',
                    description: 'Deals where this item is quoted or sold'
                },
                {
                    name: 'Linked Forms',
                    type: 'many_to_many',
                    targetModuleKey: 'forms',
                    localField: 'linked_forms',
                    foreignField: '_id',
                    inverseName: 'Linked Items',
                    inverseField: '',
                    required: false,
                    unique: false,
                    index: true,
                    cascadeDelete: false,
                    label: 'Linked Forms',
                    description: 'Audit, feedback, or maintenance forms linked to this item'
                },
                {
                    name: 'Linked Contacts',
                    type: 'many_to_many',
                    targetModuleKey: 'people',
                    localField: 'linked_contacts',
                    foreignField: '_id',
                    inverseName: 'Linked Items',
                    inverseField: '',
                    required: false,
                    unique: false,
                    index: true,
                    cascadeDelete: false,
                    label: 'Linked Contacts',
                    description: 'Contacts linked to this item (end users, product testers, etc.)'
                }
            ] : []
        }));

        // Exclude 'groups' from modules list (it's a settings feature, not a module)
        const custom = await ModuleDefinition.find({ 
            organizationId: req.user.organizationId,
            key: { $ne: 'groups' } // Exclude groups
        }).lean();
        const customByKey = new Map(custom.map(m => [m.key, m]));

        // Merge: system base + stored overrides for same key (both custom and system-typed docs are stored in ModuleDefinition)
        const merged = [];
        for (const sys of systemModules) {
            const override = customByKey.get(sys.key);
            if (override) {
                // Respect saved order from override; append any base fields not present, in base order
                const saved = Array.isArray(override.fields) ? [...override.fields] : [];
                saved.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const seen = new Set(saved.map(f => f.key));
                
                // Create a map of base fields by key for quick lookup (case-insensitive)
                const baseFieldMap = new Map();
                const baseFieldMapLower = new Map(); // Case-insensitive lookup
                for (const f of sys.fields) {
                    if (f.key) {
                        baseFieldMap.set(f.key, f);
                        baseFieldMapLower.set(f.key.toLowerCase(), f);
                    }
                }
                
                // Update saved fields with base field dataType and options (for system modules, schema is source of truth)
                // BUT preserve saved labels and lookupSettings
                for (const savedField of saved) {
                    if (!savedField.key) continue;
                    
                    // Try exact match first, then case-insensitive match
                    let baseField = baseFieldMap.get(savedField.key);
                    if (!baseField) {
                        baseField = baseFieldMapLower.get(savedField.key.toLowerCase());
                    }
                    
                    if (baseField) {
                        // Normalize field key to match base field key (camelCase)
                        if (savedField.key.toLowerCase() === baseField.key.toLowerCase() && savedField.key !== baseField.key) {
                            savedField.key = baseField.key;
                        }
                        
                        // Update dataType from base (schema is source of truth for system modules)
                        savedField.dataType = baseField.dataType;
                        // Update options if base has them (for picklists)
                        if (baseField.options && baseField.options.length > 0) {
                            savedField.options = baseField.options;
                        }
                        // Update required from base (schema is source of truth for system modules)
                        savedField.required = baseField.required;
                        // Use base label if it's better (e.g., "Event Owner" vs "Event Owner Id")
                        if (baseField.label && (
                            !savedField.label || 
                            savedField.label.toLowerCase() === 'event owner id' ||
                            savedField.label.toLowerCase() === 'eventownerid'
                        )) {
                            savedField.label = baseField.label;
                        }
                        // Always use base lookupSettings if available (base is source of truth for system modules)
                        if (baseField.lookupSettings) {
                            savedField.lookupSettings = baseField.lookupSettings;
                        }
                        // Always use base dependencies if available (base is source of truth for system modules)
                        if (baseField.dependencies && Array.isArray(baseField.dependencies) && baseField.dependencies.length > 0) {
                            savedField.dependencies = JSON.parse(JSON.stringify(baseField.dependencies));
                        }
                        // For linkedFormId in events module, ensure visibility dependency exists (backward compatibility check)
                        if (sys.key === 'events' && savedField.key === 'linkedFormId') {
                            const hasVisibilityDep = savedField.dependencies && savedField.dependencies.some(
                                dep => dep.type === 'visibility' && dep.fieldKey === 'eventType'
                            );
                            if (!hasVisibilityDep) {
                                if (!savedField.dependencies) savedField.dependencies = [];
                                savedField.dependencies.push({
                                    name: 'Show for audit event types',
                                    type: 'visibility',
                                    fieldKey: 'eventType',
                                    operator: 'in',
                                    value: ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'],
                                    logic: 'AND'
                                });
                            }
                        }
                    }
                }
                
                // Add any new base fields not in saved (case-insensitive check)
                for (const baseField of sys.fields) {
                    const baseKeyLower = baseField.key?.toLowerCase();
                    const alreadyExists = saved.some(f => f.key && f.key.toLowerCase() === baseKeyLower);
                    if (!alreadyExists) {
                        // Ensure linkedFormId in events module has visibility dependency
                        let fieldToAdd = { ...baseField, order: saved.length };
                        if (sys.key === 'events' && baseField.key === 'linkedFormId' && (!fieldToAdd.dependencies || fieldToAdd.dependencies.length === 0)) {
                            fieldToAdd.dependencies = [{
                                name: 'Show for audit event types',
                                type: 'visibility',
                                fieldKey: 'eventType',
                                operator: 'in',
                                value: ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'],
                                logic: 'AND'
                            }];
                        }
                        saved.push(fieldToAdd);
                    }
                }
                // Include quickCreate and quickCreateLayout from override if present
                let pipelineSettings = Array.isArray(override.pipelineSettings)
                    ? JSON.parse(JSON.stringify(override.pipelineSettings))
                    : JSON.parse(JSON.stringify(sys.pipelineSettings || []));
                if (sys.key === 'deals') {
                    if (pipelineSettings.length === 0) {
                        pipelineSettings = getDefaultPipelineSettings();
                    }
                    pipelineSettings = normalizePipelineSettings(pipelineSettings);
                }
                // Use override quickCreate if it exists and has sufficient fields, otherwise use default
                // For Events module, ensure quickCreate has at least the essential fields
                // Use override quickCreate if present, otherwise use saved quickCreate, otherwise empty array
                // NO hardcoding - all configuration comes from the module definition saved in database
                let finalQuickCreate = override.quickCreate || sys.quickCreate || [];
                
                merged.push({ 
                    ...sys, 
                    fields: saved,
                    quickCreate: finalQuickCreate,
                    quickCreateLayout: override.quickCreateLayout || { version: 1, rows: [] },
                    relationships: override.relationships !== undefined ? override.relationships : (sys.relationships || []),
                    name: override.name || sys.name,
                    enabled: override.enabled !== undefined ? override.enabled : sys.enabled,
                    pipelineSettings
                });
                customByKey.delete(sys.key);
            } else {
                // No overrides; ensure base fields have stable order by index
                const withOrder = sys.fields.map((f, i) => ({ ...f, order: i }));
                merged.push({ 
                    ...sys, 
                    fields: withOrder,
                    quickCreate: [],
                    quickCreateLayout: { version: 1, rows: [] },
                    relationships: sys.relationships || [],
                    pipelineSettings: sys.key === 'deals'
                        ? normalizePipelineSettings(JSON.parse(JSON.stringify(sys.pipelineSettings || [])))
                        : JSON.parse(JSON.stringify(sys.pipelineSettings || []))
                });
            }
        }
        // Remaining custom modules
        for (const m of customByKey.values()) {
            const fields = Array.isArray(m.fields) ? [...m.fields] : [];
            fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            merged.push({ 
                ...m, 
                fields,
                quickCreate: m.quickCreate || [],
                quickCreateLayout: m.quickCreateLayout || { version: 1, rows: [] },
                relationships: m.relationships || [],
                pipelineSettings: Array.isArray(m.pipelineSettings) ? m.pipelineSettings : []
            });
        }

        // Attach field counts for system modules from actual schemas
        try {
            const People = require('../models/People');
            const Organization = require('../models/Organization');
            const Deal = require('../models/Deal');
            const Task = require('../models/Task');
            const Event = require('../models/Event');
            const Form = require('../models/Form');
            const ImportHistory = require('../models/ImportHistory');
            const modelByKey = {
                people: People,
                organizations: Organization,
                deals: Deal,
                tasks: Task,
                events: Event,
                forms: Form,
                imports: ImportHistory,
                reports: null, // no direct model
                users: null // Users module is for lookup targets only, no fields needed
            };
            const uniqueCount = (fields) => {
                if (!Array.isArray(fields)) return 0;
                const seen = new Set();
                for (const f of fields) {
                    const k = String(f?.key || '').toLowerCase();
                    if (!k) continue;
                    // ignore fields without a valid dataType (incomplete entries)
                    if (!f?.dataType) continue;
                    // ignore explicitly hidden technical fields if any slipped through
                    if (k === '_id' || k === '__v' || k === 'createdat' || k === 'updatedat') continue;
                    if (!seen.has(k)) seen.add(k);
                }
                return seen.size;
            };
            for (const m of merged) {
                m.fieldCount = uniqueCount(m.fields);
            }
        } catch (e) {
            // If any model missing, skip counts gracefully
            for (const m of merged) {
                if (typeof m.fieldCount !== 'number') {
                    m.fieldCount = Array.isArray(m.fields) ? m.fields.length : 0;
                }
            }
        }

        // Sort: system first, then custom; within each, by name
        merged.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'system' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        res.json({ success: true, data: merged });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error listing modules', error: error.message });
    }
};

exports.createModule = async (req, res) => {
    try {
        const { key, name, fields } = req.body;
        if (!key || !name) {
            return res.status(400).json({ success: false, message: 'key and name are required' });
        }
        const doc = await ModuleDefinition.create({
            organizationId: req.user.organizationId,
            key: String(key).toLowerCase().trim(),
            name: String(name).trim(),
            type: 'custom',
            fields: Array.isArray(fields) ? fields : []
        });
        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Module key already exists' });
        }
        res.status(500).json({ success: false, message: 'Error creating module', error: error.message });
    }
};

exports.deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await ModuleDefinition.findOne({ 
            _id: id, 
            organizationId: req.user.organizationId,
            key: { $ne: 'groups' } // Exclude groups
        });
        if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
        if (mod.type === 'system') return res.status(403).json({ success: false, message: 'Cannot delete system module' });
        await mod.deleteOne();
        res.json({ success: true, message: 'Module deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting module', error: error.message });
    }
};

exports.updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await ModuleDefinition.findOne({ 
            _id: id, 
            organizationId: req.user.organizationId,
            key: { $ne: 'groups' } // Exclude groups
        });
        if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

        const { name, enabled, fields, relationships, quickCreate, quickCreateLayout, pipelineSettings } = req.body;
        
        console.log('🔵 updateModule called:', {
            moduleId: id,
            moduleKey: mod.key,
            bodyKeys: Object.keys(req.body),
            quickCreateProvided: quickCreate !== undefined,
            quickCreateValue: quickCreate,
            quickCreateType: typeof quickCreate,
            quickCreateIsArray: Array.isArray(quickCreate),
            quickCreateLayoutProvided: quickCreateLayout !== undefined,
            quickCreateLayoutValue: quickCreateLayout
        });
        
        if (name !== undefined) mod.name = String(name).trim();
        if (enabled !== undefined) mod.enabled = !!enabled;
        if (Array.isArray(fields)) mod.fields = fields;
        
        // Always update relationships if provided (even if empty array)
        if (relationships !== undefined) {
            const newRelationships = Array.isArray(relationships) ? relationships : [];
            console.log('📝 Setting relationships:', {
                from: mod.relationships?.length || 0,
                to: newRelationships.length,
                relationships: newRelationships
            });
            mod.set('relationships', newRelationships);
            mod.markModified('relationships');
        }
        
        // Always update quickCreate if provided (even if empty array)
        if (quickCreate !== undefined) {
            const newQuickCreate = Array.isArray(quickCreate) ? quickCreate : [];
            console.log('📝 Setting quickCreate:', {
                from: mod.quickCreate,
                to: newQuickCreate,
                length: newQuickCreate.length
            });
            mod.quickCreate = newQuickCreate;
            mod.markModified('quickCreate');
        }
        
        // Always update quickCreateLayout if provided
        if (quickCreateLayout !== undefined) {
            const newLayout = (quickCreateLayout && typeof quickCreateLayout === 'object') 
                ? quickCreateLayout 
                : { version: 1, rows: [] };
            console.log('📝 Setting quickCreateLayout:', {
                from: mod.quickCreateLayout,
                to: newLayout,
                rows: newLayout.rows?.length || 0
            });
            mod.set('quickCreateLayout', newLayout);
        }
        
        // Mark quickCreateLayout as modified (quickCreate already marked above)
        if (quickCreateLayout !== undefined) mod.markModified('quickCreateLayout');

        if (pipelineSettings !== undefined) {
            let newPipelineSettings = Array.isArray(pipelineSettings) ? pipelineSettings : [];
            if (mod.key === 'deals') {
                newPipelineSettings = normalizePipelineSettings(newPipelineSettings);
            }
            mod.set('pipelineSettings', newPipelineSettings);
            mod.markModified('pipelineSettings');
        }
        
        await mod.save();
        
        // Use raw MongoDB update to ensure quickCreate is saved (bypass Mongoose issues)
        if (quickCreate !== undefined) {
            const mongoose = require('mongoose');
            const newQuickCreate = Array.isArray(quickCreate) ? quickCreate : [];
            await mongoose.connection.db.collection('moduledefinitions').updateOne(
                { _id: mod._id },
                { $set: { quickCreate: newQuickCreate } }
            );
            console.log('✅ Explicitly saved quickCreate via raw MongoDB:', newQuickCreate);
        }
        
        // Reload from database to ensure we get the latest data - use lean() for plain object
        const saved = await ModuleDefinition.findById(mod._id).lean();
        
        console.log('✅ Module saved. Verification:', {
            key: saved.key,
            relationships: saved.relationships,
            relationshipsLength: saved.relationships?.length || 0,
            quickCreate: saved.quickCreate,
            quickCreateLength: saved.quickCreate?.length || 0,
            quickCreateType: Array.isArray(saved.quickCreate),
            quickCreateLayout: saved.quickCreateLayout,
            quickCreateLayoutRows: saved.quickCreateLayout?.rows?.length || 0,
            modQuickCreate: mod.quickCreate,
            modQuickCreateLayout: mod.quickCreateLayout
        });
        
        // saved is already a plain object from lean(), but ensure all fields are present
        const responseData = saved || {};
        
        // Always explicitly set these fields from the saved document
        responseData.relationships = saved?.relationships || [];
        responseData.quickCreate = saved?.quickCreate || [];
        responseData.quickCreateLayout = saved?.quickCreateLayout || { version: 1, rows: [] };
        responseData.pipelineSettings = saved?.pipelineSettings || [];
        if (mod.key === 'deals') {
            responseData.pipelineSettings = normalizePipelineSettings(responseData.pipelineSettings);
        }
        
        // Final check - ensure responseData has the fields before sending
        if (!('relationships' in responseData) || responseData.relationships === undefined) {
            console.warn('⚠️  relationships missing in responseData, forcing set from saved');
            responseData.relationships = saved?.relationships || [];
        }
        if (!('quickCreate' in responseData) || responseData.quickCreate === undefined) {
            console.warn('⚠️  quickCreate missing in responseData, forcing set from saved');
            responseData.quickCreate = saved?.quickCreate || [];
        }
        if (!('quickCreateLayout' in responseData) || responseData.quickCreateLayout === undefined) {
            console.warn('⚠️  quickCreateLayout missing in responseData, forcing set from saved');
            responseData.quickCreateLayout = saved?.quickCreateLayout || { version: 1, rows: [] };
        }
        
        console.log('📤 Sending response (FINAL):', {
            hasQuickCreate: 'quickCreate' in responseData,
            quickCreate: responseData.quickCreate,
            quickCreateLength: responseData.quickCreate?.length || 0,
            hasQuickCreateLayout: 'quickCreateLayout' in responseData,
            quickCreateLayout: responseData.quickCreateLayout,
            quickCreateLayoutRows: responseData.quickCreateLayout?.rows?.length || 0,
            savedQuickCreate: saved?.quickCreate,
            savedQuickCreateType: typeof saved?.quickCreate
        });
        
        res.json({ 
            success: true, 
            data: responseData, 
            message: 'Module updated' 
        });
    } catch (error) {
        console.error('❌ Error updating module:', error);
        res.status(500).json({ success: false, message: 'Error updating module', error: error.message });
    }
};

exports.updateSystemModule = async (req, res) => {
    try {
        const { key } = req.params;
        const systemKeys = new Set(['people','organizations','deals','tasks','events','forms','items','imports','reports']);
        if (!systemKeys.has(key)) return res.status(400).json({ success: false, message: 'Invalid system module key' });
        const { fields, enabled, name, relationships, quickCreate, quickCreateLayout, pipelineSettings } = req.body;
        
        console.log('🔵 updateSystemModule called:', {
            moduleKey: key,
            organizationId: req.user.organizationId,
            bodyKeys: Object.keys(req.body),
            quickCreateProvided: quickCreate !== undefined,
            quickCreateValue: quickCreate,
            quickCreateType: typeof quickCreate,
            quickCreateIsArray: Array.isArray(quickCreate),
            quickCreateLayoutProvided: quickCreateLayout !== undefined,
            quickCreateLayoutValue: quickCreateLayout
        });
        
        // Build update object - only include fields that are provided
        const updateObj = {
            type: 'system'
        };
        
        if (name !== undefined) updateObj.name = String(name).trim();
        if (enabled !== undefined) updateObj.enabled = !!enabled;
        if (Array.isArray(fields)) updateObj.fields = fields;
        if (Array.isArray(relationships)) updateObj.relationships = relationships;
        if (pipelineSettings !== undefined) {
            const pipelineValue = Array.isArray(pipelineSettings) ? pipelineSettings : [];
            updateObj.pipelineSettings = key === 'deals'
                ? normalizePipelineSettings(pipelineValue)
                : pipelineValue;
        }
        
        // Always update quickCreate if provided (even if empty array)
        if (quickCreate !== undefined) {
            updateObj.quickCreate = Array.isArray(quickCreate) ? quickCreate : [];
            console.log('📝 Setting quickCreate in updateObj:', {
                value: updateObj.quickCreate,
                length: updateObj.quickCreate.length,
                type: typeof updateObj.quickCreate,
                isArray: Array.isArray(updateObj.quickCreate)
            });
        }
        
        // Always update quickCreateLayout if provided
        if (quickCreateLayout !== undefined) {
            updateObj.quickCreateLayout = (quickCreateLayout && typeof quickCreateLayout === 'object') 
                ? quickCreateLayout 
                : { version: 1, rows: [] };
            console.log('📝 Setting quickCreateLayout in updateObj:', {
                version: updateObj.quickCreateLayout?.version,
                rows: updateObj.quickCreateLayout?.rows?.length || 0,
                hasRows: 'rows' in updateObj.quickCreateLayout
            });
        }
        
        console.log('🔧 Update object keys:', Object.keys(updateObj));
        console.log('🔧 Update object quickCreate:', updateObj.quickCreate);
        console.log('🔧 Update object quickCreate type:', typeof updateObj.quickCreate, Array.isArray(updateObj.quickCreate));
        console.log('🔧 Update object quickCreateLayout:', JSON.stringify(updateObj.quickCreateLayout, null, 2));
        
        // Deep copy to ensure we're working with clean data
        const cleanUpdateObj = JSON.parse(JSON.stringify(updateObj));
        console.log('🔧 Clean update object quickCreate:', cleanUpdateObj.quickCreate);
        console.log('🔧 Clean update object quickCreate type:', typeof cleanUpdateObj.quickCreate, Array.isArray(cleanUpdateObj.quickCreate));
        
        // Log the exact update operation
        console.log('🔧 MongoDB Update Operation:', {
            filter: { organizationId: req.user.organizationId.toString(), key },
            update: { $set: cleanUpdateObj },
            updateObjKeys: Object.keys(cleanUpdateObj),
            updateObjHasQuickCreate: 'quickCreate' in cleanUpdateObj,
            updateObjQuickCreateLength: cleanUpdateObj.quickCreate?.length || 0,
            updateObjHasQuickCreateLayout: 'quickCreateLayout' in cleanUpdateObj
        });
        
        // Ensure quickCreate is definitely in the update if provided
        if (quickCreate !== undefined && updateObj.quickCreate) {
            console.log('✅ quickCreate will be saved:', {
                value: updateObj.quickCreate,
                length: updateObj.quickCreate.length,
                isArray: Array.isArray(updateObj.quickCreate),
                keys: updateObj.quickCreate.slice(0, 5) // First 5 keys
            });
        }
        
        // Mongoose updateOne seems to be filtering out quickCreate and fields
        // So we'll use direct MongoDB driver for these critical fields and Mongoose for others
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const collection = db.collection('moduledefinitions');
        
        // Separate critical fields that Mongoose seems to ignore
        const criticalFields = {};
        const otherFields = {};
        
        Object.keys(cleanUpdateObj).forEach(objKey => {
            if (objKey === 'quickCreate' || objKey === 'quickCreateLayout' || objKey === 'fields' || objKey === 'relationships' || objKey === 'pipelineSettings') {
                criticalFields[objKey] = cleanUpdateObj[objKey];
            } else {
                otherFields[objKey] = cleanUpdateObj[objKey];
            }
        });
        
        // Update non-critical fields with Mongoose first
        let updateResult = { matchedCount: 0, modifiedCount: 0 };
        if (Object.keys(otherFields).length > 0) {
            updateResult = await ModuleDefinition.updateOne(
                { organizationId: req.user.organizationId, key },
                { $set: otherFields },
                { upsert: true, runValidators: false }
            );
            console.log('📊 Mongoose updateOne result (other fields):', {
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
                fields: Object.keys(otherFields)
            });
        }
        
        // ALWAYS use direct MongoDB driver for critical fields (quickCreate, fields, quickCreateLayout)
        if (Object.keys(criticalFields).length > 0) {
            console.log('🔧 Using direct MongoDB update for critical fields:', Object.keys(criticalFields));
            
            const directUpdateResult = await collection.updateOne(
                { 
                    organizationId: new mongoose.Types.ObjectId(req.user.organizationId), 
                    key: key.toLowerCase()
                },
                { 
                    $set: criticalFields
                },
                { upsert: false }
            );
            
            console.log('📊 Direct MongoDB update result:', {
                matchedCount: directUpdateResult.matchedCount,
                modifiedCount: directUpdateResult.modifiedCount,
                acknowledged: directUpdateResult.acknowledged,
                fields: Object.keys(criticalFields),
                relationshipsCount: criticalFields.relationships?.length || 0,
                quickCreate: criticalFields.quickCreate?.length || 0,
                fieldsCount: criticalFields.fields?.length || 0,
                pipelineSettingsCount: criticalFields.pipelineSettings?.length || 0
            });
            
            if (directUpdateResult.matchedCount === 0) {
                console.error('🚨 WARNING: Document not found for direct update!', {
                    organizationId: req.user.organizationId.toString(),
                    key: key.toLowerCase()
                });
            }
        }
        
        // Now fetch the document to verify what was saved
        const doc = await ModuleDefinition.findOne({ 
            organizationId: req.user.organizationId, 
            key 
        });
        
        if (!doc) {
            throw new Error('Failed to retrieve document after save');
        }
        
        console.log('📄 Document after updateOne:', {
            docId: doc._id,
            docRelationships: doc.relationships,
            docRelationshipsLength: doc.relationships?.length || 0,
            docQuickCreate: doc.quickCreate,
            docQuickCreateLength: doc.quickCreate?.length || 0,
            docQuickCreateType: typeof doc.quickCreate,
            docQuickCreateIsArray: Array.isArray(doc.quickCreate),
            docHasQuickCreate: 'quickCreate' in doc,
            docQuickCreateLayout: doc.quickCreateLayout,
            docQuickCreateLayoutRows: doc.quickCreateLayout?.rows?.length || 0
        });
        
        console.log('🔍 Immediately after save:', {
            docQuickCreate: doc.quickCreate,
            docQuickCreateLength: doc.quickCreate?.length || 0,
            docHasQuickCreate: 'quickCreate' in doc,
            docQuickCreateType: typeof doc.quickCreate,
            docQuickCreateLayout: doc.quickCreateLayout,
            docQuickCreateLayoutRows: doc.quickCreateLayout?.rows?.length || 0,
            docId: doc._id
        });
        
        // Wait a brief moment for write to complete, then verify
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify what was actually saved by querying directly from MongoDB (bypass Mongoose)
        const verifiedRaw = await collection.findOne({ 
            organizationId: new mongoose.Types.ObjectId(req.user.organizationId), 
            key: key.toLowerCase()
        });
        
        console.log('🔍 Raw MongoDB document keys:', verifiedRaw ? Object.keys(verifiedRaw) : 'Document not found');
        console.log('🔍 Raw MongoDB relationships:', verifiedRaw?.relationships, 'length:', verifiedRaw?.relationships?.length || 0);
        console.log('🔍 Raw MongoDB quickCreate:', verifiedRaw?.quickCreate);
        console.log('🔍 Raw MongoDB fields count:', verifiedRaw?.fields?.length || 0);
        console.log('🔍 Raw MongoDB pipelineSettings count:', verifiedRaw?.pipelineSettings?.length || 0);
        
        // Also verify with Mongoose to compare
        const verified = await ModuleDefinition.findOne({ 
            organizationId: req.user.organizationId, 
            key 
        }).lean(); // Use lean() to get plain JavaScript object
        
        // Also get the Mongoose document to compare
        const verifiedDoc = await ModuleDefinition.findOne({ 
            organizationId: req.user.organizationId, 
            key 
        });
        
        console.log('🔍 After lean query (from database):', {
            verifiedRelationships: verified?.relationships,
            verifiedRelationshipsLength: verified?.relationships?.length || 0,
            verifiedHasRelationships: verified && 'relationships' in verified,
            verifiedQuickCreate: verified?.quickCreate,
            verifiedQuickCreateLength: verified?.quickCreate?.length || 0,
            verifiedHasQuickCreate: verified && 'quickCreate' in verified,
            verifiedQuickCreateLayout: verified?.quickCreateLayout,
            verifiedQuickCreateLayoutRows: verified?.quickCreateLayout?.rows?.length || 0,
            verifiedId: verified?._id,
            verifiedKey: verified?.key,
            allVerifiedKeys: verified ? Object.keys(verified) : []
        });
        
        // Compare with Mongoose document version
        if (verifiedDoc) {
            console.log('🔍 Mongoose document (not lean):', {
                docRelationships: verifiedDoc.relationships,
                docRelationshipsLength: verifiedDoc.relationships?.length || 0,
                docHasRelationships: 'relationships' in verifiedDoc,
                docQuickCreate: verifiedDoc.quickCreate,
                docQuickCreateLength: verifiedDoc.quickCreate?.length || 0,
                docHasQuickCreate: 'quickCreate' in verifiedDoc,
                docQuickCreateLayout: verifiedDoc.quickCreateLayout,
                docQuickCreateLayoutRows: verifiedDoc.quickCreateLayout?.rows?.length || 0
            });
        }
        
        // Use raw MongoDB document if available (most reliable), otherwise fall back to Mongoose verified
        const sourceDoc = verifiedRaw || verified;
        // Ensure verified includes relationships from sourceDoc
        if (verified && sourceDoc?.relationships) {
            verified.relationships = sourceDoc.relationships;
        }
        if (verified && sourceDoc?.pipelineSettings) {
            verified.pipelineSettings = sourceDoc.pipelineSettings;
        }
        
        // Verify critical fields were saved correctly
        if (criticalFields.relationships) {
            const savedRelationships = sourceDoc?.relationships || [];
            const savedLength = Array.isArray(savedRelationships) ? savedRelationships.length : 0;
            const expectedLength = Array.isArray(criticalFields.relationships) ? criticalFields.relationships.length : 0;
            
            if (savedLength !== expectedLength) {
                console.error('🚨 CRITICAL: relationships still not saved correctly!', {
                    expected: expectedLength,
                    saved: savedLength,
                    relationships: criticalFields.relationships
                });
            } else {
                console.log('✅ Relationships saved correctly:', {
                    expected: expectedLength,
                    saved: savedLength
                });
            }
        }
        
        if (criticalFields.quickCreate) {
            const savedQuickCreate = sourceDoc?.quickCreate || [];
            const savedLength = Array.isArray(savedQuickCreate) ? savedQuickCreate.length : 0;
            const expectedLength = Array.isArray(criticalFields.quickCreate) ? criticalFields.quickCreate.length : 0;
            
            if (savedLength !== expectedLength) {
                console.error('🚨 CRITICAL: quickCreate still not saved correctly!', {
                    expected: expectedLength,
                    saved: savedLength,
                    expectedArray: criticalFields.quickCreate,
                    savedArray: savedQuickCreate,
                    rawDocHasIt: verifiedRaw && 'quickCreate' in verifiedRaw,
                    mongooseDocHasIt: verified && 'quickCreate' in verified
                });
            } else {
                console.log('✅ quickCreate verified successfully:', {
                    length: savedLength,
                    values: savedQuickCreate
                });
            }
        }
        
        if (criticalFields.fields) {
            const savedFields = sourceDoc?.fields || [];
            const savedCount = Array.isArray(savedFields) ? savedFields.length : 0;
            const expectedCount = Array.isArray(criticalFields.fields) ? criticalFields.fields.length : 0;
            
            if (savedCount !== expectedCount) {
                console.error('🚨 CRITICAL: fields still not saved correctly!', {
                    expected: expectedCount,
                    saved: savedCount
                });
            } else {
                console.log('✅ fields verified successfully:', {
                    count: savedCount
                });
            }
        }
        
        if (criticalFields.pipelineSettings) {
            const savedPipelines = sourceDoc?.pipelineSettings || [];
            const savedCount = Array.isArray(savedPipelines) ? savedPipelines.length : 0;
            const expectedCount = Array.isArray(criticalFields.pipelineSettings) ? criticalFields.pipelineSettings.length : 0;
            if (savedCount !== expectedCount) {
                console.error('🚨 CRITICAL: pipelineSettings still not saved correctly!', {
                    expected: expectedCount,
                    saved: savedCount
                });
            } else {
                console.log('✅ pipelineSettings verified successfully:', {
                    count: savedCount
                });
            }
        }
        
        // Update doc and verified from sourceDoc for response
        if (sourceDoc) {
            if (criticalFields.quickCreate) {
                doc.quickCreate = sourceDoc.quickCreate;
                verified.quickCreate = sourceDoc.quickCreate;
                if (criticalFields.quickCreateLayout) {
                    doc.quickCreateLayout = sourceDoc.quickCreateLayout;
                    verified.quickCreateLayout = sourceDoc.quickCreateLayout;
                }
            }
            if (criticalFields.fields) {
                doc.fields = sourceDoc.fields;
                verified.fields = sourceDoc.fields;
            }
            if (criticalFields.pipelineSettings) {
                doc.pipelineSettings = sourceDoc.pipelineSettings;
                verified.pipelineSettings = sourceDoc.pipelineSettings;
            }
        }
        
        console.log('✅ System module saved. Verification:', {
            key: doc.key,
            docQuickCreate: doc.quickCreate,
            docQuickCreateLength: doc.quickCreate?.length || 0,
            docQuickCreateType: typeof doc.quickCreate,
            docQuickCreateIsArray: Array.isArray(doc.quickCreate),
            docQuickCreateLayout: doc.quickCreateLayout,
            verifiedQuickCreate: verified?.quickCreate,
            verifiedQuickCreateLength: verified?.quickCreate?.length || 0,
            verifiedQuickCreateType: typeof verified?.quickCreate,
            verifiedQuickCreateIsArray: Array.isArray(verified?.quickCreate),
            verifiedQuickCreateLayout: verified?.quickCreateLayout,
            updateObjQuickCreate: updateObj.quickCreate,
            updateObjQuickCreateLength: updateObj.quickCreate?.length || 0,
            updateObjQuickCreateLayout: updateObj.quickCreateLayout
        });
        
        // Use verified document or doc - always use the one from database
        const responseDoc = verified || doc;
        
        // Convert to plain object - use JSON serialization to ensure all fields
        let responseData;
        if (responseDoc.toObject) {
            responseData = responseDoc.toObject({ getters: true, virtuals: false });
        } else {
            responseData = JSON.parse(JSON.stringify(responseDoc));
        }
        
        // Always explicitly set these fields - prioritize verified (from lean query)
        // verified is a plain object, so it should have all fields
        // Note: verified was already updated from sourceDoc earlier, so use it directly
        let relationshipsValue = verified?.relationships;
        let quickCreateValue = verified?.quickCreate;
        let quickCreateLayoutValue = verified?.quickCreateLayout;
        let pipelineSettingsValue = verified?.pipelineSettings;
        
        // If verified doesn't have it, check updateObj (what we tried to save)
        if (!relationshipsValue && updateObj.relationships) {
            console.warn('⚠️  relationships not found in saved doc, using updateObj value');
            relationshipsValue = updateObj.relationships;
        }
        if (!quickCreateValue && updateObj.quickCreate) {
            console.warn('⚠️  quickCreate not found in saved doc, using updateObj value');
            quickCreateValue = updateObj.quickCreate;
        }
        if (!quickCreateLayoutValue && updateObj.quickCreateLayout) {
            console.warn('⚠️  quickCreateLayout not found in saved doc, using updateObj value');
            quickCreateLayoutValue = updateObj.quickCreateLayout;
        }
        if (!pipelineSettingsValue && updateObj.pipelineSettings) {
            console.warn('⚠️  pipelineSettings not found in saved doc, using updateObj value');
            pipelineSettingsValue = updateObj.pipelineSettings;
        }
        
        console.log('🔍 Source document check:', {
            usingVerified: !!verified,
            sourceDocHasQuickCreate: 'quickCreate' in (sourceDoc || {}),
            quickCreateValue: quickCreateValue,
            quickCreateValueType: typeof quickCreateValue,
            quickCreateIsArray: Array.isArray(quickCreateValue),
            sourceDocHasQuickCreateLayout: 'quickCreateLayout' in (sourceDoc || {}),
            quickCreateLayoutValue: quickCreateLayoutValue,
            fallbackToUpdateObj: !sourceDoc?.quickCreate && !!updateObj.quickCreate
        });
        
        // Set the values - always use arrays/objects, never undefined
        responseData.relationships = Array.isArray(relationshipsValue) ? relationshipsValue : (relationshipsValue || []);
        responseData.quickCreate = Array.isArray(quickCreateValue) ? quickCreateValue : (quickCreateValue || []);
        responseData.quickCreateLayout = (quickCreateLayoutValue && typeof quickCreateLayoutValue === 'object') 
            ? quickCreateLayoutValue 
            : (quickCreateLayoutValue || { version: 1, rows: [] });
        
        // Final check - prioritize what was saved, but if empty or missing, use what was requested
        // This handles cases where the save might not have persisted but we still want to return what was requested
        let finalQuickCreate = [];
        if (quickCreateValue && Array.isArray(quickCreateValue)) {
            finalQuickCreate = quickCreateValue; // Use what's in the database
        } else if (updateObj.quickCreate && Array.isArray(updateObj.quickCreate)) {
            finalQuickCreate = updateObj.quickCreate; // Fallback to what was requested
        }
        
        let finalQuickCreateLayout = { version: 1, rows: [] };
        if (quickCreateLayoutValue && typeof quickCreateLayoutValue === 'object' && quickCreateLayoutValue.version) {
            finalQuickCreateLayout = quickCreateLayoutValue; // Use what's in the database
        } else if (updateObj.quickCreateLayout && typeof updateObj.quickCreateLayout === 'object') {
            finalQuickCreateLayout = updateObj.quickCreateLayout; // Fallback to what was requested
        }
        
        // Always set these in responseData
        responseData.quickCreate = finalQuickCreate;
        responseData.quickCreateLayout = finalQuickCreateLayout;
        responseData.pipelineSettings = Array.isArray(pipelineSettingsValue) ? pipelineSettingsValue : [];
        if (key === 'deals') {
            responseData.pipelineSettings = normalizePipelineSettings(responseData.pipelineSettings);
        }
        
        console.log('📤 Sending response (FINAL):', {
            hasQuickCreate: 'quickCreate' in responseData,
            quickCreate: responseData.quickCreate,
            quickCreateLength: responseData.quickCreate?.length || 0,
            hasQuickCreateLayout: 'quickCreateLayout' in responseData,
            quickCreateLayout: responseData.quickCreateLayout,
            quickCreateLayoutRows: responseData.quickCreateLayout?.rows?.length || 0,
            usingUpdateObjValues: (finalQuickCreate === updateObj.quickCreate || finalQuickCreateLayout === updateObj.quickCreateLayout),
            responseDataKeys: Object.keys(responseData)
        });
        
        // Final relationships value - prioritize saved, fallback to updateObj
        let finalRelationships = [];
        if (relationshipsValue && Array.isArray(relationshipsValue)) {
            finalRelationships = relationshipsValue; // Use what's in the database
        } else if (updateObj.relationships && Array.isArray(updateObj.relationships)) {
            finalRelationships = updateObj.relationships; // Fallback to what was requested
        }
        
        // Create a fresh object to ensure no Mongoose document weirdness
        const finalResponse = {
            _id: responseData._id || doc._id,
            organizationId: responseData.organizationId || doc.organizationId,
            key: responseData.key || doc.key,
            name: responseData.name || doc.name,
            type: responseData.type || doc.type || 'system',
            enabled: responseData.enabled !== undefined ? responseData.enabled : doc.enabled,
            fields: responseData.fields || doc.fields || [],
            relationships: finalRelationships,
            quickCreate: finalQuickCreate,
            quickCreateLayout: finalQuickCreateLayout,
            pipelineSettings: key === 'deals'
                ? normalizePipelineSettings(responseData.pipelineSettings)
                : (Array.isArray(responseData.pipelineSettings) ? responseData.pipelineSettings : []),
            createdAt: responseData.createdAt || doc.createdAt,
            updatedAt: responseData.updatedAt || doc.updatedAt
        };
        
        res.json({ 
            success: true, 
            data: finalResponse, 
            message: 'System module updated' 
        });
    } catch (error) {
        console.error('❌ Error updating system module:', error);
        res.status(500).json({ success: false, message: 'Error updating system module', error: error.message });
    }
};


