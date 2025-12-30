/**
 * Render Overall Performance Block
 * 
 * Renders overall performance score with rating, benchmark comparison, and key metrics.
 * This is a core block that is always present.
 */

/**
 * Render overall performance block
 * @param {PDFDocument} pdfDoc - PDFDocument instance
 * @param {Object} responseData - FormResponse data
 * @param {Object} blockConfig - Block configuration
 * @param {Object} branding - Template branding configuration
 * @param {Object} context - Additional context
 * @param {number} startY - Starting Y position for rendering (default: 50)
 * @returns {Promise<{height: number, pageBreak: boolean, endY: number}>}
 */
async function renderOverallPerformanceBlock(pdfDoc, responseData, blockConfig, branding, context = {}, startY = 50) {
    const pageWidth = pdfDoc.page.width;
    const pageHeight = pdfDoc.page.height;
    const margin = 24; // Reduced margin for more content space
    
    // Use branding colors
    const primaryColor = branding?.colors?.primary || '#FF6B35';
    const textColor = branding?.colors?.text || '#333333';
    const textLightColor = branding?.colors?.textLight || '#666666';
    const successColor = branding?.colors?.success || '#4CAF50';
    const dangerColor = branding?.colors?.danger || '#F44336';
    const goldColor = '#FFD700'; // Gold for stars (not in branding, keep as is)
    
    // Use branding typography
    const fontFamily = branding?.typography?.fontFamily || 'Arial';
    const baseFontSize = branding?.typography?.baseFontSize || 12;
    
    // Calculate overall score
    const overallScore = responseData.kpis?.finalScore || 0;
    const benchmarkScore = context.benchmarkScore || blockConfig?.benchmarkScore || 80;
    
    // Calculate rating
    const rating = calculateRating(overallScore);
    
    // Start Y position from parameter
    let currentY = startY;
    
    // Title
    if (blockConfig?.showScore !== false) {
        pdfDoc.fontSize(20)
              .font('Helvetica-Bold')
              .fillColor(textColor)
              .text('Overall Performance Score and Rating', margin, currentY, { align: 'center' });
        currentY += 35;
    }
    
    const contentY = currentY;
    const leftColX = margin;
    const rightColX = pageWidth / 2 + 20;
    const colWidth = (pageWidth / 2) - margin - 20;
    
    // Left Column: Overall Score with Donut Chart
    if (blockConfig?.showScore !== false) {
        pdfDoc.fontSize(16)
              .font('Helvetica-Bold')
              .fillColor(textColor)
              .text('Overall Score', leftColX, contentY, { width: colWidth, align: 'center' });
        
        // Draw donut chart (smaller to fit on page)
        const chartCenterX = leftColX + colWidth / 2;
        const chartCenterY = contentY + 65; // Moved up
        const chartRadius = 50; // Smaller radius
        const innerRadius = 35; // Smaller inner radius
        
        await drawDonutChart(pdfDoc, chartCenterX, chartCenterY, chartRadius, innerRadius, 
                            overallScore, dangerColor);
        
        // Score text in center
        pdfDoc.fontSize(20) // Smaller font
              .font('Helvetica-Bold')
              .fillColor(dangerColor)
              .text(`${overallScore.toFixed(1)}%`, chartCenterX - 25, chartCenterY - 12, { width: 50, align: 'center' });
        
        // Benchmark score
        if (blockConfig?.showBenchmark !== false) {
            pdfDoc.fontSize(11) // Slightly smaller
                  .font('Helvetica')
                  .fillColor(textLightColor)
                  .text(`Benchmark Score: ${benchmarkScore}%`, 
                        leftColX, chartCenterY + chartRadius + 15, { width: colWidth, align: 'center' });
        }
    }
    
    // Right Column: Rating
    if (blockConfig?.showRating !== false) {
        pdfDoc.fontSize(16)
              .font('Helvetica-Bold')
              .fillColor(textColor)
              .text('Rating', rightColX, contentY, { width: colWidth, align: 'center' });
        
        // Draw stars (smaller to fit on page)
        const starsY = contentY + 50; // Moved up
        const starSize = 25; // Smaller stars
        const starSpacing = 35;
        const starsStartX = rightColX + (colWidth - (rating.stars * starSpacing - 10)) / 2;
        
        for (let i = 0; i < rating.stars; i++) {
            drawStar(pdfDoc, starsStartX + (i * starSpacing), starsY, starSize, goldColor);
        }
        
        // Rating label
        pdfDoc.fontSize(14) // Smaller font
              .font('Helvetica-Bold')
              .fillColor(primaryColor) // Use primary color to match reference
              .text(rating.label, rightColX, starsY + starSize + 8, 
                    { width: colWidth, align: 'center' });
    }
    
    // Score breakdown table
    if (blockConfig?.showScoreBreakdown !== false) {
        const tableY = contentY + 180; // Reduced spacing to fit on page
        const totalPointsScored = responseData.kpis?.totalPassed || 0;
        const totalPointsAvailable = responseData.kpis?.totalQuestions || 0;
        const totalPointsScorable = totalPointsAvailable - (responseData.kpis?.totalNA || 0);
        const totalNAQuestions = responseData.kpis?.totalNA || 0;
        const totalMissedPoints = responseData.kpis?.totalFailed || 0;
        const previousMissedPoints = context.previousResponse?.kpis?.totalFailed || 0;
        const totalNonComplianceCount = totalMissedPoints;
        
        const breakdownRows = [
            ['Score:', `${overallScore}% (${totalPointsScored}/${totalPointsScorable})`],
            ['Total Points Available:', totalPointsAvailable.toString()],
            ['Total Points Scorable:', totalPointsScorable.toString()],
            ['Total Points Scored:', totalPointsScored.toString()],
            ['Total NA Questions:', totalNAQuestions.toString()],
            ['Total Missed Points:', `${totalMissedPoints} vs ${previousMissedPoints} (Last Audit)`],
            ['Total Non Compliance Count:', totalNonComplianceCount.toString()]
        ];
        
        pdfDoc.fontSize(baseFontSize)
              .font('Helvetica')
              .fillColor(textColor);
        
        let breakdownY = tableY;
        breakdownRows.forEach(([label, value]) => {
            pdfDoc.font('Helvetica-Bold')
                  .text(label, leftColX, breakdownY, { width: colWidth });
            const valueColor = label.includes('Missed Points') && totalMissedPoints > previousMissedPoints 
                              ? dangerColor : textColor;
            pdfDoc.font('Helvetica')
                  .fillColor(valueColor)
                  .text(value, rightColX, breakdownY, { width: colWidth });
            pdfDoc.fillColor(textColor);
            breakdownY += 18; // Reduced spacing
        });
        
        currentY = breakdownY + 15; // Reduced spacing
    }
    
    // Classification table
    if (blockConfig?.showClassification !== false) {
        const classificationY = currentY + 8; // Reduced spacing
        pdfDoc.fontSize(14)
              .font('Helvetica-Bold')
              .fillColor(textColor)
              .text('Classification of Ratings', margin, classificationY);
        
        const classificationRows = [
            ['Poor', '0%-59.9%', 1],
            ['Average', '60%-74.9%', 2],
            ['Good', '75%-89.9%', 3],
            ['Excellent', '90%-100%', 4]
        ];
        
        let classY = classificationY + 25; // Reduced spacing
        for (const [label, range, stars] of classificationRows) {
            // Draw star indicator
            drawStar(pdfDoc, margin + 10, classY, 10, goldColor); // Smaller stars
            
            pdfDoc.fontSize(10) // Smaller font
                  .font('Helvetica')
                  .fillColor(textColor)
                  .text(`${label}: ${range}`, margin + 28, classY - 5);
            
            classY += 18; // Reduced spacing
        }
        
        currentY = classY + 10; // Small padding
    }
    
    // Return height used and end Y position
    return {
        height: currentY - startY,
        pageBreak: false, // Let caller decide on page break
        endY: currentY
    };
}

