/**
 * Report Block Contract
 * 
 * Formal type definitions for block-based report generation system.
 * This contract defines the structure and types for report blocks that
 * can be used to generate deterministic, enterprise-grade reports.
 * 
 * @module types/reportBlockContract
 */

/**
 * @typedef {string} ReportBlockType
 * 
 * Enumeration of all supported report block types.
 * Each type represents a distinct section or element in a generated report.
 * 
 * @enum {string}
 */
const ReportBlockType = {
    // ============================================
    // IDENTITY & METADATA BLOCKS
    // ============================================
    
    /** Report cover page with identity information (logo, company name, audit details) */
    REPORT_IDENTITY: 'REPORT_IDENTITY',
    
    // ============================================
    // PERFORMANCE & SCORING BLOCKS
    // ============================================
    
    /** Overall performance score with rating, benchmark comparison, and key metrics */
    OVERALL_PERFORMANCE: 'OVERALL_PERFORMANCE',
    
    /** Breakdown of performance by section/department with scores and comparisons */
    SECTION_BREAKDOWN: 'SECTION_BREAKDOWN',
    
    /** Top 5 highest and bottom 5 lowest scoring areas */
    TOP_BOTTOM_AREAS: 'TOP_BOTTOM_AREAS',
    
    // ============================================
    // NARRATIVE & SUMMARY BLOCKS
    // ============================================
    
    /** Executive summary or narrative text describing audit findings */
    NARRATIVE_SUMMARY: 'NARRATIVE_SUMMARY',
    
    /** Summary of non-compliance issues by department/category */
    NON_COMPLIANCE_SUMMARY: 'NON_COMPLIANCE_SUMMARY',
    
    /** Detailed findings table with questions, answers, evidence, and scores */
    DETAILED_FINDINGS: 'DETAILED_FINDINGS',
    
    // ============================================
    // TREND & COMPARISON BLOCKS
    // ============================================
    
    /** Performance trends across multiple audits (line/bar charts, historical data) */
    PERFORMANCE_TRENDS: 'PERFORMANCE_TRENDS',
    
    // ============================================
    // ACTION & TRACKING BLOCKS
    // ============================================
    
    /** Corrective actions, action items, and their status tracking */
    ACTION_ITEMS: 'ACTION_ITEMS',
    
    // ============================================
    // CONTENT BLOCKS (Static/Formatting)
    // ============================================
    
    /** Heading text block with configurable level (H1, H2, H3) */
    HEADING: 'HEADING',
    
    /** Plain text content block */
    TEXT: 'TEXT',
    
    /** Horizontal divider/separator line */
    DIVIDER: 'DIVIDER'
};

/**
 * @typedef {string} VisibilityRule
 * 
 * System-driven visibility rules that determine when a block should be rendered.
 * These rules are evaluated at report generation time based on available data.
 * 
 * @enum {string}
 */
const VisibilityRule = {
    /** Always render the block (default) */
    ALWAYS: 'ALWAYS',
    
    /** Render only if the block has data to display */
    SHOW_IF_DATA_EXISTS: 'SHOW_IF_DATA_EXISTS',
    
    /** Hide if no comparison data is available (for comparison blocks) */
    HIDE_IF_NO_COMPARISON: 'HIDE_IF_NO_COMPARISON',
    
    /** Hide if no previous audits exist (for trend blocks) */
    HIDE_IF_NO_HISTORY: 'HIDE_IF_NO_HISTORY',
    
    /** Hide if no non-compliance issues exist */
    HIDE_IF_NO_NON_COMPLIANCE: 'HIDE_IF_NO_NON_COMPLIANCE',
    
    /** Hide if no action items exist */
    HIDE_IF_NO_ACTION_ITEMS: 'HIDE_IF_NO_ACTION_ITEMS',
    
    /** Hide if score meets or exceeds threshold (for performance blocks) */
    HIDE_IF_SCORE_ABOVE_THRESHOLD: 'HIDE_IF_SCORE_ABOVE_THRESHOLD',
    
    /** Hide if score is below threshold (for performance blocks) */
    HIDE_IF_SCORE_BELOW_THRESHOLD: 'HIDE_IF_SCORE_BELOW_THRESHOLD'
};

