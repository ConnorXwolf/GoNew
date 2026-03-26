import { Problem, Stone, Color } from '../types';

/**
 * Basic SGF Parser for Tesuji Problems
 * Coordinates in SGF are 'aa' to 'ss' (0-18)
 */
export function parseSGF(sgf: string, id: string): Problem | null {
  const stones: Stone[] = [];
  let solution: Stone[] = [];
  let title = 'SGF Problem';
  let description = 'Find the best move.';
  let explanation = '';
  let turn: Color = 'black';

  // Helper to convert SGF coords (aa) to x,y (0,0)
  const charToCoord = (c: string) => c.charCodeAt(0) - 97;

  // Extract initial stones
  const extractStones = (tag: 'AB' | 'AW', color: Color) => {
    const regex = new RegExp(`${tag}(?:\\[[a-s]{2}\\])+`, 'g');
    const matches = sgf.match(regex);
    if (matches) {
      matches.forEach(m => {
        const coords = m.match(/\[([a-s]{2})\]/g);
        if (coords) {
          coords.forEach(c => {
            const coord = c.match(/\[([a-s]{2})\]/)?.[1];
            if (coord) {
              stones.push({ x: charToCoord(coord[0]), y: charToCoord(coord[1]), color });
            }
          });
        }
      });
    }
  };

  extractStones('AB', 'black');
  extractStones('AW', 'white');

  // Extract solution (first move in the sequence)
  // Look for the first move after the initial setup
  const moveMatch = sgf.match(/;([BW])\[([a-s]{2})\]/);

  if (moveMatch) {
    const color = moveMatch[1] === 'B' ? 'black' : 'white';
    const coord = moveMatch[2];
    solution.push({ x: charToCoord(coord[0]), y: charToCoord(coord[1]), color });
    turn = color;
  }

  // Extract metadata
  const gn = sgf.match(/GN\[(.*?)\]/);
  if (gn) title = gn[1];
  
  // Handle multi-line comments and nested brackets
  const cMatch = sgf.match(/C\[([\s\S]*?)\](?=[A-Z]\[|\]|\)|$)/);
  if (cMatch) {
    const comment = cMatch[1].trim();
    const lines = comment.split('\n');
    description = lines[0] || 'Find the best move.';
    explanation = comment;
  }

  if (stones.length === 0 || solution.length === 0) return null;

  // Calculate view range based on stones
  const allX = [...stones.map(s => s.x), ...solution.map(s => s.x)];
  const allY = [...stones.map(s => s.y), ...solution.map(s => s.y)];
  
  const xMin = Math.max(0, Math.min(...allX) - 2);
  const xMax = Math.min(18, Math.max(...allX) + 2);
  const yMin = Math.max(0, Math.min(...allY) - 2);
  const yMax = Math.min(18, Math.max(...allY) + 2);

  return {
    id,
    title,
    description,
    initialStones: stones,
    solution,
    explanation,
    difficulty: 'medium',
    viewRange: { xStart: xMin, xEnd: xMax, yStart: yMin, yEnd: yMax },
    turn
  };
}
