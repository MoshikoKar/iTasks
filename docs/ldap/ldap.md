# LDAP / LDAPS Authentication

## Setup Guide

### Overview

This system supports dual authentication modes:
- **Local Authentication**: Traditional username/password stored in the database
- **LDAP Authentication**: Enterprise directory integration (Active Directory, OpenLDAP, etc.)

### Key Features

- ✅ Dual authentication support (local + LDAP)
- ✅ Bootstrap admin protection (cannot be deleted or demoted)
- ✅ Auto-creation of LDAP users on first login
- ✅ Encrypted LDAP credentials at rest
- ✅ Test connection before saving
- ✅ Full audit logging of authentication and configuration changes
- ✅ Zero lockout risk - bootstrap admin always uses local auth

### Installation

#### 1. Install Dependencies

```powershell
npm install ldapts
```

#### 2. Push Database Schema Changes

```powershell
npx prisma db push
npx prisma generate
```

#### 3. Mark First Admin as Bootstrap Admin

Run the SQL migration against your database:

```sql
-- Mark the first admin (by creation date) as bootstrap admin
UPDATE "User"
SET "isBootstrapAdmin" = true
WHERE id = (
  SELECT id 
  FROM "User" 
  WHERE role = 'Admin' 
  ORDER BY "createdAt" ASC 
  LIMIT 1
);
```

Or use the provided script:

```powershell
psql $env:DATABASE_URL -f scripts/migrate-bootstrap-admin.sql
```

#### 4. Set Encryption Key (Production)

Add to your `.env` file:

```env
ENCRYPTION_KEY=your-32-character-secret-key-here-change-this
```

⚠️ **Important**: Use a strong, random 32-character key in production!

#### 5. Restart the Development Server

```powershell
npm run dev
```

### Configuration

#### Access LDAP Configuration

1. Log in as an Admin user
2. Navigate to **Admin Settings**
3. Click **Configure** on the **LDAP / LDAPS Authentication** card

#### Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Enable LDAP Authentication** | Master switch for LDAP | ✓ |
| **LDAP Host** | Hostname or IP of LDAP server | `ldap.company.com` |
| **Port** | LDAP port (389 or 636) | `389` |
| **Use TLS/LDAPS** | Enable secure connection | ✓ for 636 |
| **Base DN** | Base Distinguished Name for searches | `dc=company,dc=com` |
| **Bind DN** | Service account DN for binding | `cn=admin,dc=company,dc=com` |
| **Bind Password** | Service account password | `••••••••` |
| **User Search Filter** | LDAP filter to find users | `(uid={{username}})` |
| **Username Attribute** | Attribute containing username | `uid` or `sAMAccountName` |
| **Enforce LDAP** | Force LDAP auth (except bootstrap admin) | ❌ Optional |

#### Common LDAP Configurations

**Active Directory**

```
Host: ad.company.com
Port: 389 (or 636 for LDAPS)
Use TLS: Yes (recommended)
Base DN: dc=company,dc=com
Bind DN: cn=service-account,cn=Users,dc=company,dc=com
User Search Filter: (sAMAccountName={{username}})
Username Attribute: sAMAccountName
```

**OpenLDAP**

```
Host: ldap.company.com
Port: 389 (or 636 for LDAPS)
Use TLS: Yes (recommended)
Base DN: ou=users,dc=company,dc=com
Bind DN: cn=admin,dc=company,dc=com
User Search Filter: (uid={{username}})
Username Attribute: uid
```

#### Testing Connection

1. Fill in all required fields
2. Click **Test Connection** button
3. Wait for result (green = success, orange = failure)
4. If successful, click **Save Configuration**

⚠️ **Important**: Always test the connection before saving!

### Authentication Flow

#### Login Process

1. User enters email and password
2. System checks if user exists locally
3. If local user found → verify password
4. If not local user and LDAP enabled → try LDAP auth
5. If LDAP auth succeeds:
   - Create user in database (if first login)
   - Default role: `Viewer` (Admin must promote)
   - Sync name and email from LDAP

#### User Management

**Local Users**
- Created manually by Admin
- Password stored as hash in database
- `authProvider = local`

**LDAP Users**
- Auto-created on first successful login
- Password NOT stored (validated via LDAP)
- `authProvider = ldap`
- Name/email synced from LDAP attributes

**Bootstrap Admin**
- First admin user in the system
- Always uses local authentication
- Cannot be deleted via UI
- Cannot have role lowered below Admin
- `isBootstrapAdmin = true`

