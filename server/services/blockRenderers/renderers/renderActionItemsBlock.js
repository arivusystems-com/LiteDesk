/**
 * Render Action Items Block
 * 
 * Renders corrective actions/action items from the response.
 */

/**
 * Render action items block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderActionItemsBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const successColor = branding?.colors?.success || '#4CAF50';
    const dangerColor = branding?.colors?.danger || '#F44336';
    
    // Use branding typography
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Get action items (corrective actions)
    const actionItems = buildActionItemsData(responseData, blockConfig, context);
    
    if (!actionItems || actionItems.length === 0) {
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
          .text('Action Items', margin, currentY, { align: 'center' });
    currentY += 45;
    
    // Determine columns
    const columns = ['question', 'description'];
    if (blockConfig?.showStatus !== false) {
        columns.push('status');
    }
    if (blockConfig?.showDates !== false) {
        columns.push('dueDate');
    }
    if (blockConfig?.showAssignee !== false) {
        columns.push('assignee');
    }
    if (blockConfig?.showPriority !== false) {
        columns.push('priority');
    }
    
    // Calculate column widths
    const availableWidth = pageWidth - (margin * 2);
    const colWidths = calculateActionItemColumnWidths(columns, availableWidth);
    
    // Table header
    const headerY = currentY;
    let headerX = margin;
    
    pdfDoc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF');
    
    columns.forEach((col, index) => {
        const width = colWidths[index];
        pdfDoc.rect(headerX, headerY, width, 28)
              .fillColor(primaryColor)
              .fill();
        
        const headerText = getActionItemColumnHeader(col);
        pdfDoc.text(headerText, headerX + 5, headerY + 9, { width: width - 10, align: 'center' });
        headerX += width;
    });
    
    // Table rows
    let rowY = headerY + 28;
    const baseRowHeight = 25; // Base height, will be calculated dynamically
    
    actionItems.forEach((item, index) => {
        // Calculate row height based on content
        pdfDoc.fontSize(9);
        let maxCellHeight = baseRowHeight;
        columns.forEach((col) => {
            const colIdx = columns.indexOf(col);
            const width = colWidths[colIdx];
            const cellContent = getActionItemCellContent(item, col);
            if (cellContent) {
                const textHeight = pdfDoc.heightOfString(cellContent, {
                    width: width - 10,
                    align: (col === 'status' || col === 'priority' || col === 'dueDate') ? 'center' : 'left'
                });
                const cellHeight = Math.max(textHeight + 10, baseRowHeight);
                maxCellHeight = Math.max(maxCellHeight, cellHeight);
            }
        });
        const rowHeight = maxCellHeight;
        
        // Check if we need a new page
        if (rowY + rowHeight > pdfDoc.page.height - margin) {
            pdfDoc.addPage();
            rowY = margin;
            
            // Redraw header on new page
            let newHeaderX = margin;
            columns.forEach((col, colIndex) => {
                const width = colWidths[colIndex];
                pdfDoc.rect(newHeaderX, rowY, width, 28)
                      .fillColor(primaryColor)
                      .fill();
                pdfDoc.fontSize(11)
                      .font('Helvetica-Bold')
                      .fillColor('#FFFFFF')
                      .text(getActionItemColumnHeader(col), newHeaderX + 5, rowY + 9, { 
                          width: width - 10, 
                          align: 'center' 
                      });
                newHeaderX += width;
            });
            pdfDoc.fontSize(9);
            rowY += 32;
        }
        
        // Alternating row background
        if (index % 2 === 0) {
            pdfDoc.rect(margin, rowY, colWidths.reduce((sum, w) => sum + w, 0), rowHeight)
                  .fillColor('#F9F9F9')
                  .fill();
        }
        
        let rowX = margin;
        
        columns.forEach((col, colIndex) => {
            const width = colWidths[colIndex];
            const cellContent = getActionItemCellContent(item, col);
            
            // Draw cell border
            pdfDoc.rect(rowX, rowY, width, rowHeight)
                  .strokeColor('#DDDDDD')
                  .lineWidth(0.5)
                  .stroke();
            
            // Draw cell content
            pdfDoc.fontSize(9)
                  .font('Helvetica')
                  .fillColor(textColor);
            
            // Color coding for status
            if (col === 'status') {
                if (item.status === 'Completed' || item.status === 'Resolved') {
                    pdfDoc.fillColor(successColor);
                } else if (item.status === 'Pending' || item.status === 'Open') {
                    pdfDoc.fillColor(dangerColor);
                }
            }
            
            // Color coding for priority
            if (col === 'priority') {
                if (item.priority === 'High' || item.priority === 'Urgent') {
                    pdfDoc.fillColor(dangerColor);
                }
            }
            
            const align = (col === 'status' || col === 'priority' || col === 'dueDate') ? 'center' : 'left';
            pdfDoc.text(cellContent, rowX + 5, rowY + 6, { 
                width: width - 10,
                align: align,
                lineGap: 2
            });
            
            pdfDoc.fillColor(textColor);
            rowX += width;
        });
        
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
 * Build action items data from response
 */
function buildActionItemsData(responseData, blockConfig, context) {
    if (!responseData.correctiveActions || !Array.isArray(responseData.correctiveActions)) {
        return [];
    }
    
    let actions = [...responseData.correctiveActions];
    
    // Filter by status if configured
    if (blockConfig?.statusFilter && Array.isArray(blockConfig.statusFilter) && blockConfig.statusFilter.length > 0) {
        actions = actions.filter(a => blockConfig.statusFilter.includes(a.status));
    }
    
    // Sort based on config
    const sortBy = blockConfig?.sortBy || 'date';
    if (sortBy === 'status') {
        actions.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    } else if (sortBy === 'priority') {
        const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        actions.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
    } else if (sortBy === 'department') {
        actions.sort((a, b) => (a.department || '').localeCompare(b.department || ''));
    }
    // Default: sort by date (creation date)
    
    // Map to action items format
    return actions.map((action, index) => ({
        sNo: index + 1,
        question: action.questionText || action.questionId || '',
        description: action.description || action.actionPlan || '',
        status: action.status || 'Pending',
        dueDate: action.dueDate ? formatDate(action.dueDate) : '',
        assignee: action.assignedTo?.name || action.assignedTo || '',
        priority: action.priority || 'Medium',
        department: action.department || action.sectionName || ''
    }));
}

/**
 * Get action item column header
 */
function getActionItemColumnHeader(column) {
    const headers = {
        'question': 'Question',
        'description': 'Action Description',
        'status': 'Status',
        'dueDate': 'Due Date',
        'assignee': 'Assigned To',
        'priority': 'Priority',
        'department': 'Department'
    };
    return headers[column] || column;
}

/**
 * Get action item cell content
 */
function getActionItemCellContent(item, column) {
    return String(item[column] || '');
}

/**
 * Calculate action item column widths
 */
function calculateActionItemColumnWidths(columns, availableWidth) {
    const widths = {
        'question': 150,
        'description': 250,
        'status': 80,
        'dueDate': 100,
        'assignee': 120,
        'priority': 80,
        'department': 120
    };
    
    const totalFixedWidth = columns.reduce((sum, col) => sum + (widths[col] || 100), 0);
    const scale = availableWidth / totalFixedWidth;
    
    return columns.map(col => Math.floor((widths[col] || 100) * scale));
}

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

module.exports = renderActionItemsBlock;

