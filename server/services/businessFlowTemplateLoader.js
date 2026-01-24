/**
 * ============================================================================
 * PLATFORM CORE: Business Flow Template Loader (Default Templates)
 * ============================================================================
 *
 * Loads and imports default Business Flow templates from filesystem.
 * Templates are importable configs, not runtime logic.
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const Process = require('../models/Process');
const BusinessFlow = require('../models/BusinessFlow');
const { createLogger } = require('./automationLogger');

const log = createLogger('businessFlowTemplateLoader');

const TEMPLATES_DIR = path.join(__dirname, '../templates/business-flows');

/**
 * List all available templates.
 * Returns ALL templates regardless of appKey - admins decide relevance.
 */
function listTemplates() {
  try {
    const templates = [];
    const templateDirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dirName of templateDirs) {
      const templatePath = path.join(TEMPLATES_DIR, dirName);
      const businessFlowPath = path.join(templatePath, 'businessFlow.json');

      if (fs.existsSync(businessFlowPath)) {
        const businessFlowData = JSON.parse(fs.readFileSync(businessFlowPath, 'utf8'));
        
        // Generate "What this sets up" bullets from process keys
        const highlights = generateTemplateHighlights(businessFlowData);
        
        templates.push({
          key: dirName,
          name: businessFlowData.name,
          description: businessFlowData.description,
          appKey: businessFlowData.appKey, // Metadata only, not for filtering
          processCount: businessFlowData.processKeys?.length || 0,
          highlights, // What this sets up (1-2 bullets)
          metadata: businessFlowData.metadata || {}
        });
      }
    }

    return templates;
  } catch (error) {
    log.error('list_templates_error', { error: error.message });
    return [];
  }
}

/**
 * Generate human-readable highlights for a template.
 */
function generateTemplateHighlights(businessFlowData) {
  const processKeys = businessFlowData.processKeys || [];
  const highlights = [];
  
  // Map common process keys to human-readable descriptions
  const keyDescriptions = {
    'lead_intake': 'Lead intake & assignment',
    'lead_qualification': 'Lead qualification',
    'deal_governance': 'Deal approval workflow',
    'client_onboarding': 'Client onboarding',
    'audit_scheduling': 'Audit scheduling',
    'audit_execution': 'Audit execution',
    'closure_billing': 'Closure & billing',
    'trial_conversion': 'Trial conversion',
    'membership_governance': 'Membership governance',
    'renewal_automation': 'Renewal automation'
  };
  
  for (const key of processKeys.slice(0, 3)) { // Max 3 highlights
    if (keyDescriptions[key]) {
      highlights.push(keyDescriptions[key]);
    } else {
      // Fallback: humanize the key
      highlights.push(key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
  }
  
  return highlights;
}

/**
 * Get template count (for empty state logic).
 */
function getTemplateCount() {
  try {
    const templateDirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    return templateDirs.length;
  } catch (error) {
    log.error('get_template_count_error', { error: error.message });
    return 0;
  }
}

/**
 * Get template details including preview of processes.
 */
function getTemplateDetails(templateKey) {
  try {
    const templatePath = path.join(TEMPLATES_DIR, templateKey);
    const businessFlowPath = path.join(templatePath, 'businessFlow.json');

    if (!fs.existsSync(businessFlowPath)) {
      return { ok: false, error: 'Template not found' };
    }

    const businessFlowData = JSON.parse(fs.readFileSync(businessFlowPath, 'utf8'));
    const processesDir = path.join(templatePath, 'processes');
    const processFiles = fs.existsSync(processesDir)
      ? fs.readdirSync(processesDir).filter(f => f.endsWith('.json'))
      : [];

    const processes = processFiles.map(fileName => {
      const processPath = path.join(processesDir, fileName);
      const processData = JSON.parse(fs.readFileSync(processPath, 'utf8'));
      return {
        key: fileName.replace('.json', ''),
        name: processData.name,
        description: processData.description,
        trigger: processData.trigger,
        nodeCount: processData.nodes?.length || 0
      };
    });

    return {
      ok: true,
      data: {
        ...businessFlowData,
        processes
      }
    };
  } catch (error) {
    log.error('get_template_details_error', { templateKey, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Import a template into an organization.
 * Creates all processes (as Draft) and the Business Flow.
 */
async function importTemplate(templateKey, organizationId, userId) {
  try {
    const templatePath = path.join(TEMPLATES_DIR, templateKey);
    const businessFlowPath = path.join(templatePath, 'businessFlow.json');

    if (!fs.existsSync(businessFlowPath)) {
      return { ok: false, error: 'Template not found' };
    }

    const businessFlowData = JSON.parse(fs.readFileSync(businessFlowPath, 'utf8'));
    const processesDir = path.join(templatePath, 'processes');
    const processFiles = businessFlowData.processKeys.map(key => `${key}.json`);

    // Import all processes
    const processIds = [];
    const processKeyMap = {};

    for (const fileName of processFiles) {
      const processPath = path.join(processesDir, fileName);
      if (!fs.existsSync(processPath)) {
        log.warn('process_file_not_found', { fileName, templateKey });
        continue;
      }

      const processData = JSON.parse(fs.readFileSync(processPath, 'utf8'));

      // Ensure process starts as Draft (safety guarantee)
      const process = await Process.create({
        name: processData.name,
        description: processData.description || '',
        appKey: processData.appKey || businessFlowData.appKey,
        trigger: processData.trigger,
        status: 'draft', // SAFETY: Always Draft
        version: processData.version || 1,
        nodes: processData.nodes || [],
        edges: processData.edges || [],
        createdBy: userId
      });

      processIds.push(process._id);
      processKeyMap[fileName.replace('.json', '')] = process._id;
    }

    if (processIds.length === 0) {
      return { ok: false, error: 'No processes could be imported' };
    }

    // Create Business Flow
    const businessFlow = await BusinessFlow.create({
      name: businessFlowData.name,
      description: businessFlowData.description || null,
      appKey: businessFlowData.appKey,
      processIds: processIds,
      createdBy: userId,
      organizationId: organizationId
    });

    log.info('template_imported', {
      templateKey,
      organizationId: organizationId.toString(),
      userId: userId.toString(),
      processCount: processIds.length,
      businessFlowId: businessFlow._id.toString()
    });

    return {
      ok: true,
      data: {
        businessFlowId: businessFlow._id,
        processIds: processIds,
        processKeyMap
      }
    };
  } catch (error) {
    log.error('import_template_error', { templateKey, error: error.message });
    return { ok: false, error: error.message };
  }
}

module.exports = {
  listTemplates,
  getTemplateDetails,
  getTemplateCount,
  importTemplate
};
