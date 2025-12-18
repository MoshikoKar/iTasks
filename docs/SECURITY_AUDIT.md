# Security Audit Report - iTasks Application

**Date:** 2024  
**Auditor:** Senior Security Engineer & DevSecOps Specialist  
**Application Type:** Internal Enterprise Tool (Intranet)  
**Audit Type:** Static Application Security Testing (SAST)

---

## Executive Summary

**Security Grade: C+**

This audit identified **1 Critical vulnerability**, **3 High-risk issues**, and several **Medium/Low-risk** concerns. The application demonstrates **good security fundamentals** (strong password hashing, RBAC implementation, Prisma ORM protection against SQL injection), but has **critical authorization gaps** in server actions and **missing input validation** that pose significant insider threat risks.

### Key Findings Summary

- ✅ **Strengths:** Strong password hashing (PBKDF2), RBAC framework, Prisma ORM, no XSS risks
- 🔴 **Critical:** IDOR vulnerability in `createTask` - users can create tasks on behalf of others
- 🟠 **High:** Missing Zod validation in server actions, file upload security gaps, sensitive data in logs
- 🟡 **Medium:** Console logging, file storage location, missing file size limits

---

## 1. Critical Vulnerabilities

### 🔴 CRITICAL-001: Insecure Direct Object Reference (IDOR) in `createTask`

**Location:** `app/actions/tasks.ts:49-160`

**Issue:**
The `createTask` server action accepts `creatorId` as a parameter without validating that it matches the authenticated user. An authenticated user can create tasks on behalf of any other user by simply passing a different `creatorId`.

```typescript
export async function createTask(data: {
  // ... other fields
  creatorId: string;  // ⚠️ No validation against authenticated user
  // ...
}) {
  // No check: if (data.creatorId !== authenticatedUser.id) throw error
  const task = await db.task.create({
    data: {
      creatorId: data.creatorId,  // ⚠️ Trusts client-provided creatorId
      // ...
    },
  });
}
```

**Impact:**
- **Insider Threat:** A Technician can create tasks appearing to be from an Admin or TeamLead
- **Audit Trail Corruption:** System logs will show incorrect creator attribution
- **Data Leakage:** Users can see tasks they shouldn't by manipulating creatorId
- **Escalation:** Lower-privilege users can bypass assignment restrictions

**Exploitation:**
```javascript
// Attacker (Technician) creates task as Admin
await createTask({
  title: "Sensitive Task",
  description: "...",
  creatorId: "admin-user-id-here",  // ⚠️ Forged
  assigneeId: "admin-user-id-here",
  // ...
});
```

**Recommendation:**
```typescript
export async function createTask(data: {
  // Remove creatorId from parameters
  // ...
}) {
  const user = await requireAuth();  // Get authenticated user
  const task = await db.task.create({
    data: {
      creatorId: user.id,  // ✅ Always use authenticated user
      // ...
    },
  });
}
```

**Priority:** **P0 - Fix Immediately**

---

## 2. High-Risk Vulnerabilities

### 🟠 HIGH-001: Missing Input Validation in Server Actions

**Location:** `app/actions/*.ts` (all server actions)

**Issue:**
Zod validation schemas exist (`lib/validation/taskSchema.ts`, `userSchema.ts`, `recurringTaskSchema.ts`) but are **not used** in server actions. Server actions accept raw, unvalidated input from clients.

**Affected Functions:**
- `createTask()` - No validation of title length, description, priority enum, UUIDs
- `updateTask()` - No validation of partial updates
- `addComment()` - No validation of content length or taskId format
- All other server actions

**Impact:**
- **Data Corruption:** Invalid data can be stored (e.g., 10,000 character titles)
- **Type Confusion:** Wrong enum values, invalid UUIDs can cause runtime errors
- **DoS Potential:** Extremely long strings could impact database performance
- **Business Logic Bypass:** Invalid enum values might bypass validation

**Example:**
```typescript
// Current (VULNERABLE):
export async function createTask(data: {
  title: string;  // ⚠️ No length validation
  priority?: TaskPriority;  // ⚠️ No enum validation
  // ...
}) {
  // Directly uses data without validation
}

// Should be:
export async function createTask(data: unknown) {
  const user = await requireAuth();
  const validated = createTaskSchema.parse({
    ...data,
    creatorId: user.id,  // Override with authenticated user
  });
  // Use validated data
}
```

**Recommendation:**
1. Add Zod validation to all server actions
2. Use `.safeParse()` for better error handling
3. Return user-friendly validation errors

**Priority:** **P1 - Fix Within 1 Week**

---

### 🟠 HIGH-002: File Upload Security Gaps

**Location:** `app/api/attachments/route.ts:9-90`

