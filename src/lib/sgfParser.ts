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

  // Extract solution (full sequence of moves)
  // Look for all moves in the main branch
  const moveRegex = /;([BW])\[([a-s]{2})\]/g;
  let moveMatch;
  while ((moveMatch = moveRegex.exec(sgf)) !== null) {
    const color = moveMatch[1] === 'B' ? 'black' : 'white';
    const coord = moveMatch[2];
    solution.push({ 
      x: charToCoord(coord[0]), 
      y: charToCoord(coord[1]), 
      color,
      moveNumber: solution.length + 1
    });
  }

  if (solution.length > 0) {
    turn = solution[0].color;
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

  if (solution.length === 0) return null;

  // Calculate view range based on stones
  const allX = [...stones.map(s => s.x), ...solution.map(s => s.x)];
  const allY = [...stones.map(s => s.y), ...solution.map(s => s.y)];
  
  let xMin = 0, xMax = 18, yMin = 0, yMax = 18;
  if (allX.length > 0) {
    xMin = Math.max(0, Math.min(...allX) - 2);
    xMax = Math.min(18, Math.max(...allX) + 2);
    yMin = Math.max(0, Math.min(...allY) - 2);
    yMax = Math.min(18, Math.max(...allY) + 2);
  }

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
