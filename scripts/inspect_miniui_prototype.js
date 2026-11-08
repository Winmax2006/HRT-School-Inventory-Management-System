const fs = require('fs');
const p = 'C:/Users/Art/OneDrive/เดสก์ท็อป/HRT_MiniUI_Preview.html';
const content = fs.readFileSync(p, 'utf8');

console.log('Total length:', content.length);
console.log('--- Structure Analysis ---');
console.log('Contains <style>:', content.includes('<style>'));
console.log('Contains localStorage:', content.includes('localStorage'));
console.log('Contains mock/demo data:', content.includes('mock') || content.includes('demo') || content.includes('sample'));
console.log('Menu tabs:');
const matches = content.matchAll(/id=["']tab-[^"']+["']/g);
for (const m of matches) {
  console.log('  ', m[0]);
}

const views = content.matchAll(/id=["']view-[^"']+["']/g);
for (const v of views) {
  console.log('  view:', v[0]);
}
