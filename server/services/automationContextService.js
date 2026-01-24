/**
 * ============================================================================
 * PLATFORM CORE: Automation Context Service
 * ============================================================================
 *
 * Provides human-readable automation context for records.
 * Returns explanations only - never mechanics or internals.
 *
 * Core Principle: Build centrally. Explain locally. Execute invisibly.
 *
 * ============================================================================
 */

const Process = require('../models/Process');
const AutomationRule = require('../models/AutomationRule');
const BusinessFlow = require('../models/BusinessFlow');
const { createLogger } = require('./automationLogger');

const log = createLogger('automationContextService');

/**
 * Get automation context for a specific record.
 * Returns human-readable explanations of what automation applies.
 */
async function getRecordAutomationContext(entityType, entityId, options = {}) {
  const { organizationId, record } = options;

  try {
    // Find active processes that could apply to this entity type
    const processes = await Process.find({
      status: 'active',
      $or: [
        { 'nodes.config.entityType': entityType },
        { 'trigger.eventType': { $regex: new RegExp(`^(record|status|stage)`, 'i') } }
      ]
    }).lean();

    // Filter processes that actually apply to this entity type
    const applicableProcesses = processes.filter(process => {
      // Check trigger node for entity type
      const triggerNode = process.nodes?.find(n => n.type === 'trigger');
      if (triggerNode?.config?.entityType === entityType) {
        return true;
      }
      
      // Check behavior nodes for entity type
      const behaviorNodes = process.nodes?.filter(n => 
        ['field_rule', 'ownership_rule', 'status_guard', 'approval_gate'].includes(n.type)
      );
      if (behaviorNodes?.some(n => n.config?.entityType === entityType)) {
        return true;
      }
      
      // Check action nodes for entity type
      const actionNodes = process.nodes?.filter(n => n.type === 'action');
      if (actionNodes?.some(n => n.config?.params?.entityType === entityType)) {
        return true;
      }
      
      return false;
    });

    // Find enabled automation rules for this entity type
    const rules = await AutomationRule.find({
      enabled: true,
      entityType: entityType,
      $or: [
        { organizationId: null },
        { organizationId: organizationId }
      ]
    }).lean();

    // Generate human-readable explanations
    const processExplanations = applicableProcesses.map(process => 
      generateProcessExplanation(process, entityType, record)
    );

    const ruleExplanations = rules.map(rule => 
      generateRuleExplanation(rule, entityType)
    );

    // Combine and deduplicate explanations
    const allExplanations = [...processExplanations, ...ruleExplanations];

    return {
      ok: true,
      data: {
        entityType,
        entityId,
        hasAutomation: allExplanations.length > 0,
        explanations: allExplanations,
        // For admin links (only shown to admins in UI)
        _adminContext: {
          processIds: applicableProcesses.map(p => p._id.toString()),
          ruleIds: rules.map(r => r._id.toString())
        }
      }
    };
  } catch (error) {
    log.error('get_record_automation_context_error', { entityType, entityId, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Generate human-readable explanation for a process.
 * Never expose mechanics - only outcomes.
 */
function generateProcessExplanation(process, entityType, record) {
  const explanation = {
    id: process._id.toString(),
    type: 'process',
    name: process.name,
    status: process.status,
    outcomes: []
  };

  // Analyze nodes to generate outcome explanations
  for (const node of process.nodes || []) {
    const outcome = generateNodeOutcome(node, entityType, record);
    if (outcome) {
      explanation.outcomes.push(outcome);
    }
  }

  // Generate summary based on outcomes
  explanation.summary = generateProcessSummary(explanation.outcomes, process);

  return explanation;
}

/**
 * Generate outcome explanation for a single node.
 */
function generateNodeOutcome(node, entityType, record) {
  switch (node.type) {
    case 'approval_gate':
      return generateApprovalOutcome(node.config, entityType, record);
    
    case 'field_rule':
      return generateFieldRuleOutcome(node.config, entityType);
    
    case 'ownership_rule':
      return generateOwnershipOutcome(node.config, entityType);
    
    case 'status_guard':
      return generateStatusGuardOutcome(node.config, entityType);
    
    case 'action':
      return generateActionOutcome(node.config, entityType);
    
    default:
      return null;
  }
}

/**
 * Generate approval outcome explanation.
 */
function generateApprovalOutcome(config, entityType, record) {
  if (!config) return null;

  const entityLabel = getEntityLabel(entityType);
  let description = `Approval may be required for this ${entityLabel}`;

  // Add context based on config
  if (config.approvalType === 'single') {
    description = `Manager approval required`;
  } else if (config.approvalType === 'sequential') {
    description = `Multi-level approval required`;
  }

  return {
    type: 'approval',
    icon: 'shield-check',
    description,
    detail: 'The system will pause and wait for approval before proceeding'
  };
}

/**
 * Generate field rule outcome explanation.
 */
function generateFieldRuleOutcome(config, entityType) {
  if (!config) return null;

  const entityLabel = getEntityLabel(entityType);
  const field = config.field || 'certain fields';

  return {
    type: 'field_control',
    icon: 'lock-closed',
    description: `Some fields may be automatically managed`,
    detail: `The system controls ${field} based on business rules`
  };
}

/**
 * Generate ownership outcome explanation.
 */
function generateOwnershipOutcome(config, entityType) {
  if (!config) return null;

  const entityLabel = getEntityLabel(entityType);
  let description = `Ownership is automatically assigned`;

  if (config.assignment === 'role') {
    description = `Automatically assigned to ${config.target || 'the appropriate team member'}`;
  } else if (config.assignment === 'round_robin') {
    description = `Automatically distributed among team members`;
  }

  return {
    type: 'ownership',
    icon: 'user-plus',
    description,
    detail: `The system manages who is responsible for this ${entityLabel}`
  };
}

/**
 * Generate status guard outcome explanation.
 */
function generateStatusGuardOutcome(config, entityType) {
  if (!config) return null;

  const entityLabel = getEntityLabel(entityType);

  return {
    type: 'status_control',
    icon: 'shield-exclamation',
    description: `Status changes are governed by business rules`,
    detail: `The system ensures proper workflow progression`
  };
}

/**
 * Generate action outcome explanation.
 */
function generateActionOutcome(config, entityType) {
  if (!config) return null;

  const actionType = config.actionType;
  
  const actionDescriptions = {
    'notify_user': {
      icon: 'bell',
      description: 'Notifications are sent automatically',
      detail: 'Team members are kept informed of important changes'
    },
    'create_task': {
      icon: 'clipboard-list',
      description: 'Follow-up tasks are created automatically',
      detail: 'The system creates tasks to ensure nothing is missed'
    },
    'create_record': {
      icon: 'plus-circle',
      description: 'Related records are created automatically',
      detail: 'The system creates linked records when appropriate'
    },
    'update_field': {
      icon: 'pencil',
      description: 'Fields are updated automatically',
      detail: 'The system keeps information up to date'
    },
    'send_email': {
      icon: 'envelope',
      description: 'Emails are sent automatically',
      detail: 'Stakeholders receive timely communications'
    },
    'send_whatsapp': {
      icon: 'chat-bubble-left',
      description: 'WhatsApp messages are sent automatically',
      detail: 'Quick notifications via WhatsApp'
    }
  };

  return actionDescriptions[actionType] || {
    icon: 'cog',
    description: 'Automated actions are performed',
    detail: 'The system takes action based on business rules'
  };
}

/**
 * Generate summary for a process based on its outcomes.
 */
function generateProcessSummary(outcomes, process) {
  if (outcomes.length === 0) {
    return process.description || 'This process manages automated behavior';
  }

  // Prioritize certain outcome types for the summary
  const approvalOutcome = outcomes.find(o => o.type === 'approval');
  if (approvalOutcome) {
    return approvalOutcome.description;
  }

  const ownershipOutcome = outcomes.find(o => o.type === 'ownership');
  if (ownershipOutcome) {
    return ownershipOutcome.description;
  }

  // Default to first outcome or description
  return outcomes[0]?.description || process.description || 'Automated behavior applies';
}

/**
 * Generate human-readable explanation for an automation rule.
 */
function generateRuleExplanation(rule, entityType) {
  const actionDescriptions = {
    'notify_user': 'Notifications are sent automatically',
    'create_task': 'Follow-up tasks are created automatically',
    'send_email': 'Emails are sent automatically',
    'send_whatsapp': 'WhatsApp messages are sent automatically',
    'update_field': 'Fields are updated automatically',
    'create_record': 'Related records are created automatically',
    'start_process': 'Additional workflows may be triggered'
  };

  const actionType = rule.action?.type;
  const description = actionDescriptions[actionType] || 'Automated actions are performed';

  return {
    id: rule._id.toString(),
    type: 'rule',
    name: rule.name,
    status: rule.enabled ? 'active' : 'disabled',
    summary: description,
    outcomes: [{
      type: 'action',
      icon: getActionIcon(actionType),
      description,
      detail: rule.description || 'Based on configured business rules'
    }]
  };
}

/**
 * Get icon for action type.
 */
function getActionIcon(actionType) {
  const icons = {
    'notify_user': 'bell',
    'create_task': 'clipboard-list',
    'send_email': 'envelope',
    'send_whatsapp': 'chat-bubble-left',
    'update_field': 'pencil',
    'create_record': 'plus-circle',
    'start_process': 'play'
  };
  return icons[actionType] || 'cog';
}

/**
 * Get human-readable label for entity type.
 */
function getEntityLabel(entityType) {
  const labels = {
    'people': 'contact',
    'organization': 'organization',
    'deal': 'deal',
    'form': 'form submission',
    'event': 'event'
  };
  return labels[entityType] || entityType;
}

/**
 * Check if a record has any automation applied.
 * Used for list view badges.
 */
async function hasAutomation(entityType, entityId, options = {}) {
  try {
    const context = await getRecordAutomationContext(entityType, entityId, options);
    return context.ok ? context.data.hasAutomation : false;
  } catch (error) {
    return false;
  }
}

/**
 * Get business flows for an app.
 * Used for app home screens.
 */
async function getAppFlows(appKey, organizationId) {
  try {
    const flows = await BusinessFlow.find({
      appKey: appKey.toUpperCase(),
      organizationId
    })
      .populate('processIds', 'name status description')
      .lean();

    // Generate human-readable flow explanations
    const flowExplanations = flows.map(flow => ({
      id: flow._id.toString(),
      name: flow.name,
      description: flow.description || 'End-to-end business workflow',
      processCount: flow.processIds?.length || 0,
      hasActiveProcesses: flow.processIds?.some(p => p.status === 'active') || false
    }));

    return {
      ok: true,
      data: {
        appKey,
        flows: flowExplanations
      }
    };
  } catch (error) {
    log.error('get_app_flows_error', { appKey, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Batch check automation for multiple records.
 * Used for list views to show badges efficiently.
 */
async function batchCheckAutomation(entityType, entityIds, options = {}) {
  try {
    // Get all applicable processes for this entity type
    const processes = await Process.find({
      status: 'active',
      $or: [
        { 'nodes.config.entityType': entityType },
        { 'trigger.eventType': { $regex: new RegExp(`^(record|status|stage)`, 'i') } }
      ]
    }).lean();

    // Get all applicable rules for this entity type
    const rules = await AutomationRule.find({
      enabled: true,
      entityType: entityType
    }).lean();

    // If any automation exists for this entity type, all records are potentially affected
    const hasAnyAutomation = processes.length > 0 || rules.length > 0;

    // Return map of entityId -> hasAutomation
    const result = {};
    for (const id of entityIds) {
      result[id] = hasAnyAutomation;
    }

    return {
      ok: true,
      data: result
    };
  } catch (error) {
    log.error('batch_check_automation_error', { entityType, error: error.message });
    return { ok: false, error: error.message };
  }
}

module.exports = {
  getRecordAutomationContext,
  hasAutomation,
  getAppFlows,
  batchCheckAutomation
};
