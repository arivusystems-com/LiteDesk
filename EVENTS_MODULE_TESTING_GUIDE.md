# Events Module - End-to-End Testing Guide

## Overview
This guide provides comprehensive testing steps for all Events Module enhancements including form integration, order creation, payment collection, map visualization, offline mode, and notifications.

---

## Prerequisites

1. **Backend Server Running**: Ensure the Express server is running on port 3000
2. **Frontend Running**: Ensure the Vue.js frontend is running
3. **Test User**: Have a test user account with appropriate permissions
4. **Test Organizations**: Create at least 2-3 test organizations
5. **Test Forms**: Create at least one audit form for testing

---

## Test 1: Form Integration & Audit Workflow

### Setup
1. Create an Internal Audit event
2. Link an audit form to the event
3. Ensure event status is `PLANNED`

### Steps

#### 1.1 Start Event
- Navigate to Event Detail page
- Click "Start Event" button
- **Expected**: Event status changes to `STARTED`
- **Expected**: Notification appears: "Event has been started"

#### 1.2 Check-In (GEO Required)
- If GEO is required, click "Check In"
- Allow location permissions if prompted
- **Expected**: Check-in successful with location coordinates
- **Expected**: Event status changes to `CHECKED_IN` or `IN_PROGRESS`
- **Expected**: Notification: "Check-in completed"

#### 1.3 Open Audit Form
- Click "Open Audit Form" button
- **Expected**: Form fill view opens with event context
- **Expected**: URL contains `?eventId=...`
- **Expected**: "Back to Event" button visible

#### 1.4 Fill and Submit Form
- Fill out all required form fields
- Click "Submit Form"
- **Expected**: Form submits successfully
- **Expected**: Success message displayed
- **Expected**: Auto-redirects to event after 3 seconds
- **Expected**: Form response ID stored in localStorage

#### 1.5 Submit Audit
- Return to Event Detail page
- Verify "Submit Audit" button is enabled
- Click "Submit Audit"
- **Expected**: Audit submitted successfully
- **Expected**: Event status changes to `SUBMITTED`
- **Expected**: If form has failures, status changes to `PENDING_CORRECTIVE`
- **Expected**: Notification: "Audit submitted"

#### 1.6 Verify Form Response Link
- Check event metadata in database or via API
- **Expected**: `metadata.formResponses` array contains form response ID
- **Expected**: Form response `linkedTo` field points to event

---

## Test 2: Order Creation (Field Sales Beat)

### Setup
1. Create a Field Sales Beat event
2. Set `allowedActions.orders = true`
3. Add organizations to route (multi-org) or single organization
4. Start event and check in

### Steps

#### 2.1 Open Order Creation Modal
- Click "Create Order" button
- **Expected**: Order creation modal opens
- **Expected**: Organization pre-selected (if single-org or multi-org route)

#### 2.2 Create Order
- Add order items (name, quantity, unit price)
- Add multiple items using "Add Item" button
- Verify subtotal/total calculation updates
- Add notes (optional)
- Click "Create Order"
- **Expected**: Order created successfully
- **Expected**: Modal closes
- **Expected**: Event KPI updated (orderCount, orderValue)

#### 2.3 Verify Order Data
- Check EventOrder collection in database
- **Expected**: Order record created with:
  - `eventId` linked to event
  - `organizationId` set correctly
  - `items` array with all items
  - `orderValue` matches calculated total

---

## Test 3: Payment Collection (Field Sales Beat)

### Setup
1. Use same Field Sales Beat event from Test 2
2. Set `allowedActions.payments = true`
3. Ensure event is checked in

### Steps

#### 3.1 Open Payment Modal
- Click "Collect Payment" button
- **Expected**: Payment collection modal opens
- **Expected**: Organization pre-selected

#### 3.2 Collect Payment
- Enter payment amount
- Select payment method (Cash, Card, Check, etc.)
- Enter reference number (if non-cash)
- Add notes (optional)
- Click "Collect Payment"
- **Expected**: Payment collected successfully
- **Expected**: Modal closes
- **Expected**: Payment recorded in EventOrder with `type: 'PAYMENT'`

