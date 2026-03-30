import React from 'react';
import { Stone, Color } from '../types';

interface GoBoardProps {
  stones: Stone[];
  errorStones?: Stone[];
  viewRange: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  };
  onIntersectionClick: (x: number, y: number) => void;
  lastMove?: Stone;
  showMoveNumbers?: boolean;
  boardSize?: number;
}

export const GoBoard: React.FC<GoBoardProps> = ({
  stones,
  errorStones = [],
  viewRange,
  onIntersectionClick,
  lastMove,
  showMoveNumbers = false,
  boardSize = 19,
}) => {
  const { xStart, xEnd, yStart, yEnd } = viewRange;
  const width = xEnd - xStart;
  const height = yEnd - yStart;
  const cellSize = 40;
  const padding = 50; // Increased padding to move coordinates further away

  const getXLabel = (val: number) => {
    if (boardSize === 9) {
      const labels = "ABCDEFGHI";
      return labels[val] || val.toString();
    }
    if (boardSize === 13) {
      const labels = "ABCDEFGHIJKLM";
      return labels[val] || val.toString();
    }
    const labels = "ABCDEFGHJKLMNOPQRST";
    return labels[val] || val.toString();
  };

  const getYLabel = (val: number) => {
    return (boardSize - val).toString();
  };

  // For relative coordinates as requested (A-I, 1-9)
  const getRelativeXLabel = (i: number) => {
    const absoluteX = xStart + i;
    return getXLabel(absoluteX);
  };
  const getRelativeYLabel = (j: number) => {
    const absoluteY = yStart + j;
    return getYLabel(absoluteY);
  };

  return (
    <div className="relative inline-block bg-[#e3c16f] p-1 sm:p-2 rounded-lg shadow-xl border-2 sm:border-4 border-[#8b5a2b] w-full max-w-[600px]">
      <svg
        viewBox={`0 0 ${width * cellSize + padding * 2} ${height * cellSize + padding * 2}`}
        className="w-full h-auto cursor-pointer block"
      >
        {/* Grid Lines */}
        {Array.from({ length: width + 1 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={padding + i * cellSize}
            y1={padding}
            x2={padding + i * cellSize}
            y2={padding + height * cellSize}
            stroke="#1a1a1a"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: height + 1 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={padding}
            y1={padding + i * cellSize}
            x2={padding + width * cellSize}
            y2={padding + i * cellSize}
            stroke="#1a1a1a"
            strokeWidth="1"
          />
        ))}

        {/* Coordinates */}
        {Array.from({ length: width + 1 }).map((_, i) => (
          <g key={`coord-x-${i}`}>
            <text
              x={padding + i * cellSize}
              y={padding / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5d4037"
            >
              {getRelativeXLabel(i)}
            </text>
            <text
              x={padding + i * cellSize}
              y={padding + height * cellSize + padding / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5d4037"
            >
              {getRelativeXLabel(i)}
            </text>
          </g>
        ))}
        {Array.from({ length: height + 1 }).map((_, j) => (
          <g key={`coord-y-${j}`}>
            <text
              x={padding / 2}
              y={padding + j * cellSize}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5d4037"
            >
              {getRelativeYLabel(j)}
            </text>
            <text
              x={padding + width * cellSize + padding / 2}
              y={padding + j * cellSize}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5d4037"
            >
              {getRelativeYLabel(j)}
            </text>
          </g>
        ))}

        {/* Star Points (Hoshi) - only if they fall within the range */}
        {(boardSize === 9 ? [2, 6, 4] : boardSize === 13 ? [3, 9, 6] : [3, 9, 15]).map((x) =>
          (boardSize === 9 ? [2, 6, 4] : boardSize === 13 ? [3, 9, 6] : [3, 9, 15]).map((y) => {
            // For 9x9, only show (4,4) as the center point, and (2,2), (2,6), (6,2), (6,6)
            if (boardSize === 9 && x === 4 && y !== 4) return null;
            if (boardSize === 9 && y === 4 && x !== 4) return null;
            
            // For 13x13, center point is (6,6), corners are (3,3), (3,9), (9,3), (9,9)
            if (boardSize === 13 && x === 6 && y !== 6) return null;
            if (boardSize === 13 && y === 6 && x !== 6) return null;
            
            if (x >= xStart && x <= xEnd && y >= yStart && y <= yEnd) {
              return (
                <circle
                  key={`hoshi-${x}-${y}`}
                  cx={padding + (x - xStart) * cellSize}
                  cy={padding + (y - yStart) * cellSize}
                  r="3"
                  fill="#1a1a1a"
                />
              );
            }
            return null;
          })
        )}

        {/* Clickable Intersections */}
        {Array.from({ length: width + 1 }).map((_, i) =>
          Array.from({ length: height + 1 }).map((_, j) => {
            const x = xStart + i;
            const y = yStart + j;
            return (
              <rect
                key={`click-${x}-${y}`}
                x={padding + i * cellSize - cellSize / 2}
                y={padding + j * cellSize - cellSize / 2}
                width={cellSize}
                height={cellSize}
                fill="transparent"
                onClick={() => onIntersectionClick(x, y)}
                className="hover:fill-black/5 transition-colors"
              />
            );
          })
        )}

        {/* Stones */}
        {stones.map((stone, idx) => {
          if (stone.x < xStart || stone.x > xEnd || stone.y < yStart || stone.y > yEnd) return null;
          const cx = padding + (stone.x - xStart) * cellSize;
          const cy = padding + (stone.y - yStart) * cellSize;
          const isLast = lastMove?.x === stone.x && lastMove?.y === stone.y;

          return (
            <g key={`stone-${idx}`} className="pointer-events-none">
              <defs>
                <radialGradient id="blackStoneGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#444" />
                  <stop offset="100%" stopColor="#000" />
                </radialGradient>
                <radialGradient id="whiteStoneGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fff" />
                  <stop offset="100%" stopColor="#ddd" />
                </radialGradient>
              </defs>
              <circle
                cx={cx}
                cy={cy}
                r={cellSize / 2 - 2}
                fill={stone.color === 'black' ? 'url(#blackStoneGradient)' : 'url(#whiteStoneGradient)'}
                stroke={stone.color === 'black' ? '#000' : '#ccc'}
                strokeWidth="0.5"
                className="drop-shadow-md"
              />
              {/* Highlight stones if errorStones are present */}
              {errorStones.length > 0 && stone.moveNumber !== undefined && (
                (() => {
                  const isCorrect = errorStones.some(s => s.x === stone.x && s.y === stone.y && s.color === stone.color);
                  if (isCorrect) {
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={cellSize / 2 + 2}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                          className="opacity-80"
                        />
                        {!showMoveNumbers && (
                          <text
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="18"
                            fontWeight="bold"
                            fill={stone.color === 'black' ? '#fff' : '#000'}
                            className="select-none pointer-events-none"
                          >
                            {stone.moveNumber}
                          </text>
                        )}
                      </g>
                    );
                  } else {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={cellSize / 2 + 2}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                    );
                  }
                })()
              )}
              {showMoveNumbers && stone.moveNumber !== undefined && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="18"
                  fontWeight="bold"
                  fill={stone.color === 'black' ? '#fff' : '#000'}
                  className="select-none pointer-events-none"
                >
                  {stone.moveNumber}
                </text>
              )}
              {isLast && !showMoveNumbers && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={stone.color === 'black' ? '#ffffff' : '#1a1a1a'}
                  opacity="0.8"
                />
              )}
            </g>
          );
        })}

        {/* Error/Correct Solution Stones (Ghost Stones) */}
        {errorStones.map((stone, idx) => {
          if (stone.x < xStart || stone.x > xEnd || stone.y < yStart || stone.y > yEnd) return null;
          const cx = padding + (stone.x - xStart) * cellSize;
          const cy = padding + (stone.y - yStart) * cellSize;
          
          // Check if user already placed a stone here correctly
          const isAlreadyPlacedCorrectly = stones.some(s => s.x === stone.x && s.y === stone.y && s.color === stone.color);
          if (isAlreadyPlacedCorrectly) return null;

          return (
            <g key={`error-stone-${idx}`} className="pointer-events-none">
              {/* Green dashed border for correct solution */}
              <circle
                cx={cx}
                cy={cy}
                r={cellSize / 2 + 2}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray="4 2"
                className="opacity-80"
              />
              {/* Semi-transparent ghost stone */}
              <circle
                cx={cx}
                cy={cy}
                r={cellSize / 2 - 2}
                fill={stone.color === 'black' ? '#000' : '#fff'}
                className="opacity-30"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="18"
                fontWeight="black"
                fill={stone.color === 'black' ? '#fff' : '#000'}
                className="opacity-80"
              >
                {stone.moveNumber ?? idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Coordinates */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
         {/* We can add letters/numbers here if needed */}
      </div>
    </div>
  );
};
