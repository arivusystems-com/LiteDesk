/**
 * Block Renderer Registry
 * 
 * Maps ReportBlockType to PDF renderer functions.
 * Each renderer is responsible for rendering only its own block content.
 * 
 * Renderers receive:
 * - pdfDoc: PDFDocument instance
 * - responseData: FormResponse data with all related data populated
 * - blockConfig: Block-specific configuration object
 * - branding: Template-level branding configuration
 * - context: Additional context (previousResponse, historicalResponsesCount, etc.)
 * 
 * Renderers return:
 * - { height: number, pageBreak: boolean }
 *   - height: Vertical space used by this block
 *   - pageBreak: Whether to add a page break after this block
 */

const renderReportIdentityBlock = require('./renderers/renderReportIdentityBlock');
const renderOverallPerformanceBlock = require('./renderers/renderOverallPerformanceBlock');
const renderSectionBreakdownBlock = require('./renderers/renderSectionBreakdownBlock');
const renderNarrativeSummaryBlock = require('./renderers/renderNarrativeSummaryBlock');
const renderTopBottomAreasBlock = require('./renderers/renderTopBottomAreasBlock');
const renderNonComplianceSummaryBlock = require('./renderers/renderNonComplianceSummaryBlock');
const renderDetailedFindingsBlock = require('./renderers/renderDetailedFindingsBlock');
const renderActionItemsBlock = require('./renderers/renderActionItemsBlock');
const renderHeadingBlock = require('./renderers/renderHeadingBlock');
const renderTextBlock = require('./renderers/renderTextBlock');
const renderDividerBlock = require('./renderers/renderDividerBlock');

/**
 * Registry mapping block types to their renderer functions
 * Uses ReportBlockType enum values from reportBlockContract
 */
const BLOCK_RENDERER_REGISTRY = {
    // Core blocks (implemented)
    'REPORT_IDENTITY': renderReportIdentityBlock,
    'OVERALL_PERFORMANCE': renderOverallPerformanceBlock,
    'SECTION_BREAKDOWN': renderSectionBreakdownBlock,
    
    // Optional blocks (implemented)
    'NARRATIVE_SUMMARY': renderNarrativeSummaryBlock,
    'TOP_BOTTOM_AREAS': renderTopBottomAreasBlock,
    'NON_COMPLIANCE_SUMMARY': renderNonComplianceSummaryBlock,
    'PERFORMANCE_TRENDS': null, // TODO: Implement performance trends chart
    'DETAILED_FINDINGS': renderDetailedFindingsBlock,
    'ACTION_ITEMS': renderActionItemsBlock,
    'ACTION_ITEMS_SUMMARY': renderActionItemsBlock, // Alias for ACTION_ITEMS
    
    // Content blocks (implemented)
    'HEADING': renderHeadingBlock,
    'TEXT': renderTextBlock,
    'DIVIDER': renderDividerBlock
};

/**
 * Get renderer function for a block type
 * @param {string} blockType - Block type identifier (case-insensitive)
 * @returns {Function|null} Renderer function or null if not implemented
 */
function getBlockRenderer(blockType) {
    // Normalize to uppercase for case-insensitive lookup
    const normalizedType = blockType ? blockType.toUpperCase() : '';
    return BLOCK_RENDERER_REGISTRY[normalizedType] || null;
}

/**
 * Check if a block type has a renderer implementation
 * @param {string} blockType - Block type identifier (case-insensitive)
 * @returns {boolean} True if renderer exists
 */
function hasBlockRenderer(blockType) {
    // Normalize to uppercase for case-insensitive lookup
    const normalizedType = blockType ? blockType.toUpperCase() : '';
    return BLOCK_RENDERER_REGISTRY[normalizedType] !== null && 
           BLOCK_RENDERER_REGISTRY[normalizedType] !== undefined;
}

/**
 * Get all implemented block types
 * @returns {string[]} Array of block types with renderers
 */
function getImplementedBlockTypes() {
    return Object.entries(BLOCK_RENDERER_REGISTRY)
        .filter(([_, renderer]) => renderer !== null)
        .map(([type, _]) => type);
}

module.exports = {
    getBlockRenderer,
    hasBlockRenderer,
    getImplementedBlockTypes,
    BLOCK_RENDERER_REGISTRY
};

