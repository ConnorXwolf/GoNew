import React from 'react';
import { Stone, Color } from '../types';

interface GoBoardProps {
  stones: Stone[];
  viewRange: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  };
  onIntersectionClick: (x: number, y: number) => void;
  lastMove?: Stone;
}

export const GoBoard: React.FC<GoBoardProps> = ({
  stones,
  viewRange,
  onIntersectionClick,
  lastMove,
}) => {
  const { xStart, xEnd, yStart, yEnd } = viewRange;
  const width = xEnd - xStart;
  const height = yEnd - yStart;
  const cellSize = 40;
  const padding = 20;

  const getStoneAt = (x: number, y: number) => {
    return stones.find((s) => s.x === x && s.y === y);
  };

  return (
    <div className="relative inline-block bg-[#e3c16f] p-4 rounded-lg shadow-xl border-4 border-[#8b5a2b]">
      <svg
        width={(width + 1) * cellSize + padding * 2}
        height={(height + 1) * cellSize + padding * 2}
        viewBox={`0 0 ${(width + 1) * cellSize + padding * 2} ${(height + 1) * cellSize + padding * 2}`}
        className="cursor-pointer"
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

        {/* Star Points (Hoshi) - only if they fall within the range */}
        {[3, 9, 15].map((x) =>
          [3, 9, 15].map((y) => {
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
              <circle
                cx={cx}
                cy={cy}
                r={cellSize / 2 - 2}
                fill={stone.color === 'black' ? '#1a1a1a' : '#ffffff'}
                stroke="#1a1a1a"
                strokeWidth="1"
                className="drop-shadow-md"
              />
              {isLast && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={stone.color === 'black' ? '#ffffff' : '#1a1a1a'}
                />
              )}
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
