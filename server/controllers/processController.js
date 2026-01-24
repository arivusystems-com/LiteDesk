/**
 * ============================================================================
 * PLATFORM CORE: Process Controller
 * ============================================================================
 *
 * CRUD endpoints for Process management (Admin only).
 * Includes validation, preview, and test execution functionality.
 *
 * ============================================================================
 */

const Process = require('../models/Process');
const ProcessExecution = require('../models/ProcessExecution');
const { validateProcess } = require('../services/processExecutor');
const { startProcess } = require('../services/processInvocation');
const { createLogger } = require('../services/automationLogger');

const log = createLogger('processController');

// Known app keys
const APP_KEYS = ['SALES', 'AUDIT', 'PORTAL'];

// Known entity types
const ENTITY_TYPES = ['people', 'organization', 'deal'];

// Known trigger types
const TRIGGER_TYPES = ['domain_event', 'manual'];

// Known node types
const NODE_TYPES = ['trigger', 'condition', 'action', 'data_mapping', 'end', 'field_rule', 'ownership_rule', 'status_guard', 'approval_gate'];

/**
 * Validate process definition
 */
function validateProcessDefinition(processData) {
  if (!processData.name || typeof processData.name !== 'string' || !processData.name.trim()) {
    return { valid: false, error: 'Process name is required' };
  }

  if (!processData.appKey || !APP_KEYS.includes(processData.appKey.toUpperCase())) {
    return { valid: false, error: `Invalid appKey: ${processData.appKey}` };
  }

  if (!processData.trigger || typeof processData.trigger !== 'object') {
    return { valid: false, error: 'Trigger is required' };
  }

  if (!TRIGGER_TYPES.includes(processData.trigger.type)) {
    return { valid: false, error: `Invalid trigger type: ${processData.trigger.type}` };
  }

  if (processData.trigger.type === 'domain_event' && !processData.trigger.eventType) {
    return { valid: false, error: 'Domain event trigger requires eventType' };
  }

  if (!processData.nodes || !Array.isArray(processData.nodes) || processData.nodes.length === 0) {
    return { valid: false, error: 'Process must have at least one node' };
  }

  // Validate nodes
  const nodeIds = new Set();
  for (const node of processData.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      return { valid: false, error: 'All nodes must have an id' };
    }
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate node id: ${node.id}` };
    }
    nodeIds.add(node.id);

    if (!NODE_TYPES.includes(node.type)) {
      return { valid: false, error: `Invalid node type: ${node.type}` };
    }
  }

  // Validate edges
  if (processData.edges && Array.isArray(processData.edges)) {
    for (const edge of processData.edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        return { valid: false, error: `Edge references invalid fromNodeId: ${edge.fromNodeId}` };
      }
      if (!nodeIds.has(edge.toNodeId)) {
        return { valid: false, error: `Edge references invalid toNodeId: ${edge.toNodeId}` };
      }
    }
  }

  return { valid: true };
}

/**
 * @route   GET /api/admin/processes
 * @desc    Get all processes (admin only)
 * @access  Private (Admin only)
 */
exports.getAllProcesses = async (req, res) => {
  try {
    const { appKey, status } = req.query;
    const query = {};
    
    if (appKey) query.appKey = appKey.toUpperCase();
    if (status) query.status = status.toLowerCase();
    
    // Scope to user's org or global processes
    query.$or = [
      { organizationId: null },
      { organizationId: req.user.organizationId }
    ];
    
    const processes = await Process.find(query)
      .sort({ updatedAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: processes,
      count: processes.length
    });
  } catch (error) {
    log.error('get_all_processes_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching processes',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/processes/:id
 * @desc    Get single process
 * @access  Private (Admin only)
 */
exports.getProcessById = async (req, res) => {
  try {
    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    }).lean();
    
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    res.json({
      success: true,
      data: process
    });
  } catch (error) {
    log.error('get_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching process',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/admin/processes
 * @desc    Create new process
 * @access  Private (Admin only)
 */
exports.createProcess = async (req, res) => {
  try {
    const processData = {
      ...req.body,
      createdBy: req.user._id,
      status: 'draft' // Always create in draft state
    };

    // Validate process definition
    const validation = validateProcessDefinition(processData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Additional validation using process executor
    const process = new Process(processData);
    const processValidation = validateProcess(process.toObject());
    if (!processValidation.valid) {
      return res.status(400).json({
        success: false,
        message: processValidation.error
      });
    }

    await process.save();

    log.info('process_created', {
      processId: process._id.toString(),
      name: process.name,
      appKey: process.appKey,
      createdBy: req.user._id.toString()
    });

    res.status(201).json({
      success: true,
      data: process,
      message: 'Process created successfully'
    });
  } catch (error) {
    log.error('create_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating process',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/admin/processes/:id
 * @desc    Update process (draft only)
 * @access  Private (Admin only)
 */
exports.updateProcess = async (req, res) => {
  try {
    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Only allow editing draft processes
    if (process.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft processes can be edited. Duplicate the process to make changes.'
      });
    }

    // Merge updates
    Object.assign(process, req.body);
    delete process.createdBy; // Don't allow changing creator

    // Validate process definition
    const validation = validateProcessDefinition(process.toObject());
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Additional validation using process executor
    const processValidation = validateProcess(process.toObject());
    if (!processValidation.valid) {
      return res.status(400).json({
        success: false,
        message: processValidation.error
      });
    }

    await process.save();

    log.info('process_updated', {
      processId: process._id.toString(),
      name: process.name
    });

    res.json({
      success: true,
      data: process,
      message: 'Process updated successfully'
    });
  } catch (error) {
    log.error('update_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating process',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/admin/processes/:id/status
 * @desc    Update process status (activate/deactivate)
 * @access  Private (Admin only)
 */
exports.updateProcessStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'active', 'archived'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Validate before activating
    if (status === 'active') {
      const validation = validateProcess(process.toObject());
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Cannot activate process: ${validation.error}`
        });
      }
    }

    process.status = status;
    await process.save();

    log.info('process_status_updated', {
      processId: process._id.toString(),
      status
    });

    res.json({
      success: true,
      data: process,
      message: `Process ${status === 'active' ? 'activated' : status === 'archived' ? 'archived' : 'saved as draft'} successfully`
    });
  } catch (error) {
    log.error('update_process_status_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating process status',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/admin/processes/:id/duplicate
 * @desc    Duplicate process
 * @access  Private (Admin only)
 */
exports.duplicateProcess = async (req, res) => {
  try {
    const original = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    }).lean();

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Create duplicate in draft state
    const duplicate = new Process({
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      status: 'draft',
      version: 1,
      createdBy: req.user._id
    });

    await duplicate.save();

    log.info('process_duplicated', {
      originalId: original._id.toString(),
      duplicateId: duplicate._id.toString()
    });

    res.status(201).json({
      success: true,
      data: duplicate,
      message: 'Process duplicated successfully'
    });
  } catch (error) {
    log.error('duplicate_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error duplicating process',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/admin/processes/:id/test
 * @desc    Test process execution (dry-run)
 * @access  Private (Admin only)
 */
exports.testProcess = async (req, res) => {
  try {
    const { entityId, entityType } = req.body;

    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    }).lean();

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Create a test execution context
    // This is a dry-run, so we don't actually execute
    // Instead, we simulate and return what would happen

    // For now, return a preview of what would execute
    // In a full implementation, this would use a dry-run mode of the executor

    res.json({
      success: true,
      data: {
        processId: process._id.toString(),
        processName: process.name,
        nodes: process.nodes.map(n => ({
          id: n.id,
          type: n.type,
          config: n.config
        })),
        message: 'Test execution preview (dry-run mode)'
      }
    });
  } catch (error) {
    log.error('test_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error testing process',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/processes/:id/executions
 * @desc    Get process execution logs
 * @access  Private (Admin only)
 */
exports.getProcessExecutions = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    const executions = await ProcessExecution.find({
      processId: process._id
    })
      .sort({ startedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await ProcessExecution.countDocuments({
      processId: process._id
    });

    res.json({
      success: true,
      data: executions,
      count: executions.length,
      total
    });
  } catch (error) {
    log.error('get_process_executions_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching process executions',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/admin/processes/:id
 * @desc    Delete process (draft only)
 * @access  Private (Admin only)
 */
exports.deleteProcess = async (req, res) => {
  try {
    const process = await Process.findOne({
      _id: req.params.id,
      $or: [
        { organizationId: null },
        { organizationId: req.user.organizationId }
      ]
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Only allow deleting draft processes
    if (process.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft processes can be deleted. Archive active processes instead.'
      });
    }

    await Process.deleteOne({ _id: process._id });

    log.info('process_deleted', {
      processId: process._id.toString(),
      name: process.name
    });

    res.json({
      success: true,
      message: 'Process deleted successfully'
    });
  } catch (error) {
    log.error('delete_process_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error deleting process',
      error: error.message
    });
  }
};
