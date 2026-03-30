const fs = require('fs');
const path = require('path');

const problemsPath = path.join(__dirname, 'src', 'lib', 'problems.json');
const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));

const levelLimits = {
  '幼幼班': 3,
  '初學': 5,
  '基礎': 8,
  '中階': 10,
  '高階': 15,
  '極限': 20
};

let updatedCount = 0;
const updatedProblems = problems.map(p => {
  if (p.boardSize === 19 && levelLimits[p.level]) {
    const limit = levelLimits[p.level];
    // Always update to ensure consistency, even if already at limit
    p.solution = p.solution.slice(0, limit);
    p.description = `記憶前 ${limit} 手`;
    updatedCount++;
  }
  return p;
});

if (updatedCount > 0) {
  fs.writeFileSync(problemsPath, JSON.stringify(updatedProblems, null, 2));
  console.log(`Updated ${updatedCount} 19x19 problems.`);
} else {
  console.log('No 19x19 problems found to update.');
}
