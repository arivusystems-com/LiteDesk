/**
 * Report Template Service
 * Manages customizable report templates
 * 
 * NOTE: Branding is now defined at template level (form.responseTemplate.templates[].branding)
 * This service provides backward compatibility for legacy PDF generation.
 * When block-based rendering is implemented, branding will come from template.branding.
 */

/**
 * Get default template configuration (legacy - for backward compatibility)
 * @deprecated Branding should come from template.branding in form.responseTemplate
 */
exports.getDefaultTemplate = () => {
    return {
        // Company/Brand Information
        companyName: 'GUEST DELIGHT INTERNATIONAL',
        logo: null, // Path to logo image file (deprecated - use template.branding.logo)
        hotelName: null, // Will be set from form name
        address: '',
        generalManager: '',
        
        // Audit Information
        checkInDate: null, // Will be set from response submittedAt
        checkOutDate: null, // Will be set from response submittedAt
        round: '1st Round 2024',
        
        // Scoring Configuration
        benchmarkScore: 80,
        
        // Executive Summary
        executiveSummary: null, // Auto-generated if not provided
        executiveSummaryDetails: [], // Additional paragraphs
        
        // Colors (deprecated - use template.branding.colors)
        colors: {
            primary: '#FF6B35', // Orange
            secondary: '#004E89', // Dark blue
            success: '#4CAF50', // Green
            danger: '#F44336', // Red
            warning: '#FF9800', // Orange
            gold: '#FFD700' // Gold for stars
        },
        
        // Page Configuration
        includeCoverPage: true,
        includeOverallPerformance: true,
        includeExecutiveSummary: true,
        includeScoringAreas: true,
        includeDepartmentBreakdown: true,
        includeNonCompliance: true,
        includeBrandRanking: true,
        includeBrandStandards: true,
        
        // Comparison Configuration
        includeComparison: false,
        previousResponseId: null
    };
};

/**
 * Extract branding from template configuration
 * @param {Object} template - Template object with branding property
 * @returns {Object} Branding configuration
 */
exports.extractBrandingFromTemplate = (template) => {
    if (!template || !template.branding) {
        // Fallback to default branding
        return {
            logo: null,
            colors: {
                primary: '#FF6B35',
                secondary: '#004E89',
                success: '#4CAF50',
                danger: '#F44336',
                warning: '#FF9800',
                text: '#333333',
                textLight: '#666666',
                background: '#FFFFFF'
            },
            typography: {
                fontFamily: 'Arial, sans-serif',
                headingFont: 'Arial, sans-serif',
                baseFontSize: 12
            },
            header: {
                showLogo: true,
                showCompanyName: true,
                alignment: 'center'
            },
            footer: {
                showDisclaimer: true,
                disclaimerText: 'Confidential property of GDI',
                alignment: 'right'
            }
        };
    }
    
    return template.branding;
};

/**
 * Merge custom template with default template
 */
exports.mergeTemplate = (customTemplate = {}) => {
    const defaultTemplate = exports.getDefaultTemplate();
    return {
        ...defaultTemplate,
        ...customTemplate,
        colors: {
            ...defaultTemplate.colors,
            ...(customTemplate.colors || {})
        }
    };
};

/**
 * Validate template configuration
 */
exports.validateTemplate = (template) => {
    const errors = [];
    
    if (template.benchmarkScore && (template.benchmarkScore < 0 || template.benchmarkScore > 100)) {
        errors.push('Benchmark score must be between 0 and 100');
    }
    
    if (template.colors) {
        const colorRegex = /^#[0-9A-F]{6}$/i;
        Object.entries(template.colors).forEach(([key, value]) => {
            if (!colorRegex.test(value)) {
                errors.push(`Invalid color format for ${key}: ${value}`);
            }
        });
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Get template by ID (for future template storage in database)
 */
exports.getTemplateById = async (templateId) => {
    // TODO: Implement template storage in database
    // For now, return default template
    return exports.getDefaultTemplate();
};

/**
 * Save template (for future template storage in database)
 */
exports.saveTemplate = async (template, organizationId, userId) => {
    // TODO: Implement template storage in database
    // For now, just return the template
    return template;
};

module.exports = exports;

