/**
 * Render Divider Block
 * 
 * Renders a horizontal divider line.
 */

/**
 * Render divider block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data (not used for divider)
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context (not used for divider)
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderDividerBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Get divider configuration
    const style = blockConfig?.style || 'solid';
    const color = blockConfig?.color || branding?.colors?.text || '#CCCCCC';
    const thickness = blockConfig?.thickness || 1;
    
    // Start Y position
    let currentY = startY;
    
    // Add spacing before divider
    currentY += 10;
    
    // Draw divider line
    const lineY = currentY + (thickness / 2);
    
    pdfDoc.strokeColor(color)
          .lineWidth(thickness);
    
    if (style === 'dashed') {
        // Draw dashed line (simplified - PDFKit doesn't have built-in dashed lines easily)
        const dashLength = 5;
        const gapLength = 3;
        let x = margin;
        while (x < pageWidth - margin) {
            pdfDoc.moveTo(x, lineY)
                  .lineTo(Math.min(x + dashLength, pageWidth - margin), lineY)
                  .stroke();
            x += dashLength + gapLength;
        }
    } else if (style === 'dotted') {
        // Draw dotted line
        const dotSpacing = 3;
        for (let x = margin; x < pageWidth - margin; x += dotSpacing) {
            pdfDoc.circle(x, lineY, thickness / 2)
                  .fillColor(color)
                  .fill();
        }
    } else {
        // Solid line (default)
        pdfDoc.moveTo(margin, lineY)
              .lineTo(pageWidth - margin, lineY)
              .stroke();
    }
    
    currentY += thickness + 10; // Add spacing after divider
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false,
        endY: currentY
    };
}

module.exports = renderDividerBlock;

