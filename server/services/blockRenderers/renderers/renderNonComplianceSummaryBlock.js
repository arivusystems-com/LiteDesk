/**
 * Render Non-Compliance Summary Block
 * 
 * Renders summary of non-compliance issues by department/category.
 */

/**
 * Render non-compliance summary block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderNonComplianceSummaryBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const dangerColor = branding?.colors?.danger || '#F44336';
    
    // Use branding typography
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Build non-compliance data
    const nonComplianceData = buildNonComplianceData(responseData, context.previousResponse, blockConfig);
    
    if (!nonComplianceData || nonComplianceData.length === 0) {
        // Return empty block if no non-compliance data
        return {
            height: 0,
            pageBreak: false,
            endY: startY
        };
    }
    
    // Sort based on config
    const sorted = sortNonComplianceData(nonComplianceData, blockConfig);
    
    // Limit if configured
    const dataToShow = blockConfig?.limit ? sorted.slice(0, blockConfig.limit) : sorted;
    
    // Start Y position
    let currentY = startY;
    
    // Title
    pdfDoc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(textColor)
          .text('Non-Compliance Summary', margin, currentY, { align: 'center' });
    currentY += 45;
    
    // Table headers
    const tableY = currentY;
    const colWidths = [250, 100];
    if (blockConfig?.showPreviousComparison) {
        colWidths.push(100, 80);
    }
    
    const headers = blockConfig?.showByDepartment ? ['Department', 'Non-Compliance Count'] : ['Category', 'Non-Compliance Count'];
    if (blockConfig?.showPreviousComparison) {
        headers.push('Previous Count', 'Change');
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
    dataToShow.forEach((item, index) => {
        const rowHeight = 22;
        currentX = margin;
        
        // Alternating row background
        if (index % 2 === 0) {
            pdfDoc.rect(margin, rowY, colWidths.reduce((sum, w) => sum + w, 0), rowHeight)
                  .fillColor('#F9F9F9')
                  .fill();
        }
        
        // Department/Category name
        pdfDoc.rect(currentX, rowY, colWidths[0], rowHeight)
              .strokeColor('#DDDDDD')
              .lineWidth(0.5)
              .stroke();
        pdfDoc.fontSize(10)
              .font('Helvetica')
              .fillColor(textColor)
              .text(item.name, currentX + 5, rowY + 6, { width: colWidths[0] - 10 });
        currentX += colWidths[0];
        
        // Current count
        pdfDoc.rect(currentX, rowY, colWidths[1], rowHeight)
              .strokeColor('#DDDDDD')
              .lineWidth(0.5)
              .stroke();
        pdfDoc.fontSize(10)
              .font('Helvetica-Bold')
              .fillColor(dangerColor)
              .text(`${item.currentCount}`, currentX + 5, rowY + 6, { width: colWidths[1] - 10, align: 'center' });
        currentX += colWidths[1];
        
        if (blockConfig?.showPreviousComparison) {
            // Previous count
            pdfDoc.rect(currentX, rowY, colWidths[2], rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            pdfDoc.fontSize(10)
                  .font('Helvetica')
                  .fillColor(textColor)
                  .text(`${item.previousCount || 0}`, currentX + 5, rowY + 6, { width: colWidths[2] - 10, align: 'center' });
            currentX += colWidths[2];
            
            // Change
            pdfDoc.rect(currentX, rowY, colWidths[3], rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            const changeColor = item.change > 0 ? dangerColor : item.change < 0 ? '#4CAF50' : textColor;
            const changeText = item.change > 0 ? `+${item.change}` : item.change < 0 ? `${item.change}` : '0';
            pdfDoc.fontSize(10)
                  .font('Helvetica')
                  .fillColor(changeColor)
                  .text(changeText, currentX + 5, rowY + 6, { width: colWidths[3] - 10, align: 'center' });
            currentX += colWidths[3];
        }
        
        pdfDoc.fillColor(textColor);
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
 * Build non-compliance data from response
 */
function buildNonComplianceData(responseData, previousResponse, blockConfig) {
    const data = [];
    
    if (blockConfig?.showByDepartment !== false) {
        // Group by department/section
        if (responseData.sectionScores && Array.isArray(responseData.sectionScores)) {
            const previousSections = previousResponse ? (previousResponse.sectionScores || []) : [];
            
            responseData.sectionScores.forEach(section => {
                const previous = previousSections.find(p => p.sectionId === section.sectionId);
                const failedCount = section.failed || 0;
                const previousFailed = previous ? (previous.failed || 0) : 0;
                
                if (failedCount > 0 || (blockConfig?.showPreviousComparison && previousFailed > 0)) {
                    data.push({
                        name: section.sectionName || section.name,
                        currentCount: failedCount,
                        previousCount: previousFailed,
                        change: failedCount - previousFailed
                    });
                }
            });
        }
    }
    
    return data;
}

/**
 * Sort non-compliance data based on config
 */
function sortNonComplianceData(data, blockConfig) {
    const sortBy = blockConfig?.sortBy || 'count';
    const sorted = [...data];
    
    switch (sortBy) {
        case 'count':
            sorted.sort((a, b) => b.currentCount - a.currentCount);
            break;
        case 'department':
        case 'category':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'change':
            sorted.sort((a, b) => b.change - a.change);
            break;
        default:
            // Keep original order
            break;
    }
    
    return sorted;
}

module.exports = renderNonComplianceSummaryBlock;

