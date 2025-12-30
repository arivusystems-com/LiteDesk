/**
 * Render Text Block
 * 
 * Renders simple text content with configurable alignment.
 */

/**
 * Render text block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data (not used for text)
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context (not used for text)
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderTextBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const textColor = branding?.colors?.text || '#333333';
    
    // Use branding typography
    const fontFamily = branding?.typography?.fontFamily || 'Arial';
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Get text configuration
    const content = blockConfig?.content || '';
    const align = blockConfig?.align || 'left';
    
    if (!content) {
        return {
            height: 0,
            pageBreak: false,
            endY: startY
        };
    }
    
    // Start Y position
    let currentY = startY;
    
    // Add spacing before text
    currentY += 10;
    
    // Render text (PDFKit automatically handles text wrapping)
    const textOptions = {
        width: pageWidth - (margin * 2),
        align: align
    };
    
    pdfDoc.fontSize(baseFontSize)
          .fillColor(textColor);
    
    // Calculate height of text block
    const textHeight = pdfDoc.heightOfString(content, textOptions);
    pdfDoc.text(content, margin, currentY, textOptions);
    
    currentY += textHeight + 10; // Add spacing after text
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false,
        endY: currentY
    };
}

module.exports = renderTextBlock;