/**
 * @typedef {Object} ReportBlockConfig
 * 
 * Block-specific configuration object. The structure varies by block type.
 * Each block type defines its own configuration schema.
 */

/**
 * REPORT_IDENTITY Block Configuration
 * @typedef {Object} ReportIdentityConfig
 * @property {string} companyName - Company/organization name
 * @property {string} reportTitle - Report title text
 * @property {boolean} showAuditId - Whether to display audit ID
 * @property {boolean} showDates - Whether to display check-in/check-out dates
 * @property {boolean} showRound - Whether to display audit round number
 * @property {boolean} showAddress - Whether to display address
 * @property {boolean} showGeneralManager - Whether to display general manager name
 * @note Logo is now defined at template branding level, not per block
 */

/**
 * OVERALL_PERFORMANCE Block Configuration
 * @typedef {Object} OverallPerformanceConfig
 * @property {boolean} showScore - Display overall score percentage
 * @property {boolean} showRating - Display star rating
 * @property {boolean} showBenchmark - Display benchmark comparison
 * @property {boolean} showScoreBreakdown - Display detailed score breakdown
 * @property {boolean} showClassification - Display rating classification table
 * @property {number|null} benchmarkScore - Custom benchmark score (null = use default)
 * @property {string} chartType - 'donut' | 'gauge' | 'bar' | 'none'
 * @property {boolean} showPerformanceHistory - Include mini performance history chart
 */

/**
 * SECTION_BREAKDOWN Block Configuration
 * @typedef {Object} SectionBreakdownConfig
 * @property {boolean} showCurrentScores - Display current audit scores
 * @property {boolean} showPreviousScores - Display previous audit scores for comparison
 * @property {boolean} showChange - Display change indicators (↑/↓)
 * @property {boolean} showPassFailCounts - Display passed/failed question counts
 * @property {string} sortBy - 'score' | 'name' | 'change' | 'default'
 * @property {string} sortOrder - 'asc' | 'desc'
 * @property {number|null} limit - Maximum number of sections to display (null = all)
 */

/**
 * TOP_BOTTOM_AREAS Block Configuration
 * @typedef {Object} TopBottomAreasConfig
 * @property {number} topCount - Number of top areas to show (default: 5)
 * @property {number} bottomCount - Number of bottom areas to show (default: 5)
 * @property {boolean} showScores - Display score percentages
 * @property {boolean} showChange - Display change from previous audit
 * @property {string} layout - 'side_by_side' | 'stacked' | 'table'
 */

/**
 * NARRATIVE_SUMMARY Block Configuration
 * @typedef {Object} NarrativeSummaryConfig
 * @property {string|null} customText - Custom narrative text (null = auto-generate)
 * @property {boolean} includeScoreContext - Include score in narrative
 * @property {boolean} includeTopAreas - Mention top performing areas
 * @property {boolean} includeBottomAreas - Mention areas needing improvement
 * @property {boolean} includeTrends - Include trend information
 * @property {number} maxLength - Maximum character length (0 = no limit)
 */

/**
 * PERFORMANCE_TRENDS Block Configuration
 * @typedef {Object} PerformanceTrendsConfig
 * @property {number} periodCount - Number of audits to include (default: 5)
 * @property {string[]} metrics - Metrics to display ['compliance', 'failedPoints', 'sections']
 * @property {string} chartType - 'line' | 'bar' | 'area'
 * @property {boolean} showCurrentHighlight - Highlight current audit in chart
 * @property {boolean} showAverage - Display average trend line
 * @property {boolean} showProjection - Display projected trend (if applicable)
 */

/**
 * NON_COMPLIANCE_SUMMARY Block Configuration
 * @typedef {Object} NonComplianceSummaryConfig
 * @property {boolean} showByDepartment - Group non-compliance by department
 * @property {boolean} showByCategory - Group non-compliance by category
 * @property {boolean} showPreviousComparison - Compare with previous audit
 * @property {boolean} showChange - Display change indicators
 * @property {string} sortBy - 'count' | 'department' | 'change'
 * @property {number|null} limit - Maximum items to display (null = all)
 */

