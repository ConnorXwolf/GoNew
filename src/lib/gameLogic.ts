import problemsData from './groupedProblems.json';

export type Level = {
  id: string;
  name: string;
  size: number;
  attempts: number;
  stones: [number, number];
};

export const LEVELS: Record<string, Level> = {
  BEGINNER: { id: 'beginner', name: '初學', size: 19, attempts: 3, stones: [7, 16] },
  BASIC: { id: 'basic', name: '基礎', size: 19, attempts: 3, stones: [17, 47] },
  INTERMEDIATE: { id: 'intermediate', name: '中階', size: 19, attempts: 3, stones: [48, 55] },
  UPPER_INTERMEDIATE: { id: 'upper_intermediate', name: '中高階', size: 19, attempts: 3, stones: [56, 62] },
  ADVANCED: { id: 'advanced', name: '高階', size: 19, attempts: 3, stones: [63, 73] },
  EXTREME: { id: 'extreme', name: '極限', size: 19, attempts: 1, stones: [74, 128] },
};

export const LEVEL_ORDER = ['BEGINNER', 'BASIC', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'EXTREME'];

export type Problem = {
  id: string;
  size?: number;
  stoneCount: number;
  board: number[][];
};

export const GROUPED_PROBLEMS: Record<string, Problem[]> = problemsData as Record<string, Problem[]>;


export type UserStats = {
  totalPlayed: number;
  totalCorrect: number;
  maxStreak: number;
  levelPlays: Record<string, number>;
  levelCorrect: Record<string, number>;
  levelMaxStreak: Record<string, number>;
  levelCurrentStreak: Record<string, number>;
  achievements: string[];
};

export const DEFAULT_STATS: UserStats = {
  totalPlayed: 0,
  totalCorrect: 0,
  maxStreak: 0,
  levelPlays: {},
  levelCorrect: {},
  levelMaxStreak: {},
  levelCurrentStreak: {},
  achievements: [],
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: Achievement[] = (() => {
  const achievements: Achievement[] = [];
  const levelData = [
    { id: 'beginner', name: '初學', icon: '🌱' },
    { id: 'basic', name: '基礎', icon: '🪵' },
    { id: 'intermediate', name: '中階', icon: '🪨' },
    { id: 'upper_intermediate', name: '中高階', icon: '🥉' },
    { id: 'advanced', name: '高階', icon: '🥈' },
    { id: 'extreme', name: '極限', icon: '🥇' },
  ];

  levelData.forEach(lvl => {
    achievements.push(
      { id: `${lvl.id}_play_1`, name: `體驗${lvl.name}`, description: `完成 1 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_play_10`, name: `${lvl.name}學徒`, description: `完成 10 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_play_50`, name: `${lvl.name}熟手`, description: `完成 50 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_play_100`, name: `${lvl.name}狂熱者`, description: `完成 100 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_correct_1`, name: `${lvl.name}首勝`, description: `答對 1 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_correct_10`, name: `${lvl.name}十勝`, description: `答對 10 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_correct_50`, name: `${lvl.name}五十勝`, description: `答對 50 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_correct_100`, name: `${lvl.name}百勝`, description: `答對 100 題${lvl.name}題目`, icon: lvl.icon },
      { id: `${lvl.id}_streak_3`, name: `${lvl.name}連勝`, description: `在${lvl.name}連續答對 3 題`, icon: lvl.icon },
      { id: `${lvl.id}_streak_10`, name: `${lvl.name}主宰`, description: `在${lvl.name}連續答對 10 題`, icon: lvl.icon }
    );
  });

  return achievements;
})();

export function generateProblem(levelKey: string, targetStones: number): Problem {
  const problems = GROUPED_PROBLEMS[levelKey];
  if (!problems || problems.length === 0) {
    // Fallback if something goes wrong
    return {
      id: 'fallback',
      size: 19,
      stoneCount: 0,
      board: Array(19).fill(null).map(() => Array(19).fill(0))
    };
  }
  
  // Find problems with stoneCount closest to targetStones
  let closestProblems = [];
  let minDiff = Infinity;
  
  for (const p of problems) {
    const diff = Math.abs(p.stoneCount - targetStones);
    if (diff < minDiff) {
      minDiff = diff;
      closestProblems = [p];
    } else if (diff === minDiff) {
      closestProblems.push(p);
    }
  }
  
  // Pick a random one from the closest matches
  return closestProblems[Math.floor(Math.random() * closestProblems.length)];
}
