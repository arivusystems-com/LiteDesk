# PeopleDetail.vue Feature Comparison

## Overview
This document compares the legacy PeopleDetail implementation (via RecordDetail/SummaryView) and ContactDetail.vue features with the new PeopleDetail.vue implementation to identify what features are available and what may be missing.

---

## 📋 Legacy Implementation (PeopleDetail.legacy.vue)

### Architecture
- **Component**: Simple wrapper around `RecordDetail.vue`
- **App Context**: Uses `PLATFORM` app key
- **Module**: `people`
- **Features**: Delegates all functionality to `RecordDetail` → `SummaryView`

### What RecordDetail/SummaryView Provides

#### 1. **Registry-Driven Configuration**
- Dynamic field definitions from app registry
- Tab-based navigation (Overview, Related Records, etc.)
- Permission-aware rendering (canView, canEdit)
- Configurable actions and related records
- Empty states and loading states

#### 2. **Header Features**
- **Follow/Unfollow Toggle**: Heart icon to follow/unfollow records
  - Visual state indication (filled heart when following)
  - Color-coded button (red when following, gray when not)
  - Toggle functionality with API integration
  
- **Tag Management**: Dropdown menu to add/remove tags
  - Tag dropdown button (blue when tags exist, gray when empty)
  - Display existing tags with remove buttons
  - "Add Tag" button opens tag modal
  - Tag modal for adding new tags
  - Tag removal with confirmation
  
- **Copy URL Link**: Button to copy record URL to clipboard
  - Copy functionality with user feedback
  - Link icon button
  
- **Lifecycle Status Dropdowns**: Dynamic status fields with color-coded badges
  - Multiple status dropdowns based on module configuration
  - Color-coded options with checkmarks for selected values
  - Dropdown menus with search/filter capability
  - Visual indicators (colored dots) for status options
  
- **Add Relation Dropdown**: Menu to add/link related records
  - Desktop: Dropdown button in header
  - Mobile/Tablet: Submenu in "More" dropdown
  - Lists available relationship types
  - "Add" button to create new related record
  - "Link" button to link existing record
  - Hidden for forms module
  
- **Quick Actions**: Edit, Delete buttons in header
  - Edit button (desktop: visible, mobile: in "More" menu)
  - Delete button (in "More" menu)
  - Permission-aware visibility

#### 3. **Tab System**
- **Summary Tab**: GridStack-based dashboard with customizable widgets
  - **GridStack Integration**: Drag-and-drop widget layout system
  - **Widget Types**: Customizable widgets that can display various data
  - **"Add Widget" Button**: Floating action button to add new widgets
  - **Widget Persistence**: Widget layout saved to localStorage per record type
  - **Responsive Grid**: Widgets automatically resize and reposition
  - **Customizable Dashboard**: Each record type can have different widget configurations
  - **Widget Container**: GridStack container with padding and background
  - **Empty State**: Shows message when form is not Active (for forms)
  
- **Details Tab**: All record fields displayed in a grid
  - **Search Functionality**: Search bar to filter fields by name/value
  - **"Show Empty Fields" Toggle**: Switch to show/hide fields without values
  - **Field Editing**: Inline field editing with DynamicFormField component
  - **Responsive Grid Layout**: 2-column grid on desktop, 1-column on mobile
  - **"Manage Fields" Button**: Link to field management settings (if user has permission)
  - **Field Types**: Supports all field data types (Text, Number, Date, Select, etc.)
  - **Special Field Handling**: Custom rendering for createdBy, images, rich text, etc.
  - **Empty State**: Shows message when no fields match search or no fields available
  
- **Updates Tab**: Activity timeline/feed
  - **Activity Log Entries**: Shows all activity for the record
  - **Activity Types**: Comments, assignments, field changes, tag changes
  - **Filters**: 
    - Filter by user (dropdown with all users who have activity)
    - Filter by type (dropdown with activity types)
    - Search query (text search across activity)
  - **Timeline Visualization**: 
    - Vertical timeline with avatars
    - Color-coded avatars based on person name
    - Timestamps and relative time display
  - **Clickable Links**: Links to related records in activity entries
  - **Activity Persistence**: 
    - API endpoint for activity logs (`/people/{id}/activity-logs`)
    - localStorage fallback if API fails
    - Activity logs stored per record type
  
