const fs = require('fs');

// 1. Clean index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
const targetUserLine = "User_ID: payload.userId || (typeof currentUser !== 'undefined' && currentUser ? (currentUser.id || currentUser.name) : 'USR-ANANT-01')";
const replacementUserLine = "User_ID: payload.userId || (typeof currentUser !== 'undefined' && currentUser ? (currentUser.id || currentUser.name) : 'SYSTEM_ANONYMOUS')";

const targetRoleLine = "Role: payload.role || (typeof currentUser !== 'undefined' && currentUser && currentUser.role ? currentUser.role : 'STAFF_SUPPLY')";
const replacementRoleLine = "Role: payload.role || (typeof currentUser !== 'undefined' && currentUser && currentUser.role ? currentUser.role : 'ANONYMOUS')";

if (indexHtml.includes(targetUserLine)) {
  indexHtml = indexHtml.replace(targetUserLine, replacementUserLine);
  console.log('Replaced targetUserLine in index.html');
}
if (indexHtml.includes(targetRoleLine)) {
  indexHtml = indexHtml.replace(targetRoleLine, replacementRoleLine);
  console.log('Replaced targetRoleLine in index.html');
}
fs.writeFileSync('index.html', indexHtml, 'utf8');

// 2. Clean frontend/main/App.js
let appJs = fs.readFileSync('frontend/main/App.js', 'utf8');
const targetAppUser = "Actor_User_ID: payload.actorUserId || 'USR-ANANT-01'";
const replacementAppUser = "Actor_User_ID: payload.actorUserId || (typeof currentUser !== 'undefined' && currentUser ? currentUser.id : 'SYSTEM_ANONYMOUS')";

if (appJs.includes(targetAppUser)) {
  appJs = appJs.replace(targetAppUser, replacementAppUser);
  console.log('Replaced targetAppUser in App.js');
}
fs.writeFileSync('frontend/main/App.js', appJs, 'utf8');

console.log('Finished cleaning audit user fallbacks.');
