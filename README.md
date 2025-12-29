# iTasks

A comprehensive IT task management system built with Next.js, TypeScript, Prisma, and PostgreSQL. Designed for IT teams to manage ongoing tasks and recurring maintenance with role-based access control, detailed audit logging, SLA tracking, and enterprise authentication.

## Overview

iTasks is an internal enterprise tool for IT task management. The system supports task creation, assignment, tracking, and reporting with comprehensive audit trails, SLA monitoring, and automated recurring task generation. The application is production-ready with enterprise-grade security controls.

![Dashboard](docs/image_examples/dashboard.png)

## Architecture

### Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js Server Actions and API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Session-based with dual support (Local + LDAP/LDAPS)
- **Email**: Nodemailer (SMTP)
- **Validation**: Zod schemas with React Hook Form
- **Icons**: Lucide React, Tabler Icons
- **Animations**: Framer Motion

### System Components

- **Authentication & Authorization**: Session-based auth with role-based access control (RBAC). Supports both local password authentication and LDAP/LDAPS integration.
- **Task Management**: Core task lifecycle management with status tracking, priority levels, SLA deadlines, and assignment workflows.
- **Recurring Tasks**: Automated task generation using cron expressions with distributed locking for multi-instance deployments.
- **Audit Logging**: Comprehensive system logs and task-level audit trails with IP address and user agent tracking.
- **Notifications**: SMTP email notifications for task assignments, SLA breaches, and due date reminders.
- **Dashboard**: Real-time statistics with polling, activity feeds, and workload visualization.
- **Reports**: Workload analysis, resolution time statistics, and asset issue tracking.

## Key Features

### Task Management

- **Task Types**: Standard, Recurring Instance
- **Statuses**: Open, In Progress, Pending Vendor, Pending User, Resolved, Closed
- **Priority Levels**: Low, Medium, High, Critical
- **SLA Tracking**: Automatic deadline calculation based on priority with breach detection
- **Task Assignment**: Mandatory assignee with role-based permission enforcement
- **Assignment Approval**: Technicians can request assignment to TeamLeads with approval workflow
- **Admin Visibility**: Admin users are hidden from non-admin selection lists for enhanced security
- **Sub-tasks**: Parent-child task relationships
- **Tags**: Categorization with string arrays
- **Subscribers**: Users can subscribe to task updates
- **Comments**: Task comments with @mention support
- **Attachments**: File uploads with size and type validation (10MB limit, whitelisted types)
- **Asset Context**: Link tasks to servers, applications, workstations, IP addresses, and other IT assets

### Authentication

- **Dual Authentication**: Local password authentication and LDAP/LDAPS integration
- **Bootstrap Admin**: First admin user protected from deletion and role demotion
- **Bootstrap Registration**: Automatic registration screen appears on first startup when no admin users exist
- **Session Management**: Opaque tokens stored in database with 7-day expiration
- **Password Security**: PBKDF2 with 310,000 iterations, SHA-256 digest
- **LDAP Features**: Auto-user creation on first login, encrypted credentials at rest, connection testing

### Recurring Tasks

- **Cron Expressions**: Full cron expression support for scheduling
- **Automatic Generation**: Background job checks daily for tasks to generate
- **Template-Based**: Reusable task templates with assignee, priority, and context
- **Distributed Locking**: PostgreSQL advisory locks prevent duplicate generation in multi-instance deployments

### Security

- **CSRF Protection**: Applied to all state-changing routes
- **Security Headers**: Comprehensive headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting**: Implemented on authentication and file upload endpoints
- **Input Validation**: Zod schema validation on all server actions and API routes
- **Secure Logging**: Sensitive data redaction in logs
- **Encrypted Secrets**: LDAP and SMTP passwords encrypted with AES-256-CBC
- **Environment Validation**: Startup validation with fail-fast behavior

### Audit & Logging

- **System Logs**: Comprehensive logging of all user actions with entity type, action type, IP address, and user agent
- **Task Audit Logs**: Complete history of task changes with old/new value tracking
- **Authentication Logging**: All login attempts (successful and failed) logged with metadata
- **Configuration Changes**: All system configuration changes tracked with actor information

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- SMTP server (optional, for email notifications)
- LDAP server (optional, for LDAP authentication)

