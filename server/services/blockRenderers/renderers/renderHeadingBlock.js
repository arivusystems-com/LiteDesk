/**
 * Render Heading Block
 * 
 * Renders a simple heading with configurable level and alignment.
 */

/**
 * Render heading block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data (not used for heading)
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context (not used for heading)
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderHeadingBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const textColor = branding?.colors?.text || '#333333';
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    
    // Use branding typography
    const fontFamily = branding?.typography?.fontFamily || 'Arial';
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Get heading configuration
    const content = blockConfig?.content || 'Heading';
    const level = blockConfig?.level || 1;
    const align = blockConfig?.align || 'left';
    
    // Calculate font size based on level
    const fontSize = level === 1 ? 24 : level === 2 ? 18 : 16;
    const lineHeight = fontSize * 1.2;
    
    // Start Y position
    let currentY = startY;
    
    // Add spacing before heading
    currentY += 10;
    
    // Render heading
    pdfDoc.fontSize(fontSize)
          .fillColor(level === 1 ? primaryColor : textColor)
          .text(content, margin, currentY, { 
              width: pageWidth - (margin * 2), 
              align: align 
          });
    
    currentY += lineHeight + 10; // Add spacing after heading
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false,
        endY: currentY
    };
}

module.exports = renderHeadingBlock;

