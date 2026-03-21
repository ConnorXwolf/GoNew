const data = require('./src/lib/groupedProblems.json');
console.log(data.BEGINNER.slice(0, 5).map(p => p.stoneCount));
