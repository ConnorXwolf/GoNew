export type Color = 'black' | 'white';

export interface Stone {
  x: number;
  y: number;
  color: Color;
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
}
