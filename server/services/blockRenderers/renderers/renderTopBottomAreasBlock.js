/**
 * Render Top/Bottom Areas Block
 * 
 * Renders top 5 highest and bottom 5 lowest scoring areas.
 */

/**
 * Render top/bottom areas block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderTopBottomAreasBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const successColor = branding?.colors?.success || '#4CAF50';
    const dangerColor = branding?.colors?.danger || '#F44336';
    
    // Use branding typography
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Get configuration
    const topCount = blockConfig?.topCount || 5;
    const bottomCount = blockConfig?.bottomCount || 5;
    const showScores = blockConfig?.showScores !== false;
    const layout = blockConfig?.layout || 'side_by_side';
    
    // Build section scores
    const sectionScores = buildSectionScores(responseData, context.previousResponse);
    
    // Sort by score and get top/bottom
    const sorted = [...sectionScores].sort((a, b) => b.currentScore - a.currentScore);
    const topAreas = sorted.slice(0, topCount);
    const bottomAreas = sorted.slice(-bottomCount).reverse();
    
    // Start Y position
    let currentY = startY;
    
    // Title
    pdfDoc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(textColor)
          .text('Top and Bottom Scoring Areas', margin, currentY, { align: 'center' });
    currentY += 45;
    
    if (layout === 'side_by_side') {
        // Render side by side layout
        const leftColX = margin;
        const rightColX = pageWidth / 2 + 20;
        const colWidth = (pageWidth / 2) - margin - 20;
        
        // Left column: Top areas
        pdfDoc.fontSize(14)
              .fillColor(textColor)
              .text(`Top ${topCount} Areas`, leftColX, currentY, { width: colWidth, align: 'center' });
        
        let leftY = currentY + 30;
        topAreas.forEach((area, index) => {
            pdfDoc.fontSize(baseFontSize)
                  .fillColor(textColor)
                  .text(`${index + 1}. ${area.sectionName}`, leftColX, leftY, { width: colWidth - 40 });
            if (showScores) {
                pdfDoc.fillColor(successColor)
                      .text(`${area.currentScore}%`, leftColX + colWidth - 60, leftY, { width: 50, align: 'right' });
                pdfDoc.fillColor(textColor);
            }
            leftY += 25;
        });
        
        // Right column: Bottom areas
        pdfDoc.fontSize(14)
              .fillColor(textColor)
              .text(`Bottom ${bottomCount} Areas`, rightColX, currentY, { width: colWidth, align: 'center' });
        
        let rightY = currentY + 30;
        bottomAreas.forEach((area, index) => {
            pdfDoc.fontSize(baseFontSize)
                  .fillColor(textColor)
                  .text(`${index + 1}. ${area.sectionName}`, rightColX, rightY, { width: colWidth - 40 });
            if (showScores) {
                pdfDoc.fillColor(dangerColor)
                      .text(`${area.currentScore}%`, rightColX + colWidth - 60, rightY, { width: 50, align: 'right' });
                pdfDoc.fillColor(textColor);
            }
            rightY += 25;
        });
        
        currentY = Math.max(leftY, rightY) + 20;
    } else if (layout === 'stacked') {
        // Render stacked layout
        // Top areas
        pdfDoc.fontSize(14)
              .fillColor(textColor)
              .text(`Top ${topCount} Areas`, margin, currentY);
        currentY += 30;
        
        topAreas.forEach((area, index) => {
            pdfDoc.fontSize(baseFontSize)
                  .fillColor(textColor)
                  .text(`${index + 1}. ${area.sectionName}`, margin, currentY);
            if (showScores) {
                pdfDoc.fillColor(successColor)
                      .text(`${area.currentScore}%`, pageWidth - margin - 100, currentY, { width: 100, align: 'right' });
                pdfDoc.fillColor(textColor);
            }
            currentY += 25;
        });
        
        currentY += 20;
        
        // Bottom areas
        pdfDoc.fontSize(14)
              .fillColor(textColor)
              .text(`Bottom ${bottomCount} Areas`, margin, currentY);
        currentY += 30;
        
        bottomAreas.forEach((area, index) => {
            pdfDoc.fontSize(baseFontSize)
                  .fillColor(textColor)
                  .text(`${index + 1}. ${area.sectionName}`, margin, currentY);
            if (showScores) {
                pdfDoc.fillColor(dangerColor)
                      .text(`${area.currentScore}%`, pageWidth - margin - 100, currentY, { width: 100, align: 'right' });
                pdfDoc.fillColor(textColor);
            }
            currentY += 25;
        });
        
        currentY += 20;
    } else {
        // Table layout
        const tableY = currentY;
        const colWidths = [pageWidth - margin * 2 - 150, 75, 75];
        
        // Table header
        pdfDoc.rect(margin, tableY, colWidths[0], 25)
              .fillColor(primaryColor)
              .fill();
        pdfDoc.fontSize(10)
              .fillColor('#FFFFFF')
              .text('Area', margin + 5, tableY + 8, { width: colWidths[0] - 10 });
        
        pdfDoc.rect(margin + colWidths[0], tableY, colWidths[1], 25)
              .fillColor(successColor)
              .fill();
        pdfDoc.text('Top Score', margin + colWidths[0] + 5, tableY + 8, { width: colWidths[1] - 10, align: 'center' });
        
        pdfDoc.rect(margin + colWidths[0] + colWidths[1], tableY, colWidths[2], 25)
              .fillColor(dangerColor)
              .fill();
        pdfDoc.text('Bottom Score', margin + colWidths[0] + colWidths[1] + 5, tableY + 8, { width: colWidths[2] - 10, align: 'center' });
        
        // Table rows
        let rowY = tableY + 25;
        const maxRows = Math.max(topAreas.length, bottomAreas.length);
        
        for (let i = 0; i < maxRows; i++) {
            const rowHeight = 20;
            
            // Area name
            pdfDoc.rect(margin, rowY, colWidths[0], rowHeight)
                  .strokeColor('#CCCCCC')
                  .lineWidth(0.5)
                  .stroke();
            pdfDoc.fontSize(9)
                  .fillColor(textColor);
            if (topAreas[i]) {
                pdfDoc.text(topAreas[i].sectionName, margin + 5, rowY + 5, { width: colWidths[0] - 10 });
            }
            
            // Top score
            pdfDoc.rect(margin + colWidths[0], rowY, colWidths[1], rowHeight)
                  .strokeColor('#CCCCCC')
                  .lineWidth(0.5)
                  .stroke();
            if (topAreas[i] && showScores) {
                pdfDoc.fillColor(successColor)
                      .text(`${topAreas[i].currentScore}%`, margin + colWidths[0] + 5, rowY + 5, { width: colWidths[1] - 10, align: 'center' });
            }
            
            // Bottom score
            pdfDoc.rect(margin + colWidths[0] + colWidths[1], rowY, colWidths[2], rowHeight)
                  .strokeColor('#CCCCCC')
                  .lineWidth(0.5)
                  .stroke();
            if (bottomAreas[i] && showScores) {
                pdfDoc.fillColor(dangerColor)
                      .text(`${bottomAreas[i].currentScore}%`, margin + colWidths[0] + colWidths[1] + 5, rowY + 5, { width: colWidths[2] - 10, align: 'center' });
            }
            
            pdfDoc.fillColor(textColor);
            rowY += rowHeight;
        }
        
        currentY = rowY + 20;
    }
    
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
            change: previous ? 
                (section.percentage || section.score || 0) - (previous.percentage || previous.score || 0) : 
                null,
            passed: section.passed || 0,
            failed: section.failed || 0,
            total: section.total || 0
        };
    });
}

module.exports = renderTopBottomAreasBlock;