## Getting Started

### Installation

1. Clone the repository:
```powershell
git clone https://github.com/MoshikoKar/iTasks.git
cd iTasks
```

2. Install dependencies:
```powershell
npm install
```

3. Set up environment variables:

Create a `.env` file with the following required variables:

```env
DATABASE_URL="postgresql://user:password@host:5432/itasks?schema=public"
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
ENCRYPTION_KEY="your-32-character-encryption-key-for-ldap-smtp"
NEXTAUTH_URL="http://localhost:3000"
```

**Important**: 
- `ENCRYPTION_KEY` must be at least 32 characters for AES-256 security
- `NEXTAUTH_SECRET` should be at least 32 characters
- Never commit `.env` files to version control

4. Set up the database:

```powershell
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production)
npm run db:migrate
```

5. Create an admin user:

On first startup, if no admin users exist, you will be automatically redirected to the bootstrap registration screen at `/bootstrap`. Create your first admin account there.

Alternatively, you can use the PowerShell script:

```powershell
.\create-admin-user.ps1
```

The first admin user created will automatically be marked as the bootstrap admin (protected from deletion and role demotion).

6. Start the development server:

```powershell
npm run dev
```

Or using the provided script:

```powershell
.\run-dev.ps1
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### System Configuration

System configuration is managed through the Admin Settings page (Admin role required):

- **SMTP Settings**: Configure email server for notifications
- **LDAP Settings**: Configure LDAP/LDAPS authentication
- **SLA Defaults**: Configure default SLA hours by priority
- **Support Email**: Set support contact email

### LDAP Authentication

See `docs/LDAP_SETUP.md` for detailed LDAP configuration instructions.

Key features:
- Test connection before saving
- Encrypted credentials at rest
- Auto-user creation on first login
- Bootstrap admin always uses local auth (zero lockout risk)

### SMTP Notifications

SMTP configuration supports:
- Custom host and port
- TLS/SSL support
- Encrypted password storage
- Graceful error handling if server unavailable

Notifications are sent for:
- Task assignment
- Dynamic notifications based on SLA configuration and priority (configurable percentages of remaining SLA time)
- SLA breach

### Task Assignment & Permissions

**Role Hierarchy:**
- Admin > TeamLead > Technician > Viewer

**Assignment Rules:**
- Users cannot assign tasks to users with equal or higher roles (except with approval)
- Technicians can request assignment to TeamLeads (requires approval)
- Admins can assign to anyone
- TeamLeads can assign to Technicians and Viewers in their team

**Assignment Approval Workflow:**
- When a Technician requests assignment to a TeamLead, the assignment status becomes `PENDING_APPROVAL`
- The TeamLead receives a notification and can approve or reject the request
- Approved assignments become active; rejected assignments revert to the original assignee
- All approval actions are logged in the audit trail

**Admin Visibility:**
- Admin users are completely hidden from selection lists for non-admin users
- Only Admins can see and assign tasks to other Admins
- This restriction is enforced both in the UI and backend API

## Project Structure

```
├── app/
│   ├── actions/          # Server actions (tasks, dashboard, recurring, teams, comments)
│   ├── api/              # API routes (auth, tasks, recurring, teams, users, ldap, system-config)
│   ├── tasks/            # Task pages (list, detail, my tasks)
│   │   └── [id]/
│   │       ├── actions/  # Task-specific server actions
│   │       └── page.tsx
│   ├── sla/              # SLA & Exceptions page
│   ├── recurring/        # Recurring tasks page
│   ├── reports/          # Reports page
│   ├── admin/            # Admin pages (users, teams, settings, logs)
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard
├── components/
│   ├── sidebar.tsx       # Navigation sidebar
│   ├── data-table.tsx    # Reusable data table component
│   ├── create-task-form.tsx
│   ├── recurring-task-form.tsx
│   ├── tasks-page-wrapper.tsx
│   ├── recurring-page-wrapper.tsx
│   ├── admin-page-wrapper.tsx
│   ├── ldap-config-form.tsx
│   └── ui/               # UI components
├── hooks/
│   ├── useAuth.ts        # Authentication hook
│   ├── usePolling.ts     # Polling hook
│   ├── useTaskFilters.ts # Task filtering hook
│   ├── useFormSubmission.ts
│   └── index.ts          # Barrel exports
├── lib/
│   ├── db.ts             # Prisma client singleton
│   ├── auth.ts           # Authentication helpers
│   ├── ldap.ts           # LDAP client and encryption
│   ├── smtp.ts           # SMTP configuration
│   ├── notifications.ts  # Notification logic
│   ├── cron.ts           # Cron parsing and distributed locking
│   ├── rate-limit.ts     # Rate limiting
│   ├── csrf.ts           # CSRF protection
│   ├── cache.ts          # Dashboard stats caching
│   ├── logger.ts         # Secure logging with sensitive data redaction
│   ├── env-validation.ts # Environment variable validation
│   ├── utils/
│   │   └── date.ts       # Date formatting utilities
│   ├── validation/
│   │   ├── taskSchema.ts
│   │   ├── recurringTaskSchema.ts
│   │   ├── userSchema.ts
│   │   └── index.ts
│   └── constants.ts      # Application constants
├── prisma/
│   └── schema.prisma    # Database schema
├── middleware.ts        # Authentication and security headers middleware
├── instrumentation.ts    # Recurring task scheduler initialization
├── create-admin-user.ps1
├── clear-database.ps1
├── run-dev.ps1
├── run-dev.sh
├── run-prod.ps1
└── run-prod.sh
```

## Development

### Running in Development Mode

```powershell
npm run dev
```

Or using PowerShell script:

```powershell
.\run-dev.ps1
```

Or using shell script (Linux/macOS):

```bash
./run-dev.sh
```

### Building for Production

```powershell
npm run build
npm start
```

Or using PowerShell script:

```powershell
.\run-prod.ps1
```

Or using shell script (Linux/macOS):

```bash
./run-prod.sh
```

### Database Migrations

```powershell
# Create a new migration
npm run db:migrate

