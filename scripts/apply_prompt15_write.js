const fs = require('fs');

let content = fs.readFileSync('Write.gs', 'utf8');

// 1. Self-approval prevention in hrtApproveRequisition_
const approveTarget = `reqNo = reqData[r][1];`;
const approveReplacement = `reqNo = reqData[r][1];
        const reqOwner = String(reqData[r][3]).trim();
        if (caller && (caller.id === reqOwner || caller.user_id === reqOwner || caller.email === reqOwner)) {
          const err = new Error('FORBIDDEN: Self-approval is strictly prohibited. An approver or director cannot approve their own requisition.');
          err.code = 'FORBIDDEN';
          throw err;
        }`;

if (!content.includes(approveTarget)) {
  console.error('Target not found for hrtApproveRequisition_');
  process.exit(1);
}
content = content.replace(approveTarget, approveReplacement);
console.log('Successfully added self-approval check in hrtApproveRequisition_');

// 2. Replace hrtCreateUser_
const createStart = content.indexOf('function hrtCreateUser_(payload, caller) {');
const updateComment = '/**\n * Updates user role or department (ADMIN Only)';
const createEnd = content.indexOf(updateComment, createStart);

if (createStart === -1 || createEnd === -1) {
  console.error('Could not locate boundaries for hrtCreateUser_');
  process.exit(1);
}

const newCreateUser = `function hrtCreateUser_(payload, caller) {
  payload = payload || {};
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const role = String(payload.role || 'TEACHER').trim().toUpperCase();
  const department = String(payload.department || payload.dept || 'ทั่วไป').trim();

  // Enforce ADMIN role requirement
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: Only administrators can create new users.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!email || !email.includes('@')) throw new Error('VALIDATION_ERROR: Valid email address is required.');
  if (!name) throw new Error('VALIDATION_ERROR: Personnel name is required.');
  if (!CONFIG.ROLES[role]) throw new Error(\`VALIDATION_ERROR: Invalid role "\${role}".\`);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const sheet = getSheet('users');
    const data = sheet.getDataRange().getValues();
    const H = data[0].map(h => String(h).trim().toLowerCase());
    const iId = H.indexOf('user_id');
    const iEmail = H.indexOf('email');
    const iUsername = H.indexOf('username');

    // Duplicate check under lock
    for (let r = 1; r < data.length; r++) {
      const rowEmail = iEmail >= 0 ? String(data[r][iEmail]).trim().toLowerCase() : String(data[r][3]).trim().toLowerCase();
      const rowUsername = iUsername >= 0 ? String(data[r][iUsername]).trim().toLowerCase() : String(data[r][1]).trim().toLowerCase();
      if (rowEmail === email || rowUsername === email) {
        const err = new Error(\`DUPLICATE_USER: User with email "\${email}" already exists.\`);
        err.code = 'DUPLICATE_USER';
        throw err;
      }
    }

    // Compute next user_id safely (AUTH-11 & AUTH-12):
    // Find maximum numeric index among existing USR-(\\d+) IDs to guarantee uniqueness
    // across concurrency, gaps, row deletions, and re-imports.
    let maxNum = 0;
    for (let r = 1; r < data.length; r++) {
      const existingId = String(data[r][iId >= 0 ? iId : 0] || '').trim();
      const match = existingId.match(/^USR-(\\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : data.length; // When only header exists (data.length===1), yields USR-001
    const userId = \`USR-\${nextNum.toString().padStart(3, '0')}\`;
    const username = email; // Enforce normalized E-mail as username

    // Columns: user_id, username, name, email, role, department, status
    sheet.appendRow([
      userId,
      sanitizeCellValue(username),
      sanitizeCellValue(name),
      email,
      role,
      sanitizeCellValue(department),
      'ACTIVE'
    ]);

    if (typeof invalidateCache_ === 'function') {
      invalidateCache_();
    }

    if (typeof logAudit_ === 'function') {
      logAudit_('CREATE_USER', 'USER_MANAGEMENT', \`เพิ่มผู้ใช้งาน \${name} (\${email}) บทบาท: \${role}\`, caller, true);
    }

    return {
      success: true,
      user_id: userId,
      email: email,
      role: role,
      status: 'ACTIVE'
    };

  } finally {
    lock.releaseLock();
  }
}

`;

content = content.substring(0, createStart) + newCreateUser + content.substring(createEnd);
console.log('Successfully replaced hrtCreateUser_ in Write.gs');

// 3. Replace hrtUpdateUser_
const updateStart = content.indexOf('function hrtUpdateUser_(payload, caller) {');
const suspendComment = '/**\n * Suspends user account (ADMIN Only)';
const updateEnd = content.indexOf(suspendComment, updateStart);

if (updateStart === -1 || updateEnd === -1) {
  console.error('Could not locate boundaries for hrtUpdateUser_');
  process.exit(1);
}

