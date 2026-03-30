import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { parseSGF } from './sgfParser';

const ZIP_FILE_NAME = 'problems.zip'; // Assume this is the name
const OUTPUT_FILE = './src/lib/problems.json';

async function main() {
  const files = fs.readdirSync('.');
  const zipFiles = files.filter(f => f.endsWith('.zip'));
  
  if (zipFiles.length === 0) {
    console.error(`No zip files found in root directory`);
    return;
  }

  const allProblems: any[] = [];

  for (const zipFileName of zipFiles) {
    const zipPath = path.resolve(zipFileName);
    console.log(`Processing ${zipFileName}...`);
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    console.log(`Found ${zipEntries.length} entries in ${zipFileName}`);

    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.sgf')) {
        const sgfContent = entry.getData().toString('utf8');
        const baseId = path.basename(entry.entryName, '.sgf');
        try {
          const baseProblem = parseSGF(sgfContent, baseId);
          if (!baseProblem) continue;
          const fullSolution = baseProblem.solution;
          const boardSize = baseProblem.boardSize || 19;
          
          // Define difficulty levels and their move counts based on board size
          let levels: { name: string, count: number }[] = [];
          
          if (boardSize === 9) {
            levels = [
              { name: '幼幼班', count: 5 },
              { name: '初學', count: 10 },
              { name: '基礎', count: 20 },
              { name: '中階', count: 40 },
              { name: '高階', count: 60 }
            ];
          } else if (boardSize === 13) {
            levels = [
              { name: '幼幼班', count: 10 },
              { name: '初學', count: 30 },
              { name: '基礎', count: 60 },
              { name: '中階', count: 80 },
              { name: '高階', count: 100 }
            ];
          } else {
            // Default for 19x19 or others
            levels = [
              { name: '幼幼班', count: 15 },
              { name: '初學', count: 35 },
              { name: '基礎', count: 65 },
              { name: '中階', count: 85 },
              { name: '高階', count: 105 }
            ];
          }

          // Add partial problems
          levels.forEach(level => {
            if (fullSolution.length >= level.count) {
              allProblems.push({
                ...baseProblem,
                id: `${zipFileName}_${path.basename(entry.entryName, '.sgf')}_${level.name}`,
                level: level.name,
                solution: fullSolution.slice(0, level.count)
              });
            }
          });

          // Always add the full solution as "極限"
          if (boardSize === 13) {
             if (fullSolution.length >= 100) {
                allProblems.push({
                  ...baseProblem,
                  id: `${zipFileName}_${path.basename(entry.entryName, '.sgf')}_極限`,
                  level: '極限',
                  solution: fullSolution
                });
             }
          } else if (boardSize === 19) {
            if (fullSolution.length > 105) {
              allProblems.push({
                ...baseProblem,
                id: `${zipFileName}_${path.basename(entry.entryName, '.sgf')}_極限`,
                level: '極限',
                solution: fullSolution.slice(0, 200)
              });
            }
          } else {
            allProblems.push({
              ...baseProblem,
              id: `${zipFileName}_${path.basename(entry.entryName, '.sgf')}_極限`,
              level: '極限',
              solution: fullSolution
            });
          }

        } catch (err) {
          console.error(`Error parsing ${entry.entryName} in ${zipFileName}:`, err);
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProblems));
  console.log(`Successfully imported ${allProblems.length} problems to ${OUTPUT_FILE}`);
}

main().catch(console.error);
