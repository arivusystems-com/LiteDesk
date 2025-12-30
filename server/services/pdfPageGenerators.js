const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * @deprecated PDF Page Generators
 * 
 * This file contains legacy hardcoded PDF page generation functions.
 * It has been replaced by block-based PDF generation in blockRenderers/.
 * 
 * DO NOT USE: All PDF generation must now use templates with blocks.
 * 
 * This file will be removed after full migration to block-based rendering.
 * 
 * @see blockRenderers/blockBasedPdfService.js
 * @see blockRenderers/renderers/
 */

// Color constants matching the report style
const COLORS = {
    primary: '#FF6B35', // Orange
    secondary: '#004E89', // Dark blue
    success: '#4CAF50', // Green
    danger: '#F44336', // Red
    warning: '#FF9800', // Orange
    text: '#333333',
    textLight: '#666666',
    background: '#FFFFFF',
    footer: '#1A237E', // Dark blue footer
    gold: '#FFD700' // Gold for stars
};

/**
 * @deprecated This function is part of the legacy hardcoded PDF generation system.
 * Use block-based rendering with REPORT_IDENTITY block instead.
 * 
 * Generate cover page with header information
 */
async function generateCoverPage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header with logo
    if (templateConfig.logo) {
        // If logo path provided, add logo image
        // For now, we'll use text logo
        doc.fontSize(24)
           .fillColor(COLORS.primary)
           .text('GUEST DELIGHT INTERNATIONAL', margin, 80, { align: 'center' });
    } else {
        doc.fontSize(24)
           .fillColor(COLORS.primary)
           .text('GUEST DELIGHT INTERNATIONAL', margin, 80, { align: 'center' });
    }

    // Hotel/Organization name
    doc.fontSize(18)
       .fillColor(COLORS.text)
       .text(reportData.header.hotelName, margin, 130, { align: 'center' });

    // Audit information table
    const tableY = 200;
    const tableWidth = pageWidth - (margin * 2);
    const colWidth = tableWidth / 2;

    // Table header
    doc.rect(margin, tableY, tableWidth, 30)
       .fillColor(COLORS.primary)
       .fill();

    doc.fontSize(12)
       .fillColor('#FFFFFF')
       .text('GUEST DELIGHT INTERNATIONAL', margin + 10, tableY + 8, { width: tableWidth - 20, align: 'center' });

    // Table rows
    const rows = [
        ['Check-In Date:', formatDate(reportData.header.checkInDate)],
        ['Check-Out Date:', formatDate(reportData.header.checkOutDate)],
        ['Audit ID:', reportData.header.auditId],
        ['Round:', reportData.header.round],
        ['Hotel Name:', reportData.header.hotelName],
        ['Address:', reportData.header.address],
        ['General Manager:', reportData.header.generalManager]
    ];

    let currentY = tableY + 35;
    rows.forEach(([label, value]) => {
        doc.fontSize(10)
           .fillColor(COLORS.text)
           .text(label, margin + 10, currentY, { width: colWidth - 20 });
        doc.text(value, margin + colWidth + 10, currentY, { width: colWidth - 20 });
        currentY += 20;
    });

    // Footer
    doc.rect(0, pageHeight - 40, pageWidth, 40)
       .fillColor(COLORS.footer)
       .fill();

    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text(reportData.header.hotelName, margin, pageHeight - 30, { width: pageWidth / 2 - margin });
    doc.text('Confidential property of GDI', pageWidth / 2, pageHeight - 30, { 
        width: pageWidth / 2 - margin,
        align: 'right'
    });
}

/**
 * Generate overall performance page with donut chart and rating
 */