### Security Considerations

#### Encryption

- LDAP bind password encrypted at rest using AES-256-CBC
- Encryption key from `ENCRYPTION_KEY` environment variable
- Passwords never returned to frontend

#### Audit Logging

All LDAP-related actions are logged:
- Configuration changes (who, when, what changed)
- Successful logins (user, IP, timestamp)
- Failed login attempts
- User auto-creation from LDAP

View logs in **Admin Settings → Recent Activity**

#### Best Practices

1. **Use TLS/LDAPS**: Always enable secure connection in production
2. **Strong Bind Password**: Use a dedicated service account with minimal permissions
3. **Test Before Save**: Always test connection before saving configuration
4. **Monitor Logs**: Regularly review authentication logs
5. **Backup Bootstrap Admin**: Document bootstrap admin credentials securely
6. **Rotate Encryption Key**: Change `ENCRYPTION_KEY` and re-encrypt credentials periodically

### Troubleshooting (Quick Reference)

#### Cannot Connect to LDAP Server

- Verify host and port are correct
- Check firewall allows outbound LDAP traffic
- Ensure TLS certificate is valid (if using LDAPS)
- Test with `ldapsearch` from command line

#### User Not Found

- Verify Base DN is correct
- Check User Search Filter syntax
- Ensure service account has read permissions
- Test filter with actual LDAP tools

#### Authentication Fails

- Verify user exists in LDAP directory
- Check password is correct
- Ensure user DN can bind to LDAP
- Review LDAP server logs

#### Bootstrap Admin Cannot Login

- Bootstrap admin ALWAYS uses local auth
- Verify email/password in database
- Check `isBootstrapAdmin = true` in database
- Never relies on LDAP even if enforced

### Migration from Local to LDAP

1. **Keep Local Users**: Existing local users continue to work
2. **Enable LDAP**: Configure LDAP settings without enforcing
3. **Test**: Have users try logging in with LDAP credentials
4. **Verify**: Check auto-created users in Admin panel
5. **Promote**: Change LDAP user roles as needed
6. **Enforce** (Optional): Enable "Enforce LDAP" to disable local auth (except bootstrap admin)

### API Endpoints

**Get LDAP Configuration**
```
GET /api/ldap/config
Auth: Admin only
Returns: LDAP settings (password excluded)
```

**Update LDAP Configuration**
```
POST /api/ldap/config
Auth: Admin only
Body: LDAP configuration fields
Returns: Success/error
```

**Test LDAP Connection**
```
POST /api/ldap/test
Auth: Admin only
Body: LDAP configuration to test
Returns: Success/error message
```

### Support

For issues or questions:
- Check system logs in Admin panel
- Review Recent Activity for authentication errors
- Verify LDAP server is operational
- Contact system administrator

---

**Last Updated**: 21-12-2025

---

## Detailed Troubleshooting Guide

### Common Error: "Invalid credentials" or Bind Failures

#### Error: `000004DC: LdapErr: DSID-0C090CE5, comment: In order to perform this operation a successful bind must be completed`

**Cause**: Service account bind is failing, or connection is being reused incorrectly.

**Solution**: 
1. Verify service account credentials are correct
2. Check that Bind DN format matches your AD configuration
3. Ensure the service account is enabled and not locked

---

### Step-by-Step Debugging

#### 1. Verify Service Account Credentials

Test the service account manually:

```powershell
# Using PowerShell
$username = "your-service-account@domain.com"
$password = "your-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://your-dc.domain.com", $username, $password)
$ldap.distinguishedName  # Should return DN if successful
```

#### 2. Check User Search Filter

For **Active Directory**, the default should be:
```
User Search Filter: (sAMAccountName={{username}})
Username Attribute: sAMAccountName
```

For **OpenLDAP**, use:
```
User Search Filter: (uid={{username}})
Username Attribute: uid
```

#### 3. Verify User Can Be Found

Test if the user exists in LDAP:

```powershell
# PowerShell - Search for user
$searcher = New-Object System.DirectoryServices.DirectorySearcher
$searcher.Filter = "(sAMAccountName=testuser)"
$searcher.SearchRoot = "LDAP://dc=domain,dc=com"
$result = $searcher.FindOne()
$result.Properties["distinguishedName"]
```

#### 4. Test User Password

Verify the user's password works:

```powershell
$userDn = "CN=Test User,CN=Users,DC=domain,DC=com"
$password = "user-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://your-dc.domain.com", $userDn, $password)
$ldap.distinguishedName  # Should succeed if password is correct
```

