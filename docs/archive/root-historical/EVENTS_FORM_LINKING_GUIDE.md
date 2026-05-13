# How to Link Forms When Creating Audit Events

## Overview
When creating an event with an audit event type, you need to link an audit form. This guide explains how the form linking works and how to use it.

---

## Step-by-Step Instructions

### 1. Select Audit Event Type
When creating a new event, select one of the audit event types:
- **Internal Audit**
- **External Audit — Single Org**
- **External Audit Beat**

### 2. Audit Form Field Appears
Once you select an audit event type, the **"Audit Form"** field will automatically appear below the event type selection.

### 3. Forms Are Automatically Loaded
The system automatically fetches all **Active** forms from your organization. Forms are filtered to show:
- Forms with `formType: 'Audit'` (if available)
- All Active forms (as fallback if no Audit type forms exist)

### 4. Select a Form
Click the "Audit Form" dropdown and select the form you want to link to this event.

### 5. Form Is Linked
The selected form ID is stored in `linkedFormId` and will be:
- Saved with the event
- Used when opening the audit form during event execution
- Linked to form responses when the form is submitted

---

## Technical Details

### Form Fetching Logic

The system fetches forms using:
```javascript
GET /api/forms?status=Active&limit=100
```

**Filtering:**
- Primary: Shows forms with `formType: 'Audit'` if available
- Fallback: Shows all Active forms if no Audit-type forms exist
- Client-side filtering ensures relevant forms are displayed

### When Forms Are Fetched

Forms are automatically fetched when:
1. **Component mounts** - If event type is already an audit type
2. **Event type changes** - When user selects an audit event type
3. **Modal opens in edit mode** - If editing an event with linked form

### Form Requirements

For a form to appear in the dropdown:
- ✅ Form must have `status: 'Active'`
- ✅ Form must belong to your organization
- ✅ Form should ideally have `formType: 'Audit'` (optional, but recommended)

---

## UI Flow

```
1. User selects Event Type: "Internal Audit"
   ↓
2. System detects audit type selected
   ↓
3. "Audit Form" field appears (required)
   ↓
4. System fetches Active forms
   ↓
5. Forms populate in dropdown
   ↓
6. User selects a form
   ↓
7. Form ID stored in form.linkedFormId
   ↓
8. On save, linkedFormId sent to backend
```

---

## Code Implementation

### Frontend (EventFormModal.vue)

**Form Field Display:**
```vue
<div v-if="requiresAuditForm">
  <label>Audit Form <span class="text-red-500">*</span></label>
  <select v-model="form.linkedFormId" required>
    <option value="">Select Form...</option>
    <option v-for="formItem in auditForms" :value="formItem._id">
      {{ formItem.name }}
    </option>
  </select>
</div>
```

**Form Fetching:**
```javascript
const fetchForms = async () => {
  loadingForms.value = true;
  try {
    const response = await apiClient.get('/forms', { 
      params: { limit: 100, status: 'Active' } 
    });
    if (response.success) {
      const forms = response.data || [];
      // Filter to show Audit forms, or all if none found
      auditForms.value = forms.filter(form => {
        return !form.formType || 
               form.formType === 'Audit' || 
               form.formType.toLowerCase().includes('audit');
      });
      
      // Fallback: show all active forms if no audit forms
      if (auditForms.value.length === 0 && forms.length > 0) {
        auditForms.value = forms;
      }
    }
  } finally {
    loadingForms.value = false;
  }
};
```

**Auto-fetch on Event Type Change:**
```javascript
const onEventTypeChange = () => {
  // ... other logic ...
  
  // Fetch forms if audit type selected
  if (requiresAuditForm.value) {
    fetchForms();
  } else {
    // Clear forms if not audit type
    auditForms.value = [];
    form.value.linkedFormId = '';
  }
};
```

---

## Troubleshooting

### Issue: No Forms Appear in Dropdown

**Possible Causes:**
1. No Active forms exist in your organization
2. Forms exist but are in Draft or Ready status
3. Network error fetching forms

**Solutions:**
- Create a new form and set status to "Active"
- Check that forms belong to your organization
- Check browser console for errors
- Verify API endpoint is accessible

### Issue: Wrong Forms Showing

**Possible Causes:**
1. Forms don't have `formType: 'Audit'` set
2. All forms are being shown (fallback behavior)

**Solutions:**
- Set `formType: 'Audit'` when creating audit forms
- The system will show all Active forms as fallback
- This is expected behavior if no Audit-type forms exist

### Issue: Form Not Saving

**Possible Causes:**
1. Form field is required but not selected
2. Form ID is invalid
3. Backend validation failing

**Solutions:**
- Ensure a form is selected (required field)
- Check browser console for validation errors
- Verify form ID exists in database

---

## Best Practices

1. **Create Audit Forms First**
   - Create and activate audit forms before creating events
   - Set `formType: 'Audit'` for better filtering

2. **Use Descriptive Form Names**
   - Name forms clearly (e.g., "Store Audit Form", "Safety Inspection")
   - Makes selection easier when linking

3. **Keep Forms Active**
   - Only Active forms appear in dropdown
   - Archive old forms instead of deleting

4. **Test Form Linking**
   - After creating event, verify form is linked
   - Check EventDetail view shows linked form
   - Test opening form from event execution

---

## Related Features

- **Form Fill View**: `/forms/:id/fill?eventId=...` - Opens form with event context
- **Form Submission**: Automatically links form response to event
- **Audit Submission**: Uses linked form response for audit workflow
- **Event Metadata**: Stores form response IDs in `event.metadata.formResponses`

---

## API Endpoints Used

- `GET /api/forms?status=Active&limit=100` - Fetch active forms
- `POST /api/events` - Create event with `linkedFormId`
- `PUT /api/events/:id` - Update event with `linkedFormId`

---

## Summary

Form linking is **automatic** when you:
1. ✅ Select an audit event type
2. ✅ The "Audit Form" field appears
3. ✅ Forms are automatically loaded
4. ✅ Select a form from the dropdown
5. ✅ Save the event

The system handles form fetching, filtering, and linking automatically. Just select the event type and choose a form!

