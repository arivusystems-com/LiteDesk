const FormResponse = require('../models/FormResponse');
const Form = require('../models/Form');
const blockBasedPdfService = require('./blockRenderers/blockBasedPdfService');
const { getActiveTemplate } = require('./blockRenderers/templateValidator');

/**
 * Enhanced PDF Report Generation Service
 * 
 * Generates PDF reports using block-based templates.
 * This is the ONLY supported PDF generation path.
 * 
 * All PDF generation must use templates with blocks defined in the Response Template Builder.
 * Legacy hardcoded PDF generation has been deprecated.
 */

/**
 * Generate comprehensive PDF report
 * 
 * This function now exclusively uses block-based PDF generation.
 * Templates must be defined in the Form's responseTemplate field.
 * 
 * @param {ObjectId} responseId - Response ID
 * @param {Object} options - Report generation options
 * @param {Object} options.organizationId - Organization ID
 * @param {Object} options.template - Optional template override (if not provided, will fetch from form)
 * @param {Object} options.templateConfig - Legacy template config (for backward compatibility, merged into template)
 * @param {boolean} options.includeComparison - Whether to include comparison with previous response
 * @param {ObjectId} options.previousResponseId - Previous response ID for comparison
 * @returns {Promise<String>} PDF file URL
 * @throws {Error} If template is missing or invalid
 */
exports.generateComprehensiveReport = async (responseId, options = {}) => {
    try {
        const {
            organizationId,
            template: providedTemplate = null,
            templateConfig = {},
            includeComparison = false,
            previousResponseId = null
        } = options;

        // Fetch response with all related data
        const response = await FormResponse.findById(responseId)
            .populate('formId')
            .populate('submittedBy', 'firstName lastName email')
            .populate('organizationId', 'name');

        if (!response) {
            console.error('Response not found for ID:', responseId);
            throw new Error('Response not found');
        }
        
        // Validate that formId exists
        if (!response.formId) {
            console.error('FormId is null/undefined for response:', responseId);
            throw new Error('Form ID not found in response');
        }
        
        // Validate that organizationId exists
        if (!response.organizationId) {
            console.error('OrganizationId is null/undefined for response:', responseId);
            throw new Error('Organization ID not found in response');
        }

        // Get template - use provided template or fetch from form
        let template = providedTemplate;
        
        if (!template) {
            // Fetch form to get active template
            const formId = response.formId._id || response.formId;
            const form = await Form.findById(formId);
            
            if (!form) {
                throw new Error('Form not found');
            }
            
            template = getActiveTemplate(form);
            
            if (!template) {
                throw new Error(
                    'No active template found. Please create a response template in the Response Template Builder.'
                );
            }
            
        }

        // Merge legacy templateConfig into template if needed (for backward compatibility)
        if (templateConfig && Object.keys(templateConfig).length > 0) {
            // Merge branding if provided in templateConfig
            if (templateConfig.logo || templateConfig.colors) {
                if (!template.branding) {
                    template.branding = {};
                }
                if (templateConfig.logo) {
                    template.branding.logo = templateConfig.logo;
                }
                if (templateConfig.colors) {
                    template.branding.colors = { ...template.branding.colors, ...templateConfig.colors };
                }
            }
        }

        // Fetch previous response if comparison is needed
        let previousResponse = null;
        if (includeComparison && previousResponseId) {
            previousResponse = await FormResponse.findById(previousResponseId)
                .populate('formId');
        }

        // Generate PDF using block-based rendering (ONLY path)
        console.log('Generating PDF using block-based template for response:', responseId);
        const pdfUrl = await blockBasedPdfService.generatePdfFromTemplateBlocks(
            responseId,
            template,
            {
                organizationId,
                includeComparison,
                previousResponseId,
                benchmarkScore: templateConfig.benchmarkScore || 80,
                round: templateConfig.round || '1st Round 2024'
            }
        );

        return pdfUrl;
    } catch (error) {
        console.error('Generate comprehensive report error in enhancedPdfReportService:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            responseId: responseId
        });
        throw error;
    }
};

/**
 * @deprecated This function is part of the legacy hardcoded PDF generation system.
 * It has been replaced by block-based PDF generation in blockBasedPdfService.js.
 * 
 * This function will be removed after full migration to block-based rendering.
 * 
 * DO NOT USE: All PDF generation must now use templates with blocks.
 * 
 * @see blockBasedPdfService.generatePdfFromTemplateBlocks
 */