- **Additional Tabs** (context-dependent):
  - **Tenant Details Tab**: For tenant organizations (shows tenant-specific fields)
  - **Preview Tab**: For forms (form preview with live rendering)
  - **Usage Tab**: For active forms (form usage statistics and submissions table)
  - **Responses Tab**: For active forms (detailed form responses with status, score, etc.)
  
- **Tab Management**:
  - Tab state persistence (active tab saved to localStorage)
  - Tab switching without page reload
  - Tab-based content organization
  - Dynamic tab configuration from registry
  - Tab names and IDs stored per record type

#### 4. **Related Records**
- Generic `RelatedRecordsRenderer` component
- Platform-level relationship management
- Required relationship validation
- Dynamic relationship configuration
- Add Relation functionality (create or link related records)

#### 5. **Modals & Popups**
- **Tag Modal**: Modal dialog for adding/editing tags
  - Input field for tag name
  - Add/Cancel buttons
  - Overlay background
  
- **Widget Management Modal**: Modal for adding widgets to GridStack dashboard
  - List of available widget types
  - Widget selection interface
  - Add/Cancel buttons
  
- **Reset Layout Confirmation Modal**: Confirmation dialog for resetting GridStack layout
  - Warning message
  - Confirm/Cancel buttons
  
- **Dependency Popup Modal**: Popup for field dependencies/triggers
  - Triggered by field changes
  - Configurable title, description, and fields
  - Form fields for dependency conditions
  - Prevents duplicate popups
  - Tracks user-initiated vs system-initiated changes

#### 6. **Edit & Delete**
- Edit via `CreateRecordDrawer` component
  - Full-featured edit drawer
  - Field validation
  - Save/Cancel actions
  
- Delete confirmation modal
  - Confirmation dialog
  - Delete/Cancel buttons
  
- Tab navigation after delete
  - Automatically switches to module list tab
  - Closes record detail tab
  - Refreshes module list

#### 7. **Permission System**
- Permission-aware rendering throughout
- **Manage Fields Button**: Only shown if user has `settings.edit` permission
- Field-level permissions (canView, canEdit)
- Action-level permissions (canDelete, canFollow, etc.)
- Permission checks for all user actions

---

## 🆕 New PeopleDetail.vue Implementation

### Architecture
- **Component**: Custom-built Vue component
- **App Context**: Supports multiple apps (SALES, HELPDESK, AUDIT, PORTAL, PROJECTS)
- **Module**: `people` with app-aware profile composition
- **API**: Uses `/people/{id}/profile` endpoint with app context resolution

### What It Provides

#### 1. **App-Aware Profile Composition**
- ✅ **Core Information Section**: Shared fields across all apps
  - Name (first_name, last_name)
  - Email, Phone, Mobile
  - Source, Organization
  - Tags, Do Not Contact flag
  - Created/Updated timestamps
  - Edit mode with inline form

- ✅ **App Participations Section**: Shows which apps person participates in
  - Displays app keys with participation types
  - "Attach to another app" functionality

- ✅ **App-Specific Sections**: Dynamic sections per app
  - SALES: type (Lead/Contact), lead_status, contact_status, role, etc.
  - Other apps: app-specific fields
  - Edit mode per app section

#### 2. **App Participation Management**
- ✅ **Attach to App Modal**: 
  - Intent selection (Sales Lead, Sales Contact, Helpdesk Contact, etc.)
  - Form fields based on participation type
  - Validation errors display
  - Prevents duplicate participations

- ✅ **Convert Lead to Contact**: 
  - Sales-specific conversion
  - Modal with warning about consequences
  - Updates person's role within Sales app

#### 3. **Core Entity Sections**
- ✅ **Notes Section**: Uses `Notes` component
  - App-aware notes
  - Create notes with permissions
  - Entity type: Person

- ✅ **Files Section**: Uses `Files` component
  - App-aware file attachments
  - Upload with permissions
  - Entity type: Person

- ✅ **Activity Timeline**: Uses `ActivityTimeline` component
  - Immutable audit stream
  - App-aware filtering
  - Auto-refresh on updates

