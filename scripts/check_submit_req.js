const fs = require('fs');
const apiContent = fs.readFileSync('Api.gs', 'utf8');
const lines = apiContent.split('\n');
lines.forEach((l, idx) => {
  if (l.includes("'apiSubmitRequisition'")) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
