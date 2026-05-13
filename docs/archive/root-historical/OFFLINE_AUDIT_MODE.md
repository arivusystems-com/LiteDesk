# Offline Audit Mode Documentation

## Overview

The Audit App includes offline-first PWA support, enabling auditors to work in the field without a constant internet connection. This document describes how offline mode works, its limitations, and how to use it effectively.

## Core Principles

### ⚠️ Critical Rules

1. **Offline mode is a UX buffer, not an execution engine**
   - No audit state transitions occur offline
   - No approve/reject actions offline
   - All offline actions are queued and replayed when online

2. **CRM is always the single source of truth**
   - The backend validates and decides all state changes
   - Audit App never assumes success
   - All queued actions are replayed in order when syncing

3. **No silent background sync**
   - User must explicitly trigger sync
   - All sync errors are surfaced to the user
   - No automatic retry loops

## What Works Offline

### ✅ Read Operations

- **View audit list**: Cached assignments are available offline
- **View audit details**: Full audit information including form schemas
- **View timeline**: Historical timeline entries are cached
- **Fill forms**: Form responses can be saved locally (future enhancement)

### ✅ Queued Actions

- **CHECK_IN**: Check-in actions are queued with geo data (if available)
- **SUBMIT**: Form submissions are queued for later sync

## What Never Works Offline

### ❌ Blocked Operations

- **Approve/Reject**: Requires online connection (workflow logic)
- **Corrective workflows**: Requires server-side validation
- **User/org management**: Requires authentication
- **Any CRM mutation**: Must go through sync engine

## How It Works

### 1. Service Worker

The service worker (`/public/service-worker.js`) handles:
- Caching static assets (Cache First)
- Caching `/api/audit/*` GET requests (Stale-While-Revalidate)
- **Never caching** `/api/*` CRM routes

### 2. IndexedDB Storage

Four main stores:

#### `audit_assignments` (Read Cache)
- Cached list of assigned audits
- Updated when online and syncing
- Used when offline to display audit list

#### `audit_details` (Read Cache)
- Full audit detail including form schemas
- Updated when viewing audit details online
- Used when offline to view audit information

#### `audit_timeline` (Read Cache)
- Timeline entries for each audit
- Updated when viewing timeline online
- Used when offline to show audit history

#### `offline_actions` (Write Buffer)
- Queued actions waiting to sync
- Append-only (actions are never modified)
- Cleared after successful sync

### 3. Offline Queue

The queue service (`offlineQueue.js`) manages:
- **Enqueueing actions**: CHECK_IN and SUBMIT actions
- **Preventing duplicates**: No duplicate CHECK_IN for same event
- **FIFO execution**: Actions sync in order they were created

### 4. Sync Engine

The sync engine (`auditSyncEngine.js`) handles:
- **Manual sync only**: User must trigger sync
- **FIFO replay**: Actions executed in order
- **Stop on failure**: First failure stops sync
- **Error surfacing**: All CRM errors shown to user

## User Experience

### Offline Indicators

1. **Global Offline Banner**
   - Red banner at top of screen when offline
   - Shows "You're offline — changes will sync later"
   - Displays pending action count

2. **Saved Locally Badge**
   - Yellow badge on audit header when actions are queued
   - Shows "Saved locally" status

3. **Sync Status Drawer** (Mobile)
   - Bottom sheet accessible from top bar
   - Shows pending action count
   - "Sync Now" button (only when online)
   - Error details if sync fails

### Button States

| State | Behavior |
|-------|----------|
| **Online** | Normal operation |
| **Offline** | Actions are queued, "Saved locally" shown |
| **Syncing** | All buttons disabled, spinner shown |
| **Failed** | Retry button visible, error message shown |

### Action Flow

#### Check-In (Offline)

1. User taps "Check In"
2. Location permission requested (if available)
3. Action queued in IndexedDB
4. "Saved locally" badge appears
5. User sees confirmation: "Check-in saved locally. It will sync when you're back online."

#### Submit (Offline)

1. User taps "Submit Audit"
2. Action queued in IndexedDB
3. "Saved locally" badge appears
4. User sees confirmation: "Submission saved locally. It will sync when you're back online."

