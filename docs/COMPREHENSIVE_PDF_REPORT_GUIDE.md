# Comprehensive PDF Report Generation Guide

## Overview

The Comprehensive PDF Report feature generates world-class audit reports similar to professional hotel audit reports. These reports include multiple pages with detailed analysis, charts, tables, and visualizations.

## Features

### Report Pages

1. **Cover Page** - Header with audit information, hotel details, and metadata
2. **Overall Performance Score** - Donut chart, star rating, score breakdown, and classification
3. **Executive Summary** - Narrative summary of the audit experience
4. **Top 5 / Bottom 5 Scoring Areas** - Tables showing highest and lowest performing departments
5. **Department Breakdown** - Detailed score breakdown with historical comparison
6. **Non-Compliance Counts** - Department-wise non-compliance tracking with change indicators
7. **Brand Ranking** - Ranking visualization compared to other audits
8. **Brand Standards Reports** - Detailed audit tables with Yes/No/N/A answers, comments, and attachments

## API Endpoint

### Generate Comprehensive Report

**POST** `/api/forms/:formId/responses/:responseId/generate-comprehensive-report`

#### Request Body

```json
{
  "templateConfig": {
    "companyName": "GUEST DELIGHT INTERNATIONAL",
    "hotelName": "Orchid Hotel - The Orchid Mumbai",
    "address": "Mumbai, Maharashtra, India, 987654",
    "generalManager": "Ravi Rai",
    "checkInDate": "2024-12-12",
    "checkOutDate": "2024-12-14",
    "round": "1st Round 2024",
    "benchmarkScore": 80,
    "executiveSummary": "Custom executive summary text...",
    "executiveSummaryDetails": [
      "Additional paragraph 1...",
      "Additional paragraph 2..."
    ],
    "colors": {
      "primary": "#FF6B35",
      "secondary": "#004E89",
      "success": "#4CAF50",
      "danger": "#F44336",
      "gold": "#FFD700"
    }
  },
  "includeComparison": true,
  "previousResponseId": "previous-response-id-here"
}
```

#### Response

```json
{
  "success": true,
  "message": "Comprehensive report generated successfully",
  "data": {
    "reportUrl": "/api/uploads/{organizationId}/reports/comprehensive-report-{auditId}-{timestamp}.pdf",
    "responseId": "response-id",
    "formId": "form-id",
    "generatedAt": "2024-12-15T10:30:00.000Z"
  }
}
```

## Template Configuration

### Default Template

If no `templateConfig` is provided, the system uses default values:

- **companyName**: "GUEST DELIGHT INTERNATIONAL"
- **hotelName**: Form name (from response)
- **address**: Empty string
- **generalManager**: Empty string
- **checkInDate**: Response submittedAt date
- **checkOutDate**: Response submittedAt date
- **round**: "1st Round 2024"
- **benchmarkScore**: 80
- **executiveSummary**: Auto-generated based on response data
- **colors**: Predefined color scheme

### Customization Options

#### Company/Brand Information
- `companyName`: Company or brand name
- `logo`: Path to logo image file (future feature)
- `hotelName`: Name of the hotel/location being audited
- `address`: Physical address
- `generalManager`: General manager name

#### Audit Information
- `checkInDate`: Audit start date
- `checkOutDate`: Audit end date
- `round`: Audit round identifier (e.g., "1st Round 2024")

#### Scoring Configuration
- `benchmarkScore`: Target score (default: 80)

#### Executive Summary
- `executiveSummary`: Custom summary text (auto-generated if not provided)
- `executiveSummaryDetails`: Array of additional paragraphs

#### Colors
- `colors.primary`: Primary brand color (default: #FF6B35 - Orange)
- `colors.secondary`: Secondary brand color (default: #004E89 - Dark blue)
- `colors.success`: Success/green color (default: #4CAF50)
- `colors.danger`: Error/red color (default: #F44336)
- `colors.gold`: Gold color for stars (default: #FFD700)

## Report Structure

### Overall Performance Page

- **Donut Chart**: Visual representation of overall score
- **Star Rating**: 1-4 stars based on score
  - 1 star: Poor (0%-59.9%)
  - 2 stars: Average (60%-74.9%)
  - 3 stars: Good (75%-89.9%)
  - 4 stars: Excellent (90%-100%)
- **Score Breakdown Table**: Detailed metrics
- **Performance History Chart**: Historical audit scores

### Department Breakdown

Shows:
- Current audit score
- Previous audit score (if comparison enabled)
- Percentage change
- Pass/Fail counts

### Non-Compliance Counts

Tracks:
- Previous audit non-compliance count
- Current audit non-compliance count
- Change indicator (highlighted in red if increased)

### Brand Standards Reports

Detailed tables for each department/section:
- Question serial numbers
- Audit standards
- Yes/No/N/A answers (color-coded)
- Comments
- Scores
- Attachment indicators

## Comparison Feature

Enable comparison with previous audits:

```json
{
  "includeComparison": true,
  "previousResponseId": "previous-response-id"
}
```

This adds:
- Previous audit scores in department breakdown
- Change indicators (↑/↓)
- Non-compliance comparison
- Historical trend visualization

## Usage Examples

### Basic Report Generation

```javascript
// Frontend example
const response = await fetch(
  `/api/forms/${formId}/responses/${responseId}/generate-comprehensive-report`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  }
);

const result = await response.json();
// Access PDF at: result.data.reportUrl
```

### Customized Report

```javascript
const response = await fetch(
  `/api/forms/${formId}/responses/${responseId}/generate-comprehensive-report`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      templateConfig: {
        companyName: "My Company",
        hotelName: "Grand Hotel",
        address: "123 Main St, City, Country",
        generalManager: "John Doe",
        benchmarkScore: 85,
        colors: {
          primary: "#1A237E",
          success: "#00C853"
        }
      }
    })
  }
);
```

### Report with Comparison

```javascript
const response = await fetch(
  `/api/forms/${formId}/responses/${responseId}/generate-comprehensive-report`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      includeComparison: true,
      previousResponseId: "previous-response-id"
    })
  }
);
```

## File Storage

Generated PDFs are stored at:
```
server/uploads/{organizationId}/reports/comprehensive-report-{auditId}-{timestamp}.pdf
```

Access via:
```
/api/uploads/{organizationId}/reports/{filename}
```

## Future Enhancements

- [ ] Logo image support in header
- [ ] Image attachment embedding in PDF
- [ ] Custom page templates
- [ ] Template storage in database
- [ ] Scheduled report generation
- [ ] Email delivery of reports
- [ ] Multi-language support
- [ ] Custom chart types
- [ ] Interactive PDF features

## Troubleshooting

### PDF Generation Fails

1. Check that `pdfkit` is installed: `npm list pdfkit`
2. Verify uploads directory permissions
3. Check organizationId is valid
4. Review server logs for detailed error messages

### Missing Data in Report

1. Ensure form response has complete data
2. Verify section scores are calculated
3. Check that KPIs are populated
4. Validate form structure has sections and questions

### Template Not Applied

1. Verify templateConfig structure matches expected format
2. Check color values are valid hex codes
3. Ensure dates are in valid format
4. Review validation errors in response

## Support

For issues or questions, please refer to:
- Technical documentation: `/docs/TECHNICAL_SPEC.md`
- Form module documentation: `/docs/FORMS_MODULE_IMPLEMENTATION_PLAN.md`

