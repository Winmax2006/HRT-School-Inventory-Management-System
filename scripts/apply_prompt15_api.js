const fs = require('fs');

let content = fs.readFileSync('Api.gs', 'utf8');

// 1. Locate resolveAuthenticatedUser
const resolveStart = content.indexOf('function resolveAuthenticatedUser(isWrite, rawPayload) {');
const verifyComment = '/**\n   * Cryptographically verifies Google ID Token signature and claims';
const resolveEnd = content.indexOf(verifyComment, resolveStart);

if (resolveStart === -1 || resolveEnd === -1) {
  console.error('Could not locate boundaries for resolveAuthenticatedUser in Api.gs');
  process.exit(1);
}

const newResolveAuth = `function resolveAuthenticatedUser(isWrite, rawPayload) {
    let email = '';
    let isTokenVerified = false;

    // 1. Check Session.getActiveUser().getEmail() (native GAS execution)
    try {
      if (typeof Session !== 'undefined' && Session.getActiveUser) {
        email = Session.getActiveUser().getEmail();
      }
    } catch (e) {
      email = '';
    }

    // 2. Check for passed ID token if direct session email is blank
    const idToken = (rawPayload && (rawPayload.id_token || rawPayload.idToken || rawPayload.authToken)) || '';
    if (!email && idToken) {
      if (!CONFIG.GOOGLE_CLIENT_ID) {
        const err = new Error('CONFIGURATION_ERROR: GOOGLE_CLIENT_ID is not configured in Script Properties for token validation.');
        err.code = 'CONFIGURATION_ERROR';
        throw err;
      }
      const verifiedProfile = verifyGoogleIdToken(idToken);
      if (verifiedProfile && verifiedProfile.email) {
        email = verifiedProfile.email;
        isTokenVerified = true;
      } else {
        const err = new Error('UNAUTHORIZED: Invalid or expired Google ID Token.');
        err.code = 'UNAUTHORIZED';
        throw err;
      }
    }

    // 3. Test harness authorization hook (Strictly active only in automated test runner with explicit _testCaller)
    if (!email && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
      if (rawPayload && rawPayload._testCaller) {
        return rawPayload._testCaller;
      }
    }

    // P0 Fail-Closed: Anonymous or blank identity is rejected
    if (!email) {
      const err = new Error('UNAUTHORIZED: Authenticated Google identity is required. Anonymous requests are rejected.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 4. Domain & Registry Policy Check (Prompt 15 Task 5)
    const allowedDomains = CONFIG.ALLOWED_DOMAINS || ['hrt.ac.th', 'school.internal'];
    const emailDomain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
    const isPrimaryDomain = allowedDomains.includes(emailDomain);

    // 5. Lookup user in 01_Users table to verify active status and actual role
    let foundUserRow = null;
    try {
      const uSheet = getSheet('users');
      const uData = uSheet.getDataRange().getValues();
      const H = uData[0].map(h => String(h).trim().toLowerCase());
      const iId = H.indexOf('user_id');
      const iEmail = H.indexOf('email');
      const iRole = H.indexOf('role');
      const iActive = H.indexOf('status');
      const iName = H.indexOf('name');
      const iDept = H.indexOf('department');

      for (let i = 1; i < uData.length; i++) {
        const rowEmail = String(uData[i][iEmail >= 0 ? iEmail : 3]).toLowerCase().trim();
        if (rowEmail === email.toLowerCase().trim()) {
          // Explicit Active Status Check (Prompt 15 Task 10: Never default blank to active)
          const rawStatus = (iActive >= 0 && uData[i][iActive] !== undefined && uData[i][iActive] !== null)
            ? String(uData[i][iActive]).trim().toUpperCase()
            : '';

          if (rawStatus !== 'ACTIVE') {
            const err = new Error(\`USER_SUSPENDED: User account "\${email}" is not active (status: "\${rawStatus || 'EMPTY'}"). Access denied.\`);
            err.code = rawStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_INACTIVE';
            throw err;
          }

          const rawRole = String(uData[i][iRole >= 0 ? iRole : 4] || 'REQUESTER').toUpperCase();
          const userId = iId >= 0 ? String(uData[i][iId] || \`USR-\${i}\`) : \`USR-\${i}\`;
          
          foundUserRow = {
            id: userId,
            user_id: userId,
            email: email,
            name: String(uData[i][iName >= 0 ? iName : 2] || email),
            role: rawRole,
            department: String(uData[i][iDept >= 0 ? iDept : 5] || 'ทั่วไป'),
            status: 'ACTIVE',
            isActive: true,
            isTokenVerified: isTokenVerified
          };
          break;
        }
      }
    } catch (err) {
      if (err.code === 'USER_SUSPENDED' || err.code === 'USER_INACTIVE' || err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN_DOMAIN') throw err;
      Logger.log('Warning resolving user from sheet: ' + err.message);
    }

    // 6. External Domain Policy Check
    // External domains (like gmail.com) require identity + active registration in 01_Users
    if (!isPrimaryDomain) {
      if (!foundUserRow) {
        const err = new Error(\`FORBIDDEN_DOMAIN: Email domain "@\${emailDomain}" is not permitted to access this institutional system.\`);
        err.code = 'FORBIDDEN_DOMAIN';
        throw err;
      }
    }

    // 7. Unknown / Unregistered User Check (Prompt 15 Task 3 & AUTH-03: Unknown accounts cannot enter)
    if (!foundUserRow) {
      const err = new Error(\`UNREGISTERED_USER: Google identity "\${email}" is not registered in the personnel directory. Please contact the administrator.\`);
      err.code = 'UNREGISTERED_USER';
      throw err;
    }

    return foundUserRow;
  }

  `;