const newUpdateUser = `function hrtUpdateUser_(payload, caller) {
  payload = payload || {};
  const userId = String(payload.user_id || payload.userId || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const newRole = payload.role ? String(payload.role).trim().toUpperCase() : null;
  const newDept = payload.department !== undefined ? String(payload.department).trim() : null;
  const newStatus = payload.status ? String(payload.status).trim().toUpperCase() : null;

  // Enforce ADMIN role requirement
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: Only administrators can update users.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!userId && !email) throw new Error('PARAM_REQUIRED: user_id or email is required.');
  if (newRole && !CONFIG.ROLES[newRole]) throw new Error(\`VALIDATION_ERROR: Invalid role "\${newRole}".\`);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const sheet = getSheet('users');
    const data = sheet.getDataRange().getValues();
    const H = data[0].map(h => String(h).trim().toLowerCase());
    const iId = H.indexOf('user_id');
    const iEmail = H.indexOf('email');
    const iRole = H.indexOf('role');
    const iDept = H.indexOf('department');
    const iStatus = H.indexOf('status');
    const iName = H.indexOf('name');

    let targetRow = -1;
    let targetUser = null;

    for (let r = 1; r < data.length; r++) {
      const rowId = String(data[r][iId >= 0 ? iId : 0]).trim();
      const rowEmail = String(data[r][iEmail >= 0 ? iEmail : 3]).trim().toLowerCase();
      if ((userId && rowId === userId) || (email && rowEmail === email)) {
        targetRow = r + 1;
        targetUser = {
          user_id: rowId,
          email: rowEmail,
          role: String(data[r][iRole >= 0 ? iRole : 4]).trim().toUpperCase(),
          status: String(data[r][iStatus >= 0 ? iStatus : 6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!targetUser) throw new Error(\`NOT_FOUND: User "\${userId || email}" not found.\`);

    // Email immutability: Email is the unique persistent identity.
    if (payload.new_email && payload.new_email.trim().toLowerCase() !== targetUser.email) {
      const err = new Error('IMMUTABLE_FIELD: Email address cannot be modified after user creation to preserve transaction history and referential integrity.');
      err.code = 'IMMUTABLE_FIELD';
      throw err;
    }

    // Last-Admin Protection Guard
    if (targetUser.role === 'ADMIN' && ((newRole && newRole !== 'ADMIN') || (newStatus && newStatus !== 'ACTIVE'))) {
      if (caller && (caller.id === targetUser.user_id || caller.user_id === targetUser.user_id || caller.email === targetUser.email)) {
        const err = new Error('LAST_ADMIN_PROTECTION: Self-demotion or self-suspension of administrator account is strictly prohibited.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }

      let activeAdminCount = 0;
      for (let r = 1; r < data.length; r++) {
        const rRole = String(data[r][iRole >= 0 ? iRole : 4]).trim().toUpperCase();
        const rStatus = String(data[r][iStatus >= 0 ? iStatus : 6]).trim().toUpperCase();
        if (rRole === 'ADMIN' && rStatus === 'ACTIVE') {
          activeAdminCount++;
        }
      }

      if (activeAdminCount <= 1) {
        const err = new Error('LAST_ADMIN_PROTECTION: Cannot demote or suspend the last remaining active administrator account.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }
    }

    const newName = payload.name !== undefined ? String(payload.name).trim() : null;
    if (newName && iName >= 0) sheet.getRange(targetRow, iName + 1).setValue(sanitizeCellValue(newName));
    if (newRole && iRole >= 0) sheet.getRange(targetRow, iRole + 1).setValue(newRole);
    if (newDept !== null && iDept >= 0) sheet.getRange(targetRow, iDept + 1).setValue(sanitizeCellValue(newDept));
    if (newStatus && iStatus >= 0) sheet.getRange(targetRow, iStatus + 1).setValue(newStatus);

    if (typeof invalidateCache_ === 'function') {
      invalidateCache_();
    }

    if (typeof logAudit_ === 'function') {
      logAudit_('UPDATE_USER', 'USER_MANAGEMENT', \`แก้ไขผู้ใช้ \${targetUser.email} (Role: \${newRole || targetUser.role}, Status: \${newStatus || targetUser.status})\`, caller, true);
    }

    return {
      success: true,
      user_id: targetUser.user_id,
      email: targetUser.email,
      role: newRole || targetUser.role,
      status: newStatus || targetUser.status
    };

  } finally {
    lock.releaseLock();
  }
}

`;

content = content.substring(0, updateStart) + newUpdateUser + content.substring(updateEnd);
console.log('Successfully replaced hrtUpdateUser_ in Write.gs');

fs.writeFileSync('Write.gs', content, 'utf8');

// Verify syntax
new Function(content);
console.log('Write.gs is syntactically valid! Total length:', content.length);
