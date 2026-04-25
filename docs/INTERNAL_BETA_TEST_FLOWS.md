# Internal beta — structured test flows

Use these **end-to-end** paths instead of ad-hoc clicking. Log failures with steps to reproduce, browser, and user role.

**Prerequisites:** UAT is deployed and seeded (`npm run seed:internal-beta` in `server/` against the UAT database). See [UAT_DEV_ENVIRONMENT.md](./UAT_DEV_ENVIRONMENT.md). Login with the owner email printed by the seed (or your `INTERNAL_BETA_SEED_*` env).

**Tenant:** default slug `arivu-internal-beta` (overridable via `INTERNAL_BETA_SLUG`).

---

## A. CRM — organization → people → deal → pipeline

1. **Accounts:** Open **Sales** (or your CRM home). Open company accounts (e.g. Nimbus, Vertex, Helix from seed). Confirm industry, status, and activity show **non-empty** history.
2. **People:** Open **People**; open contacts tied to the seeded accounts. Confirm participations, tags, and **activity** on the person record.
3. **Deals:** Open **Deals**; pick “Nimbus — Fleet routing & analytics” (or any open deal). Verify amount, stage, next step, and related **contact** + **account** links.
4. **Pipeline:** Change a deal’s **stage**; save. Confirm the board/list reflects the new stage and that **Won/Lost** deals look correct (seed includes at least one closed-won path where pipeline allows it).
5. **Tasks:** Open **Tasks**; find “Send revised proposal” (and completed items). Mark an open task complete; confirm due dates and **related** record (deal/contact) when present.

**Pass:** No blank critical surfaces; stage moves persist; tasks update.

---

## B. Calendar / meetings (Sales)

1. Open **Events / Meetings** (route may vary by app shell).
2. Confirm **upcoming** meetings (Nimbus checkpoint, Vertex security session) and a **completed** past meeting (Helix MES scoping).
3. Open one event: time, location, status.

**Pass:** Seeded meetings visible; completed vs planned is clear.

---

## C. Internal audit (Audit app)

1. Switch to **Audit** and open the **events** or **audit** list (per your navigation).
2. Find **Internal — Q2 controls** (in progress / `needs_review` style) and **Internal — Data handling spot check** (closed/completed).
3. Open the scheduled internal audit: confirm `related` org context, auditor/owner, and that the record is navigable end-to-end (no 500s).

**Pass:** At least one open and one **completed** internal audit with realistic labels.

---

## D. Helpdesk (cases)

1. Open **Helpdesk** and the **Cases** list.
2. Open **SSO: Azure AD group mapping** and **Performance: list view slow** (seeded titles may vary slightly).
3. Add an internal **comment** or state change (per permissions). Confirm SLA / activity sections load without error.

**Pass:** Two cases present; details page usable.

---

## E. Form (sample QBR form)

1. In **Settings** or **Forms** (or Audit forms, depending on product layout), find **QBR — Customer health (sample)**.
2. Open the form definition: confirm **sections and questions** render.
3. If your flow supports it, open a **preview** or test submission path.

**Pass:** Form structure visible; no empty “ghost” form.

---

## F. Form → workflow / automation (if configured in org)

*If the UAT org has user-defined automations, run this. Otherwise, note “skipped — no workflow configured.”*

1. Submit or trigger the action that your team configured (e.g. new case → notification).
2. Confirm side effect: notification, job queue, or field update as designed.

**Pass:** Outcome matches automation definition.

---

## G. Dashboards and reports

*Many dashboards are **configuration-driven**. After seed, confirm default **Sales** (and any pinned) dashboard widgets load with **non-zero** or plausible empty states, not broken charts.*

1. Open the main **Sales dashboard** (or home).
2. Open **Reports** (if present) and run one saved report.
3. Note any widget that still shows “no data” **because the feature has no data model yet** and file a product gap separately from bugs.

**Pass:** No JS errors; charts/tables that depend on deals/people show data where the schema supports it.

---

## H. Notifications and reminders

1. After login, check **in-app notifications** (bell or similar).
2. If push/email is enabled in UAT, use a test address only; confirm no production recipients get mail.

**Pass:** Seeded or live-generated notifications appear; no duplicate spam from misconfigured schedulers in UAT.

---

## I. Permissions / roles

1. **As owner/admin:** complete flows A–D.
2. **As a limited user (if you create one):** repeat **read-only** steps (open deal, read case). Attempt a restricted action (e.g. delete org); expect **deny** or hidden UI, not a silent 500.

**Pass:** Role boundaries match expectations; errors are explicit where possible.

---

## J. Observability (short)

1. In UAT, cause a **harmless** frontend error in console and confirm **Sentry** receives it. See [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md).
2. Confirm PostHog shows **$pageview** and **user_logged_in** for your session.

**Pass:** Tooling is demonstrably on for UAT.

---

## Seed scope note

The internal beta script seeds: **tenant**, **people**, **company accounts**, **deals** across the **configured pipeline**, **tasks**, **meetings (events)**, **internal audit** events, **helpdesk cases**, and a **sample form**. **Workflows, dashboards, automations, and reports** often live in org-specific configuration or future modules: extend the seed in `server/scripts/seedInternalBetaData.js` as those models stabilize. There is no separate **Project** collection in this codebase at the time of writing.
