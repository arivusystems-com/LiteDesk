/**
 * Render Section Breakdown Block
 * 
 * Renders breakdown of performance by section/department with scores and comparisons.
 * This is a core block that is always present.
 */

/**
 * Render section breakdown block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderSectionBreakdownBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const dangerColor = branding?.colors?.danger || '#F44336';
    
    // Use branding typography
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Start Y position from parameter
    let currentY = startY;
    
    // Title
    pdfDoc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(textColor)
          .text('Department by Department Score Breakdown', margin, currentY, { align: 'center' });
    currentY += 45;
    
    // Build section scores
    const sectionScores = buildSectionScores(responseData, context.previousResponse);
    
    // Sort sections based on config
    const sortedSections = sortSections(sectionScores, blockConfig);
    
    // Limit sections if configured
    const sectionsToShow = blockConfig?.limit ? sortedSections.slice(0, blockConfig.limit) : sortedSections;
    
    // Table headers
    const tableY = currentY;
    const colWidths = [200, 100, 100, 100, 80];
    const headers = ['Department'];
    
    if (blockConfig?.showPreviousScores) {
        headers.push('Previous Audit 2', 'Previous Audit', 'Current Audit', '% Change');
    } else {
        headers.push('Current Audit');
    }
    
    pdfDoc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF');
    
    let currentX = margin;
    headers.forEach((header, index) => {
        const width = colWidths[index] || 100;
        pdfDoc.rect(currentX, tableY, width, 28)
              .fillColor(primaryColor)
              .fill();
        pdfDoc.text(header, currentX + 5, tableY + 9, { width: width - 10, align: 'center' });
        currentX += width;
    });
    
    // Table rows
    let rowY = tableY + 28;
    sectionsToShow.forEach((section, index) => {
        const rowHeight = 22;
        currentX = margin;
        
        // Alternating row background
        if (index % 2 === 0) {
            pdfDoc.rect(margin, rowY, colWidths.reduce((sum, w) => sum + w, 0), rowHeight)
                  .fillColor('#F9F9F9')
                  .fill();
        }
        
        // Department name
        pdfDoc.rect(currentX, rowY, colWidths[0], rowHeight)
              .strokeColor('#DDDDDD')
              .lineWidth(0.5)
              .stroke();
        pdfDoc.fontSize(10)
              .font('Helvetica')
              .fillColor(textColor)
              .text(section.sectionName, currentX + 5, rowY + 6, { width: colWidths[0] - 10 });
        currentX += colWidths[0];
        
        if (blockConfig?.showPreviousScores) {
            // Previous Audit 2
            pdfDoc.rect(currentX, rowY, colWidths[1], rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            pdfDoc.fontSize(10)
                  .font('Helvetica')
                  .fillColor(textColor)
                  .text(section.previousScore2 ? `${section.previousScore2}%` : 'NA', 
                       currentX + 5, rowY + 6, { width: colWidths[1] - 10, align: 'center' });
            currentX += colWidths[1];
            
            // Previous Audit
            pdfDoc.rect(currentX, rowY, colWidths[2], rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            pdfDoc.fontSize(10)
                  .font('Helvetica')
                  .fillColor(textColor)
                  .text(section.previousScore ? `${section.previousScore}%` : 'NA', 
                       currentX + 5, rowY + 6, { width: colWidths[2] - 10, align: 'center' });
            currentX += colWidths[2];
        }
        
        // Current Audit
        pdfDoc.rect(currentX, rowY, colWidths[blockConfig?.showPreviousScores ? 3 : 1], rowHeight)
              .strokeColor('#DDDDDD')
              .lineWidth(0.5)
              .stroke();
        const changeColor = section.change && section.change < 0 ? dangerColor : textColor;
        pdfDoc.fontSize(10)
              .font('Helvetica-Bold')
              .fillColor(changeColor)
              .text(`${section.currentScore}%`, currentX + 5, rowY + 6, 
                    { width: (colWidths[blockConfig?.showPreviousScores ? 3 : 1]) - 10, align: 'center' });
        currentX += colWidths[blockConfig?.showPreviousScores ? 3 : 1];
        
        // % Change (if showing previous scores)
        if (blockConfig?.showChange && blockConfig?.showPreviousScores) {
            pdfDoc.rect(currentX, rowY, colWidths[4], rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            const changeText = section.change !== null 
                ? `${section.change > 0 ? '+' : ''}${section.change.toFixed(1)}%`
                : 'N/A';
            pdfDoc.fontSize(10)
                  .font('Helvetica')
                  .fillColor(changeColor)
                  .text(changeText, currentX + 5, rowY + 6, { width: colWidths[4] - 10, align: 'center' });
        }
        
        rowY += rowHeight;
    });
    
    currentY = rowY + 20;
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false,
        endY: currentY
    };
}

/**
 * Build section scores array from response data
 */
function buildSectionScores(responseData, previousResponse) {
    if (!responseData.sectionScores || !Array.isArray(responseData.sectionScores)) {
        return [];
    }
    
    const previousSections = previousResponse ? 
        (previousResponse.sectionScores || []) : [];
    
    return responseData.sectionScores.map(section => {
        const previous = previousSections.find(p => p.sectionId === section.sectionId);
        
        return {
            sectionId: section.sectionId,
            sectionName: section.sectionName,
            currentScore: section.percentage || section.score || 0,
            previousScore: previous ? (previous.percentage || previous.score || 0) : null,
            previousScore2: null, // Can be fetched from older responses
            change: previous ? 
                (section.percentage || section.score || 0) - (previous.percentage || previous.score || 0) : 
                null,
            passed: section.passed || 0,
            failed: section.failed || 0,
            total: section.total || 0
        };
    });
}

/**
 * Sort sections based on block config
 */
function sortSections(sections, blockConfig) {
    const sortBy = blockConfig?.sortBy || 'default';
    const sortOrder = blockConfig?.sortOrder || 'asc';
    
    const sorted = [...sections];
    
    switch (sortBy) {
        case 'score':
            sorted.sort((a, b) => b.currentScore - a.currentScore);
            break;
        case 'name':
            sorted.sort((a, b) => a.sectionName.localeCompare(b.sectionName));
            break;
        case 'change':
            sorted.sort((a, b) => {
                const aChange = a.change !== null ? a.change : -Infinity;
                const bChange = b.change !== null ? b.change : -Infinity;
                return bChange - aChange;
            });
            break;
        default:
            // Keep original order
            break;
    }
    
    if (sortOrder === 'desc' && sortBy !== 'default') {
        sorted.reverse();
    }
    
    return sorted;
}

module.exports = renderSectionBreakdownBlock;