async function generateOverallPerformancePage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(20)
       .fillColor(COLORS.text)
       .text('Overall Performance Score and Rating', margin, 120, { align: 'center' });

    const contentY = 180;
    const leftColX = margin;
    const rightColX = pageWidth / 2 + 20;
    const colWidth = (pageWidth / 2) - margin - 20;

    // Left Column: Overall Score with Donut Chart
    doc.fontSize(16)
       .fillColor(COLORS.text)
       .text('Overall Score', leftColX, contentY, { width: colWidth, align: 'center' });

    // Draw donut chart
    const chartCenterX = leftColX + colWidth / 2;
    const chartCenterY = contentY + 80;
    const chartRadius = 60;
    const innerRadius = 40;

    await drawDonutChart(doc, chartCenterX, chartCenterY, chartRadius, innerRadius, 
                        reportData.overallPerformance.score, COLORS.danger);

    // Score text in center
    doc.fontSize(24)
       .fillColor(COLORS.danger)
       .text(`${reportData.overallPerformance.score}%`, chartCenterX - 30, chartCenterY - 15, { width: 60, align: 'center' });

    // Benchmark score
    doc.fontSize(12)
       .fillColor(COLORS.textLight)
       .text(`Benchmark Score: ${reportData.overallPerformance.benchmarkScore}%`, 
              leftColX, chartCenterY + chartRadius + 20, { width: colWidth, align: 'center' });

    // Right Column: Rating
    doc.fontSize(16)
       .fillColor(COLORS.text)
       .text('Rating', rightColX, contentY, { width: colWidth, align: 'center' });

    // Draw stars
    const starsY = contentY + 60;
    const starSize = 30;
    const starSpacing = 40;
    const starsStartX = rightColX + (colWidth - (reportData.overallPerformance.rating * starSpacing - 10)) / 2;

    for (let i = 0; i < reportData.overallPerformance.rating; i++) {
        drawStar(doc, starsStartX + (i * starSpacing), starsY, starSize, COLORS.gold);
    }

    // Rating label
    doc.fontSize(16)
       .fillColor(COLORS.text)
       .text(reportData.overallPerformance.ratingLabel, rightColX, starsY + starSize + 10, 
             { width: colWidth, align: 'center' });

    // Score breakdown table
    const tableY = contentY + 250;
    const breakdown = reportData.overallPerformance.scoreBreakdown;

    const breakdownRows = [
        ['Score:', breakdown.score],
        ['Total Points Available:', breakdown.totalPointsAvailable],
        ['Total Points Scorable:', breakdown.totalPointsScorable],
        ['Total Points Scored:', breakdown.totalPointsScored],
        ['Total NA Questions:', breakdown.totalNAQuestions],
        ['Total Missed Points:', `${breakdown.totalMissedPoints} vs ${breakdown.previousMissedPoints} (Last Audit)`],
        ['Total Non Compliance Count:', breakdown.totalNonComplianceCount]
    ];

    doc.fontSize(12)
       .fillColor(COLORS.text);

    let currentY = tableY;
    breakdownRows.forEach(([label, value]) => {
        doc.text(label, leftColX, currentY, { width: colWidth });
        const valueColor = label.includes('Missed Points') && breakdown.totalMissedPoints > breakdown.previousMissedPoints 
                          ? COLORS.danger : COLORS.text;
        doc.fillColor(valueColor)
           .text(value, rightColX, currentY, { width: colWidth });
        doc.fillColor(COLORS.text);
        currentY += 20;
    });

    // Classification table
    const classificationY = currentY + 30;
    doc.fontSize(14)
       .fillColor(COLORS.text)
       .text('Classification of Ratings', margin, classificationY);

    const classificationRows = [
        ['Poor', '0%-59.9%', 1],
        ['Average', '60%-74.9%', 2],
        ['Good', '75%-89.9%', 3],
        ['Excellent', '90%-100%', 4]
    ];

    currentY = classificationY + 30;
    for (const [label, range, stars] of classificationRows) {
        // Draw star indicator
        drawStar(doc, margin + 10, currentY, 12, COLORS.gold);
        
        doc.fontSize(10)
           .fillColor(COLORS.text)
           .text(`${label}: ${range}`, margin + 30, currentY - 6);
        
        currentY += 20;
    }

    // Performance history chart
    if (reportData.performanceHistory && reportData.performanceHistory.length > 0) {
        await generatePerformanceHistoryChart(doc, reportData.performanceHistory, margin, currentY + 30);
    }

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate executive summary page
 */
