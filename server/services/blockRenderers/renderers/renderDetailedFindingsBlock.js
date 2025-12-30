/**
 * Render Detailed Findings Block
 * 
 * Renders detailed table of all questions and answers with scores, comments, etc.
 */

/**
 * Render detailed findings block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderDetailedFindingsBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const successColor = branding?.colors?.success || '#4CAF50';
    const dangerColor = branding?.colors?.danger || '#F44336';
    
    // Use branding typography
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Get form data to find question details
    const form = responseData.formId || context.form;
    
    // Build findings data
    const findings = buildFindingsData(responseData, form, blockConfig);
    
    if (!findings || findings.length === 0) {
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
          .text('Detailed Findings', margin, currentY, { align: 'center' });
    currentY += 45;
    
    // Determine columns based on config - default to match expected format
    const columns = blockConfig?.columns || ['sNo', 'category', 'tag', 'area', 'standard', 'answer', 'comment', 'score'];
    
    // Calculate column widths
    const availableWidth = pageWidth - (margin * 2);
    const colWidths = calculateColumnWidths(columns, availableWidth);
    
    // Table header
    const headerY = currentY;
    const headerHeight = 25;
    let headerX = margin;
    
    // Draw header background
    pdfDoc.rect(margin, headerY, availableWidth, headerHeight)
          .fillColor(primaryColor)
          .fill();
    
    pdfDoc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF');
    
    columns.forEach((col, index) => {
        const width = colWidths[index];
        const headerText = getColumnHeader(col);
        const align = (col === 'answer' || col === 'score' || col === 'sNo') ? 'center' : 'center';
        
        pdfDoc.text(headerText, headerX + 5, headerY + 8, { 
            width: width - 10, 
            align: align 
        });
        headerX += width;
    });
    
    // Table rows with dynamic height
    let rowY = headerY + 25;
    const cellPadding = 5;
    const minRowHeight = 20;
    const lineHeight = 12; // Height per line of text at 8pt font
    
    pdfDoc.fontSize(8); // Set base font size for height calculations
    
    findings.forEach((finding, index) => {
        // Calculate maximum height needed for this row based on all cells
        let maxCellHeight = minRowHeight;
        
        columns.forEach((col, colIdx) => {
            const width = colWidths[colIdx];
            const cellContent = getCellContent(finding, col);
            
            if (cellContent) {
                const textHeight = pdfDoc.heightOfString(cellContent, {
                    width: width - (cellPadding * 2),
                    align: col === 'answer' || col === 'score' || col === 'sNo' ? 'center' : 'left'
                });
                const cellHeight = Math.max(textHeight + (cellPadding * 2), minRowHeight);
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
                pdfDoc.rect(newHeaderX, rowY, width, 25)
                      .fillColor(primaryColor)
                      .fill();
                pdfDoc.fontSize(9)
                      .fillColor('#FFFFFF')
                      .text(getColumnHeader(col), newHeaderX + 5, rowY + 8, { 
                          width: width - 10, 
                          align: 'center' 
                      });
                newHeaderX += width;
            });
            pdfDoc.fontSize(8); // Reset to 8pt for cell content
            rowY += 25; // Move below header
        }
        
        let rowX = margin;
        
        // Draw all cell borders first
        columns.forEach((col, colIdx) => {
            const width = colWidths[colIdx];
            pdfDoc.rect(rowX, rowY, width, rowHeight)
                  .strokeColor('#CCCCCC')
                  .lineWidth(0.5)
                  .stroke();
            rowX += width;
        });
        
        // Draw cell content
        rowX = margin;
        columns.forEach((col, colIndex) => {
            const width = colWidths[colIndex];
            const cellContent = getCellContent(finding, col);
            
            // Set text alignment and color
            const align = (col === 'answer' || col === 'score' || col === 'sNo') ? 'center' : 'left';
            
            pdfDoc.fontSize(8)
                  .fillColor(textColor);
            
            // Color coding for pass/fail in answer column
            if (col === 'answer') {
                if (finding.passFail === 'Fail') {
                    pdfDoc.fillColor(dangerColor);
                } else if (finding.passFail === 'Pass') {
                    pdfDoc.fillColor(successColor);
                } else if (finding.passFail === 'N/A') {
                    pdfDoc.fillColor('#666666'); // Gray for N/A
                }
            }
            
            // Draw text with proper wrapping
            if (cellContent) {
                pdfDoc.text(cellContent, rowX + cellPadding, rowY + cellPadding, { 
                    width: width - (cellPadding * 2),
                    align: align,
                    lineGap: 2
                });
            }
            
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
 * Build findings data from response
 */
