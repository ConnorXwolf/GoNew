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

const shortProblems = problems.filter(p => {
  if (p.boardSize === 13 && levelLimits[p.level]) {
    return p.solution.length < levelLimits[p.level];
  }
  return false;
});

console.log(`Found ${shortProblems.length} 13x13 problems with fewer moves than the limit.`);
if (shortProblems.length > 0) {
  console.log('Example:', JSON.stringify(shortProblems[0], null, 2));
}