#### 4. **Edit Capabilities**
- ✅ **Core Fields Edit**: Inline editing of core information
  - First Name, Last Name, Email, Phone, Mobile, Source
  - Do Not Contact checkbox
  - Validation (requires at least one of name/email)

- ✅ **App Fields Edit**: Per-app inline editing
  - Dynamic field forms based on app
  - Date inputs for birthday/qualification_date
  - Select dropdowns for type
  - Textareas for notes fields
  - Number inputs for scores

#### 5. **Permission System**
- ✅ **View Permissions**: `canView` per section
- ✅ **Edit Permissions**: `canEdit` per section
- ✅ **Read-only Indicators**: Shows when sections are read-only

#### 6. **UI/UX Features**
- ✅ Loading states
- ✅ Error states with retry
- ✅ Responsive layout
- ✅ Dark mode support
- ✅ Form validation
- ✅ Success/error feedback

---

## ❌ Missing Features (Compared to ContactDetail.vue)

### 1. **Related Records Widgets**

#### Missing: RelatedDealsWidget
- **What ContactDetail has**: Full widget showing deals related to contact
  - List of deals with name, amount, stage, status, probability, expected close
  - Color-coded stage badges
  - Create new deal button
  - Click to view deal details
  - Limit configurable (default: 5)

#### Missing: RelatedTasksWidget
- **What ContactDetail has**: Full widget showing tasks related to contact
  - List of tasks with title, priority, status, due date, assigned to
  - **Interactive checkboxes** to mark complete/incomplete
  - Color-coded priority and status badges
  - Create new task button
  - Click to view task details
  - Limit configurable (default: 5)

#### Missing: RelatedEventsWidget
- **What ContactDetail has**: Full widget showing events related to contact
  - Timeline view of events
  - Create new event button
  - Click to view event details
  - Limit configurable (default: 10)

#### Missing: RelatedOrganizationWidget
- **What ContactDetail has**: Widget showing organization relationship
  - Organization details display
  - View organization button
  - Link organization button
  - Unlink organization button

### 2. **Stats Dashboard**

#### Missing: Quick Stats Cards
- **What ContactDetail has**: Three stat cards showing:
  - **Deals Count**: Number of related deals
  - **Notes Count**: Number of notes
  - **Score**: Contact score value

### 3. **Profile Card Features**

#### Missing: Enhanced Profile Card
- **What ContactDetail has**:
  - Large avatar display
  - Job title display
  - Lifecycle stage badge (with projection awareness)
  - Contact methods (email, phone, mobile) as clickable cards
  - Organization link
  - Department display
  - Lead source display
  - Created date display
  - Do Not Contact warning banner
  - Tags display section

### 4. **Tab System & GridStack Dashboard**

#### Missing: Summary Tab with GridStack Widgets
- **What Legacy SummaryView has**:
  - **GridStack Dashboard**: Drag-and-drop widget layout system
  - **Customizable Widgets**: Users can add/remove/reposition widgets
  - **Widget Types**: Various widget types can be added (stats, charts, lists, etc.)
  - **Widget Persistence**: Layout saved to localStorage per record type
  - **"Add Widget" Button**: Floating action button to add new widgets
  - **Responsive Grid**: Widgets automatically resize based on screen size
  - **GridStack Library**: Uses GridStack.js for drag-and-drop functionality
  - **Widget Container**: Styled container with padding and background
  - **Per-Record-Type Layouts**: Different widget configurations for different record types

#### Missing: Details Tab
- **What Legacy SummaryView has**:
  - **Dedicated Tab**: All fields shown in a separate "Details" tab
  - **Field Search**: Search bar to filter fields by name or value
  - **Show Empty Fields Toggle**: Switch to show/hide fields without values
  - **Grid Layout**: Responsive 2-column grid for field display
  - **Field-by-Field Editing**: Each field can be edited inline
  - **Manage Fields Button**: Link to field management settings
  - **Special Field Rendering**: Custom rendering for complex fields (createdBy, images, etc.)

