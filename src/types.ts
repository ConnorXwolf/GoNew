export type Color = 'black' | 'white';

export interface Stone {
  x: number;
  y: number;
  color: Color;
  moveNumber?: number;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  initialStones: Stone[];
  solution: Stone[]; // Sequence of moves
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  viewRange: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  };
  turn: Color;
  quadrant?: string;
  level?: string;
  boardSize?: number;
}

export interface SRSData {
  problemId: string;
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: number; // timestamp
  lastReviewDate: number; // timestamp
}