async function generateExecutiveSummaryPage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(20)
       .fillColor(COLORS.primary)
       .text('Executive Summary', margin, 120, { align: 'center' });

    // Hotel and Score info
    const infoY = 180;
    doc.fontSize(12)
       .fillColor(COLORS.text)
       .text('Hotel', margin, infoY);
    doc.text(reportData.header.hotelName, margin + 100, infoY);

    doc.text('Score', margin, infoY + 25);
    doc.fontSize(24)
       .fillColor(COLORS.primary)
       .text(`${reportData.overallPerformance.score}%`, margin + 100, infoY + 20);

    // Executive summary text
    const summaryY = infoY + 80;
    doc.fontSize(11)
       .fillColor(COLORS.text)
       .text(reportData.executiveSummary, margin, summaryY, {
           width: pageWidth - (margin * 2),
           align: 'left',
           lineGap: 5
       });

    // Add more detailed summary paragraphs if available
    if (templateConfig.executiveSummaryDetails) {
        let currentY = summaryY + 150;
        templateConfig.executiveSummaryDetails.forEach(paragraph => {
            doc.fontSize(11)
               .fillColor(COLORS.text)
               .text(paragraph, margin, currentY, {
                   width: pageWidth - (margin * 2),
                   align: 'left',
                   lineGap: 5
               });
            currentY += 100;
        });
    }

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate top 5 / bottom 5 scoring areas page
 */
async function generateScoringAreasPage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(20)
       .fillColor(COLORS.text)
       .text('Top 5: Highest Scoring Areas / Bottom 5: Lowest Scoring Areas', 
             margin, 120, { align: 'center' });

    const tableY = 180;
    const leftTableX = margin;
    const rightTableX = pageWidth / 2 + 20;
    const tableWidth = (pageWidth / 2) - margin - 20;

    // Top 5 Table
    doc.rect(leftTableX, tableY, tableWidth, 30)
       .fillColor(COLORS.success)
       .fill();

    doc.fontSize(12)
       .fillColor('#FFFFFF')
       .text('Top 5: Highest Scoring Areas', leftTableX + 10, tableY + 8, 
             { width: tableWidth - 20, align: 'center' });

    let currentY = tableY + 35;
    reportData.scoringAreas.top5.forEach((area, index) => {
        doc.fontSize(10)
           .fillColor(COLORS.text)
           .text(`${index + 1}. ${area.department}`, leftTableX + 10, currentY);
        doc.fillColor(COLORS.success)
           .text(`${area.score}%`, leftTableX + tableWidth - 60, currentY, { align: 'right' });
        doc.fillColor(COLORS.text);
        currentY += 25;
    });

    // Bottom 5 Table
    doc.rect(rightTableX, tableY, tableWidth, 30)
       .fillColor(COLORS.danger)
       .fill();

    doc.fontSize(12)
       .fillColor('#FFFFFF')
       .text('Bottom 5: Lowest Scoring Areas', rightTableX + 10, tableY + 8, 
             { width: tableWidth - 20, align: 'center' });

    currentY = tableY + 35;
    reportData.scoringAreas.bottom5.forEach((area, index) => {
        doc.fontSize(10)
           .fillColor(COLORS.text)
           .text(`${index + 1}. ${area.department}`, rightTableX + 10, currentY);
        doc.fillColor(COLORS.danger)
           .text(`${area.score}%`, rightTableX + tableWidth - 60, currentY, { align: 'right' });
        doc.fillColor(COLORS.text);
        currentY += 25;
    });

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate department breakdown page
 */
