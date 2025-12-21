import { Client } from 'ldapts';
import { db } from './db';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Validate encryption key on startup
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required for LDAP password encryption');
}
if (ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long for AES-256 security');
}

/**
 * Encrypt sensitive data for storage
 */
export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data from storage
 */
export function decryptSecret(encrypted: string): string {
  const [ivHex, encryptedText] = encrypted.split(':');
  if (!ivHex || !encryptedText) {
    throw new Error('Invalid encrypted format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get LDAP configuration from database
 */
export async function getLDAPConfig() {
  const config = await db.systemConfig.findUnique({
    where: { id: 'system' },
    select: {
      ldapEnabled: true,
      ldapHost: true,
      ldapPort: true,
      ldapBaseDn: true,
      ldapBindDn: true,
      ldapBindPassword: true,
      ldapUseTls: true,
      ldapUserSearchFilter: true,
      ldapUsernameAttribute: true,
      ldapEnforced: true,
    },
  });

  if (!config || !config.ldapEnabled || !config.ldapHost) {
    return null;
  }

  // Decrypt bind password if present
  let bindPassword: string | undefined = undefined;
  if (config.ldapBindPassword) {
    try {
      bindPassword = decryptSecret(config.ldapBindPassword);
    } catch (error) {
      console.error('Failed to decrypt LDAP bind password:', error);
      return null;
    }
  }

  return {
    enabled: config.ldapEnabled,
    host: config.ldapHost,
    port: config.ldapPort || 389,
    baseDn: config.ldapBaseDn || '',
    bindDn: config.ldapBindDn || '',
    bindPassword,
    useTls: config.ldapUseTls || false,
    userSearchFilter: config.ldapUserSearchFilter || '(uid={{username}})',
    usernameAttribute: config.ldapUsernameAttribute || 'uid',
    enforced: config.ldapEnforced || false,
  };
}

/**
 * Convert domain to Base DN
 * Example: "company.com" -> "dc=company,dc=com"
 */
export function domainToBaseDn(domain: string): string {
  if (!domain) return '';
  const parts = domain.split('.').filter(p => p.length > 0);
  return parts.map(p => `dc=${p}`).join(',');
}

/**
 * Parse username input that might be in various formats
 * Supports: username, username@domain, domain\username
 */
export function parseUsernameInput(input: string): { username: string; domain?: string } {
  if (!input) return { username: '' };
  
  // Check for domain\username format (Windows/AD format)
  if (input.includes('\\')) {
    const parts = input.split('\\');
    if (parts.length === 2) {
      return { username: parts[1], domain: parts[0] };
    }
  }
  
  // Check for username@domain format (UPN format)
  if (input.includes('@')) {
    const parts = input.split('@');
    if (parts.length === 2) {
      return { username: parts[0], domain: parts[1] };
    }
  }
  
  // Just username
  return { username: input };
}

/**
 * Auto-discover Bind DN from username and domain
 * Tries multiple formats:
 * 1. domain\username format (Windows/AD format)
 * 2. UPN format: username@domain
 * 3. DN format: cn=username,cn=Users,dc=...
 * 4. Simple username (if AD allows)
 */
export function constructBindDn(username: string, domain: string, baseDn?: string): string[] {
  const bindDns: string[] = [];
  
  if (!username || !domain) return bindDns;
  
  const base = baseDn || domainToBaseDn(domain);
  
  // 1. domain\username format (Windows/AD format - most common for AD)
  bindDns.push(`${domain}\\${username}`);
  
  // 2. UPN format (also common for AD)
  bindDns.push(`${username}@${domain}`);
  
  // 3. DN format with Users container (common AD structure)
  bindDns.push(`cn=${username},cn=Users,${base}`);
  
  // 4. DN format with OU=Users (alternative AD structure)
  bindDns.push(`cn=${username},ou=Users,${base}`);
  
  // 5. Simple username (some AD configurations allow this)
  bindDns.push(username);
  
  return bindDns;
}

/**
 * Test LDAP connection with auto-discovery of Bind DN
 */
export async function testLDAPConnectionWithAutoDiscovery(
  host: string,
  port: number,
  username: string,
  domain: string,
  password: string,
  useTls: boolean,
  baseDn?: string
): Promise<{ success: boolean; error?: string; discoveredBindDn?: string; discoveredBaseDn?: string }> {
  const discoveredBaseDn = baseDn || domainToBaseDn(domain);
  const bindDnCandidates = constructBindDn(username, domain, discoveredBaseDn);
  
  const client = new Client({
    url: `${useTls ? 'ldaps' : 'ldap'}://${host}:${port}`,
    timeout: 5000,
    connectTimeout: 5000,
  });

  let lastError: string | undefined = undefined;

  // Try each Bind DN format until one works
  for (const bindDn of bindDnCandidates) {
    try {
      await client.bind(bindDn, password);
      
      // If bind succeeds, try a simple search to verify
      await client.search(discoveredBaseDn, {
        scope: 'base',
        filter: '(objectClass=*)',
        sizeLimit: 1,
      });

      await client.unbind();
      
      return {
        success: true,
        discoveredBindDn: bindDn,
        discoveredBaseDn: discoveredBaseDn,
      };
    } catch (error: any) {
      lastError = error.message || 'Connection failed';
      // Continue to next format
    }
  }

  // If all formats failed, try to get more info from the last error
  try {
    await client.unbind();
  } catch {
    // Ignore
  }

  return {
    success: false,
    error: lastError || 'All bind DN formats failed. Please verify username, domain, and password.',
    discoveredBaseDn: discoveredBaseDn,
  };
}

/**
 * Test LDAP connection and authentication
 */
export async function testLDAPConnection(config: {
  host: string;
  port: number;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  useTls: boolean;
  userSearchFilter: string;
  usernameAttribute: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = new Client({
    url: `${config.useTls ? 'ldaps' : 'ldap'}://${config.host}:${config.port}`,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    // Test bind with provided credentials
    await client.bind(config.bindDn, config.bindPassword);

    // Test search
    const searchFilter = config.userSearchFilter.replace('{{username}}', 'test');
    await client.search(config.baseDn, {
      scope: 'sub',
      filter: searchFilter,
      sizeLimit: 1,
    });

    return { success: true };
  } catch (error: any) {
    console.error('LDAP connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  } finally {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}

/**
 * Authenticate user against LDAP
 */
export async function authenticateLDAP(
  username: string,
  password: string
): Promise<{ success: boolean; user?: { name: string; email: string }; error?: string }> {
  console.log('[LDAP] Starting authentication for username:', username);
  const config = await getLDAPConfig();
  
  if (!config) {
    console.error('[LDAP] No LDAP configuration found in database');
    return { success: false, error: 'LDAP not configured' };
  }
  
  if (!config.enabled) {
    console.error('[LDAP] LDAP is disabled in configuration');
    return { success: false, error: 'LDAP not enabled' };
  }
  
  console.log('[LDAP] Configuration loaded:', {
    host: config.host,
    port: config.port,
    baseDn: config.baseDn,
    bindDn: config.bindDn ? '***set***' : 'NOT SET',
    useTls: config.useTls,
    userSearchFilter: config.userSearchFilter,
    usernameAttribute: config.usernameAttribute,
  });

  // Step 1: Use service account to search for the user
  const searchClient = new Client({
    url: `${config.useTls ? 'ldaps' : 'ldap'}://${config.host}:${config.port}`,
    timeout: 10000,
    connectTimeout: 5000,
  });

  let userDn: string | null = null;
  let userInfo: { name: string; email: string } | null = null;

  try {
    // Bind with service account (ldapts handles connection automatically)
    if (!config.bindDn) {
      console.error('[LDAP] Bind DN is not configured');
      return {
        success: false,
        error: 'Service account Bind DN is not configured',
      };
    }
    
    if (!config.bindPassword) {
      console.error('[LDAP] Bind password is not configured or decryption failed');
      return {
        success: false,
        error: 'Service account password is not configured or could not be decrypted',
      };
    }
    
    console.log('[LDAP] Attempting to bind with service account:', config.bindDn);

    try {
      await searchClient.bind(config.bindDn, config.bindPassword);
      console.log('Service account bind successful for:', config.bindDn);
    } catch (bindError: any) {
      console.error('LDAP service account bind failed:', {
        bindDn: config.bindDn,
        host: config.host,
        port: config.port,
        useTls: config.useTls,
        error: bindError.message,
        code: bindError.code,
        name: bindError.name,
      });
      
      // Provide more specific error messages
      let errorMsg = 'Service account bind failed';
      const errorStr = bindError.message || '';
      const errorCode = bindError.code;
      
      if (errorStr.includes('52e') || errorCode === 0x31 || errorStr.includes('80090308')) {
        errorMsg = 'Invalid service account credentials (wrong username or password)';
      } else if (errorStr.includes('52b')) {
        errorMsg = 'Service account is disabled or locked';
      } else if (errorStr.includes('52d')) {
        errorMsg = 'Service account logon is restricted';
      } else if (errorStr.includes('timeout') || errorStr.includes('ECONNREFUSED')) {
        errorMsg = `Cannot connect to LDAP server at ${config.host}:${config.port}`;
      } else if (errorStr.includes('certificate') || errorStr.includes('TLS')) {
        errorMsg = 'TLS/SSL certificate validation failed';
      } else if (errorStr) {
        errorMsg = `Service account bind failed: ${errorStr}`;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Search for user - verify bind succeeded by attempting search
    const searchFilter = config.userSearchFilter.replace('{{username}}', username);
    console.log('[LDAP] Searching for user with filter:', searchFilter);
    console.log('[LDAP] Base DN:', config.baseDn);
    console.log('[LDAP] Username attribute:', config.usernameAttribute);
    
    let searchEntries;
    try {
      const searchResult = await searchClient.search(config.baseDn, {
        scope: 'sub',
        filter: searchFilter,
        attributes: [config.usernameAttribute, 'cn', 'mail', 'displayName', 'dn', 'sAMAccountName', 'userPrincipalName', 'uid'],
      });
      searchEntries = searchResult.searchEntries;
      console.log('[LDAP] Search completed, found', searchEntries.length, 'entries');
      
      if (searchEntries.length > 0) {
        console.log('[LDAP] First entry attributes:', Object.keys(searchEntries[0]));
        console.log('[LDAP] First entry DN:', searchEntries[0].dn);
      }
    } catch (searchError: any) {
      console.error('LDAP search failed:', {
        baseDn: config.baseDn,
        filter: searchFilter,
        error: searchError.message,
        code: searchError.code,
      });
      
      // If search fails with "bind must be completed", the bind actually failed
      if (searchError.message?.includes('bind must be completed') || searchError.code === 1) {
        return {
          success: false,
          error: 'Service account bind failed - please verify credentials and try again',
        };
      }
      
      throw searchError; // Re-throw to be caught by outer catch
    }

    // If no results with configured filter, try common Active Directory alternatives
    if (searchEntries.length === 0) {
      console.log('[LDAP] No results with configured filter, trying AD alternatives...');
      const adFilters = [
        `(sAMAccountName=${username})`,
        `(userPrincipalName=${username}@*)`,
        `(cn=${username})`,
        `(|(sAMAccountName=${username})(userPrincipalName=${username}@*)(cn=${username}))`,
      ];
      
      for (const adFilter of adFilters) {
        try {
          console.log('[LDAP] Trying alternative filter:', adFilter);
          const altResult = await searchClient.search(config.baseDn, {
            scope: 'sub',
            filter: adFilter,
            attributes: ['cn', 'mail', 'displayName', 'dn', 'sAMAccountName', 'userPrincipalName', 'uid'],
          });
          
          if (altResult.searchEntries.length > 0) {
            console.log('[LDAP] Found user with alternative filter:', adFilter);
            searchEntries = altResult.searchEntries;
            break;
          }
        } catch (altError: any) {
          console.log('[LDAP] Alternative filter failed:', adFilter, altError.message);
          // Continue to next filter
        }
      }
    }

    if (searchEntries.length === 0) {
      console.error('[LDAP] User not found after trying all search filters');
      return { success: false, error: 'User not found in LDAP directory' };
    }

    const userEntry = searchEntries[0];
    userDn = userEntry.dn;
    
    // Extract user information
    const name = (userEntry.displayName || userEntry.cn || username) as string;
    const email = (userEntry.mail || `${username}@${config.host.split('.')[0] || 'ldap'}`) as string;
    userInfo = { name, email };
  } catch (error: any) {
    console.error('LDAP search error:', error);
    return {
      success: false,
      error: `User search failed: ${error.message || 'Unknown error'}`,
    };
  } finally {
    try {
      await searchClient.unbind();
    } catch {
      // Ignore unbind errors
    }
  }

  // Step 2: Create a NEW connection to verify user password
  if (!userDn || !userInfo) {
    return { success: false, error: 'Failed to retrieve user information' };
  }

  const authClient = new Client({
    url: `${config.useTls ? 'ldaps' : 'ldap'}://${config.host}:${config.port}`,
    timeout: 10000,
    connectTimeout: 5000,
  });

  try {
    // Bind as the user to verify password (ldapts handles connection automatically)
    try {
      await authClient.bind(userDn, password);
      console.log('User bind successful');
    } catch (bindError: any) {
      console.error('LDAP user bind failed:', {
        userDn,
        error: bindError.message,
        code: bindError.code,
      });
      
      // Provide more specific error messages
      let errorMsg = 'Invalid credentials';
      if (bindError.message?.includes('52e') || bindError.code === 0x31) {
        errorMsg = 'Invalid password';
      } else if (bindError.message?.includes('52b')) {
        errorMsg = 'User account is disabled or locked';
      } else if (bindError.message?.includes('533')) {
        errorMsg = 'User account is disabled';
      } else if (bindError.message?.includes('775')) {
        errorMsg = 'User account is locked';
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Password verified successfully
    return {
      success: true,
      user: userInfo,
    };
  } catch (error: any) {
    console.error('LDAP authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  } finally {
    try {
      await authClient.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}
