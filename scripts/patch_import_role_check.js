const fs = require('fs');

let writeCode = fs.readFileSync('Write.gs', 'utf8');

// Add guard to hrtValidateImportItems_
const targetVal = `function hrtValidateImportItems_(payload, caller) {
  payload = payload || {};`;
const replacementVal = `function hrtValidateImportItems_(payload, caller) {
  payload = payload || {};
  if (!caller || !['ADMIN', 'OFFICER'].includes(caller.role)) {
    throw new Error('FORBIDDEN: Only officers and administrators can validate items for import.');
  }`;

if (writeCode.includes(targetVal)) {
  writeCode = writeCode.replace(targetVal, replacementVal);
  console.log('Added guard to hrtValidateImportItems_');
}

// Add guard to hrtImportItems_
const targetImp = `function hrtImportItems_(payload, caller) {
  payload = payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];`;
const replacementImp = `function hrtImportItems_(payload, caller) {
  payload = payload || {};
  if (!caller || !['ADMIN', 'OFFICER'].includes(caller.role)) {
    throw new Error('FORBIDDEN: Only officers and administrators can import items.');
  }
  const items = Array.isArray(payload.items) ? payload.items : [];`;

if (writeCode.includes(targetImp)) {
  writeCode = writeCode.replace(targetImp, replacementImp);
  console.log('Added guard to hrtImportItems_');
}

fs.writeFileSync('Write.gs', writeCode, 'utf8');
console.log('Successfully updated Write.gs');