# Apply schema changes (development)
npm run db:push

# Generate Prisma client
npm run db:generate

# Open Prisma Studio
npm run db:studio
```

### Linting

```powershell
npm run lint
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Create and apply migrations (production)
- `npm run db:studio` - Open Prisma Studio

## Role-Based Access Control

### Roles

- **Admin**: Full system access, user management, team management, system configuration
- **TeamLead**: Manage team members, assign tasks, view team reports
- **Technician**: Create and manage assigned tasks, view team tasks
- **Viewer**: Read-only access to tasks and reports

### Permission Hierarchy

Users cannot assign tasks to users with equal or higher permission levels:
- Admin > TeamLead > Technician > Viewer

### Bootstrap Admin

The first admin user in the system is automatically marked as the bootstrap admin:
- Cannot be deleted
- Cannot have role lowered below Admin
- Always uses local authentication (never LDAP)
- Provides break-glass access in case of LDAP issues

## Security Features

### Implemented Security Controls

- ✅ CSRF protection on all state-changing routes
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting on authentication and file uploads
- ✅ Input validation with Zod schemas
- ✅ Secure logging with sensitive data redaction
- ✅ Encrypted secrets (LDAP and SMTP passwords)
- ✅ Environment variable validation on startup
- ✅ Session management with opaque tokens
- ✅ Password hashing with PBKDF2 (310,000 iterations)
- ✅ File upload security (size limits, type whitelisting, path traversal protection)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (React default escaping)

### Security Audit Status

The system has undergone comprehensive security audits. All critical and high-priority vulnerabilities have been resolved. See `docs/SECURITY_AUDIT_FINAL.md` and `docs/FULL_AUDIT_2025.md` for details.

**Security Grade**: A (Production Ready)

## Performance

### Optimizations

- Dashboard stats caching with TTL-based expiration and automatic invalidation
- Cursor-based pagination on task lists
- Optimized database queries with proper includes and batching
- Distributed locking for cron jobs (PostgreSQL advisory locks)
- Webpack optimizations for faster development builds

### Known Limitations