#### Approve/Reject (Offline)

1. User taps "Approve" or "Reject"
2. Button is disabled (grayed out)
3. Alert shown: "Approve/Reject requires an online connection. Please check your connection and try again."

#### Sync Process

1. User taps "Sync Now" (or comes back online)
2. UI locks (read-only mode)
3. Actions replayed in FIFO order
4. First failure stops sync
5. Success summary shown
6. Server state refreshed

## Safety Guards

### Sync Abort Conditions

Sync will abort if:
- Audit already closed remotely
- Ownership changed (user no longer has access)
- State mismatch (audit state changed on server)

### Error Handling

- **409 Conflict**: "Audit state has changed. Please refresh and try again."
- **403 Forbidden**: "You no longer have access to this audit."
- **Network errors**: Queued actions remain, user can retry

## Testing Checklist

### ✅ Must Pass

- [ ] Start audit → go offline → progress saved
- [ ] Close app → reopen → data retained
- [ ] Submit offline → action queued
- [ ] Reconnect → manual sync works
- [ ] CRM rejects → error shown
- [ ] Audit closed remotely → sync blocked
- [ ] Logout → offline data cleared
- [ ] Approve/Reject disabled offline
- [ ] No duplicate CHECK_IN queued
- [ ] FIFO sync order maintained

## Troubleshooting

### Issue: Actions not syncing

**Solution**: 
1. Check online status (banner should disappear)
2. Open sync drawer and check for errors
3. Try "Sync Now" button
4. Check browser console for errors

### Issue: Data not persisting

**Solution**:
1. Check browser IndexedDB support
2. Check browser storage permissions
3. Clear browser cache and retry

### Issue: Sync fails with 409/403

**Solution**:
1. Refresh audit detail page
2. Check if audit state changed
3. Check if you still have access
4. Remove failed action from queue (if needed)

## Technical Details

### Service Worker Scope

- **Scope**: `/audit/*` only
- **Registration**: Automatic on audit routes
- **Cache Strategy**: Stale-While-Revalidate for GET requests

### IndexedDB Schema

```javascript
// audit_assignments
{
  eventId: string (key),
  assignmentId: string,
  auditType: string,
  auditState: string,
  scheduledAt: ISO string,
  dueAt: ISO string,
  lastSyncedAt: ISO string
}

// audit_details
{
  eventId: string (key),
  assignment: object,
  event: object,
  executionContext: object,
  lastSyncedAt: ISO string
}

// audit_timeline
{
  eventId: string (key),
  entries: array,
  lastSyncedAt: ISO string
}

// offline_actions
{
  id: number (auto-increment key),
  type: 'CHECK_IN' | 'SUBMIT',
  eventId: string,
  payload: object,
  status: 'PENDING' | 'SYNCED' | 'FAILED',
  retryCount: number,
  createdAt: ISO string,
  syncedAt?: ISO string,
  errorMessage?: string
}
```

### API Integration

#### Read APIs (Offline Support)

```javascript
// Prefer IndexedDB when offline
if (isOffline) {
  const cached = await getAuditDetail(eventId);
  return cached;
}

// Online: Fetch and cache
const response = await apiClient.get(`/audit/assignments/${eventId}`);
await saveAuditDetail(eventId, response.data);
```

#### Write APIs (Queue When Offline)

```javascript
// If offline, queue action
if (isOffline) {
  await enqueueAction('CHECK_IN', eventId, locationData);
  return;
}

// Online: Execute immediately
await apiClient.post(`/audit/execute/${eventId}/check-in`, locationData);
```

## Future Enhancements

### Not Implemented (By Design)

- ❌ Background auto-sync
- ❌ Offline approvals
- ❌ CRM state replication
- ❌ Dual state machines
- ❌ Silent conflict resolution
- ❌ Form response caching (future)

### Potential Future Features

- Form response local storage
- Offline photo capture
- Batch sync with progress
- Conflict resolution UI

## Support

For issues or questions:
1. Check browser console for errors
2. Verify IndexedDB is supported
3. Check network connectivity
4. Review sync drawer for error details

---

**Last Updated**: Phase 7D Implementation
**Version**: 1.0.0