**Issues:**
1. **No File Size Limits:** Unlimited file uploads can cause DoS
2. **No File Type Validation:** Malicious files (`.exe`, `.sh`, `.php`) can be uploaded
3. **Files Stored in Public Directory:** Uploaded files are accessible via direct URL (`/uploads/{taskId}/{filename}`)
4. **Path Traversal Risk:** Filename sanitization exists but may not cover all edge cases

**Current Implementation:**
```typescript
// ⚠️ No size check
const bytes = await file.arrayBuffer();
const buffer = Buffer.from(bytes);
await writeFile(filePath, buffer);  // ⚠️ No type validation

// Files stored in public directory
const uploadsDir = join(process.cwd(), "public", "uploads", taskId);
```

**Impact:**
- **DoS:** Large files can exhaust disk space
- **Malware Distribution:** Executable files can be uploaded and shared
- **Information Disclosure:** Files accessible without authentication via direct URL
- **Storage Exhaustion:** No cleanup mechanism for old files

**Recommendation:**
```typescript
// 1. Validate file size (e.g., 10MB max)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: "File too large" }, { status: 400 });
}

// 2. Whitelist allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
}

// 3. Store files outside public directory
const uploadsDir = join(process.cwd(), "uploads", taskId);  // Not in "public"

// 4. Serve files via authenticated API endpoint
// app/api/attachments/[id]/download/route.ts
```

**Priority:** **P1 - Fix Within 1 Week**

---

### 🟠 HIGH-003: Sensitive Data Exposure in Logs

**Location:** Multiple files with `console.error()` statements

**Issue:**
`console.error()` statements throughout the codebase may log sensitive information including:
- Full error objects (which may contain user data, stack traces with file paths)
- LDAP configuration details (though passwords are redacted)
- Database errors (which may expose schema structure)

**Examples:**
```typescript
// app/api/users/route.ts:54
console.error("Error fetching users:", error);  // ⚠️ May contain user data

// lib/ldap.ts:284-292
console.log('[LDAP] Configuration loaded:', {
  host: config.host,  // ⚠️ Exposes LDAP server details
  port: config.port,
  baseDn: config.baseDn,
  // ...
});

// app/actions/tasks.ts:44
console.error("Error calculating SLA deadline:", error);  // ⚠️ Full error object
```

**Impact:**
- **Information Disclosure:** Error logs may contain user emails, IDs, or system details
- **Debugging Information Leakage:** Stack traces expose file paths and code structure
- **Compliance Issues:** PII may be logged in violation of data protection regulations

**Recommendation:**
1. Use structured logging library (e.g., `winston`, `pino`)
2. Sanitize error messages before logging
3. Redact sensitive fields (emails, IDs, passwords)
4. Use log levels appropriately (error vs. debug)
5. In production, ensure logs are not accessible to unauthorized users

**Example:**
```typescript
import logger from '@/lib/logger';

// Instead of:
console.error("Error fetching users:", error);

// Use:
logger.error("Error fetching users", {
  error: error.message,  // Only message, not full object
  userId: user?.id ? '[REDACTED]' : undefined,
});
```

**Priority:** **P1 - Fix Within 2 Weeks**

---

## 3. Medium-Risk Issues

### 🟡 MEDIUM-001: Missing RBAC Check in `createTask` API Route

**Location:** `app/api/tasks/route.ts:77-136`

**Issue:**
The API route validates assignment permissions but doesn't verify that the authenticated user matches `creatorId` (if provided). While the route enforces assignment rules, it still allows `creatorId` to be set arbitrarily.

**Current Code:**
```typescript
export async function POST(request: NextRequest) {
  const currentUser = await requireAuth();
  const body = await request.json();
  
  // ✅ Validates assignment permissions
  // ⚠️ But doesn't validate creatorId matches currentUser.id
  const task = await createTask(body);  // Passes body.creatorId directly
}
```

**Impact:**
- Same as CRITICAL-001 but at API route level
- Defense-in-depth failure

**Recommendation:**
```typescript
// Override creatorId with authenticated user
const task = await createTask({
  ...body,
  creatorId: currentUser.id,  // ✅ Always use authenticated user
});
```

**Priority:** **P2 - Fix Within 1 Month**

---

### 🟡 MEDIUM-002: System Config API Returns Full Configuration

**Location:** `app/api/system-config/route.ts:8-33`

**Issue:**
The GET endpoint returns the entire `SystemConfig` object, including fields like `smtpPassword` and `ldapBindPassword` (though these are encrypted at rest). While encrypted, exposing the structure and presence of these fields is unnecessary.

**Current Code:**
```typescript
export async function GET() {
  await requireRole([Role.Admin]);  // ✅ Admin-only
  const config = await db.systemConfig.findUnique({
    where: { id: "system" },
  });
  return NextResponse.json(config);  // ⚠️ Returns full config including password fields
}
```

**Impact:**
- **Information Disclosure:** Reveals system configuration structure
- **Defense-in-Depth:** Even if encrypted, passwords shouldn't be returned