/**
 * DETAILED_FINDINGS Block Configuration
 * @typedef {Object} DetailedFindingsConfig
 * @property {string[]|null} sectionIds - Specific sections to include (null = all)
 * @property {boolean} showOnlyFailed - Show only failed questions
 * @property {boolean} showOnlyPassed - Show only passed questions
 * @property {boolean} showEvidence - Display evidence attachments
 * @property {boolean} showComments - Display question comments
 * @property {boolean} showScores - Display individual question scores
 * @property {string[]} columns - Columns to display ['sNo', 'category', 'tag', 'area', 'standard', 'answer', 'comment', 'score']
 * @property {string} sortBy - 'section' | 'score' | 'questionId'
 */

/**
 * ACTION_ITEMS Block Configuration
 * @typedef {Object} ActionItemsConfig
 * @property {boolean} showStatus - Display action item status
 * @property {boolean} showDates - Display creation/due dates
 * @property {boolean} showAssignee - Display assigned user
 * @property {boolean} showPriority - Display priority level
 * @property {string[]|null} statusFilter - Filter by status ['pending', 'in_progress', 'completed', 'regressed']
 * @property {boolean} showFromPreviousAudits - Include action items from previous audits
 * @property {string} sortBy - 'date' | 'status' | 'priority' | 'department'
 */

/**
 * HEADING Block Configuration
 * @typedef {Object} HeadingConfig
 * @property {string} content - Heading text
 * @property {number} level - Heading level (1, 2, or 3)
 * @property {string} align - Text alignment 'left' | 'center' | 'right'
 */

/**
 * TEXT Block Configuration
 * @typedef {Object} TextConfig
 * @property {string} content - Text content (supports markdown/HTML if enabled)
 * @property {boolean} allowMarkdown - Enable markdown formatting
 * @property {string} align - Text alignment 'left' | 'center' | 'right' | 'justify'
 */

/**
 * DIVIDER Block Configuration
 * @typedef {Object} DividerConfig
 * @property {string} style - Divider style 'solid' | 'dashed' | 'dotted'
 * @property {string} color - Divider color (hex code)
 * @property {number} thickness - Line thickness in pixels
 */

/**
 * Union type of all block configuration types
 * @typedef {ReportIdentityConfig|OverallPerformanceConfig|SectionBreakdownConfig|TopBottomAreasConfig|NarrativeSummaryConfig|PerformanceTrendsConfig|NonComplianceSummaryConfig|DetailedFindingsConfig|ActionItemsConfig|HeadingConfig|TextConfig|DividerConfig} ReportBlockConfig
 */

/**
 * @typedef {Object} ReportBlockSchema
 * 
 * Core schema definition for a report block.
 * This is the contract that all report blocks must conform to.
 * 
 * @property {string} id - Unique identifier for the block (required, immutable)
 * @property {ReportBlockType} type - Type of the block (required, immutable after creation)
 * @property {boolean} mandatory - Whether this block is required and cannot be deleted (default: false)
 * @property {boolean} locked - Whether this block's configuration is locked from editing (default: false)
 * @property {VisibilityRule} visibilityRule - System-driven visibility rule (default: 'ALWAYS')
 * @property {ReportBlockConfig} config - Block-specific configuration object (required)
 * @property {number} order - Display order within the template (required, 0-based index)
 * @property {Object} [metadata] - Optional metadata (created date, modified date, etc.)
 * @property {string} [metadata.createdBy] - User ID who created the block
 * @property {Date} [metadata.createdAt] - Creation timestamp
 * @property {Date} [metadata.updatedAt] - Last update timestamp
 */
const ReportBlockSchema = {
    id: String,
    type: String, // ReportBlockType enum value
    mandatory: Boolean,
    locked: Boolean,
    visibilityRule: String, // VisibilityRule enum value
    config: Object, // Block-specific configuration
    order: Number,
    metadata: {
        createdBy: String,
        createdAt: Date,
        updatedAt: Date
    }
};

