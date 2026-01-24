# DEFAULT BUSINESS FLOWS — Implementation Summary

## Overview

Created default Business Flow templates that ship with the platform, enabling new customers to go live in 1 day with proven, ready-to-use end-to-end flows.

## Template Structure

All templates are stored in `/server/templates/business-flows/`:

```
templates/business-flows/
├── sales-lifecycle-flow/
│   ├── businessFlow.json
│   └── processes/
│       ├── lead_intake.json
│       ├── lead_qualification.json
│       └── deal_governance.json
├── audit-engagement-flow/
│   ├── businessFlow.json
│   └── processes/
│       ├── client_onboarding.json
│       ├── audit_scheduling.json
│       ├── audit_execution.json
│       └── closure_billing.json
└── member-lifecycle-flow/
    ├── businessFlow.json
    └── processes/
        ├── trial_conversion.json
        ├── membership_governance.json
        └── renewal_automation.json
```

## Templates Created

### 1. Sales Lifecycle Flow (Mandatory)

**Business Flow:**
- Name: "Sales Lifecycle Flow"
- Description: "End-to-end flow from Lead capture to Deal closure"
- App: SALES
- Processes: 3

**Processes:**

1. **Lead Intake Process**
   - Trigger: People created (Type = Sales Lead)
   - Actions:
     - Assign owner (role-based)
     - Send welcome WhatsApp
     - Create follow-up task

2. **Lead Qualification Process**
   - Trigger: People type changed → Sales Contact
   - Actions:
     - Create Organization
     - Create Deal
     - Notify Sales Manager

3. **Deal Governance Process**
   - Trigger: Deal stage changed
   - Actions:
     - If value > ₹10L → Request approval
     - Notify Finance on approval

### 2. Audit Engagement Flow

**Business Flow:**
- Name: "Audit Engagement Flow"
- Description: "Complete flow from client onboarding through audit execution to closure and billing"
- App: AUDIT
- Processes: 4

**Processes:**

1. **Client Onboarding Process**
   - Sets required fields (auditType, complianceOfficer)
   - Creates onboarding checklist task

2. **Audit Scheduling Process**
   - Creates audit event
   - Assigns field team
   - Notifies auditors

3. **Audit Execution Process**
   - Tracks completion
   - Triggers report generation task

4. **Closure & Billing Process**
   - Notifies Finance when audit closed

### 3. Member Lifecycle Flow

**Business Flow:**
- Name: "Member Lifecycle Flow"
   - Description: "Complete flow from lead signup through trial, membership activation, renewal, and expiry handling"
- App: SALES
- Processes: 3

**Processes:**

1. **Trial Conversion Process**
   - Converts trial to active membership
   - Sends conversion notification

2. **Membership Governance Process**
   - Handles activations
   - Creates welcome tasks

3. **Renewal Automation Process**
   - Sends renewal reminders (7 days before)
   - Handles expiry (sets status to Expired)

## Template Metadata

Each template includes:

- **Recommended apps/modules**: Which apps/modules work best with this flow
- **Editable thresholds**: Configurable values (e.g., deal value threshold)
- **"Why this exists"**: Explanation of the business value
- **Safe defaults**: All processes start as Draft, require admin review

## Backend Implementation

### Template Loader Service (`/server/services/businessFlowTemplateLoader.js`)

**Functions:**
- `listTemplates()` - Lists all available templates
- `getTemplateDetails(key)` - Gets template with process previews
- `importTemplate(key, organizationId, userId)` - Imports template (creates processes as Draft + Business Flow)

**Safety Guarantees:**
- ✅ All imported processes start as Draft
- ✅ No auto-activation
- ✅ Admin must review before enabling
- ✅ Templates never override existing processes

### API Endpoints (`/server/controllers/businessFlowTemplateController.js`)

- `GET /api/admin/business-flow-templates` - List templates
- `GET /api/admin/business-flow-templates/:key` - Get template details
- `POST /api/admin/business-flow-templates/:key/import` - Import template

## Frontend Implementation

### UI Integration (`/client/src/views/admin/BusinessFlows.vue`)

**Features:**
- "Start with Template" button in header
- Template selection modal (grid view)
- Template preview (name, description, app, process count)
- Import confirmation modal with safety notice
- Auto-navigation to imported flow after import

**User Flow:**
1. Click "Start with Template"
2. Browse available templates
3. Select template
4. Confirm import (with safety notice)
5. Template imported (all processes Draft)
6. Navigate to imported flow
7. Review and activate processes manually

## Safety & Validation

✅ **All processes start as Draft** - No auto-activation  
✅ **Admin review required** - Must manually activate  
✅ **No override** - Templates never replace existing processes  
✅ **Clear messaging** - UI shows "all processes in Draft status"  
✅ **Import confirmation** - User must confirm before import  

## Files Created/Modified

### New Files
1. `/server/templates/business-flows/sales-lifecycle-flow/businessFlow.json`
2. `/server/templates/business-flows/sales-lifecycle-flow/processes/lead_intake.json`
3. `/server/templates/business-flows/sales-lifecycle-flow/processes/lead_qualification.json`
4. `/server/templates/business-flows/sales-lifecycle-flow/processes/deal_governance.json`
5. `/server/templates/business-flows/audit-engagement-flow/businessFlow.json`
6. `/server/templates/business-flows/audit-engagement-flow/processes/*.json` (4 files)
7. `/server/templates/business-flows/member-lifecycle-flow/businessFlow.json`
8. `/server/templates/business-flows/member-lifecycle-flow/processes/*.json` (3 files)
9. `/server/services/businessFlowTemplateLoader.js`
10. `/server/controllers/businessFlowTemplateController.js`
11. `/server/routes/businessFlowTemplateRoutes.js`

### Modified Files
1. `/server/server.js` (added template routes)
2. `/client/src/views/admin/BusinessFlows.vue` (added template import UI)

## Testing Checklist

- [ ] List templates - should show 3 templates
- [ ] Get template details - should show process previews
- [ ] Import Sales Lifecycle Flow - should create 3 processes (Draft) + Business Flow
- [ ] Import Audit Engagement Flow - should create 4 processes (Draft) + Business Flow
- [ ] Import Member Lifecycle Flow - should create 3 processes (Draft) + Business Flow
- [ ] Verify all imported processes are Draft
- [ ] Verify Business Flow is created with correct processIds
- [ ] Verify no existing processes are overwritten
- [ ] Template selection modal - should show all templates
- [ ] Import confirmation - should show safety notice
- [ ] After import - should navigate to imported flow

## Notes

- **Templates are importable configs** - Not runtime logic
- **No hardcoding** - All behavior is configurable
- **Zero-config go-live** - Customers can import and go live in 1 day
- **Proven flows** - Templates reflect real-world business patterns
- **Safe defaults** - Everything starts as Draft, requires review

## Future Enhancements (Out of Scope)

- Template marketplace (community templates)
- Template versioning
- Template customization wizard
- Template preview mode (dry-run)
- Template comparison tool
