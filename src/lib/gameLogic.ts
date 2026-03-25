import problemsData from './groupedProblems.json';

import { translations, Language } from './i18n';

export type Level = {
  id: string;
  name: (lang: Language) => string;
  size: number;
  attempts: number;
  stones: [number, number];
};

export const LEVELS: Record<string, Level> = {
  BEGINNER: { id: 'beginner', name: (lang) => translations[lang].beginner, size: 19, attempts: 3, stones: [7, 16] },
  BASIC: { id: 'basic', name: (lang) => translations[lang].basic, size: 19, attempts: 3, stones: [17, 47] },
  INTERMEDIATE: { id: 'intermediate', name: (lang) => translations[lang].intermediate, size: 19, attempts: 3, stones: [48, 55] },
  UPPER_INTERMEDIATE: { id: 'upper_intermediate', name: (lang) => translations[lang].upper_intermediate, size: 19, attempts: 3, stones: [56, 62] },
  ADVANCED: { id: 'advanced', name: (lang) => translations[lang].advanced, size: 19, attempts: 3, stones: [63, 73] },
  EXTREME: { id: 'extreme', name: (lang) => translations[lang].extreme, size: 19, attempts: 1, stones: [74, 128] },
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

export const getAchievements = (lang: Language): Achievement[] => {
  const achievements: Achievement[] = [];
  const levelData = [
    { id: 'beginner', key: 'beginner', icon: '🌱' },
    { id: 'basic', key: 'basic', icon: '🪵' },
    { id: 'intermediate', key: 'intermediate', icon: '🪨' },
    { id: 'upper_intermediate', key: 'upper_intermediate', icon: '🥉' },
    { id: 'advanced', key: 'advanced', icon: '🥈' },
    { id: 'extreme', key: 'extreme', icon: '🥇' },
  ];

  const milestones = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  
  levelData.forEach(lvl => {
    const lvlName = translations[lang][lvl.key as keyof typeof translations['en']];
    const t = translations[lang];
    
    milestones.forEach(m => {
      // Played achievements
      achievements.push({
        id: `${lvl.id}_play_${m}`,
        name: `${lvlName} ${t.totalPlayed} ${m}`,
        description: `${t.totalPlayed} ${m} ${lvlName}`,
        icon: lvl.icon
      });
      
      // Correct achievements
      achievements.push({
        id: `${lvl.id}_correct_${m}`,
        name: `${lvlName} ${t.totalCorrect} ${m}`,
        description: `${t.totalCorrect} ${m} ${lvlName}`,
        icon: lvl.icon
      });
    });
  });

  return achievements;
};

export function generateProblem(levelKey: string, targetStones: number, excludeId?: string): Problem {
  const key = levelKey.toUpperCase();
  let problems = GROUPED_PROBLEMS[key] || GROUPED_PROBLEMS[levelKey];
  
  // Fallback if the specific level key is missing (e.g., higher levels not in JSON)
  if (!problems || problems.length === 0) {
    const availableKeys = Object.keys(GROUPED_PROBLEMS);
    if (availableKeys.length > 0) {
      // Use INTERMEDIATE as a good default if available, otherwise the last one
      const fallbackKey = availableKeys.includes('INTERMEDIATE') ? 'INTERMEDIATE' : availableKeys[availableKeys.length - 1];
      problems = GROUPED_PROBLEMS[fallbackKey];
    }
  }

  if (!problems || problems.length === 0) {
    // Ultimate fallback if no problems at all
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
  
  // If we have multiple candidates and one matches the excludeId, try to pick another one
  let selectedProblem: Problem;
  if (closestProblems.length > 1 && excludeId) {
    const filtered = closestProblems.filter(p => p.id !== excludeId);
    if (filtered.length > 0) {
      selectedProblem = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
      selectedProblem = closestProblems[Math.floor(Math.random() * closestProblems.length)];
    }
  } else {
    selectedProblem = closestProblems[Math.floor(Math.random() * closestProblems.length)];
  }

  // Apply sequencing to the board
  return applySequenceToProblem(selectedProblem);
}

function applySequenceToProblem(problem: Problem): Problem {
  const { board } = problem;
  if (!board || !Array.isArray(board)) return problem;
  
  const newBoard = board.map(row => row ? [...row] : []);
  
  const blackStones: { x: number, y: number }[] = [];
  const whiteStones: { x: number, y: number }[] = [];
  
  for (let y = 0; y < board.length; y++) {
    const row = board[y];
    if (!row || !Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 1) blackStones.push({ x, y });
      else if (row[x] === 2) whiteStones.push({ x, y });
    }
  }

  const totalStones = blackStones.length + whiteStones.length;
  if (totalStones === 0) return problem;

  // Clear the board
  for (let y = 0; y < newBoard.length; y++) {
    for (let x = 0; x < newBoard[y].length; x++) {
      newBoard[y][x] = 0;
    }
  }

  // Find the top-left-most stone to start the logical sequence
  const allOriginalStones = [...blackStones, ...whiteStones];
  let currentX = 0;
  let currentY = 0;
  
  if (allOriginalStones.length > 0) {
    let startStone = allOriginalStones[0];
    let minScore = startStone.x + startStone.y * 19;
    for (const s of allOriginalStones) {
      const score = s.x + s.y * 19;
      if (score < minScore) {
        minScore = score;
        startStone = s;
      }
    }
    currentX = startStone.x;
    currentY = startStone.y;
  }

  const getDistance = (s: { x: number, y: number }, tx: number, ty: number) => {
    return Math.sqrt(Math.pow(s.x - tx, 2) + Math.pow(s.y - ty, 2));
  };

  const findAndRemoveClosest = (list: { x: number, y: number }[], tx: number, ty: number) => {
    if (list.length === 0) return null;
    let closestIdx = 0;
    let minD = getDistance(list[0], tx, ty);
    for (let i = 1; i < list.length; i++) {
      const d = getDistance(list[i], tx, ty);
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    }
    return list.splice(closestIdx, 1)[0];
  };

  // Assign numbers while strictly alternating colors (Black odd, White even)
  // and following proximity logic (Go logic)
  for (let move = 1; move <= totalStones; move++) {
    const isBlackMove = move % 2 === 1;
    let targetStone;

    // Try to pick the closest stone of the correct original color first
    if (isBlackMove) {
      targetStone = findAndRemoveClosest(blackStones, currentX, currentY);
      if (!targetStone) {
        targetStone = findAndRemoveClosest(whiteStones, currentX, currentY);
      }
    } else {
      targetStone = findAndRemoveClosest(whiteStones, currentX, currentY);
      if (!targetStone) {
        targetStone = findAndRemoveClosest(blackStones, currentX, currentY);
      }
    }

    if (targetStone) {
      const assignedColor = isBlackMove ? 1 : 2;
      newBoard[targetStone.y][targetStone.x] = assignedColor + move * 10;
      currentX = targetStone.x;
      currentY = targetStone.y;
    }
  }

  return {
    ...problem,
    board: newBoard
  };
}
