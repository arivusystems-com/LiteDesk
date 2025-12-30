# Events Form Activation Update

## Decision
Show both **Ready** and **Active** forms in the event creation form dropdown. When a **Ready** form is linked to an event, it automatically changes status from **Ready** to **Active**.

---

## Implementation

### Frontend Changes

**`client/src/components/events/EventFormModal.vue`**:

1. **Updated `fetchForms()` function**:
   - Now fetches all forms (no status filter)
   - Filters client-side to show only **Ready** and **Active** forms
   - Sorts forms: Active first, then Ready
   - Shows status indicator in dropdown

2. **Updated dropdown display**:
   - Shows "(Ready - will activate)" for Ready forms
   - Shows "(Active)" for Active forms
   - Helps users understand that Ready forms will be activated

### Backend Changes

**`server/controllers/eventController.js`**:

1. **Updated `createEvent()` function**:
   - Checks if `linkedFormId` is provided
   - If form status is "Ready", automatically changes to "Active"
   - Updates form's `modifiedBy` field
   - Logs the activation for audit trail

2. **Updated `updateEvent()` function**:
   - Checks if `linkedFormId` is being changed
   - If new form status is "Ready", automatically activates it
   - Handles form activation on event updates

---

## Code Changes

### Frontend: Form Fetching

```javascript
const fetchForms = async () => {
  loadingForms.value = true;
  try {
    // Fetch all forms (no status filter)
    const response = await apiClient.get('/forms', { params: { limit: 100 } });
    if (response.success) {
      const allForms = response.data || [];
      
      // Filter to show only Ready and Active forms
      const readyAndActiveForms = allForms.filter(form => 
        form.status === 'Ready' || form.status === 'Active'
      );
      
      // Filter by formType if available
      auditForms.value = readyAndActiveForms.filter(form => {
        return !form.formType || 
               form.formType === 'Audit' || 
               form.formType.toLowerCase().includes('audit');
      });
      
      // Sort: Active forms first, then Ready forms
      auditForms.value.sort((a, b) => {
        if (a.status === 'Active' && b.status === 'Ready') return -1;
        if (a.status === 'Ready' && b.status === 'Active') return 1;
        return 0;
      });
    }
  } finally {
    loadingForms.value = false;
  }
};
```

### Backend: Form Activation on Event Creation

```javascript
// In createEvent function
if (eventData.linkedFormId) {
    const Form = require('../models/Form');
    const linkedForm = await Form.findOne({
        _id: eventData.linkedFormId,
        organizationId: req.user.organizationId
    });
    
    if (linkedForm && linkedForm.status === 'Ready') {
        // Automatically activate the form when linked to an event
        linkedForm.status = 'Active';
        linkedForm.modifiedBy = req.user._id;
        await linkedForm.save();
        console.log(`Form ${linkedForm._id} automatically activated from Ready to Active`);
    }
}
```

### Backend: Form Activation on Event Update

```javascript
// In updateEvent function
if (req.body.linkedFormId && req.body.linkedFormId !== currentEvent.linkedFormId?.toString()) {
    const Form = require('../models/Form');
    const linkedForm = await Form.findOne({
        _id: req.body.linkedFormId,
        organizationId: req.user.organizationId
    });
    
    if (linkedForm && linkedForm.status === 'Ready') {
        // Automatically activate the form when linked to an event
        linkedForm.status = 'Active';
        linkedForm.modifiedBy = req.user._id;
        await linkedForm.save();
        console.log(`Form ${linkedForm._id} automatically activated from Ready to Active`);
    }
}
```

---

## User Experience

### Before
- Only Active forms shown in dropdown
- Ready forms not available for selection
- Users had to manually activate forms before linking

### After
- Both Ready and Active forms shown
- Ready forms clearly marked with "(Ready - will activate)"
- Automatic activation when form is linked
- No manual activation step required

---

## Workflow

```
1. User creates/edits event
   ↓
2. Selects audit event type
   ↓
3. Audit Form dropdown shows Ready + Active forms
   ↓
4. User selects a Ready form
   ↓
5. Event is saved/updated
   ↓
6. Backend automatically activates Ready form
   ↓
7. Form status changes: Ready → Active
   ↓
8. Form is now Active and linked to event
```

---

## Benefits

1. **Streamlined Workflow**: No need to manually activate forms before linking
2. **Better UX**: Users can see all available forms (Ready + Active)
3. **Automatic Activation**: Ready forms become Active when used
4. **Clear Indication**: Dropdown shows which forms will be activated
5. **Audit Trail**: Form activation is logged with user who linked it

---

## Testing Checklist

- [ ] Create event with Ready form → Verify form becomes Active
- [ ] Create event with Active form → Verify form stays Active
- [ ] Update event to link Ready form → Verify form becomes Active
- [ ] Update event to link Active form → Verify form stays Active
- [ ] Dropdown shows both Ready and Active forms
- [ ] Status indicators display correctly
- [ ] Forms sorted correctly (Active first)

---

## Files Modified

- ✅ `client/src/components/events/EventFormModal.vue` - Form fetching and display
- ✅ `server/controllers/eventController.js` - Form activation logic

---

## Status: **COMPLETE** ✅

Both Ready and Active forms are now shown, and Ready forms automatically activate when linked to events.

