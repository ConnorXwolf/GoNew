import React from 'react';

interface GoBoardProps {
  size: number;
  boardState: number[][];
  interactive?: boolean;
  onIntersectionClick?: (x: number, y: number) => void;
  showErrors?: boolean;
  problemBoard?: number[][];
}

export const GoBoard: React.FC<GoBoardProps> = ({
  size,
  boardState,
  interactive = false,
  onIntersectionClick,
  showErrors = false,
  problemBoard,
}) => {
  const cellSize = 10;
  const boardPixelSize = size * cellSize;
  const offset = cellSize / 2;

  const starPoints = [];
  if (size === 9) {
    starPoints.push([2, 2], [6, 2], [4, 4], [2, 6], [6, 6]);
  } else if (size === 13) {
    starPoints.push([3, 3], [9, 3], [6, 6], [3, 9], [9, 9]);
  } else if (size === 19) {
    starPoints.push(
      [3, 3], [9, 3], [15, 3],
      [3, 9], [9, 9], [15, 9],
      [3, 15], [9, 15], [15, 15]
    );
  }

  return (
    <div className="relative w-full max-w-md aspect-square bg-[#E3C16F] shadow-xl rounded-sm border-2 border-[#8B5A2B] p-2">
      <svg viewBox={`0 0 ${boardPixelSize} ${boardPixelSize}`} className="w-full h-full">
        {Array.from({ length: size }).map((_, i) => (
          <g key={`lines-${i}`}>
            <line 
              x1={offset} y1={i * cellSize + offset} 
              x2={boardPixelSize - offset} y2={i * cellSize + offset} 
              stroke="#5C4033" strokeWidth="0.3" 
            />
            <line 
              x1={i * cellSize + offset} y1={offset} 
              x2={i * cellSize + offset} y2={boardPixelSize - offset} 
              stroke="#5C4033" strokeWidth="0.3" 
            />
          </g>
        ))}
        
        {starPoints.map(([x, y], i) => (
          <circle key={`star-${i}`} cx={x * cellSize + offset} cy={y * cellSize + offset} r={0.8} fill="#5C4033" />
        ))}
        
        {boardState.map((row, y) => 
          row.map((stone, x) => {
            if (stone === 0) return null;
            const isError = showErrors && problemBoard && problemBoard[y][x] !== stone;
            return (
              <g key={`stone-${x}-${y}`} className="transition-all duration-200">
                <circle cx={x * cellSize + offset + 0.3} cy={y * cellSize + offset + 0.5} r={4.6} fill="rgba(0,0,0,0.4)" />
                <circle 
                  cx={x * cellSize + offset} 
                  cy={y * cellSize + offset} 
                  r={4.8} 
                  fill={stone === 1 ? 'url(#blackStone)' : 'url(#whiteStone)'} 
                />
                {isError && (
                  <circle cx={x * cellSize + offset} cy={y * cellSize + offset} r={1.5} fill="#ef4444" />
                )}
              </g>
            );
          })
        )}

        {showErrors && problemBoard && problemBoard.map((row, y) => 
          row.map((stone, x) => {
            if (stone !== 0 && boardState[y][x] === 0) {
              return (
                <circle 
                  key={`missing-${x}-${y}`}
                  cx={x * cellSize + offset} 
                  cy={y * cellSize + offset} 
                  r={4.8} 
                  fill={stone === 1 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'} 
                  stroke="#ef4444"
                  strokeWidth="0.8"
                  strokeDasharray="1,1"
                />
              );
            }
            return null;
          })
        )}

        {interactive && Array.from({ length: size }).map((_, y) => 
          Array.from({ length: size }).map((_, x) => (
            <rect 
              key={`click-${x}-${y}`}
              x={x * cellSize} 
              y={y * cellSize} 
              width={cellSize} 
              height={cellSize} 
              fill="transparent" 
              className="cursor-pointer hover:fill-black/10 transition-colors"
              onClick={() => onIntersectionClick?.(x, y)} 
            />
          ))
        )}

        <defs>
          <radialGradient id="blackStone" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#555" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <radialGradient id="whiteStone" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#d4d4d4" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};