---

## Test 4: Map Visualization

### Setup
1. Create event with `geoRequired = true`
2. Set event location with latitude/longitude
3. Start event and check in

### Steps

#### 4.1 View Map
- Navigate to Event Detail page
- Scroll to GPS Tracking Map section
- **Expected**: Map loads with Leaflet
- **Expected**: Event location marker visible
- **Expected**: Radius circle displayed (if radius set)

#### 4.2 Check-In Marker
- After checking in, verify map updates
- **Expected**: Green check-in marker appears
- **Expected**: Marker shows check-in coordinates
- **Expected**: Popup shows check-in timestamp

#### 4.3 Check-Out Marker
- After checking out, verify map updates
- **Expected**: Red check-out marker appears
- **Expected**: Polyline connects check-in and check-out points

#### 4.4 Current Location Tracking
- While event is active, verify current location updates
- **Expected**: Blue animated marker shows current location
- **Expected**: Marker updates as location changes

#### 4.5 Map Controls
- Click "Center Map" button
- **Expected**: Map zooms to fit all markers
- **Expected**: All markers visible in viewport

---

## Test 5: Offline Mode

### Setup
1. Open Event Detail page
2. Ensure event is in `STARTED` or `CHECKED_IN` state

### Steps

#### 5.1 Simulate Offline
- Open browser DevTools → Network tab
- Set to "Offline" mode
- **Expected**: Offline indicator appears in EventExecution component
- **Expected**: Message: "You are offline. Actions will be synced when connection is restored."

#### 5.2 Queue Actions Offline
- Try to check in (if not already checked in)
- **Expected**: Action queued (no error)
- **Expected**: Message: "You are offline. Check-in will be synced when connection is restored."
- **Expected**: Action stored in localStorage

#### 5.3 Verify Queue
- Check localStorage for `eventPendingActions`
- **Expected**: Array contains queued action with:
  - `type`: 'checkIn' (or other action type)
  - `eventId`: Event ID
  - `data`: Action data
  - `timestamp`: ISO timestamp

#### 5.4 Sync When Online
- Set network back to "Online"
- **Expected**: Actions automatically sync
- **Expected**: Queued actions execute
- **Expected**: Actions removed from queue after success
- **Expected**: Event data updates

#### 5.5 Event Caching
- While offline, navigate away and back
- **Expected**: Event data loads from cache
- **Expected**: Cached data displayed (may be slightly stale)

---

## Test 6: Notifications

### Setup
1. Grant browser notification permissions
2. Open Event Detail page

### Steps

#### 6.1 Browser Notifications
- Start event
- **Expected**: Browser notification appears:
  - Title: Event name
  - Body: "Event has been started"
  - Icon: Favicon

#### 6.2 In-App Notifications
- Check notification storage
- **Expected**: Notification stored in localStorage
- **Expected**: Unread count incremented

#### 6.3 Notification Types
Test each notification type:
- **Event Started**: Triggered on start
- **Check-In**: Triggered on check-in
- **Check-Out**: Triggered on check-out
- **Audit Submitted**: Triggered on audit submission
- **Event Completed**: Triggered on completion

#### 6.4 Notification Persistence
- Refresh page
- **Expected**: Notifications persist
- **Expected**: Unread count maintained

---

## Test 7: Multi-Org Route

### Setup
1. Create External Audit Beat or Field Sales Beat event
2. Add 3+ organizations to route
3. Set route sequence

### Steps

#### 7.1 Route Display
- View Event Execution component
- **Expected**: Route progress section visible
- **Expected**: All organizations listed with sequence numbers
- **Expected**: Current org highlighted

#### 7.2 Per-Org Check-In
- Click "Check In" for current organization
- **Expected**: Only current org checked in
- **Expected**: Org status changes to `IN_PROGRESS`
- **Expected**: Other orgs remain `PENDING`

#### 7.3 Move to Next Org
- Complete actions for current org
- Click "Next" button
- **Expected**: Current org status changes to `COMPLETED`
- **Expected**: Next org becomes current
- **Expected**: `currentOrgIndex` increments

