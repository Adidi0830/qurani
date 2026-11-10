const fs = require('fs');
const path = 'd:/UBIG/PROJECT/PROJECT QURANI/admin-qurani-org/src/app/groups/categories/page.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/showToast\((["'])(.*?)\1,\s*(["'])(.*?)\3\)/g, 'showToast({ title: "$2", type: "$4" })');
content = content.replace(/showToast\((`.*?`),\s*(["'])(.*?)\2\)/g, 'showToast({ title: $1, type: "$3" })');
fs.writeFileSync(path, content);
console.log('Fixed showToast calls');