/**
 * Calculate rating from score
 */
function calculateRating(score) {
    if (score >= 90) return { stars: 4, label: 'Excellent' };
    if (score >= 75) return { stars: 3, label: 'Good' };
    if (score >= 60) return { stars: 2, label: 'Average' };
    return { stars: 1, label: 'Poor' };
}

/**
 * Draw donut chart
 */
async function drawDonutChart(pdfDoc, centerX, centerY, outerRadius, innerRadius, percentage, color) {
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (2 * Math.PI * percentage / 100);
    
    // Draw background circle (full)
    pdfDoc.circle(centerX, centerY, outerRadius)
          .fillColor('#E0E0E0')
          .fill();
    
    // Draw percentage arc
    pdfDoc.path(`M ${centerX} ${centerY - outerRadius}`)
          .arc(centerX, centerY, outerRadius, startAngle, endAngle)
          .lineTo(centerX, centerY)
          .closePath()
          .fillColor(color)
          .fill();
    
    // Draw inner circle (white) to create donut effect
    pdfDoc.circle(centerX, centerY, innerRadius)
          .fillColor('#FFFFFF')
          .fill();
}

/**
 * Draw star
 */
function drawStar(pdfDoc, x, y, size, color) {
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
    
    pdfDoc.path(path)
          .fillColor(color)
          .fill();
}

module.exports = renderOverallPerformanceBlock;

