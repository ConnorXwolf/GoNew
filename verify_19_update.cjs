const fs = require('fs');
const path = require('path');

const problemsPath = path.join(__dirname, 'src', 'lib', 'problems.json');
const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));

const updated19 = problems.filter(p => p.boardSize === 19).slice(0, 5);

console.log('Sample updated 19x19 problems:');
updated19.forEach(p => {
  console.log(`ID: ${p.id}, Level: ${p.level}, Solution Length: ${p.solution.length}, Description: ${p.description}`);
});