**Recommendation:**
```typescript
return NextResponse.json({
  ...config,
  smtpPassword: config.smtpPassword ? '[ENCRYPTED]' : null,
  ldapBindPassword: config.ldapBindPassword ? '[ENCRYPTED]' : null,
});
```

**Priority:** **P2 - Fix Within 1 Month**

---

### 🟡 MEDIUM-003: No Input Validation on Recurring Task API Routes

**Location:** `app/api/recurring/route.ts`, `app/api/recurring/[id]/route.ts`

**Issue:**
Recurring task API routes accept JSON body without Zod validation. Cron expressions, task priorities, and other fields are not validated before database operations.

**Impact:**
- Invalid cron expressions can cause runtime errors
- Invalid enum values can bypass business logic
- No length validation on task names/descriptions

**Recommendation:**
Use `createRecurringTaskSchema` and `updateRecurringTaskSchema` from `lib/validation/recurringTaskSchema.ts`.

**Priority:** **P2 - Fix Within 1 Month**

---

### 🟡 MEDIUM-004: File Upload Path Traversal Risk

**Location:** `app/api/attachments/route.ts:45`

**Issue:**
Filename sanitization uses basic regex replacement but may not cover all path traversal attempts.

**Current Code:**
```typescript
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
```

**Potential Issues:**
- Unicode characters in filenames
- Multiple dots (e.g., `../../etc/passwd.txt`)
- Long filenames causing filesystem issues

**Recommendation:**
```typescript
import path from 'path';

// More robust sanitization
const sanitizedFileName = path.basename(file.name)
  .replace(/[^a-zA-Z0-9.-]/g, "_")
  .substring(0, 255);  // Limit length

// Additional check: ensure no path traversal
if (sanitizedFileName.includes('..') || path.isAbsolute(sanitizedFileName)) {
  throw new Error("Invalid filename");
}
```

**Priority:** **P2 - Fix Within 1 Month**

---

## 4. Low-Risk Issues & Best Practices

### 🟢 LOW-001: Console.log Statements in Production

**Location:** Multiple files (174 instances found)

**Issue:**
Many `console.log()` and `console.error()` statements exist. While `next.config.js` has `removeConsole: process.env.NODE_ENV === 'production'`, this only removes `console.log`, not `console.error`.

**Recommendation:**
- Replace with structured logging
- Ensure all console statements are removed in production build
- Use environment-based log levels

**Priority:** **P3 - Fix When Convenient**

---

### 🟢 LOW-002: Session Cookie Configuration

**Location:** `app/api/auth/login/route.ts:50-56`

**Current:**
```typescript
response.cookies.set(SESSION_COOKIE, user.id, {
  httpOnly: true,  // ✅ Good
  sameSite: "lax",  // ✅ Good
  secure: process.env.NODE_ENV === "production",  // ✅ Good
  path: "/",
  maxAge: 60 * 60 * 24 * 7,  // 7 days
});
```

**Status:** ✅ **Well Configured**

**Minor Suggestion:**
Consider shorter session timeout for internal tools (e.g., 8 hours) or implement session refresh mechanism.

---

### 🟢 LOW-003: Password Hashing Implementation

**Location:** `lib/auth.ts:10-17`

**Current:**
- Algorithm: PBKDF2 with SHA-256
- Iterations: 310,000 (✅ Excellent - OWASP recommends 600,000+ but 310k is acceptable)
- Key Length: 32 bytes (256 bits)
- Salt: 16 bytes random

**Status:** ✅ **Strong Implementation**

**Minor Suggestion:**
Consider increasing iterations to 600,000+ for future-proofing, but current implementation is secure.

---

## 5. Positive Security Findings

### ✅ Strengths Identified

1. **No SQL Injection Risk**
   - Uses Prisma ORM exclusively
   - Only `$queryRaw` used for health checks (safe, no user input)
   - Parameterized queries by default

2. **No XSS Risks**
   - No `dangerouslySetInnerHTML` found in codebase
   - React's default escaping protects against XSS

3. **RBAC Implementation**
   - Role-based access control implemented throughout
   - `requireRole()` helper function used consistently
   - Admin, TeamLead, Technician, Viewer roles properly enforced

4. **Middleware Protection**
   - `middleware.ts` protects all routes except public paths
   - Session validation on every request
   - Proper redirect to login for unauthenticated users

5. **Password Security**
   - Strong hashing algorithm (PBKDF2)
   - Timing-safe comparison (`crypto.timingSafeEqual`)
   - Passwords never returned in API responses

6. **Audit Logging**
   - Comprehensive system logging via `SystemLog` model
   - Tracks user actions, task changes, permission changes
   - Persists even after entity deletion

