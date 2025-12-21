# LDAP Authentication Troubleshooting Guide

## Common Error: "Invalid credentials" or Bind Failures

### Error: `000004DC: LdapErr: DSID-0C090CE5, comment: In order to perform this operation a successful bind must be completed`

**Cause**: Service account bind is failing, or connection is being reused incorrectly.

**Solution**: 
1. Verify service account credentials are correct
2. Check that Bind DN format matches your AD configuration
3. Ensure the service account is enabled and not locked

---

## Step-by-Step Debugging

### 1. Verify Service Account Credentials

Test the service account manually:

```powershell
# Using PowerShell
$username = "your-service-account@domain.com"
$password = "your-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://your-dc.domain.com", $username, $password)
$ldap.distinguishedName  # Should return DN if successful
```

### 2. Check User Search Filter

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

### 3. Verify User Can Be Found

Test if the user exists in LDAP:

```powershell
# PowerShell - Search for user
$searcher = New-Object System.DirectoryServices.DirectorySearcher
$searcher.Filter = "(sAMAccountName=testuser)"
$searcher.SearchRoot = "LDAP://dc=domain,dc=com"
$result = $searcher.FindOne()
$result.Properties["distinguishedName"]
```

### 4. Test User Password

Verify the user's password works:

```powershell
$userDn = "CN=Test User,CN=Users,DC=domain,DC=com"
$password = "user-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://your-dc.domain.com", $userDn, $password)
$ldap.distinguishedName  # Should succeed if password is correct
```

---

## Configuration Checklist

### For Active Directory:

- [ ] **Host**: Domain controller hostname or IP
- [ ] **Port**: 389 (LDAP) or 636 (LDAPS)
- [ ] **Use TLS**: Yes (recommended)
- [ ] **Base DN**: `dc=company,dc=com` (auto-generated from domain)
- [ ] **Bind DN**: Use auto-discovery or `username@domain.com` format
- [ ] **User Search Filter**: `(sAMAccountName={{username}})`
- [ ] **Username Attribute**: `sAMAccountName`

### For OpenLDAP:

- [ ] **Host**: LDAP server hostname or IP
- [ ] **Port**: 389 (LDAP) or 636 (LDAPS)
- [ ] **Use TLS**: Yes (recommended)
- [ ] **Base DN**: `ou=users,dc=company,dc=com`
- [ ] **Bind DN**: Use auto-discovery or `cn=admin,dc=company,dc=com`
- [ ] **User Search Filter**: `(uid={{username}})`
- [ ] **Username Attribute**: `uid`

---

## Login Process

When a user logs in:

1. **Email entered**: `user@company.com` or `user`
2. **Username extracted**: `user` (everything before `@`)
3. **LDAP search**: Uses User Search Filter with `{{username}}` replaced
4. **User found**: System retrieves user DN
5. **Password verification**: Binds as user to verify password
6. **Auto-create**: If first login, user is created in database with Viewer role

---

## Common Issues

### Issue: "User not found in LDAP directory"

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

### Issue: "Service account bind failed"

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

### Issue: "Invalid credentials" (user password)

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

## Testing Authentication Flow

### 1. Test Service Account

```powershell
# Test service account bind
$bindDn = "service-account@domain.com"
$password = "service-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://dc.domain.com", $bindDn, $password)
$ldap.distinguishedName  # Should succeed
```

### 2. Test User Search

```powershell
# Search for user
$searcher = New-Object System.DirectoryServices.DirectorySearcher
$searcher.Filter = "(sAMAccountName=testuser)"
$searcher.SearchRoot = "LDAP://dc=domain,dc=com"
$result = $searcher.FindOne()
$userDn = $result.Properties["distinguishedName"][0]
```

### 3. Test User Authentication

```powershell
# Bind as user
$userDn = "CN=Test User,CN=Users,DC=domain,DC=com"
$userPassword = "user-password"
$ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://dc.domain.com", $userDn, $userPassword)
$ldap.distinguishedName  # Should succeed if password is correct
```

---

## Debug Mode

Enable detailed logging by checking server console. The system logs:
- Service account bind attempts
- User search operations
- User authentication attempts
- All errors with detailed messages

Check **Admin Settings → Recent Activity** for authentication logs.

---

## Quick Fixes

### If auto-discovery worked but login fails:

1. **Check User Search Filter**: Should match your LDAP type (AD vs OpenLDAP)
2. **Verify Username Attribute**: `sAMAccountName` for AD, `uid` for OpenLDAP
3. **Test with actual username**: Make sure the username format matches what's in LDAP

### If test connection works but login fails:

1. **Check Base DN**: Make sure it includes the user's container
2. **Verify User Search Filter**: Test with actual LDAP query
3. **Check user exists**: Verify user is in the Base DN scope

---

## Still Having Issues?

1. Check server logs in terminal/console
2. Review Recent Activity in Admin panel
3. Test each step manually with LDAP tools
4. Verify all configuration fields match your LDAP server
5. Ensure firewall allows LDAP traffic (port 389/636)

---

**Last Updated**: 21-12-2025