async function generateDepartmentBreakdownPage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(18)
       .fillColor(COLORS.text)
       .text('Department by Department Score Breakdown', margin, 120, { align: 'center' });

    // Table headers
    const tableY = 160;
    const colWidths = [200, 100, 100, 100, 80];
    const headers = ['Department', 'Previous Audit 2', 'Previous Audit', 'Current Audit', '% Change'];

    doc.fontSize(10)
       .fillColor('#FFFFFF');

    let currentX = margin;
    headers.forEach((header, index) => {
        doc.rect(currentX, tableY, colWidths[index], 25)
           .fillColor(COLORS.primary)
           .fill();
        doc.text(header, currentX + 5, tableY + 8, { width: colWidths[index] - 10, align: 'center' });
        currentX += colWidths[index];
    });

    // Table rows
    let currentY = tableY + 25;
    reportData.departmentBreakdown.forEach(dept => {
        const rowHeight = 20;
        currentX = margin;

        // Department name
        doc.rect(currentX, currentY, colWidths[0], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.fontSize(9)
           .fillColor(COLORS.text)
           .text(dept.department, currentX + 5, currentY + 5, { width: colWidths[0] - 10 });
        currentX += colWidths[0];

        // Previous Audit 2
        doc.rect(currentX, currentY, colWidths[1], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.text(dept.previousScore2 ? `${dept.previousScore2}%` : 'NA', 
                 currentX + 5, currentY + 5, { width: colWidths[1] - 10, align: 'center' });
        currentX += colWidths[1];

        // Previous Audit
        doc.rect(currentX, currentY, colWidths[2], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.text(dept.previousScore ? `${dept.previousScore}%` : 'NA', 
                 currentX + 5, currentY + 5, { width: colWidths[2] - 10, align: 'center' });
        currentX += colWidths[2];

        // Current Audit
        doc.rect(currentX, currentY, colWidths[3], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        const changeColor = dept.change && dept.change < 0 ? COLORS.danger : COLORS.text;
        doc.fillColor(changeColor)
           .text(`${dept.currentScore}%`, currentX + 5, currentY + 5, 
                 { width: colWidths[3] - 10, align: 'center' });
        currentX += colWidths[3];

        // % Change
        doc.rect(currentX, currentY, colWidths[4], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        const changeText = dept.change !== null 
            ? `${dept.change > 0 ? '+' : ''}${dept.change.toFixed(1)}%`
            : 'N/A';
        doc.fillColor(changeColor)
           .text(changeText, currentX + 5, currentY + 5, { width: colWidths[4] - 10, align: 'center' });

        currentY += rowHeight;
    });

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate non-compliance counts page
 */
async function generateNonCompliancePage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(18)
       .fillColor(COLORS.text)
       .text('Department Non Compliance Counts', margin, 120, { align: 'center' });

    // Table
    const tableY = 160;
    const colWidths = [250, 120, 120, 100];
    const headers = ['Department', 'Previous Audit', 'Current Audit', 'Change'];

    doc.fontSize(10)
       .fillColor('#FFFFFF');

    let currentX = margin;
    headers.forEach((header, index) => {
        doc.rect(currentX, tableY, colWidths[index], 25)
           .fillColor(COLORS.primary)
           .fill();
        doc.text(header, currentX + 5, tableY + 8, { width: colWidths[index] - 10, align: 'center' });
        currentX += colWidths[index];
    });

    // Table rows
    let currentY = tableY + 25;
    reportData.nonComplianceCounts.forEach(dept => {
        const rowHeight = 20;
        currentX = margin;

        // Highlight row if significant change
        if (dept.change > 0) {
            doc.rect(margin, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
               .fillColor('#FFF5F5')
               .fill();
        }

        // Department
        doc.rect(currentX, currentY, colWidths[0], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.fontSize(9)
           .fillColor(COLORS.text)
           .text(dept.department, currentX + 5, currentY + 5, { width: colWidths[0] - 10 });
        currentX += colWidths[0];

        // Previous Audit
        doc.rect(currentX, currentY, colWidths[1], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.text(dept.previousCount.toString(), currentX + 5, currentY + 5, 
                 { width: colWidths[1] - 10, align: 'center' });
        currentX += colWidths[1];

        // Current Audit
        doc.rect(currentX, currentY, colWidths[2], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        doc.text(dept.currentCount.toString(), currentX + 5, currentY + 5, 
                 { width: colWidths[2] - 10, align: 'center' });
        currentX += colWidths[2];

        // Change
        doc.rect(currentX, currentY, colWidths[3], rowHeight)
           .strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .stroke();
        const changeText = dept.change > 0 ? `+${dept.change}` : dept.change.toString();
        const changeColor = dept.change > 0 ? COLORS.danger : COLORS.text;
        doc.fillColor(changeColor)
           .text(changeText, currentX + 5, currentY + 5, { width: colWidths[3] - 10, align: 'center' });

        currentY += rowHeight;
    });

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate brand ranking page
 */
async function generateBrandRankingPage(doc, reportData, templateConfig) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Header
    await addPageHeader(doc, reportData, margin);

    // Title
    doc.fontSize(18)
       .fillColor(COLORS.primary)
       .text('Brand Ranking', margin, 120, { align: 'center' });

    // Brand ranking chart and table
    const chartY = 180;
    const chartHeight = 200;
    const chartWidth = 100;

    // Draw bar chart
    const maxScore = 100;
    const barHeight = (reportData.brandRanking.score / maxScore) * chartHeight;
    const barX = margin + 50;
    const barY = chartY + chartHeight - barHeight;

    doc.rect(barX, barY, chartWidth, barHeight)
       .fillColor(COLORS.success)
       .fill();

    // Score label above bar
    doc.fontSize(16)
       .fillColor(COLORS.text)
       .text(`${reportData.brandRanking.score}%`, barX, barY - 25, 
             { width: chartWidth, align: 'center' });

    // Legend
    doc.rect(barX, chartY + chartHeight + 10, 15, 15)
       .fillColor(COLORS.success)
       .fill();
    doc.fontSize(10)
       .fillColor(COLORS.text)
       .text(reportData.header.hotelName.substring(0, 15) + '...', barX + 20, chartY + chartHeight + 12);

    // Ranking table
    const tableX = barX + chartWidth + 50;
    const tableY = chartY;
    const tableColWidth = 100;

    doc.fontSize(12)
       .fillColor(COLORS.primary)
       .text('Ranking', tableX, tableY, { width: tableColWidth, align: 'center' });
    doc.text('Total Hotels', tableX, tableY + 30, { width: tableColWidth, align: 'center' });

    doc.fontSize(16)
       .fillColor(COLORS.text)
       .text(reportData.brandRanking.ranking.toString(), tableX, tableY + 15, 
             { width: tableColWidth, align: 'center' });
    doc.text(reportData.brandRanking.totalHotels.toString(), tableX, tableY + 45, 
             { width: tableColWidth, align: 'center' });

    // Explanation
    const explanationY = chartY + chartHeight + 60;
    doc.fontSize(10)
       .fillColor(COLORS.textLight)
       .text('Brand Ranking: This graph shows how your performance on this report ranks in comparison to the average performance of other group Hotels.', 
             margin, explanationY, { width: pageWidth - (margin * 2), lineGap: 3 });

    // Hotel list
    doc.fontSize(10)
       .fillColor(COLORS.text)
       .text(`• ${reportData.header.hotelName}`, margin, explanationY + 40);

    // Footer
    await addPageFooter(doc, reportData, pageHeight);
}

/**
 * Generate brand standards report pages (detailed audit tables)
 */
async function generateBrandStandardsPages(doc, reportData, templateConfig) {
    reportData.brandStandardsReports.forEach((report, reportIndex) => {
        if (reportIndex > 0) {
            doc.addPage();
        }

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;

        // Header
        addPageHeader(doc, reportData, margin);

        // Title
        doc.fontSize(18)
           .fillColor(COLORS.text)
           .text('Brand Standards Report', margin, 120, { align: 'center' });

        // Department info
        const infoY = 160;
        doc.fontSize(12)
           .fillColor(COLORS.text)
           .text('Hotel:', margin, infoY);
        doc.text(reportData.header.hotelName, margin + 80, infoY);

        doc.text('Department:', margin, infoY + 20);
        doc.text(report.department, margin + 80, infoY + 20);

        doc.text('Score:', margin, infoY + 40);
        doc.fontSize(16)
           .fillColor(COLORS.text)
           .text(`${report.score}%`, margin + 80, infoY + 35);

        // Table headers
        const tableY = infoY + 80;
        const colWidths = [40, 60, 80, 120, 150, 60, 100, 50];
        const headers = ['S No.', 'Category', 'Tag', 'Area of Audit', 'Standard', 'Answer', 'Comment', 'Score'];

        doc.fontSize(8)
           .fillColor('#FFFFFF');

        let currentX = margin;
        headers.forEach((header, index) => {
            doc.rect(currentX, tableY, colWidths[index], 25)
               .fillColor(COLORS.primary)
               .fill();
            doc.text(header, currentX + 3, tableY + 8, { width: colWidths[index] - 6, align: 'center' });
            currentX += colWidths[index];
        });

        // Table rows
        let currentY = tableY + 25;
        report.questions.forEach((question, qIndex) => {
            // Check if we need a new page
            if (currentY > pageHeight - 100) {
                doc.addPage();
                addPageHeader(doc, reportData, margin);
                currentY = 120;
            }

            const rowHeight = Math.max(30, Math.ceil(question.comment.length / 50) * 15);
            currentX = margin;

            // S No.
            doc.rect(currentX, currentY, colWidths[0], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.fontSize(8)
               .fillColor(COLORS.text)
               .text(question.sNo, currentX + 3, currentY + 5, { width: colWidths[0] - 6, align: 'center' });
            currentX += colWidths[0];

            // Category
            doc.rect(currentX, currentY, colWidths[1], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.text(question.category || '', currentX + 3, currentY + 5, { width: colWidths[1] - 6 });
            currentX += colWidths[1];

            // Tag
            doc.rect(currentX, currentY, colWidths[2], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.text(question.tag || '', currentX + 3, currentY + 5, { width: colWidths[2] - 6 });
            currentX += colWidths[2];

            // Area of Audit
            doc.rect(currentX, currentY, colWidths[3], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.text(question.areaOfAudit || '', currentX + 3, currentY + 5, { width: colWidths[3] - 6 });
            currentX += colWidths[3];

            // Standard
            doc.rect(currentX, currentY, colWidths[4], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.text(question.standard || '', currentX + 3, currentY + 5, { width: colWidths[4] - 6 });
            currentX += colWidths[4];

            // Answer (Yes/No/N/A with color coding)
            doc.rect(currentX, currentY, colWidths[5], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            const answerColor = question.answer === 'Yes' ? COLORS.success : 
                               question.answer === 'No' ? COLORS.danger : COLORS.textLight;
            doc.fillColor(answerColor)
               .text(question.answer || 'N/A', currentX + 3, currentY + 5, 
                     { width: colWidths[5] - 6, align: 'center' });
            currentX += colWidths[5];

            // Comment
            doc.rect(currentX, currentY, colWidths[6], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.fillColor(COLORS.text)
               .text(question.comment || '', currentX + 3, currentY + 5, { width: colWidths[6] - 6 });
            currentX += colWidths[6];

            // Score
            doc.rect(currentX, currentY, colWidths[7], rowHeight)
               .strokeColor('#CCCCCC')
               .lineWidth(0.5)
               .stroke();
            doc.text(question.score || '0/1', currentX + 3, currentY + 5, 
                     { width: colWidths[7] - 6, align: 'center' });

            currentY += rowHeight;

            // Add attachments if available
            if (question.attachments && question.attachments.length > 0) {
                // Note: Image embedding would require additional image processing
                // For now, we'll just note that attachments exist
                doc.fontSize(7)
                   .fillColor(COLORS.textLight)
                   .text(`[${question.attachments.length} attachment(s)]`, 
                         margin + colWidths[0] + colWidths[1], currentY, 
                         { width: pageWidth - margin * 2 });
                currentY += 15;
            }
        });

        // Footer
        addPageFooter(doc, reportData, pageHeight);
    });
}

/**
 * Helper functions
 */

function addPageHeader(doc, reportData, margin) {
    const pageWidth = doc.page.width;
    
    // Logo/Company name
    doc.fontSize(16)
       .fillColor(COLORS.primary)
       .text(reportData.header.companyName, margin, 30, { align: 'center' });
    
    // Horizontal line
    doc.moveTo(margin, 60)
       .lineTo(pageWidth - margin, 60)
       .strokeColor(COLORS.primary)
       .lineWidth(1)
       .stroke();
}

function addPageFooter(doc, reportData, pageHeight) {
    const pageWidth = doc.page.width;
    const margin = 50;

    doc.rect(0, pageHeight - 40, pageWidth, 40)
       .fillColor(COLORS.footer)
       .fill();

    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text(reportData.header.hotelName, margin, pageHeight - 30, 
             { width: pageWidth / 2 - margin });
    doc.text('Confidential property of GDI', pageWidth / 2, pageHeight - 30, 
             { width: pageWidth / 2 - margin, align: 'right' });
}

async function drawDonutChart(doc, centerX, centerY, outerRadius, innerRadius, percentage, color) {
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (2 * Math.PI * percentage / 100);
    
    // Draw background circle (full)
    doc.circle(centerX, centerY, outerRadius)
       .fillColor('#E0E0E0')
       .fill();
    
    // Draw percentage arc
    doc.path(`M ${centerX} ${centerY - outerRadius}`)
       .arc(centerX, centerY, outerRadius, startAngle, endAngle)
       .lineTo(centerX, centerY)
       .closePath()
       .fillColor(color)
       .fill();
    
    // Draw inner circle (white) to create donut effect
    doc.circle(centerX, centerY, innerRadius)
       .fillColor('#FFFFFF')
       .fill();
}

function drawStar(doc, x, y, size, color) {
    const points = 5;
    const outerRadius = size / 2;
    const innerRadius = outerRadius * 0.4;
    const angleStep = (2 * Math.PI) / points;
    
    let path = '';
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * angleStep) - (Math.PI / 2);
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        
        if (i === 0) {
            path = `M ${px} ${py}`;
        } else {
            path += ` L ${px} ${py}`;
        }
    }
    path += ' Z';
    
    doc.path(path)
       .fillColor(color)
       .fill();
}

async function generatePerformanceHistoryChart(doc, historyData, margin, startY) {
    const pageWidth = doc.page.width;
    const chartWidth = pageWidth - (margin * 2);
    const chartHeight = 150;
    const barWidth = chartWidth / historyData.length;
    const maxScore = 100;

    // Chart title
    doc.fontSize(14)
       .fillColor(COLORS.text)
       .text('Performance Map of Previous Audits', margin, startY);

    // Draw bars
    let currentX = margin;
    historyData.forEach((data, index) => {
        const barHeight = (data.score / maxScore) * chartHeight;
        const barY = startY + 40 + chartHeight - barHeight;
        const barColor = data.isCurrent ? COLORS.danger : '#CCCCCC';

        doc.rect(currentX, barY, barWidth - 5, barHeight)
           .fillColor(barColor)
           .fill();

        // Score label
        doc.fontSize(8)
           .fillColor(COLORS.text)
           .text(`${data.score}%`, currentX, barY - 15, 
                 { width: barWidth - 5, align: 'center' });

        // Date label
        doc.text(formatDate(data.date), currentX, startY + 40 + chartHeight + 5, 
                 { width: barWidth - 5, align: 'center' });

        currentX += barWidth;
    });

    // Legend
    const legendY = startY + 40 + chartHeight + 30;
    doc.rect(margin, legendY, 15, 15)
       .fillColor('#CCCCCC')
       .fill();
    doc.fontSize(9)
       .fillColor(COLORS.text)
       .text('Previous Audits', margin + 20, legendY + 2);

    doc.rect(margin + 150, legendY, 15, 15)
       .fillColor(COLORS.danger)
       .fill();
    doc.text('Current Audit', margin + 170, legendY + 2);
}

function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}${getOrdinal(day)} ${month} ${year}`;
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

module.exports = {
    generateCoverPage,
    generateOverallPerformancePage,
    generateExecutiveSummaryPage,
    generateScoringAreasPage,
    generateDepartmentBreakdownPage,
    generateNonCompliancePage,
    generateBrandRankingPage,
    generateBrandStandardsPages
};

