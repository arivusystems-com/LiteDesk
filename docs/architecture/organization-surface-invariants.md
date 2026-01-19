# OrganizationSurface Invariants

## Purpose

Define the rules for how Organizations appear in the product, aligned with PeopleSurface principles.

## Core Definitions

### Tenant Organization

- Identified by `isTenant: true`
- Represents workspace / subscription / platform context
- NEVER browsed as an entity
- NEVER appears in sidebar navigation
- Accessible only via workspace selector or Platform settings

### Business Organization

- Identified by `isTenant: false`
- Represents customers, partners, vendors, etc.
- Appears only as a contextual surface

## Navigation Rules

- OrganizationSurface is NOT listed in the sidebar
- Organizations are accessed via:
  - People
  - Work objects (Deals, Tickets, Audits, etc.)
  - Search
- There is no default global "Organizations" tab

## Surface Rules

OrganizationSurface MUST:

- Show business context, not platform configuration
- Be app-agnostic at the surface level
- Show app-specific data only within app sections

OrganizationSurface MUST NOT:

- Show subscription, billing, limits, or enabledApps
- Show tenant-only fields
- Act as a primary navigation destination

## Structural Sections (v1)

1. Header (business identity)
2. People linked to the organization
3. Work grouped by app (Sales, Helpdesk, Audit, etc.)
4. Business details (progressive disclosure)
5. Activity timeline

## Mental Model

- People are identities
- Work is what we do
- Organizations provide context for work

## Lock Statement

OrganizationSurface is a contextual surface.
It must never regress into an entity-browsing or CRM-style navigation model.

Any change to these rules requires updating this document first.