- Polling uses fixed intervals (consider WebSocket for real-time updates at scale)
- Large JSON in audit logs (can be optimized by storing only changed fields)
- Client-side pagination for activity logs (consider server-side for 10,000+ entries)

## Database Schema

Key models:
- **User**: Authentication, roles, team membership
- **Task**: Core task entity with status, priority, SLA, assignment
- **TaskContext**: IT asset linking (servers, applications, workstations, etc.)
- **RecurringTaskConfig**: Templates for automated task generation
- **Comment**: Task comments with mention support
- **Attachment**: File attachments with metadata
- **AuditLog**: Task-level change history
- **SystemLog**: System-wide activity logging
- **Session**: Active user sessions
- **SystemConfig**: System configuration (SMTP, LDAP, SLA defaults)
- **Team**: Team organization
- **Mention**: User mentions in comments

See `prisma/schema.prisma` for complete schema definition.

## Documentation

Additional documentation is available in the `docs/` directory:

- `docs/LDAP_SETUP.md` - LDAP/LDAPS authentication setup guide
- `docs/LDAP_TROUBLESHOOTING.md` - LDAP troubleshooting guide
- `docs/QUICK_START.md` - Quick start guide after implementation
- `docs/SECURITY_AUDIT_FINAL.md` - Security audit report
- `docs/FULL_AUDIT_2025.md` - Comprehensive audit report
- `docs/UX_AUDIT_FINAL.md` - UX audit findings
- `docs/ARCHITECTURAL_AUDIT.md` - Architecture review
- `docs/REFACTORING_SUMMARY.md` - Refactoring improvements
- `docs/IMPLEMENTATION_SUMMARY.md` - Implementation details

## Known Issues & Limitations

### Current Limitations

- React Strict Mode disabled in development (for faster compilation)
- Some accessibility improvements needed (keyboard navigation, ARIA labels)
- Mobile responsiveness could be improved (table views)
- No offline support
- Polling-based updates (not WebSocket-based real-time)

### Design Decisions

- Files stored in `public/uploads/` directory (accessible via authenticated session)
- 7-day session timeout (internal tool, users expect persistent sessions)
- PBKDF2 with 310,000 iterations (acceptable, OWASP recommends 600k+ for future-proofing)
- Dashboard stats cached for 2 minutes with automatic invalidation

## Production Deployment

### Pre-Deployment Checklist

- [ ] Set strong `ENCRYPTION_KEY` (32+ characters)
- [ ] Set strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Configure `NEXTAUTH_URL` for production domain
- [ ] Use encrypted database connections (SSL/TLS)
- [ ] Enable HTTPS (enforced via security headers)
- [ ] Configure SMTP server for notifications
- [ ] Configure LDAP if using enterprise authentication
- [ ] Set up log aggregation and monitoring
- [ ] Document bootstrap admin credentials securely
- [ ] Test LDAP connection from production server
- [ ] Enable TLS/LDAPS for secure LDAP connection
- [ ] Review security logs and audit trail
- [ ] Backup database before deployment

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption secret
- `ENCRYPTION_KEY` - LDAP/SMTP password encryption key

Optional:
- `NEXTAUTH_URL` - Application URL (required in production)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_FROM` - Email sender address

### Monitoring

Recommended monitoring:
- Database connection health
- SMTP server availability
- LDAP server availability (if enabled)
- Failed authentication attempts
- SLA breach rates
- System log volume

## Contributing

This is an internal enterprise tool. For contributions, please follow the existing code style and patterns. Key principles:

- Use TypeScript with proper types (no `any`)
- Validate input with Zod schemas
- Use server actions for mutations
- Follow existing component patterns
- Add audit logging for state changes
- Update documentation for new features

## License

Non-Commercial License

Copyright (c) 2025 iTasks Contributors

This software is licensed under a Non-Commercial License that:
- ✅ Allows modification and private use
- ✅ Requires sharing changes with the community
- ❌ Prohibits commercial use
- ⚠️ No warranty or liability

See [LICENSE](LICENSE) file for full terms and conditions.

## Links

- Repository: [https://github.com/MoshikoKar/iTasks](https://github.com/MoshikoKar/iTasks)