function buildFindingsData(responseData, form, blockConfig) {
    if (!responseData.responseDetails || !Array.isArray(responseData.responseDetails)) {
        return [];
    }
    
    let findings = responseData.responseDetails;
    
    // Filter by section if configured
    if (blockConfig?.sectionIds && Array.isArray(blockConfig.sectionIds) && blockConfig.sectionIds.length > 0) {
        findings = findings.filter(f => blockConfig.sectionIds.includes(f.sectionId));
    }
    
    // Filter by pass/fail
    if (blockConfig?.showOnlyFailed) {
        findings = findings.filter(f => f.passFail === 'Fail');
    } else if (blockConfig?.showOnlyPassed) {
        findings = findings.filter(f => f.passFail === 'Pass');
    }
    
    // Enrich with question details from form
    if (form && form.sections) {
        findings = findings.map(finding => {
            const questionInfo = findQuestionInForm(form, finding.questionId);
            const question = questionInfo.question;
            const section = questionInfo.section;
            const subsection = questionInfo.subsection;
            
            return {
                ...finding,
                questionText: question?.questionText || finding.questionId,
                standard: question?.questionText || finding.questionId, // Use questionText as standard
                category: question?.category || section?.name || '',
                tag: question?.tag || (question?.tags && question.tags.length > 0 ? question.tags.join(', ') : '') || '',
                area: subsection?.name || section?.name || '',
                sectionName: section?.name || '',
                subsectionName: subsection?.name || ''
            };
        });
    }
    
    // Sort based on config
    const sortBy = blockConfig?.sortBy || 'section';
    if (sortBy === 'score') {
        findings.sort((a, b) => (a.score || 0) - (b.score || 0));
    } else if (sortBy === 'questionId') {
        findings.sort((a, b) => a.questionId.localeCompare(b.questionId));
    }
    // Default: keep section order
    
    // Add serial numbers
    findings = findings.map((finding, index) => ({
        ...finding,
        sNo: index + 1
    }));
    
    return findings;
}

/**
 * Find question in form structure and return question with section/subsection info
 */
function findQuestionInForm(form, questionId) {
    if (!form.sections || !Array.isArray(form.sections)) {
        return { question: null, section: null, subsection: null };
    }
    
    for (const section of form.sections) {
        // Check section-level questions
        if (section.questions && Array.isArray(section.questions)) {
            for (const question of section.questions) {
                if (question.questionId === questionId) {
                    return { question, section, subsection: null };
                }
            }
        }
        
        // Check subsection-level questions
        if (section.subsections && Array.isArray(section.subsections)) {
            for (const subsection of section.subsections) {
                if (subsection.questions && Array.isArray(subsection.questions)) {
                    for (const question of subsection.questions) {
                        if (question.questionId === questionId) {
                            return { question, section, subsection };
                        }
                    }
                }
            }
        }
    }
    
    return { question: null, section: null, subsection: null };
}

/**
 * Get column header text
 */
function getColumnHeader(column) {
    const headers = {
        'sNo': 'S No.',
        'category': 'Category',
        'tag': 'Tag',
        'area': 'Area of Audit',
        'standard': 'Standard',
        'question': 'Question',
        'answer': 'Answer',
        'comment': 'Comment',
        'score': 'Score'
    };
    return headers[column] || column;
}

/**
 * Get cell content for a column
 */
function getCellContent(finding, column) {
    switch (column) {
        case 'sNo':
            return finding.sNo ? String(finding.sNo) : '-';
        case 'category':
            const category = finding.category || finding.sectionName;
            return category || '-';
        case 'tag':
            return finding.tag || '-';
        case 'area':
            const area = finding.area || finding.subsectionName || finding.sectionName;
            return area || '-';
        case 'standard':
            // Use questionText as standard (the actual audit question)
            return finding.standard || finding.questionText || '-';
        case 'question':
            return finding.questionText || finding.questionId || '-';
        case 'answer':
            // Format answer based on passFail for Yes/No questions
            if (finding.passFail === 'N/A') {
                return 'N/A';
            }
            if (finding.passFail === 'Pass') {
                return 'Yes';
            }
            if (finding.passFail === 'Fail') {
                return 'No';
            }
            // Fallback to actual answer value
            if (typeof finding.answer === 'boolean') {
                return finding.answer ? 'Yes' : 'No';
            }
            if (Array.isArray(finding.answer)) {
                return finding.answer.join(', ') || '-';
            }
            return String(finding.answer || '-');
        case 'comment':
            // Get comment from responseDetail (may be in different fields)
            return finding.comment || finding.auditorFinding || finding.managerAction?.comment || '';
        case 'score':
            // Format score as "X/Y" or "-" for N/A
            if (finding.passFail === 'N/A') {
                return '-';
            }
            // For Yes/No questions, score is typically 0/1 or 1/1
            const score = finding.score !== undefined ? finding.score : (finding.passFail === 'Pass' ? 1 : 0);
            const maxScore = 1; // Typically 1 for Yes/No questions
            return `${score}/${maxScore}`;
        default:
            return '-';
    }
}

/**
 * Calculate column widths based on columns
 */
function calculateColumnWidths(columns, availableWidth) {
    const widths = {
        'sNo': 40,
        'category': 80,
        'tag': 60,
        'area': 100,
        'standard': 200, // Wider for question text
        'question': 200,
        'answer': 60,    // Narrower for Yes/No/N/A
        'comment': 180,  // Wider for comments
        'score': 50
    };
    
    const totalFixedWidth = columns.reduce((sum, col) => sum + (widths[col] || 100), 0);
    const scale = availableWidth / totalFixedWidth;
    
    return columns.map(col => Math.floor((widths[col] || 100) * scale));
}

module.exports = renderDetailedFindingsBlock;

