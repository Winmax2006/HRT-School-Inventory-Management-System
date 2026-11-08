const fs = require('fs');

function updateTestVersion(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/"VERSION: '2.7.0-rc.3'"]/, `"VERSION: '2.7.0-rc.3'", "VERSION: '2.7.0-rc.4'"]`);
  content = content.replace(/'v2.7.0-rc.3']/, `'v2.7.0-rc.3', 'v2.7.0-rc.4']`);
  content = content.replace(/or 2\.7\.0-rc\.3/, `2.7.0-rc.3, or 2.7.0-rc.4`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + filePath);
}

updateTestVersion('tests/p3_miniui_critical_test.js');
updateTestVersion('tests/p4_settings_important_test.js');