---

### Configuration Checklist

#### For Active Directory:

- [ ] **Host**: Domain controller hostname or IP
- [ ] **Port**: 389 (LDAP) or 636 (LDAPS)
- [ ] **Use TLS**: Yes (recommended)
- [ ] **Base DN**: `dc=company,dc=com` (auto-generated from domain)
- [ ] **Bind DN**: Use auto-discovery or `username@domain.com` format
- [ ] **User Search Filter**: `(sAMAccountName={{username}})`
- [ ] **Username Attribute**: `sAMAccountName`

#### For OpenLDAP:

- [ ] **Host**: LDAP server hostname or IP
- [ ] **Port**: 389 (LDAP) or 636 (LDAPS)
- [ ] **Use TLS**: Yes (recommended)
- [ ] **Base DN**: `ou=users,dc=company,dc=com`
- [ ] **Bind DN**: Use auto-discovery or `cn=admin,dc=company,dc=com`
- [ ] **User Search Filter**: `(uid={{username}})`
- [ ] **Username Attribute**: `uid`

---

### Login Process (Detailed)

When a user logs in:

1. **Email entered**: `user@company.com` or `user`
2. **Username extracted**: `user` (everything before `@`)
3. **LDAP search**: Uses User Search Filter with `{{username}}` replaced
4. **User found**: System retrieves user DN
5. **Password verification**: Binds as user to verify password
6. **Auto-create**: If first login, user is created in database with Viewer role

---

### Common Issues

#### Issue: "User not found in LDAP directory"

**Possible causes**:
- User Search Filter is incorrect
- Base DN is wrong
- Username attribute doesn't match
- User doesn't exist in LDAP

**Solutions**:
1. Check User Search Filter matches your LDAP structure
2. Verify Base DN includes the user's container
3. Test search manually with LDAP tools
4. Verify user exists in directory

#### Issue: "Service account bind failed"

**Possible causes**:
- Bind DN format is incorrect
- Password is wrong
- Account is disabled or locked
- Account doesn't have search permissions

**Solutions**:
1. Use auto-discovery to find correct Bind DN format
2. Verify password is correct
3. Check account status in Active Directory
4. Ensure service account has "Read" permissions on Base DN

#### Issue: "Invalid credentials" (user password)

**Possible causes**:
- User password is incorrect
- User account is disabled
- User account is locked
- Password has expired

**Solutions**:
1. Verify password is correct
2. Check user account status in AD
3. Reset password if needed
4. Unlock account if locked

---

### Testing Authentication Flow

#### 1. Test Service Account

```powershell
# Test service account bind
$bindDn = "service-account@domain.com"
$password = "service-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://dc.domain.com", $bindDn, $password)
$ldap.distinguishedName  # Should succeed
```

#### 2. Test User Search

```powershell
# Search for user
$searcher = New-Object System.DirectoryServices.DirectorySearcher
$searcher.Filter = "(sAMAccountName=testuser)"
$searcher.SearchRoot = "LDAP://dc=domain,dc=com"
$result = $searcher.FindOne()
$userDn = $result.Properties["distinguishedName"][0]
```

#### 3. Test User Authentication

```powershell
# Bind as user
$userDn = "CN=Test User,CN=Users,DC=domain,DC=com"
$userPassword = "user-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://dc.domain.com", $userDn, $userPassword)
$ldap.distinguishedName  # Should succeed if password is correct
```

---

### Debug Mode

Enable detailed logging by checking server console. The system logs:
- Service account bind attempts
- User search operations
- User authentication attempts
- All errors with detailed messages

Check **Admin Settings → Recent Activity** for authentication logs.

---

### Quick Fixes

#### If auto-discovery worked but login fails:

1. **Check User Search Filter**: Should match your LDAP type (AD vs OpenLDAP)
2. **Verify Username Attribute**: `sAMAccountName` for AD, `uid` for OpenLDAP
3. **Test with actual username**: Make sure the username format matches what's in LDAP

#### If test connection works but login fails:

1. **Check Base DN**: Make sure it includes the user's container
2. **Verify User Search Filter**: Test with actual LDAP query
3. **Check user exists**: Verify user is in the Base DN scope

---

### Still Having Issues?

1. Check server logs in terminal/console
2. Review Recent Activity in Admin panel
3. Test each step manually with LDAP tools
4. Verify all configuration fields match your LDAP server
5. Ensure firewall allows LDAP traffic (port 389/636)

---

**Last Updated**: 21-12-2025
