import fs from 'fs';

const problems = JSON.parse(fs.readFileSync('./src/lib/problems.json', 'utf8'));

const summary = {};

problems.forEach(p => {
  const size = p.boardSize || 19;
  const level = p.level || '未知';
  const key = `${size}x${size}`;
  
  if (!summary[key]) summary[key] = {};
  if (!summary[key][level]) summary[key][level] = 0;
  
  summary[key][level]++;
});

console.log('=== 題目統計報告 ===');
Object.keys(summary).sort().forEach(size => {
  console.log(`\n棋盤大小: ${size}`);
  let total = 0;
  Object.keys(summary[size]).sort().forEach(level => {
    console.log(`  - ${level}: ${summary[size][level]} 題`);
    total += summary[size][level];
  });
  console.log(`  * 總計: ${total} 題`);
});
