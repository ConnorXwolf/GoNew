import fs from 'fs';
const problems = JSON.parse(fs.readFileSync('src/lib/problems.json', 'utf8'));
const p13 = problems.find(p => p.boardSize === 13);
console.log(JSON.stringify(p13, null, 2));
