# Block-Based PDF Generation Implementation

## Overview

This document describes the implementation of a block-based PDF generation system that aligns with the Response Template Builder. The system runs in parallel with the existing hardcoded PDF generation, allowing for incremental migration.

## Architecture

### 1. Block Renderer Registry (`server/services/blockRenderers/blockRendererRegistry.js`)

Maps `ReportBlockType` enum values to their corresponding PDF renderer functions.

**Implemented Renderers:**
- `REPORT_IDENTITY` → `renderReportIdentityBlock`
- `OVERALL_PERFORMANCE` → `renderOverallPerformanceBlock`
- `SECTION_BREAKDOWN` → `renderSectionBreakdownBlock`

**Unimplemented (will log warning and skip):**
- `NARRATIVE_SUMMARY`
- `TOP_BOTTOM_AREAS`
- `NON_COMPLIANCE_SUMMARY`
- `PERFORMANCE_TRENDS`
- `DETAILED_FINDINGS`
- `ACTION_ITEMS`
- `HEADING`, `TEXT`, `DIVIDER`

### 2. Block Renderers (`server/services/blockRenderers/renderers/`)

Each renderer is a standalone function that:
- Accepts: `(pdfDoc, responseData, blockConfig, branding, context)`
- Returns: `{ height: number, pageBreak: boolean }`
- Renders only its own content
- Does not control page order outside itself
- Does not fetch data independently (data is passed in)

**Core Block Renderers:**

#### `renderReportIdentityBlock.js`
- Renders report cover page with identity information
- Uses branding for logo, colors, typography
- Configurable header/footer layout
- Shows audit information table

#### `renderOverallPerformanceBlock.js`
- Renders overall performance score with donut chart
- Shows rating with stars
- Displays score breakdown table
- Shows classification of ratings

#### `renderSectionBreakdownBlock.js`
- Renders department-by-department score breakdown
- Supports previous audit comparison
- Configurable sorting and limiting
- Shows percentage changes

### 3. Block-Based PDF Service (`server/services/blockRenderers/blockBasedPdfService.js`)

Main service that:
- Reads template blocks in order
- Respects block order, visibility rules, mandatory/locked flags
- Applies global branding at document start
- Invokes correct renderer from registry per block
- Filters blocks based on system-driven visibility rules

**Key Functions:**
- `generatePdfFromTemplateBlocks(responseId, template, options)` - Main entry point
- `generatePDFFromBlocks(blocks, responseData, branding, context, organizationId)` - PDF generation logic
- `applyBrandingToDocument(doc, branding)` - Applies branding to PDF document

### 4. Integration with Existing Service (`server/services/enhancedPdfReportService.js`)

**Feature Flag:**
- Environment variable: `BLOCK_RENDERING_ENABLED` (default: `false`)
- Can be overridden per request via `options.blockRenderingEnabled`

**Decision Logic:**
```javascript
const useBlockRendering = blockRenderingEnabled && 
                          template && 
                          template.blocks && 
                          Array.isArray(template.blocks) && 
                          template.blocks.length > 0;
```

**Fallback:**
- If block rendering fails, automatically falls back to legacy PDF generation
- Legacy generation remains unchanged and fully functional

### 5. Block Visibility (`server/utils/blockVisibility.js`)

System-driven visibility rules:
- `PERFORMANCE_TRENDS` → `HIDE_IF_NO_HISTORY`
- `NON_COMPLIANCE_SUMMARY` → `HIDE_IF_NO_NON_COMPLIANCE`
- `DETAILED_FINDINGS` → `HIDE_IF_NO_QUESTIONS`
- `ACTION_ITEMS` → `HIDE_IF_NO_ACTION_ITEMS`

Core blocks (mandatory) are always visible.

## Usage

### Enabling Block-Based PDF Generation

**Option 1: Environment Variable**
```bash
BLOCK_RENDERING_ENABLED=true
```

**Option 2: Per-Request Override**
```javascript
await enhancedPdfReportService.generateComprehensiveReport(responseId, {
    organizationId,
    template: activeTemplate, // Template with blocks array
    blockRenderingEnabled: true,
    // ... other options
});
```

### Template Structure

Templates must have:
```javascript
{
    blocks: [
        {
            id: 'block-1',
            type: 'REPORT_IDENTITY',
            mandatory: true,
            locked: true,
            order: 0,
            config: { /* block-specific config */ }
        },
        // ... more blocks
    ],
    branding: {
        logo: '...',
        colors: { /* ... */ },
        typography: { /* ... */ },
        header: { /* ... */ },
        footer: { /* ... */ }
    }
}
```

## Page Break Handling

- Each block controls its own vertical spacing
- Page breaks occur:
  - At block boundaries (when block requests `pageBreak: true`)
  - Automatically when content exceeds page height
- No fixed page sequence
- No assumption of page count

## Branding Application

- Branding is applied once at document start
- Header/footer styles come from template branding config
- Block renderers consume branding tokens instead of raw colors
- Removes hardcoded color constants where possible

## WYSIWYG Parity

The block-driven PDF output:
- Matches on-screen block order exactly
- Respects block visibility rules
- Respects locked blocks
- Respects user-configured presentation options
- No additional content appears that is not in the template

## Backward Compatibility

- Existing PDF generation remains fully functional
- No breaking changes to existing APIs
- Legacy generation is the default
- Block-based generation is opt-in via feature flag

## Error Handling

- If block renderer is not implemented: logs warning and skips block
- If block rendering fails: falls back to legacy generation
- Individual block errors do not crash entire PDF generation

## Next Steps

1. **Implement Optional Block Renderers:**
   - Narrative Summary
   - Top & Bottom Areas
   - Non-Compliance Summary
   - Performance Trends
   - Detailed Findings
   - Action Items Summary

2. **Content Block Renderers:**
   - Heading
   - Text
   - Divider

3. **Testing:**
   - Test with various template configurations
   - Test visibility rules
   - Test page break handling
   - Test branding application

4. **Gradual Migration:**
   - Enable for specific organizations/forms
   - Monitor performance and errors
   - Gradually expand rollout

## Files Created/Modified

### New Files:
- `server/services/blockRenderers/blockRendererRegistry.js`
- `server/services/blockRenderers/blockBasedPdfService.js`
- `server/services/blockRenderers/renderers/renderReportIdentityBlock.js`
- `server/services/blockRenderers/renderers/renderOverallPerformanceBlock.js`
- `server/services/blockRenderers/renderers/renderSectionBreakdownBlock.js`

### Modified Files:
- `server/services/enhancedPdfReportService.js` - Added feature flag and block-based rendering integration
- `server/utils/blockVisibility.js` - Updated to use correct block type identifiers