#### Missing: Updates Tab (Activity Timeline)
- **What Legacy SummaryView has**:
  - **Dedicated Tab**: Activity timeline in separate "Updates" tab
  - **Activity Filters**: 
    - Filter by user (dropdown)
    - Filter by activity type (dropdown)
    - Search query (text search)
  - **Timeline UI**: Vertical timeline with avatars and color coding
  - **Activity Types**: Comments, assignments, field changes, tag changes
  - **Clickable Links**: Links to related records within activity entries
  - **Activity Persistence**: API + localStorage fallback

**Note**: New PeopleDetail shows Activity Timeline inline, but without filters and not in a dedicated tab.

### 5. **Activity & Notes Section**

#### Missing: Inline Note Creation
- **What ContactDetail has**: 
  - "Add" button to create notes inline
  - Textarea form in the activity section
  - Notes list with avatars, timestamps, author names
  - Format time ago display
  - Empty state with call-to-action

**Note**: New PeopleDetail uses separate `Notes` component, which may provide similar functionality but integrated differently.

### 5. **Navigation & Actions**

#### Missing: Back Button
- **What ContactDetail has**: Back button to return to people list

#### Missing: Header Action Buttons
- **What ContactDetail has**: 
  - Edit button (opens CreateRecordDrawer)
  - Delete button (with confirmation)

**Note**: New PeopleDetail has inline edit, but no delete button or back button.

### 6. **Related Records Renderer**

#### Missing: Platform-Level Related Records
- **What ContactDetail has**: `RelatedRecordsRenderer` component
  - Shows platform-level relationships
  - Required relationship validation
  - Dynamic relationship configuration

### 7. **Edit Drawer Integration**

#### Missing: CreateRecordDrawer Integration
- **What ContactDetail has**: Uses `CreateRecordDrawer` for editing
  - Full-featured edit form
  - Consistent with other record types
  - Validation and error handling

**Note**: New PeopleDetail uses inline editing instead.

### 8. **Event Creation**

#### Missing: Event Form Drawer
- **What ContactDetail has**: `CreateRecordDrawer` for events
  - Pre-fills relatedTo with contact ID
  - Opens in drawer/modal
  - Refreshes events widget on save

---

## 🔄 Feature Parity Analysis

### ✅ Features Present in New PeopleDetail
1. Core information display and editing
2. App-specific field display and editing
3. App participation management
4. Notes (via Notes component)
5. Files (via Files component)
6. Activity timeline (via ActivityTimeline component)
7. Permission-based access control
8. Loading and error states
9. Dark mode support
10. Responsive design

### ❌ Features Missing from New PeopleDetail
1. **Tab System** - No tab-based navigation
   - ❌ **Summary Tab with GridStack Dashboard** - No customizable widget dashboard
   - ❌ **Details Tab** - No dedicated tab for viewing all fields in a grid
   - ❌ **Updates Tab** - Activity timeline is shown inline, not in a separate tab
   - ❌ **Tab State Persistence** - No tab state saved to localStorage
   - ❌ **GridStack Widgets** - No drag-and-drop customizable dashboard widgets
   - ❌ **Add Widget Functionality** - No ability to add custom widgets to dashboard

2. **Related Records Widgets**
   - ❌ **RelatedDealsWidget** - No way to see/manage related deals
   - ❌ **RelatedTasksWidget** - No way to see/manage related tasks
   - ❌ **RelatedEventsWidget** - No way to see/manage related events
   - ❌ **RelatedOrganizationWidget** - No organization relationship widget

3. **Stats Dashboard** - No quick stats cards (deals count, notes count, score)

4. **Enhanced Profile Card** - Simpler profile display, missing job title, department, lead source

5. **Navigation & Actions**
   - ❌ **Back Button** - No navigation back to list
   - ❌ **Delete Button** - No delete functionality

6. **Details Tab Features**
   - ❌ **Field Search** - No search functionality for fields
   - ❌ **Show Empty Fields Toggle** - No toggle to show/hide empty fields
   - ❌ **Manage Fields Button** - No link to field management settings
   - ❌ **Grid Layout for Fields** - Fields shown inline, not in dedicated tab with grid

7. **Activity/Updates Tab Features**
   - ❌ **Activity Filters** - No filter by user, type, or search query
   - ❌ **Activity Timeline UI** - Activity shown inline, not in dedicated Updates tab
   - ❌ **Activity Link Navigation** - No clickable links to related records in activity