/**
 * @typedef {Object} ReportBrandingConfig
 * 
 * Report-level branding configuration that applies globally to all blocks.
 * Branding cannot be overridden by individual blocks.
 * 
 * @property {string|null} logo - Logo image URL or path (null = no logo)
 * @property {Object} colors - Color palette for the report
 * @property {string} colors.primary - Primary brand color (hex code)
 * @property {string} colors.secondary - Secondary brand color (hex code)
 * @property {string} colors.success - Success/positive color (hex code)
 * @property {string} colors.danger - Danger/error color (hex code)
 * @property {string} colors.warning - Warning color (hex code)
 * @property {string} colors.text - Primary text color (hex code)
 * @property {string} colors.textLight - Light text color (hex code)
 * @property {string} colors.background - Background color (hex code)
 * @property {Object} typography - Typography tokens
 * @property {string} typography.fontFamily - Primary font family
 * @property {string} typography.headingFont - Heading font family
 * @property {number} typography.baseFontSize - Base font size in pixels
 * @property {Object} header - Header layout configuration
 * @property {boolean} header.showLogo - Whether to show logo in header
 * @property {boolean} header.showCompanyName - Whether to show company name in header
 * @property {string} header.alignment - Header alignment 'left' | 'center' | 'right'
 * @property {Object} footer - Footer layout configuration
 * @property {boolean} footer.showDisclaimer - Whether to show disclaimer text
 * @property {string} footer.disclaimerText - Footer disclaimer text
 * @property {string} footer.alignment - Footer alignment 'left' | 'center' | 'right'
 */
const ReportBrandingConfig = {
    logo: String,
    colors: {
        primary: String,
        secondary: String,
        success: String,
        danger: String,
        warning: String,
        text: String,
        textLight: String,
        background: String
    },
    typography: {
        fontFamily: String,
        headingFont: String,
        baseFontSize: Number
    },
    header: {
        showLogo: Boolean,
        showCompanyName: Boolean,
        alignment: String
    },
    footer: {
        showDisclaimer: Boolean,
        disclaimerText: String,
        alignment: String
    }
};

/**
 * @typedef {Object} ReportTemplateSchema
 * 
 * Schema for a complete report template containing multiple blocks.
 * 
 * @property {string} id - Unique template identifier
 * @property {string} name - Template name
 * @property {string} [description] - Template description
 * @property {boolean} isDefault - Whether this is the default template
 * @property {ReportBlockSchema[]} blocks - Array of report blocks in display order
 * @property {ReportBrandingConfig} branding - Report-level branding configuration
 * @property {Object} [metadata] - Template metadata
 * @property {string} [metadata.organizationId] - Organization this template belongs to
 * @property {string} [metadata.createdBy] - User ID who created the template
 * @property {Date} [metadata.createdAt] - Creation timestamp
 * @property {Date} [metadata.updatedAt] - Last update timestamp
 * @property {number} [metadata.version] - Template version number
 */
const ReportTemplateSchema = {
    id: String,
    name: String,
    description: String,
    isDefault: Boolean,
    blocks: [ReportBlockSchema],
    branding: ReportBrandingConfig,
    metadata: {
        organizationId: String,
        createdBy: String,
        createdAt: Date,
        updatedAt: Date,
        version: Number
    }
};

/**
 * Validates that a block type is a valid ReportBlockType
 * @param {string} type - Block type to validate
 * @returns {boolean} True if valid
 */
function isValidBlockType(type) {
    return Object.values(ReportBlockType).includes(type);
}

/**
 * Validates that a visibility rule is valid
 * @param {string} rule - Visibility rule to validate
 * @returns {boolean} True if valid
 */
function isValidVisibilityRule(rule) {
    return Object.values(VisibilityRule).includes(rule);
}

/**
 * Gets the default configuration for a block type
 * @param {ReportBlockType} blockType - The block type
 * @returns {ReportBlockConfig} Default configuration object
 */