async function buildReportData(response, previousResponse, templateConfig) {
    console.log('Building report data for response:', response._id);
    
    // Validate required data
    if (!response.formId) {
        console.error('Form data not found in response:', response._id);
        throw new Error('Form data not found in response');
    }
    if (!response.organizationId) {
        console.error('Organization data not found in response:', response._id);
        throw new Error('Organization data not found in response');
    }
    
    // Check if formId is populated or just an ObjectId
    const form = response.formId;
    const formId = (typeof form === 'object' && form._id) ? form._id : form;
    
    console.log('Form ID:', formId, 'Form populated:', typeof form === 'object' && form.name);
    console.log('Organization ID:', response.organizationId._id || response.organizationId);
    
    const organization = response.organizationId;

    // Calculate overall metrics
    const overallScore = response.kpis?.finalScore || 0;
    const totalPointsScored = response.kpis?.totalPassed || 0;
    const totalPointsAvailable = response.kpis?.totalQuestions || 0;
    const totalPointsScorable = totalPointsAvailable - (response.kpis?.totalNA || 0);
    const totalNAQuestions = response.kpis?.totalNA || 0;
    const totalMissedPoints = response.kpis?.totalFailed || 0;
    const totalNonComplianceCount = totalMissedPoints;

    // Calculate rating based on score
    const rating = calculateRating(overallScore);
    const benchmarkScore = templateConfig.benchmarkScore || 80;

    // Build section scores
    const sectionScores = buildSectionScores(response);
    
    // Build top/bottom scoring areas
    const { top5, bottom5 } = buildTopBottomScoringAreas(sectionScores);

    // Build department breakdown
    const departmentBreakdown = buildDepartmentBreakdown(response, previousResponse);

    // Build non-compliance counts
    const nonComplianceCounts = buildNonComplianceCounts(response, previousResponse);

    // Build executive summary
    const executiveSummary = buildExecutiveSummary(response, templateConfig);

    // Build brand ranking (handle potential errors)
    let brandRanking = [];
    try {
        brandRanking = await buildBrandRanking(response, organization);
    } catch (error) {
        console.error('Error building brand ranking:', error);
        brandRanking = []; // Default to empty array
    }

    // Build performance history (handle potential errors)
    let performanceHistory = [];
    try {
        const formIdForHistory = (form && typeof form === 'object' && form._id) ? form._id : form;
        performanceHistory = await buildPerformanceHistory(formIdForHistory, response._id);
    } catch (error) {
        console.error('Error building performance history:', error);
        performanceHistory = []; // Default to empty array
    }

    // Build brand standards reports (handle potential errors)
    let brandStandardsReports = [];
    try {
        brandStandardsReports = buildBrandStandardsReports(response);
    } catch (error) {
        console.error('Error building brand standards reports:', error);
        brandStandardsReports = []; // Default to empty array
    }

    return {
        // Header Information
        header: {
            logo: templateConfig.logo || null,
            companyName: templateConfig.companyName || organization?.name || 'GUEST DELIGHT INTERNATIONAL',
            hotelName: templateConfig.hotelName || form?.name || 'Form',
            address: templateConfig.address || '',
            generalManager: templateConfig.generalManager || '',
            auditId: response.responseId || (response._id ? response._id.toString() : `response-${Date.now()}`),
            checkInDate: templateConfig.checkInDate || response.submittedAt,
            checkOutDate: templateConfig.checkOutDate || response.submittedAt,
            round: templateConfig.round || '1st Round 2024'
        },

        // Overall Performance
        overallPerformance: {
            score: overallScore,
            benchmarkScore,
            rating: rating.stars,
            ratingLabel: rating.label,
            scoreBreakdown: {
                score: `${overallScore}% (${totalPointsScored}/${totalPointsScorable})`,
                totalPointsAvailable,
                totalPointsScorable,
                totalPointsScored,
                totalNAQuestions,
                totalMissedPoints,
                previousMissedPoints: previousResponse?.kpis?.totalFailed || 0,
                totalNonComplianceCount
            },
            classification: {
                poor: { range: '0%-59.9%', stars: 1 },
                average: { range: '60%-74.9%', stars: 2 },
                good: { range: '75%-89.9%', stars: 3 },
                excellent: { range: '90%-100%', stars: 4 }
            }
        },

        // Executive Summary
        executiveSummary,

        // Top/Bottom Scoring Areas
        scoringAreas: {
            top5,
            bottom5
        },

        // Department Breakdown
        departmentBreakdown,

        // Non-Compliance Counts
        nonComplianceCounts,

        // Brand Ranking
        brandRanking,

        // Performance History
        performanceHistory,

        // Brand Standards Reports
        brandStandardsReports,

        // Response data for detailed sections
        responseData: response
    };
}

