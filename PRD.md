# Project Specification: iTasks (חיבור של IT+Tasks)

## 1. Project Overview
Build a comprehensive iTasks platform (חיבור של IT+Tasks) designed for IT teams. The system manages ongoing tasks, recurring maintenance, and incidents. It features role-based access control, detailed audit logging, SLA tracking, and local SMTP notifications.

**Target Architecture:**
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn/UI (for rapid, professional components).
- **Backend:** Next.js Server Actions (or separate Node.js/Express if preferred), Prisma ORM.
- **Database:** PostgreSQL.
- **Tools:** Lucide React (icons), Recharts (for dashboard charts), React-Hook-Form + Zod (validation).

---

## 2. Core Data Entities & Database Schema

### Users & Roles
* **Roles:** `Admin`, `Team Lead`, `Technician`, `Viewer`.
* **Fields:** ID, Name, Email, Role, PasswordHash, CreatedAt.

### Tasks
* **Types:** `Standard`, `Recurring_Instance`, `Incident`.
* **Status:** `Open`, `In Progress`, `Pending (Vendor/User)`, `Resolved`, `Closed`.
* **Priority:** `Low`, `Medium`, `High`, `Critical`.
* **Fields:**
    * Title, Description (Rich Text).
    * DueDate (DateTime).
    * SLA_Deadline (DateTime, calculated).
    * CreatorID (User).
    * AssigneeID (User - Mandatory, default to Creator on creation).
    * Subscribers (Many-to-Many Users).
    * Tags (Array of Strings).
    * ParentTaskID (Self-relation for Sub-tasks).

### Asset/Context Linking (Crucial)
Allow linking a task to specific IT entities. Use a JSONB column or a related table `TaskContext`:
* **Fields:**
    * Server Name / Hostname.
    * Application Name.
    * Workstation ID.
    * User (Active Directory user related to ticket).
    * Environment (`Prod`, `Staging`, `Test`).
    * IP Address.
    * Manufacturer / Vendor.
    * Version.

### Recurring Tasks Config
* **Logic:** Defines the template for generating tasks automatically.
* **Fields:** Frequency (Cron string or interval), LastGeneratedAt, NextGenerationAt, TemplateData (Title, priority, assignee).

### Audit Log
* **Trigger:** ANY create, update, delete, status change, or assignment change.
* **Fields:** TaskID, ActorID (Who), ActionType, OldValue, NewValue, Timestamp.

### Attachments & Comments
* **Comments:** TaskID, UserID, Content, Timestamp.
* **Attachments:** FilePath, FileType (Screenshot, Log, Dump), UploadedBy.

---

## 3. Business Logic Requirements

1.  **Task Assignment:** A task must always have an assignee. Defaults to creator. Admin/Lead can reassign.
2.  **SLA Logic:** System highlights tasks approaching `SLA_Deadline`.
    * *Logic:* If `Now > SLA_Deadline` AND Status != `Resolved/Closed` -> Mark as Breach.
3.  **Recurring Tasks:** A background job (e.g., Cron) checks `RecurringConfigs` daily. If `NextGenerationAt` is today, clone the template into a new Task (Type: `Recurring_Instance`) and update `NextGenerationAt`.
4.  **Notifications (SMTP):**
    * **Config:** Connect to a remote mail server on Local LAN, Port 25. No Auth/StartTLS (unless specified otherwise in env vars).
    * **Trigger:** 24h before DueDate, on SLA Breach, and on Assignment.
5.  **Search:** Full-text search on Title, Description, and linked Assets (IP, Server name).

---

## 4. Frontend & UI Architecture (Strict Layout)

### Global Layout
* **Sidebar Navigation:**
    1.  Dashboard
    2.  My Tasks
    3.  All Tasks
    4.  SLA & Exceptions
    5.  Incidents
    6.  Recurring Tasks
    7.  Reports
    8.  Knowledge Base (Optional)
    9.  Admin (Settings)

### Page Specifications

#### 1. Dashboard (Main View)
* **Status Cards (Clickable filters):**
    * `Open Tasks` (Count)
    * `My Tasks` (Count)
    * `Overdue` (Count, Red)
    * `SLA Breaches` (Count, Red)
    * `Critical Tasks` (Count)
* **Section: "My Day" (Brief):** Top 5-7 tasks assigned to current user (Due Today OR Overdue). Link to full "My Tasks".
* **Section: Critical & Incidents:** List of high-severity items with "Time Open" counter.
* **Section: Recent Activity:** Last 5-10 actions in the system (e.g., "User X closed task Y").

#### 2. My Tasks (Technician Daily View)
* **Default Filter:** `Assignee = CurrentUser`.
* **Quick Filters (Tabs/Pills):** `Today`, `Overdue`, `Waiting`, `High/Critical`.
* **Actions:** Quick status toggle, click row to open details.

#### 3. All Tasks (Manager View)
* **Component:** High-density Data Table.
* **Columns:** Status, Priority, Due Date, SLA, Asset Context (Server/App), Title, Assignee.
* **Features:** Advanced Filtering (by any column), Saved Views, Export to CSV/PDF.

#### 4. SLA & Exceptions
* **Focus:** Only tasks `Overdue` OR `Approaching SLA`.
* **Sort:** By Severity first, then Time remaining.
* **Grouping:** By Team/Technician.

#### 5. Recurring Tasks
* **View:** Table of Recurring Configs.
* **Columns:** Name, Frequency, Last Run, Next Run, Status of last instance (Did it fail?).
* **Visuals:** Indicator if the last generated task was NOT completed.

#### 6. Incidents
* **Condition:** If no incidents exist, show empty state.
* **View:** Timeline view of critical outages/issues. Link to related Sub-tasks.

#### 7. Reports
* **Charts:**
    * Workload per Technician (Bar chart).
    * Average Resolution Time (Line chart).
    * Most Frequent Asset issues (e.g., "Server X has 10 tickets").

---

## 5. Non-Functional Requirements
1.  **Security:** Secure session management (Auth.js or equivalent).
2.  **Performance:** Dashboard must load under 1s. Use React Server Components where possible.
3.  **Reliability:** SMTP failures should be logged but should not crash the application.
4.  **Error Handling:** Graceful UI error states (Toasts).
5. **Data Freshness:** The Dashboard and Incident views should implement "swr" or polling every 30-60 seconds to fetch new data automatically without manual page refresh.