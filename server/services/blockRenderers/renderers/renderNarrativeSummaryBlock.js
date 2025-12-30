/**
 * Render Narrative Summary Block
 * 
 * Renders executive summary or narrative text describing audit findings.
 */

/**
 * Render narrative summary block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderNarrativeSummaryBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const textColor = branding?.colors?.text || '#333333';
    
    // Use branding typography
    const fontFamily = branding?.typography?.fontFamily || 'Arial';
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Generate narrative text
    let narrativeText = '';
    
    if (blockConfig?.customText) {
        // Use custom text if provided
        narrativeText = blockConfig.customText;
    } else {
        // Auto-generate narrative
        narrativeText = generateNarrativeText(responseData, blockConfig, context);
    }
    
    // Apply max length if configured
    if (blockConfig?.maxLength && blockConfig.maxLength > 0) {
        if (narrativeText.length > blockConfig.maxLength) {
            narrativeText = narrativeText.substring(0, blockConfig.maxLength) + '...';
        }
    }
    
    if (!narrativeText) {
        return {
            height: 0,
            pageBreak: false,
            endY: startY
        };
    }
    
    // Start Y position
    let currentY = startY;
    
    // Title
    pdfDoc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(textColor)
          .text('Executive Summary', margin, currentY, { align: 'center' });
    currentY += 45;
    
    // Add spacing before text
    currentY += 10;
    
    // Render narrative text (PDFKit handles text wrapping)
    const textOptions = {
        width: pageWidth - (margin * 2),
        align: 'left'
    };
    
    pdfDoc.fontSize(baseFontSize)
          .fillColor(textColor);
    
    // Calculate height of text block
    const textHeight = pdfDoc.heightOfString(narrativeText, textOptions);
    pdfDoc.text(narrativeText, margin, currentY, textOptions);
    
    currentY += textHeight + 20; // Add spacing after text
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false,
        endY: currentY
    };
}

/**
 * Generate narrative text from response data
 */
function generateNarrativeText(responseData, blockConfig, context) {
    const overallScore = responseData.kpis?.finalScore || 0;
    const rating = calculateRating(overallScore);
    
    let narrative = '';
    
    // Score context
    if (blockConfig?.includeScoreContext !== false) {
        narrative += `This audit achieved an overall score of ${overallScore}%, which is rated as "${rating.label}". `;
    }
    
    // Top areas
    if (blockConfig?.includeTopAreas !== false && responseData.sectionScores) {
        const sorted = [...responseData.sectionScores].sort((a, b) => 
            (b.percentage || b.score || 0) - (a.percentage || a.score || 0)
        );
        const top3 = sorted.slice(0, 3).filter(s => (s.percentage || s.score || 0) >= 75);
        if (top3.length > 0) {
            narrative += `Areas performing well include ${top3.map(s => s.sectionName || s.name).join(', ')}. `;
        }
    }
    
    // Bottom areas
    if (blockConfig?.includeBottomAreas !== false && responseData.sectionScores) {
        const sorted = [...responseData.sectionScores].sort((a, b) => 
            (a.percentage || a.score || 0) - (b.percentage || b.score || 0)
        );
        const bottom3 = sorted.slice(0, 3).filter(s => (s.percentage || s.score || 0) < 75);
        if (bottom3.length > 0) {
            narrative += `Areas requiring attention include ${bottom3.map(s => s.sectionName || s.name).join(', ')}. `;
        }
    }
    
    // Trends (if available)
    if (blockConfig?.includeTrends && context.previousResponse) {
        const previousScore = context.previousResponse.kpis?.finalScore || 0;
        const scoreChange = overallScore - previousScore;
        if (scoreChange > 0) {
            narrative += `Performance has improved by ${scoreChange.toFixed(1)}% compared to the previous audit. `;
        } else if (scoreChange < 0) {
            narrative += `Performance has decreased by ${Math.abs(scoreChange).toFixed(1)}% compared to the previous audit. `;
        } else {
            narrative += `Performance remains consistent with the previous audit. `;
        }
    }
    
    // Default if nothing was added
    if (!narrative.trim()) {
        narrative = `This audit provides a comprehensive review of operations and compliance. `;
        narrative += `Overall performance was ${rating.label.toLowerCase()}, with both strengths and areas for improvement identified.`;
    }
    
    return narrative.trim();
}

/**
 * Calculate rating from score
 */
function calculateRating(score) {
    if (score >= 90) return { label: 'Excellent' };
    if (score >= 75) return { label: 'Good' };
    if (score >= 60) return { label: 'Average' };
    return { label: 'Poor' };
}

module.exports = renderNarrativeSummaryBlock;

