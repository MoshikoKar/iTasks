# TODO.md – Permissions, Onboarding, Notifications & Cross-Platform Support

## Summary

This document tracks open, partial, and completed tasks related to:

* RBAC permission hierarchy refinements
* Task assignment approval flows
* Admin visibility restrictions
* Initial system bootstrap & onboarding
* SMTP notification logic improvements
* Cross-platform execution scripts

The goal is to improve real-world usability, security boundaries, and operational flexibility without breaking existing behavior.

---

## Category: RBAC & Permission Hierarchy

### Task 1 – Conditional Assignment Upwards (Technician → TeamLead)

**Status:** ✅ Completed
**Priority:** High

**Current State:**

* Permission hierarchy is strict:

  ```
  Admin > TeamLead > Technician > Viewer
  ```
* Users cannot assign tasks to users with equal or higher roles.

**Required Change:**

* Allow **Technicians** to assign tasks to their **TeamLead**, but:

  * The assignment must be **pending approval**
  * The task is **NOT fully assigned** until the TeamLead explicitly approves it
  * This flow is **different** from regular assignment (which does not require approval)

**Functional Requirements:**

* New assignment state: `PendingApproval`
* TeamLead receives a notification when a Technician requests assignment
* TeamLead can:

  * Approve → assignment becomes active
  * Reject → assignment is cancelled, task remains with original assignee
* Audit log must record:

  * Who requested
  * Who approved/rejected
  * Timestamp

**Additional Rule (Viewers / Secondary Contributors):**

* Technicians **ARE allowed** to add a TeamLead as:

  * Viewer
  * Secondary Contributor
* This does **NOT** require approval and does **NOT** change the assignee

**DB Check:**

* Likely required:

  * Add `assignmentStatus` enum (e.g. `ACTIVE | PENDING_APPROVAL | REJECTED`)
  * Store `requestedByUserId`
* Review impact on:

  * `Task`
  * `AuditLog`

**README Update Needed:** Yes

* Update permission hierarchy explanation
* Document approval-based assignment flow

---

### Task 2 – Admin Visibility Restrictions

**Status:** ✅ Completed
**Priority:** High

**Current State:**

* Non-admin users can see Admins in:

  * Assignee dropdown
  * Viewers / Secondary Contributors list

**Required Change:**

* Users **below Admin level**:

  * Must NOT see Admin users in:

    * Assignee lists
    * Viewers / Secondary Contributors lists
* Only Admins can:

  * See other Admins
  * Assign tasks to Admins
  * Add Admins as contributors/viewers

**Rules Summary:**

* Technician / TeamLead / Viewer:

  * Admins are completely hidden from selection lists
* Admin:

  * Full visibility and assignment capabilities

**DB Check:**

* No schema change expected
* Ensure filtering is enforced:

  * Backend (API / server actions)
  * Frontend (UI lists)
* Backend enforcement is mandatory (UI-only filtering is insufficient)

**README Update Needed:** Yes

* Clarify Admin isolation rules

---

## Category: Authentication & Bootstrap Flow

### Task 3 – Initial Admin Registration Screen (Bootstrap Only)

**Status:** ✅ Completed
**Priority:** Critical

**Current State:**

* Admin creation is done via:

  ```
  .\create-admin-user.ps1
  ```

**Required Change:**

* Add a **registration screen** that:

  * Appears **ONLY** on first application startup
  * Appears **ONLY IF** there is **NO Admin user** in the database
* After the first Admin is created:

  * The registration screen must **never appear again**
  * Not via URL
  * Not via refresh
  * Not via any navigation path

**Rules:**

* The first registered Admin:

  * Is automatically marked as `bootstrap admin`
  * Uses local authentication only
* If at least one Admin exists:

  * Registration route must be disabled or return 404

**DB Check:**

* No new tables required
* Query required on app startup:

  * `SELECT COUNT(*) WHERE role = 'Admin'`

**README Update Needed:** Yes

* Document bootstrap onboarding flow
* Clarify difference between:

  * Initial setup
  * Ongoing user management

---

## Category: Notifications & SLA Logic

### Task 4 – Dynamic SMTP Notifications Based on Priority & SLA

**Status:** ✅ Completed
**Priority:** High

**Current State:**

* Email is sent:

  * 24 hours before due date
* This fails for:

  * Critical tasks with 4-hour SLA
  * Custom organization-defined SLA values

**Required Change:**

* Notification timing must be:

  * Dynamic
  * Derived from:

    * Priority
    * SLA configuration
    * Organization-level settings
* No hardcoded values like “24 hours before”

**Expected Behavior:**

* Each priority has configurable SLA rules
* Notification offsets are calculated as:

  * Percentage of SLA
  * Or configurable thresholds (e.g. 50%, 75%, 90%)
* Example:

  * Critical (4h SLA) → notify at 2h remaining
  * High (24h SLA) → notify at 6h remaining

**DB Check:**

* Likely already partially supported via SLA config
* Verify:

  * SLA rules are accessible to notification scheduler
  * Notification timing is stored or derivable

**README Update Needed:** Yes

* Update SMTP / SLA section
* Remove static “24h before due date” wording

---

## Category: DevOps & Cross-Platform Support

### Task 5 – Linux & macOS Execution Scripts

**Status:** ✅ Completed
**Priority:** Medium

**Current State:**

* Only PowerShell scripts exist:

  * `run-dev.ps1`
  * `run-prod.ps1`

**Required Change:**

