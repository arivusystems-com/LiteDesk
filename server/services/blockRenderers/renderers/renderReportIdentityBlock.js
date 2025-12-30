/**
 * Render Report Identity Block
 * 
 * Renders the report cover page with identity information.
 * This is a core block that is always present.
 */

/**
 * Render report identity block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderReportIdentityBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const pageHeight = pdfDoc.page.height;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors, fallback to defaults
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const footerColor = branding?.colors?.secondary || '#1A237E';
    
    // Use branding typography
    const fontFamily = branding?.typography?.fontFamily || 'Arial';
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Company/Organization name (from branding or response)
    const companyName = blockConfig?.companyName || 
                       (responseData?.organizationId?.name ? 
                        (typeof responseData.organizationId === 'object' ? responseData.organizationId.name : responseData.organizationId) : 
                        null) ||
                       'GUEST DELIGHT INTERNATIONAL';
    
    // Hotel/Form name - get from form or use config
    let hotelName = blockConfig?.reportTitle;
    if (!hotelName && responseData?.formId) {
        if (typeof responseData.formId === 'object' && responseData.formId.name) {
            hotelName = responseData.formId.name;
        }
    }
    hotelName = hotelName || 'Audit Report';
    
    // Get organization details for address/GM
    const organization = responseData?.organizationId;
    const orgAddress = blockConfig?.address || 
                      (organization && typeof organization === 'object' ? 
                       (organization.address || (organization.city && organization.state ? 
                        `${organization.city}, ${organization.state}, ${organization.country || ''}, ${organization.zipCode || ''}`.trim() : '')) : '');
    const generalManager = blockConfig?.generalManager || '';
    
    // Use startY as the base position
    let currentY = startY;
    
    // Top spacing
    currentY += 40;
    
    // Company name - large and prominent at top
    pdfDoc.fontSize(28)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(companyName, margin, currentY, { 
              width: pageWidth - (margin * 2), 
              align: 'center' 
          });
    currentY += 50;
    
    // Subtitle
    pdfDoc.fontSize(20)
          .font('Helvetica')
          .fillColor(textColor)
          .text(hotelName, margin, currentY, { 
              width: pageWidth - (margin * 2), 
              align: 'center' 
          });
    currentY += 60;
    
    // Audit information table with improved styling - centered
    const tableY = currentY;
    const tableWidth = pageWidth - (margin * 2);
    const colWidth = tableWidth / 2;
    const rowHeight = 20; // Reduced row height
    
    // Build rows with all relevant information
    const rows = [];
    
    // Dates - use check-in/check-out if available in linkedTo Event, otherwise use submittedAt
    let checkInDate = blockConfig?.checkInDate;
    let checkOutDate = blockConfig?.checkOutDate;
    
    if (blockConfig?.showDates !== false) {
        if (!checkInDate) {
            checkInDate = responseData.submittedAt;
        }
        if (!checkOutDate) {
            checkOutDate = responseData.submittedAt;
        }
        rows.push(['Check-In Date:', formatDate(checkInDate)]);
        rows.push(['Check-Out Date:', formatDate(checkOutDate)]);
    }
    
    if (blockConfig?.showAuditId !== false) {
        const auditId = blockConfig?.auditId || responseData.responseId || responseData._id.toString().substring(0, 8);
        rows.push(['Audit ID:', auditId]);
    }
    
    if (blockConfig?.showRound !== false) {
        rows.push(['Round:', context.round || blockConfig?.round || '1st Round 2024']);
    }
    
    if (blockConfig?.showHotelName !== false) {
        rows.push(['Hotel Name:', hotelName]);
    }
    
    if (blockConfig?.showAddress !== false && orgAddress) {
        rows.push(['Address:', orgAddress]);
    }
    
    if (blockConfig?.showGeneralManager !== false && generalManager) {
        rows.push(['General Manager:', generalManager]);
    }
    
    // Draw table with better styling - centered
    currentY = tableY;
    
    // Table header bar
    pdfDoc.rect(margin, currentY, tableWidth, 28)
          .fillColor(primaryColor)
          .fill();
    
    pdfDoc.fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text(companyName, margin + 10, currentY + 8, { 
              width: tableWidth - 20, 
              align: 'center' 
          });
    
    currentY += 28;
    
    // Table rows with alternating background for better readability
    rows.forEach(([label, value], index) => {
        // Alternating row background (very light gray)
        if (index % 2 === 0) {
            pdfDoc.rect(margin, currentY, tableWidth, rowHeight)
                  .fillColor('#F9F9F9')
                  .fill();
        }
        
        // Label (left column)
        pdfDoc.fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(textColor)
              .text(label, margin + 10, currentY + 5, { width: colWidth - 20 });
        
        // Value (right column)
        pdfDoc.fontSize(9)
              .font('Helvetica')
              .fillColor(textColor)
              .text(value || 'N/A', margin + colWidth + 10, currentY + 5, { 
                  width: colWidth - 20,
                  align: 'left'
              });
        
        currentY += rowHeight;
    });
    
    // Draw border around entire table
    pdfDoc.rect(margin, tableY, tableWidth, currentY - tableY)
          .strokeColor('#DDDDDD')
          .lineWidth(1)
          .stroke();
    
    // Calculate end Y for this block (use the higher of table end or a minimum)
    const identityEndY = currentY + 15; // Small padding after table
    
    // Footer (using branding footer config) - always show for professional look
    const footerHeight = 40;
    pdfDoc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight)
          .fillColor(footerColor)
          .fill();
    
    pdfDoc.fontSize(10)
          .font('Helvetica')
          .fillColor('#FFFFFF');
    
    // Left side: Hotel name
    pdfDoc.text(hotelName, margin, pageHeight - (footerHeight / 2) - 5, { 
        width: pageWidth / 2 - margin,
        align: 'left'
    });
    
    // Right side: Disclaimer text
    const disclaimerText = branding?.footer?.disclaimerText || blockConfig?.disclaimerText || 'Confidential property of GDI';
    pdfDoc.text(disclaimerText, pageWidth / 2, pageHeight - (footerHeight / 2) - 5, { 
        width: pageWidth / 2 - margin,
        align: 'right'
    });
    
    // Return height used - NO page break so overall performance can render on same page
    return {
        height: identityEndY - startY,
        pageBreak: false, // Don't break page - allow overall performance on same page
        endY: identityEndY // Return actual end position
    };
}

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}${getOrdinal(day)} ${month} ${year}`;
}

/**
 * Get ordinal suffix
 */
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

module.exports = renderReportIdentityBlock;