8. **Header Features Missing**
   - ❌ **Follow/Unfollow Toggle** - No follow functionality (heart icon)
   - ❌ **Tag Management Dropdown** - Tags shown inline, no dropdown with add/remove
   - ❌ **Tag Modal** - No modal for adding/editing tags
   - ❌ **Copy URL Link** - No copy link button in header
   - ❌ **Lifecycle Status Dropdowns** - No dynamic status dropdowns in header
   - ❌ **Add Relation Dropdown** - No way to add/link related records from header

9. **Modals & Popups Missing**
   - ❌ **Widget Management Modal** - No modal for managing GridStack widgets
   - ❌ **Reset Layout Confirmation Modal** - No confirmation modal for resetting layouts
   - ❌ **Dependency Popup Modal** - No popup system for field dependencies/triggers

10. **Permission System**
    - ❌ **Permission-Aware UI** - Limited permission checks (only canView/canEdit per section)
    - ❌ **Manage Fields Button** - No link to field management settings (requires permission check)
    - ❌ **Action-Level Permissions** - No granular permission checks for actions (follow, tag, etc.)

11. **Other Missing Features**
    - ❌ **Inline Note Creation** - Notes handled by separate component (may be fine)
    - ❌ **Platform-Level Related Records** - No RelatedRecordsRenderer integration
    - ❌ **CreateRecordDrawer Integration** - Uses inline editing instead
    - ❌ **Event Creation Drawer** - No event creation from person detail page

---

## 🎯 Recommendations

### High Priority Missing Features
1. **Tab System**: Implement tab-based navigation (Summary, Details, Updates)
   - **Summary Tab**: GridStack dashboard with customizable widgets
   - **Details Tab**: All fields in searchable grid layout
   - **Updates Tab**: Activity timeline with filters
   
2. **Related Records Widgets**: Add RelatedDealsWidget, RelatedTasksWidget, RelatedEventsWidget
3. **Delete Functionality**: Add delete button with confirmation modal
4. **Back Navigation**: Add back button to return to people list
5. **Stats Dashboard**: Add quick stats cards for deals, notes, score

### Medium Priority Missing Features
1. **Related Organization Widget**: Add widget for organization relationship
2. **Enhanced Profile Card**: Add job title, department, lead source to profile display
3. **Platform-Level Related Records**: Integrate RelatedRecordsRenderer for platform relationships

### Low Priority / Design Decisions
1. **Inline vs Drawer Editing**: Current inline editing may be preferred over drawer
2. **Note Creation**: Separate Notes component may be preferred over inline creation
3. **Event Creation**: May be handled elsewhere in the app

---

## 📝 Summary

The new `PeopleDetail.vue` is a **significant architectural improvement** with:
- ✅ App-aware profile composition
- ✅ Multi-app participation management
- ✅ Permission-based access control
- ✅ Core entity integration (Notes, Files, Activity)

However, it's **missing several key features** from the legacy implementation:

### Critical Missing Features:
1. **Tab System**: The legacy implementation uses a tab-based interface (Summary, Details, Updates) which provides:
   - Better content organization
   - GridStack dashboard widgets (customizable, drag-and-drop)
   - Dedicated Details tab with field search and grid layout
   - Dedicated Updates tab with activity filters
   - Tab state persistence

2. **Relationship Management**: Missing widgets and features from `ContactDetail.vue`:
   - Related records widgets (Deals, Tasks, Events, Organization)
   - Quick stats dashboard
   - Delete functionality
   - Back navigation
   - Enhanced profile card details

### Architectural Differences:

**Legacy Approach (RecordDetail/SummaryView)**:
- Tab-based navigation (Summary, Details, Updates)
- GridStack dashboard widgets (customizable dashboard)
- Registry-driven configuration
- Generic, reusable across all record types
- Field search and filtering in Details tab
- Activity timeline with filters in Updates tab

**New Approach (PeopleDetail.vue)**:
- Single-page, scrollable layout
- App-aware profile composition
- Multi-app participation management
- Inline editing (no drawer)
- Sections organized by app participation
- Activity timeline shown inline (not in separate tab)

The new implementation focuses on **app participation and core information management**, while the legacy approach focuses on **tab-based organization, customizable dashboards, and relationship visualization**.