/**
 * Build section scores array
 */
function buildSectionScores(response) {
    if (!response.sectionScores || !Array.isArray(response.sectionScores)) {
        return [];
    }

    return response.sectionScores.map(section => ({
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        score: section.percentage || section.score || 0,
        passed: section.passed || 0,
        failed: section.failed || 0,
        total: section.total || 0
    }));
}

/**
 * Build top 5 and bottom 5 scoring areas
 */
function buildTopBottomScoringAreas(sectionScores) {
    const sorted = [...sectionScores].sort((a, b) => b.score - a.score);
    
    return {
        top5: sorted.slice(0, 5).map(s => ({
            department: s.sectionName,
            score: s.score
        })),
        bottom5: sorted.slice(-5).reverse().map(s => ({
            department: s.sectionName,
            score: s.score
        }))
    };
}

/**
 * Build department breakdown with historical comparison
 */
function buildDepartmentBreakdown(response, previousResponse) {
    const sections = buildSectionScores(response);
    const previousSections = previousResponse ? buildSectionScores(previousResponse) : [];

    return sections.map(section => {
        const previous = previousSections.find(p => p.sectionId === section.sectionId);
        
        return {
            department: section.sectionName,
            currentScore: section.score,
            previousScore: previous?.score || null,
            previousScore2: null, // Can be fetched from older responses
            change: previous ? section.score - previous.score : null,
            passed: section.passed,
            failed: section.failed,
            total: section.total
        };
    });
}

/**
 * Build non-compliance counts by department
 */
function buildNonComplianceCounts(response, previousResponse) {
    const sections = buildSectionScores(response);
    const previousSections = previousResponse ? buildSectionScores(previousResponse) : [];

    return sections.map(section => {
        const previous = previousSections.find(p => p.sectionId === section.sectionId);
        
        return {
            department: section.sectionName,
            previousCount: previous?.failed || 0,
            currentCount: section.failed,
            change: section.failed - (previous?.failed || 0)
        };
    });
}

/**
 * Build executive summary text
 */
function buildExecutiveSummary(response, templateConfig) {
    // Use custom summary if provided
    if (templateConfig.executiveSummary) {
        return templateConfig.executiveSummary;
    }

    // Generate summary based on response data
    const score = response.kpis?.finalScore || 0;
    const rating = calculateRating(score);
    
    let summary = `The overall experience was ${rating.label.toLowerCase()}, with both positive and negative aspects. `;
    
    if (response.correctiveActions && response.correctiveActions.length > 0) {
        summary += `Various service gaps and cleanliness issues affected the overall impression. `;
    }

    // Add more detailed summary based on section scores
    const sections = buildSectionScores(response);
    const lowScores = sections.filter(s => s.score < 60);
    
    if (lowScores.length > 0) {
        summary += `Key areas requiring attention include: ${lowScores.map(s => s.sectionName).join(', ')}. `;
    }

    return summary;
}

/**
 * Build brand ranking data
 */
async function buildBrandRanking(response, organization) {
    try {
        // Get formId - handle both populated and non-populated cases
        const formId = (response.formId && typeof response.formId === 'object' && response.formId._id) 
            ? response.formId._id 
            : response.formId;
        const organizationId = (organization && typeof organization === 'object' && organization._id)
            ? organization._id
            : organization || response.organizationId;
        
        // Get all responses for this form to calculate ranking
        const allResponses = await FormResponse.find({ 
            formId: formId,
            organizationId: organizationId 
        })
            .select('kpis.finalScore')
            .sort({ 'kpis.finalScore': -1 });

        const currentScore = response.kpis?.finalScore || 0;
        const rank = allResponses.findIndex(r => r._id.toString() === response._id.toString()) + 1;
        const totalHotels = allResponses.length;

        return {
            ranking: rank,
            totalHotels,
            score: currentScore
        };
    } catch (error) {
        console.error('Error in buildBrandRanking:', error);
        throw error;
    }
}

/**
 * Build performance history chart data
 */
