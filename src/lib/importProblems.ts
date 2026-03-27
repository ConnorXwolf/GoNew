import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { parseSGF } from './sgfParser';

const ZIP_FILE_NAME = 'problems.zip'; // Assume this is the name
const OUTPUT_FILE = './src/lib/problems.json';

async function main() {
  const zipPath = path.resolve(ZIP_FILE_NAME);
  if (!fs.existsSync(zipPath)) {
    console.error(`Zip file not found: ${ZIP_FILE_NAME}`);
    return;
  }

  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  const allProblems: any[] = [];

  console.log(`Found ${zipEntries.length} entries in zip`);

  for (const entry of zipEntries) {
    if (entry.entryName.endsWith('.sgf')) {
      const sgfContent = entry.getData().toString('utf8');
      const baseId = path.basename(entry.entryName, '.sgf');
      try {
        const baseProblem = parseSGF(sgfContent, baseId);
        if (!baseProblem) continue;
        const fullSolution = baseProblem.solution;
        
        // Define difficulty levels and their move counts
        const levels = [
          { name: '幼幼班', count: 5 },
          { name: '初學', count: 10 },
          { name: '基礎', count: 20 },
          { name: '中階', count: 40 },
          { name: '高階', count: 60 }
        ];

        // Add partial problems
        levels.forEach(level => {
          if (fullSolution.length >= level.count) {
            allProblems.push({
              ...baseProblem,
              id: `${path.basename(entry.entryName, '.sgf')}_${level.name}`,
              level: level.name,
              solution: fullSolution.slice(0, level.count)
            });
          }
        });

        // Always add the full solution as "極限"
        allProblems.push({
          ...baseProblem,
          id: `${path.basename(entry.entryName, '.sgf')}_極限`,
          level: '極限',
          solution: fullSolution
        });

      } catch (err) {
        console.error(`Error parsing ${entry.entryName}:`, err);
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProblems, null, 2));
  console.log(`Successfully imported ${allProblems.length} problems to ${OUTPUT_FILE}`);
}

main().catch(console.error);
