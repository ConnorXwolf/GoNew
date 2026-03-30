const fs = require('fs');
const path = require('path');

const problemsPath = path.join(__dirname, 'src', 'lib', 'problems.json');
const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));

const levels = new Set();
problems.forEach(p => {
  if (p.boardSize === 13) {
    levels.add(p.level);
  }
});

console.log('Unique levels for 13x13:', Array.from(levels));