7. **Bootstrap Admin Protection**
   - `isBootstrapAdmin` flag prevents permission reduction
   - Bootstrap admin cannot be deleted
   - Prevents complete system lockout

---

## 6. Recommendations for Internal Enterprise Tools

### Insider Threat Mitigation

1. **Implement Data Loss Prevention (DLP)**
   - Monitor large file downloads
   - Alert on bulk data exports
   - Track access to sensitive tasks

2. **Enhanced Audit Logging**
   - Log all failed authorization attempts
   - Track IP addresses for sensitive operations
   - Implement log retention policies

3. **Role-Based Data Filtering**
   - Ensure TeamLeads can only see their team's data
   - Implement data segregation at database level
   - Review RBAC filters in dashboard queries

4. **Session Management**
   - Implement session timeout warnings
   - Force re-authentication for sensitive operations
   - Track concurrent sessions per user

5. **Input Validation**
   - **Critical:** Implement Zod validation in all server actions
   - Validate all enum values
   - Enforce string length limits
   - Sanitize user inputs before storage

6. **File Upload Security**
   - Implement file size limits (recommended: 10MB)
   - Whitelist allowed file types
   - Scan uploaded files for malware (if budget allows)
   - Store files outside public directory
   - Serve files via authenticated API endpoints

7. **Error Handling**
   - Never expose stack traces to users
   - Sanitize error messages before logging
   - Use structured logging with log levels
   - Implement log rotation and retention

---

## 7. Remediation Priority

### Immediate (P0) - Fix Today
1. ✅ **CRITICAL-001:** Fix IDOR in `createTask` - Override `creatorId` with authenticated user

### High Priority (P1) - Fix Within 1 Week
1. ✅ **HIGH-001:** Add Zod validation to all server actions
2. ✅ **HIGH-002:** Implement file upload security (size limits, type validation, move out of public)

### Medium Priority (P2) - Fix Within 1 Month
1. ✅ **HIGH-003:** Replace console.error with structured logging
2. ✅ **MEDIUM-001:** Fix API route creatorId validation
3. ✅ **MEDIUM-002:** Redact passwords in system config API
4. ✅ **MEDIUM-003:** Add validation to recurring task routes
5. ✅ **MEDIUM-004:** Improve filename sanitization

### Low Priority (P3) - Fix When Convenient
1. ✅ **LOW-001:** Replace remaining console.log statements
2. ✅ Consider shorter session timeouts
3. ✅ Increase PBKDF2 iterations to 600k+

---

## 8. Testing Recommendations

### Security Testing Checklist

1. **Authorization Testing**
   - [ ] Test IDOR vulnerability in `createTask`
   - [ ] Verify users cannot access tasks outside their team
   - [ ] Test role escalation attempts
   - [ ] Verify bootstrap admin protection

2. **Input Validation Testing**
   - [ ] Test with extremely long strings
   - [ ] Test with invalid enum values
   - [ ] Test with malformed UUIDs
   - [ ] Test with SQL injection attempts (should be blocked by Prisma)

3. **File Upload Testing**
   - [ ] Test with files > 10MB
   - [ ] Test with executable files (.exe, .sh, .php)
   - [ ] Test path traversal in filenames (`../../etc/passwd`)
   - [ ] Verify files are not accessible without authentication

4. **Session Management Testing**
   - [ ] Test session expiration
   - [ ] Test concurrent sessions
   - [ ] Verify session cookies are httpOnly and secure

5. **Error Handling Testing**
   - [ ] Verify error messages don't expose sensitive data
   - [ ] Test error logging doesn't include PII
   - [ ] Verify stack traces are not returned to clients

---

## 9. Compliance Considerations

### Data Protection
- ✅ Passwords are hashed (not encrypted, which is correct for passwords)
- ⚠️ Ensure error logs don't contain PII (address HIGH-003)
- ✅ Audit logging is comprehensive
- ⚠️ File uploads may contain sensitive data - ensure proper access controls

### Access Control
- ✅ RBAC implemented
- ⚠️ Fix IDOR vulnerability (CRITICAL-001)
- ✅ Session management is secure
- ⚠️ File access controls need improvement (HIGH-002)

---

## 10. Conclusion

The iTasks application demonstrates **solid security fundamentals** with strong password hashing, RBAC implementation, and protection against common vulnerabilities (SQL injection, XSS). However, **critical authorization gaps** and **missing input validation** pose significant risks, especially for an internal tool where insider threats are a primary concern.

**Key Action Items:**
1. **Immediately** fix the IDOR vulnerability in `createTask`
2. **Within 1 week** implement Zod validation in all server actions
3. **Within 1 week** secure file uploads (size limits, type validation, access controls)
4. **Within 2 weeks** replace console.error with structured logging

With these fixes, the security grade would improve to **B+** or **A-**.

---

**Report Generated:** 2024  
**Next Review:** After remediation of P0 and P1 issues
