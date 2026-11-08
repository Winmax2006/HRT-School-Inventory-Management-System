const fs = require('fs');
const crypto = require('crypto');

// 1. Copy Write_v2.7.0-rc.5.gs as base
let writeContent = fs.readFileSync('Write_v2.7.0-rc.5.gs', 'utf8');

// 2. Apply Prompt 13 patches (helper encapsulation)
writeContent = writeContent.replace(/\bsetConfig\(/g, 'setConfig_(');
writeContent = writeContent.replace(/\binvalidateCache\(/g, 'invalidateCache_(');
writeContent = writeContent.replace(/\blogAudit\(([^)]+)\)/g, 'logAudit_($1, true)');

// 3. Apply Prompt 14 patch (hrtUpdateSettings_)
const oldUpdateSettingsRegex = /function hrtUpdateSettings_\(payload, caller\) \{[\s\S]*?return \{\s*success: true,\s*section: section,\s*updatedCount: updatedCount,\s*revisionId: nextRev,\s*timestamp: new Date\(\)\.toISOString\(\)\s*\};\s*\}/;

const newUpdateSettings = `function hrtUpdateSettings_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can update system settings.');
  }

  // Optimistic Concurrency Control (Revision Check)
  const currentRevision = getConfig('settings_revision_id', 'rev_1');
  if (payload.expectedRevisionId && payload.expectedRevisionId !== currentRevision) {
    throw new Error(\`CONCURRENCY_CONFLICT: Settings have been modified by another administrator (current: "\${currentRevision}", expected: "\${payload.expectedRevisionId}"). Please refresh.\`);
  }

  const section = String(payload.section || payload.category || 'general').trim();
  
  // Extract input settings (supporting flat settings, payload.data, and nested section models)
  let rawSettings = Object.assign({}, payload.settings || payload.data || {});

  // If payload contains nested category blocks, flatten them into rawSettings
  ['schoolProfile', 'school', 'documents', 'rules', 'miniui', 'systemConfig'].forEach(cat => {
    if (payload[cat] && typeof payload[cat] === 'object') {
      Object.assign(rawSettings, payload[cat]);
      if (payload[cat].signatories && typeof payload[cat].signatories === 'object') {
        Object.assign(rawSettings, payload[cat].signatories);
      }
    }
  });

  // Comprehensive Form Model to Backend Config Key Mapping (RPC-11)
  const fieldAliases = {
    'school_org': 'organization',
    'school_agency': 'agency',
    'officer_name': 'signatory_approver_name',
    'officer_pos': 'signatory_approver_title',
    'director_name': 'signatory_director_name',
    'director_pos': 'signatory_director_title',
    'schoolName': 'school_name',
    'schoolShortName': 'school_short_name',
    'schoolAddress': 'school_address',
    'schoolPhone': 'school_phone',
    'schoolEmail': 'school_email',
    'schoolLogoUrl': 'school_logo_url',
    'signatoryRequesterTitle': 'signatory_requester_title',
    'signatoryApproverName': 'signatory_approver_name',
    'signatoryApproverTitle': 'signatory_approver_title',
    'signatoryDirectorName': 'signatory_director_name',
    'signatoryDirectorTitle': 'signatory_director_title',
    'signatoriesEffectiveDate': 'signatories_effective_date',
    'documentPrefix': 'document_prefix',
    'documentPattern': 'document_pattern',
    'workflowMode': 'workflow_mode',
    'allowOverQuota': 'allow_over_quota',
    'lowStockThreshold': 'low_stock_threshold',
    'minStockThreshold': 'low_stock_threshold',
    'ropFactor': 'rop_factor',
    'fastMovingThreshold': 'fast_moving_threshold',
    'rulesEffectiveDate': 'rules_effective_date',
    'miniuiEnabled': 'miniui_enabled',
    'miniuiAllowedDepts': 'miniui_allowed_depts',
    'miniuiWelcomeMessage': 'miniui_welcome_message',
    'abcThresholdA': 'abc_threshold_a',
    'abcThresholdB': 'abc_threshold_b',
    'abcThresholdC': 'abc_threshold_c',
    'decimalUnits': 'decimal_units',
    'enableDemoRoleSwitch': 'enable_demo_role_switch'
  };

  const allowedKeys = [
    'school_name', 'organization', 'agency', 'school_address', 'school_phone', 'school_email', 'school_logo_url',
    'school_short_name', 'school_footer_note',
    'signatory_requester_title', 'signatory_approver_name', 'signatory_approver_title', 'signatory_director_name', 'signatory_director_title', 'signatories_effective_date', 'document_prefix', 'document_pattern',
    'workflow_mode', 'allow_over_quota', 'low_stock_threshold', 'rop_factor', 'fast_moving_threshold', 'rules_effective_date',
    'abc_threshold_a', 'abc_threshold_b', 'abc_threshold_c', 'movement_velocity_period_days',
    'miniui_enabled', 'miniui_welcome_message', 'miniui_allowed_depts', 'miniui_require_urgency', 'miniui_require_required_date', 'miniui_success_message',
    'decimal_units', 'enable_demo_role_switch', 'cache_ttl'
  ];

  let updatedCount = 0;
  Object.keys(rawSettings).forEach(rawKey => {
    const targetKey = fieldAliases[rawKey] || rawKey;
    if (allowedKeys.includes(targetKey)) {
      const val = rawSettings[rawKey];
      // CRITICAL (RPC-11): Preserve boolean false, number 0, and allowed empty strings without defaulting
      if (val !== undefined && val !== null) {
        setConfig_(targetKey, sanitizeCellValue(val));
        updatedCount++;
      }
    }
  });

  // Increment revision ID and bust data caches
  const nextRev = 'rev_' + Date.now();
  setConfig_('settings_revision_id', nextRev);
  try {
    const curRev = typeof getConfigInt === 'function' ? getConfigInt('data_revision', 1) : 1;
    setConfig_('data_revision', curRev + 1);
  } catch (de) {}

  if (typeof logAudit_ === 'function') {
    logAudit_('UPDATE_SETTINGS', 'SYSTEM', \`อัปเดตการตั้งค่าระบบหมวด \${section} (\${updatedCount} รายการ, rev: \${nextRev})\`, caller, true);
  }

  return {
    success: true,
    section: section,
    updatedCount: updatedCount,
    revisionId: nextRev,
    timestamp: new Date().toISOString()
  };
}`;

writeContent = writeContent.replace(oldUpdateSettingsRegex, newUpdateSettings);
fs.writeFileSync('Write.gs', writeContent, 'utf8');

const hash = crypto.createHash('sha256').update(fs.readFileSync('Write.gs')).digest('hex');
console.log('Restored Write.gs to Prompt 14 state. Hash:', hash);
console.log('Expected Prompt 14 hash: 27fb6419e30a77128f6e5a8650affa67d12c637a8453316091f1f6cef968a9b6');
