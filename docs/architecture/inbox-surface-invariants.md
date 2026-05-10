# Inbox & attention surfaces (invariants)

## Purpose

- **Shell Inbox** (`/inbox`, `InboxSurface.vue`) is **workspace email only**: recent threads, triage filters, search, folder counts, optional **standalone** sends (`relatedTo.moduleKey === 'workspace'`), and per-mailbox unread when mailboxes are loaded with `includeThreadCounts`.
- **Attention** (`/platform/attention`, `AttentionSurface.vue`) is the **cross-app attention list** (tasks + events from `GET /api/inbox`). It is a **shell** sidebar row directly **below Approvals** (above the Core section), not inside the mail surface.

Together they answer: “What email is active?” and “What work needs me?” — as separate destinations.

## 1. Attention (tasks + events)

Attention aggregates work requiring user action across apps.

### What belongs

- Tasks assigned to the user
- Events that require preparation, response, or follow-up
- Overdue or time-bound responsibilities (per `docs/architecture/inbox-aggregation.md`)

### What does not belong

- Historical activity logs
- Passive events with no required action
- Raw entity lists (People, Organizations, Deals) as the primary pattern
- Workspace email threads (those belong on `/inbox`)

### UX principles

- Scannable in under a few seconds per item
- Each item answers why it appears and what click does
- Items link to their owning surface; completion routes through existing APIs

### Navigation

- Route: `/platform/attention`
- Sidebar: **Shell** surface `id: attention`, ordered after **Approvals** (same block as Home, Inbox, Approvals)

## 2. Shell Inbox (email)

### What belongs

- Workspace-wide email threads (`GET /api/communications/workspace-threads`), optional `search` query (list only; counts stay unscoped by search)
- Filters (all / unread / assigned to me), include done, reload list vs refresh counts (`GET /api/communications/workspace-thread-counts`)
- `GET /api/mailboxes?includeThreadCounts=true` for **per-mailbox unread** badges (and `allMailThreadUnread`); toggling **Done** refetches mailboxes so badges match `includeDone`; counts derive from **one** workspace summary (partition by thread mailbox id).
- **`PATCH /api/communications/threads/bulk`** for multi-select **mark done / reopen / assign to me / add tag**
- **`GET workspace-threads`** supports **`cursor`** + **`nextCursor`** for “Load more” (same bounded aggregation until DB paging exists).
- Row opens the linked record when `relatedTo` is a normal module; **`workspace`** threads open a **preview modal** (Integrations link); standalone send is gated by **`allowWorkspaceEmail`** in Communication Policy (Integrations → Email provider).

### What does not belong

- Task/event attention rows (use Attention)
- Mixing thread list with `GET /api/inbox` payloads

### Deep links

- `/inbox` — mail
- `/inbox?tab=attention` — **redirects** to `/platform/attention` for backward compatibility

## 3. Lock statement

Do not merge task/event attention back into `InboxSurface` without updating this document and the sidebar builder contract in `client/src/utils/buildSidebarFromRegistry.ts`.

Shell surfaces: Home, Inbox (mail), Approvals, **Attention**, and Search (modal-only).
