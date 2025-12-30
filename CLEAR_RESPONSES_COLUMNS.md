# Clear Responses Table Column Settings

## Problem
The Responses list table is showing old columns instead of the new decision-focused columns.

## Solution

### Option 1: Browser Console (Quick Fix)

Open your browser's developer console (F12) and run:

```javascript
// Clear all Responses column settings
const keys = [
  'litedesk-listview-forms-columns',
  'datatable-responses-table-hidden',
  'datatable-responses-table-order',
  'datatable-responses-table-frozen',
  'litedesk-responses-columns-v2-migrated'
];
keys.forEach(key => {
  localStorage.removeItem(key);
  console.log('Cleared:', key);
});
console.log('All Responses column settings cleared. Refreshing page...');
location.reload();
```

### Option 2: Manual Clear

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find Local Storage
4. Delete these keys:
   - `litedesk-listview-forms-columns`
   - `datatable-responses-table-hidden`
   - `datatable-responses-table-order`
   - `datatable-responses-table-frozen`
   - `litedesk-responses-columns-v2-migrated`
5. Refresh the page

## Expected Columns After Clear

After clearing, you should see these 8 columns:

1. **Response ID** - Monospace font
2. **Form** - Name + Type badge (stacked)
3. **Linked To** - Entity type badge + event name
4. **Execution Status** - With "EXECUTION" label
5. **Review Status** - With "REVIEW" label  
6. **Final Score** - Large score % + compliance %
7. **Submitted By** - Avatar + name
8. **Submitted At** - Date + relative time

## Note

The code now automatically clears old column settings on mount, but if you're still seeing old columns, use the console script above to force clear them.