* Add equivalent scripts for:

  * Linux
  * macOS

**Required Scripts:**

* `run-dev.sh`
* `run-prod.sh`

**Requirements:**

* Same behavior as PS1 versions
* Proper environment loading
* Executable (`chmod +x`)
* No platform-specific assumptions

**DB Check:** Not required

**README Update Needed:** Yes

* Add Linux/macOS instructions
* Include execution examples

---

## Category: UI / UX / Responsive Design

### Task 6 – Full Responsive & Dynamic Layout Support (Desktop, Tablet, Mobile)

**Status:** ✅ Completed
**Priority:** Critical

**Implementation Summary:**

The following responsive improvements were implemented across the entire application:

#### Sidebar Component (`components/ui/sidebar.tsx`)
* Added responsive width handling for tablet (240px) vs desktop (280px)
* Implemented proper touch interaction for tablet mode with click-to-toggle
* Enhanced mobile sidebar with backdrop overlay and smooth slide animation
* Added escape key and body scroll lock for mobile menu
* Improved touch targets with proper sizing (min 44px)

#### Global CSS Utilities (`app/globals.css`)
* Added `.responsive-card-grid` - auto-adjusting grid from 1 to 4 columns
* Added `.responsive-stat-grid` - stat cards with 1-5 column support
* Added `.responsive-two-col` - two-column layouts that stack on mobile
* Added `.flex-card` utilities for cards that maintain aspect ratio
* Added `.touch-target` for minimum touch target sizing
* Added `.responsive-table-container` for horizontal scroll on small screens
* Added smooth transitions for main content area on sidebar toggle

#### Layout (`app/layout.tsx`)
* Updated main content padding to be responsive (p-3 to p-6)
* Added `main-content-area` class for smooth sidebar transitions
* Ensured proper overflow handling to prevent horizontal scroll

#### Dashboard (`components/dashboard/dashboard-content.tsx`, `stat-card.tsx`)
* Updated stat cards with responsive padding and font sizes
* Improved analytics widget grid from fixed to responsive columns
* Added truncation and proper min-width handling for card titles
* Reduced card heights on mobile (260px) vs desktop (340px)

#### Admin Users Page (`components/admin-users-page.tsx`)
* Converted users table to mobile card layout for screens < 768px
* Made header and action buttons full-width on mobile
* Improved team cards grid to 1-3 columns based on viewport
* Added touch-friendly button sizing

#### Reports Page (`components/reports-client.tsx`)
* Made header actions wrap responsively
* Added horizontally scrollable tab navigation on mobile
* Updated all chart containers with responsive heights
* Improved filter panel layout for mobile

#### Modal Component (`components/modal.tsx`)
* Added max-height constraint with scroll
* Made header sticky for better UX on long forms
* Reduced padding on mobile
* Improved close button touch target

#### Header & Footer (`components/header.tsx`, `components/footer.tsx`)
* Made notification button touch-friendly
* Improved footer layout to wrap on small screens
* Reduced font sizes on mobile

---

### Implemented Features

#### Layout & Grid Behavior ✅
* Card count per row is now dynamic based on available width
* Layout reflows automatically with screen size and sidebar state
* No fixed card widths - all using responsive grid logic
* Sidebar toggle triggers smooth layout recalculation

#### Breakpoints ✅
* Mobile (< 640px): 1-2 columns, overlay sidebar
* Tablet (640px-1024px): 2-3 columns, collapsible sidebar
* Desktop (> 1024px): 3-4+ columns, hover-expand sidebar

#### Sidebar Interaction ✅
* Smooth 0.2s transition on expansion/collapse
* Cards and sections resize smoothly without distortion
* No text clipping or overflow on toggle

#### Orientation Support ✅
* All layouts work in both portrait and landscape
* Tested for tablet and mobile orientations

#### Cards & Components ✅
* Cards maintain proper proportions at all sizes
* Internal scrolling for overflow content
* Buttons have minimum touch target size (44px)
* Tables switch to card layout on mobile or use horizontal scroll

---

### DB Check

* Not required ✅

---

### README Update Needed

**Completed** - The application now supports:
* Desktop (1024px+)
* Tablet (640px-1024px)
* Mobile (< 640px)
* Portrait and Landscape orientations

---

## Completed Tasks

* ✅ Task 1: Conditional Assignment Upwards (Technician → TeamLead) - Implemented PendingApproval state, approval flow, and audit logging
* ✅ Task 2: Admin Visibility Restrictions - Hidden Admin users from non-admin selection lists in user search and task assignment
* ✅ Task 3: Initial Admin Registration Screen (Bootstrap Only) - Added bootstrap registration screen that appears only when no admin users exist
* ✅ Task 4: Dynamic SMTP Notifications Based on Priority & SLA - Replaced hardcoded 24-hour notifications with dynamic SLA-based timing
* ✅ Task 5: Linux & macOS Execution Scripts - Added run-dev.sh and run-prod.sh scripts with equivalent functionality to PowerShell versions
* ✅ Task 6: Full Responsive & Dynamic Layout Support - Implemented comprehensive responsive design across all pages including sidebar, dashboard, admin, reports, and all card-based layouts

---

## Global Notes

* All permission rules must be enforced server-side
* UI behavior must reflect backend truth
* All changes must be covered by audit logging
* No breaking changes to existing Admin flows

---

**Last Updated:** 29-12-2025 (All tasks completed)
**Owner:** MoshikoKar