function getDefaultBlockConfig(blockType) {
    const defaults = {
        [ReportBlockType.REPORT_IDENTITY]: {
            logo: null,
            companyName: '',
            reportTitle: 'Audit Report',
            showAuditId: true,
            showDates: true,
            showRound: true,
            showAddress: false,
            showGeneralManager: false
        },
        [ReportBlockType.OVERALL_PERFORMANCE]: {
            showScore: true,
            showRating: true,
            showBenchmark: true,
            showScoreBreakdown: true,
            showClassification: true,
            benchmarkScore: null,
            chartType: 'donut',
            showPerformanceHistory: false
        },
        [ReportBlockType.SECTION_BREAKDOWN]: {
            showCurrentScores: true,
            showPreviousScores: false,
            showChange: false,
            showPassFailCounts: true,
            sortBy: 'default',
            sortOrder: 'asc',
            limit: null
        },
        [ReportBlockType.TOP_BOTTOM_AREAS]: {
            topCount: 5,
            bottomCount: 5,
            showScores: true,
            showChange: false,
            layout: 'side_by_side'
        },
        [ReportBlockType.NARRATIVE_SUMMARY]: {
            customText: null,
            includeScoreContext: true,
            includeTopAreas: true,
            includeBottomAreas: true,
            includeTrends: false,
            maxLength: 0
        },
        [ReportBlockType.PERFORMANCE_TRENDS]: {
            periodCount: 5,
            metrics: ['compliance'],
            chartType: 'line',
            showCurrentHighlight: true,
            showAverage: false,
            showProjection: false
        },
        [ReportBlockType.NON_COMPLIANCE_SUMMARY]: {
            showByDepartment: true,
            showByCategory: false,
            showPreviousComparison: false,
            showChange: false,
            sortBy: 'count',
            limit: null
        },
        [ReportBlockType.DETAILED_FINDINGS]: {
            sectionIds: null,
            showOnlyFailed: false,
            showOnlyPassed: false,
            showEvidence: true,
            showComments: true,
            showScores: true,
            columns: ['sNo', 'category', 'tag', 'area', 'standard', 'answer', 'comment', 'score'],
            sortBy: 'section'
        },
        [ReportBlockType.ACTION_ITEMS]: {
            showStatus: true,
            showDates: true,
            showAssignee: false,
            showPriority: false,
            statusFilter: null,
            showFromPreviousAudits: true,
            sortBy: 'date'
        },
        [ReportBlockType.HEADING]: {
            content: 'Heading',
            level: 1,
            align: 'left'
        },
        [ReportBlockType.TEXT]: {
            content: '',
            allowMarkdown: false,
            align: 'left'
        },
        [ReportBlockType.DIVIDER]: {
            style: 'solid',
            color: '#CCCCCC',
            thickness: 1
        }
    };
    
    return defaults[blockType] || {};
}

/**
 * Validates a report block against the schema
 * @param {Object} block - Block object to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateBlock(block) {
    const errors = [];
    
    if (!block.id || typeof block.id !== 'string') {
        errors.push('Block must have a valid string id');
    }
    
    if (!block.type || !isValidBlockType(block.type)) {
        errors.push(`Block must have a valid type. Got: ${block.type}`);
    }
    
    if (typeof block.mandatory !== 'boolean') {
        errors.push('Block must have a boolean mandatory property');
    }
    
    if (typeof block.locked !== 'boolean') {
        errors.push('Block must have a boolean locked property');
    }
    
    if (block.visibilityRule && !isValidVisibilityRule(block.visibilityRule)) {
        errors.push(`Invalid visibility rule: ${block.visibilityRule}`);
    }
    
    if (!block.config || typeof block.config !== 'object') {
        errors.push('Block must have a config object');
    }
    
    if (typeof block.order !== 'number' || block.order < 0) {
        errors.push('Block must have a valid non-negative order number');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    ReportBlockType,
    VisibilityRule,
    ReportBlockSchema,
    ReportTemplateSchema,
    ReportBrandingConfig,
    isValidBlockType,
    isValidVisibilityRule,
    getDefaultBlockConfig,
    validateBlock
};

