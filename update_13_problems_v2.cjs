const fs = require('fs');
const path = require('path');

const problemsPath = path.join(__dirname, 'src', 'lib', 'problems.json');
const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));

const levelLimits = {
  '幼幼班': 5,
  '初學': 8,
  '基礎': 10,
  '中階': 15,
  '高階': 20,
  '極限': 25
};

let updatedCount = 0;
const updatedProblems = problems.map(p => {
  if (p.boardSize === 13 && levelLimits[p.level]) {
    const limit = levelLimits[p.level];
    if (p.solution.length > limit || p.description !== `記憶前 ${limit} 手`) {
      p.solution = p.solution.slice(0, limit);
      p.description = `記憶前 ${limit} 手`;
      updatedCount++;
    }
  }
  return p;
});

if (updatedCount > 0) {
  fs.writeFileSync(problemsPath, JSON.stringify(updatedProblems, null, 2));
  console.log(`Updated ${updatedCount} 13x13 problems.`);
} else {
  console.log('No 13x13 problems needed updating.');
}