content = content.substring(0, resolveStart) + newResolveAuth + content.substring(resolveEnd);
console.log('Successfully replaced resolveAuthenticatedUser in Api.gs');

// 2. Locate verifyGoogleIdToken
const verifyStart = content.indexOf('function verifyGoogleIdToken(token) {');
const enforceComment = '/**\n   * Enforces Role-Based Access Control and Granular Permissions';
const verifyEnd = content.indexOf(enforceComment, verifyStart);

if (verifyStart === -1 || verifyEnd === -1) {
  console.error('Could not locate boundaries for verifyGoogleIdToken in Api.gs');
  process.exit(1);
}

const newVerifyToken = `function verifyGoogleIdToken(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      if (typeof UrlFetchApp !== 'undefined') {
        const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), {
          muteHttpExceptions: true
        });
        if (response.getResponseCode() === 200) {
          const tokenInfo = JSON.parse(response.getContentText());
          // Verify Issuer
          if (!['accounts.google.com', 'https://accounts.google.com'].includes(tokenInfo.iss)) {
            return null;
          }
          // Verify Expiration
          const exp = parseInt(tokenInfo.exp, 10);
          if (isNaN(exp) || exp * 1000 < Date.now()) {
            return null;
          }
          // Verify Audience if configured
          if (CONFIG.GOOGLE_CLIENT_ID && tokenInfo.aud !== CONFIG.GOOGLE_CLIENT_ID) {
            return null;
          }
          // Verify Email Verification Flag
          if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
            return null;
          }
          return tokenInfo;
        }
      } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
        // Node test harness simulation: parse mock token without network call
        if (token.startsWith('TEST_TOKEN:')) {
          const parts = token.split(':');
          const mockEmail = parts[1];
          const mockAud = parts[2];
          const mockExp = parseInt(parts[3] || '9999999999', 10);
          const mockVerified = parts[4] !== 'unverified';
          if (mockExp * 1000 < Date.now()) return null;
          if (CONFIG.GOOGLE_CLIENT_ID && mockAud !== CONFIG.GOOGLE_CLIENT_ID) return null;
          if (!mockVerified) return null;
          return {
            iss: 'https://accounts.google.com',
            email: mockEmail,
            aud: mockAud,
            exp: mockExp,
            email_verified: 'true'
          };
        }
      }
    } catch (e) {
      Logger.log('Token verification exception: ' + e.message);
    }

    return null;
  }

  `;

content = content.substring(0, verifyStart) + newVerifyToken + content.substring(verifyEnd);
console.log('Successfully replaced verifyGoogleIdToken in Api.gs');

fs.writeFileSync('Api.gs', content, 'utf8');

// Verify syntax
new Function(content);
console.log('Api.gs is syntactically valid! Total length:', content.length);