async function buildPerformanceHistory(formId, currentResponseId) {
    try {
        // Handle both populated and non-populated formId
        const formIdToUse = (formId && typeof formId === 'object' && formId._id) 
            ? formId._id 
            : formId;
        
        if (!formIdToUse) {
            console.error('No formId provided to buildPerformanceHistory');
            return [];
        }
        
        const responses = await FormResponse.find({ formId: formIdToUse })
            .select('submittedAt kpis.finalScore')
            .sort({ submittedAt: 1 })
            .limit(10);

        return responses.map((r, index) => ({
            date: r.submittedAt,
            score: r.kpis?.finalScore || 0,
            isCurrent: r._id.toString() === currentResponseId.toString(),
            round: `${index + 1}st Round ${new Date(r.submittedAt).getFullYear()}`
        }));
    } catch (error) {
        console.error('Error in buildPerformanceHistory:', error);
        throw error;
    }
}

/**
 * Build brand standards reports (detailed audit tables)
 */
function buildBrandStandardsReports(response) {
    try {
        const reports = [];
        
        // Group questions by section - handle both populated and non-populated formId
        const form = response.formId;
        if (!form || (typeof form === 'object' && !form.sections)) {
            console.warn('Form sections not available in buildBrandStandardsReports');
            return [];
        }
        
        const sections = form.sections || [];
        
        sections.forEach(section => {
            const sectionQuestions = response.responseDetails.filter(
                detail => detail.sectionId === section.sectionId
            );

            if (sectionQuestions.length > 0) {
                reports.push({
                    department: section.name,
                    sectionId: section.sectionId,
                    score: calculateSectionScore(sectionQuestions),
                    questions: sectionQuestions.map(q => {
                        const question = findQuestionInForm(form, q.questionId);
                        return {
                            sNo: q.questionId,
                            category: '',
                            tag: section.name,
                            areaOfAudit: section.name,
                            standard: question?.questionText || q.questionId,
                            answer: getAnswerLabel(q.answer, q.passFail),
                            comment: q.comment || '',
                            score: `${q.score || (q.passFail === 'Pass' ? 1 : 0)}/1`,
                            attachments: q.attachments || []
                        };
                    })
                });
            }
        });

        return reports;
    } catch (error) {
        console.error('Error in buildBrandStandardsReports:', error);
        throw error;
    }
}

/**
 * Helper functions
 */
function calculateRating(score) {
    if (score >= 90) return { stars: 4, label: 'Excellent' };
    if (score >= 75) return { stars: 3, label: 'Good' };
    if (score >= 60) return { stars: 2, label: 'Average' };
    return { stars: 1, label: 'Poor' };
}

function calculateSectionScore(questions) {
    if (questions.length === 0) return 0;
    const total = questions.length;
    const passed = questions.filter(q => q.passFail === 'Pass').length;
    return Math.round((passed / total) * 100);
}

function findQuestionInForm(form, questionId) {
    if (!form || !form.sections) return null;
    
    for (const section of form.sections) {
        // Check direct questions
        if (section.questions) {
            const question = section.questions.find(q => q.questionId === questionId);
            if (question) return question;
        }
        
        // Check subsections
        if (section.subsections) {
            for (const subsection of section.subsections) {
                if (subsection.questions) {
                    const question = subsection.questions.find(q => q.questionId === questionId);
                    if (question) return question;
                }
            }
        }
    }
    
    return null;
}

function getAnswerLabel(answer, passFail) {
    if (passFail === 'N/A') return 'N/A';
    if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
    if (answer === 'Yes' || answer === 'No') return answer;
    return passFail === 'Pass' ? 'Yes' : 'No';
}

/**
 * Generate PDF document
 */
/**
 * @deprecated This function is part of the legacy hardcoded PDF generation system.
 * It has been replaced by block-based PDF generation in blockBasedPdfService.js.
 * 
 * This function uses hardcoded page sequencing which is no longer supported.
 * All PDF generation must now use templates with blocks.
 * 
 * This function will be removed after full migration to block-based rendering.
 * 
 * @see blockBasedPdfService.generatePdfFromTemplateBlocks
 */
async function generatePDF(reportData, organizationId, templateConfig) {
    // This function is deprecated and should not be called
    throw new Error(
        'Legacy PDF generation is no longer supported. ' +
        'Please use block-based templates via blockBasedPdfService.generatePdfFromTemplateBlocks'
    );
}

module.exports = exports;