#### 7.4 Route Completion
- Complete all organizations
- **Expected**: All orgs show `COMPLETED` status
- **Expected**: Event can be completed

---

## Test 8: Error Handling

### Steps

#### 8.1 Invalid Form Response
- Try to submit audit without filling form
- **Expected**: Error message: "Please fill and submit the audit form first"

#### 8.2 GEO Validation Errors
- Try to check in when outside radius
- **Expected**: Error message about being outside radius
- **Expected**: Check-in blocked

#### 8.3 Network Errors
- Simulate network failure during action
- **Expected**: Error message displayed
- **Expected**: Action queued for retry (if offline mode active)

#### 8.4 Permission Errors
- Try actions without proper permissions
- **Expected**: Appropriate error message
- **Expected**: Action blocked

---

## Test 9: Data Integrity

### Steps

#### 9.1 Form Response Linking
- Submit form from event context
- Check FormResponse document
- **Expected**: `linkedTo.type = 'Event'`
- **Expected**: `linkedTo.id = eventId`

#### 9.2 Event Metadata
- Check Event document after form submission
- **Expected**: `metadata.formResponses` array contains response ID
- **Expected**: No duplicate entries

#### 9.3 Order Linking
- Create order from event
- Check EventOrder document
- **Expected**: `eventId` matches event
- **Expected**: `organizationId` matches selected org

#### 9.4 Audit History
- Perform various actions (start, check-in, submit, etc.)
- Check `auditHistory` array
- **Expected**: Each action has audit entry
- **Expected**: Entries include timestamp, actor, action type

---

## Test 10: Performance & Edge Cases

### Steps

#### 10.1 Large Forms
- Test with form containing 50+ questions
- **Expected**: Form loads and submits without performance issues

#### 10.2 Multiple Orders
- Create 10+ orders for same event
- **Expected**: All orders saved correctly
- **Expected**: KPI calculations accurate

#### 10.3 Rapid Actions
- Perform multiple actions quickly (check-in, check-out, submit)
- **Expected**: All actions processed correctly
- **Expected**: No race conditions

#### 10.4 Concurrent Users
- Have two users work on same event
- **Expected**: Last write wins (or proper conflict resolution)
- **Expected**: No data corruption

---

## Verification Checklist

After completing all tests, verify:

- [ ] All form integrations work correctly
- [ ] Orders can be created and linked to events
- [ ] Payments can be collected
- [ ] Map displays correctly with all markers
- [ ] Offline mode queues and syncs actions
- [ ] Notifications appear for all actions
- [ ] Multi-org routes progress correctly
- [ ] Error handling works as expected
- [ ] Data integrity maintained
- [ ] Performance acceptable

---

## Common Issues & Solutions

### Issue: Form response not linking to event
**Solution**: Verify `eventId` is passed in form submission and event metadata is updated

### Issue: Map not loading
**Solution**: Check Leaflet library is loaded, verify internet connection for tile loading

### Issue: Offline actions not syncing
**Solution**: Check localStorage for `eventPendingActions`, verify sync function is called on online event

### Issue: Notifications not appearing
**Solution**: Check browser notification permissions, verify notification composable is initialized

### Issue: Multi-org route not progressing
**Solution**: Verify `currentOrgIndex` is updating, check org status transitions

---

## Test Data Examples

### Sample Event (Internal Audit)
```json
{
  "eventName": "Store Audit - Downtown Location",
  "eventType": "Internal Audit",
  "status": "PLANNED",
  "geoRequired": true,
  "linkedFormId": "<form_id>",
  "relatedToId": "<org_id>"
}
```

### Sample Order
```json
{
  "items": [
    { "name": "Product A", "quantity": 10, "unitPrice": 25.00 },
    { "name": "Product B", "quantity": 5, "unitPrice": 15.00 }
  ],
  "subtotal": 325.00,
  "total": 325.00
}
```

---

## Conclusion

After completing all tests, the Events Module should be fully functional with all enhancements working correctly. Document any issues found and their resolutions for future reference.

