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
  
  // If we have multiple candidates and one matches the excludeId, try to pick another one
  if (closestProblems.length > 1 && excludeId) {
    const filtered = closestProblems.filter(p => p.id !== excludeId);
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }
  
  // Pick a random one from the closest matches
  return closestProblems[Math.floor(Math.random() * closestProblems.length)];
}
