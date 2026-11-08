const fs = require('fs');

let appJs = fs.readFileSync('frontend/main/App.js', 'utf8');

// Add version to docblock
if (!appJs.includes('Version: v2.7.0-rc.4')) {
  appJs = appJs.replace(
    ' * HRT School Inventory Management System (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))',
    ' * HRT School Inventory Management System (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))\n * Version: v2.7.0-rc.4'
  );
  console.log('Added Version: v2.7.0-rc.4 to App.js header');
}

// Clean fsnData array to empty array in App.js
const fsnDataStartIdx = appJs.indexOf('    // FSN Master Data (13 Digits e-GP Standard)\n    let fsnData = [');
const fsnDataEndTarget = '    ];\n\n    // School Departments';
const fsnDataEndIdx = appJs.indexOf(fsnDataEndTarget);

if (fsnDataStartIdx !== -1 && fsnDataEndIdx !== -1) {
  const replacementFsn = '    // FSN Master Data (13 Digits e-GP Standard) - Clean runtime empty default\n    let fsnData = [];';
  appJs = appJs.slice(0, fsnDataStartIdx) + replacementFsn + '\n\n' + appJs.slice(fsnDataEndIdx + 7);
  console.log('Cleaned fsnData to empty array in App.js');
}

fs.writeFileSync('frontend/main/App.js', appJs, 'utf8');
console.log('Finished updating App.js');
