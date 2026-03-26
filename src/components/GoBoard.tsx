import React, { useState, useRef, useEffect } from 'react';

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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const cellSize = 10;
  const boardPixelSize = size * cellSize;
  const offset = cellSize / 2;
  const labelMargin = 8;
  const totalSize = boardPixelSize + labelMargin * 2;

  const userColLabels = "ABCDEFGHIJKLMNOPQRS".split(""); 

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

  const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoom === 1) {
      setZoom(1.5);
      // Reset pan when zooming in
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limit panning range
      const limit = (totalSize * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-limit, Math.min(limit, newX)),
        y: Math.max(-limit, Math.min(limit, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const limit = (totalSize * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-limit, Math.min(limit, newX)),
        y: Math.max(-limit, Math.min(limit, newY))
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[min(90vw,480px)] aspect-square bg-[#E3C16F] shadow-xl rounded-sm border-2 border-[#8B5A2B] p-1 sm:p-2 overflow-hidden select-none touch-none"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg 
        viewBox={`-${labelMargin} -${labelMargin} ${totalSize} ${totalSize}`} 
        className="w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <g>
          {/* Coordinates */}
          {Array.from({ length: size }).map((_, i) => (
            <React.Fragment key={`coords-${i}`}>
              {/* Top labels (Letters) */}
              <text
                x={i * cellSize + offset}
                y={-labelMargin / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fill="#5C4033"
                fontWeight="bold"
                className="select-none"
              >
                {userColLabels[i]}
              </text>
              {/* Bottom labels (Letters) */}
              <text
                x={i * cellSize + offset}
                y={boardPixelSize + labelMargin / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fill="#5C4033"
                fontWeight="bold"
                className="select-none"
              >
                {userColLabels[i]}
              </text>
              {/* Left labels (Numbers) */}
              <text
                x={-labelMargin / 2}
                y={i * cellSize + offset}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fill="#5C4033"
                fontWeight="bold"
                className="select-none"
              >
                {size - i}
              </text>
              {/* Right labels (Numbers) */}
              <text
                x={boardPixelSize + labelMargin / 2}
                y={i * cellSize + offset}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fill="#5C4033"
                fontWeight="bold"
                className="select-none"
              >
                {size - i}
              </text>
            </React.Fragment>
          ))}

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
              const pStone = (problemBoard && problemBoard[y]) ? problemBoard[y][x] : 0;
              const pColor = pStone === 0 ? 0 : (pStone % 10);
              const isError = showErrors && problemBoard && pColor !== (stone % 10);
              const isBlack = (stone % 10) === 1;
              
              return (
                <g key={`stone-${x}-${y}`} className="transition-all duration-200">
                  <circle cx={x * cellSize + offset + 0.3} cy={y * cellSize + offset + 0.5} r={4.6} fill="rgba(0,0,0,0.4)" />
                  <circle 
                    cx={x * cellSize + offset} 
                    cy={y * cellSize + offset} 
                    r={4.8} 
                    fill={isBlack ? 'url(#blackStone)' : 'url(#whiteStone)'} 
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
              if (stone !== 0 && boardState[y] && boardState[y][x] === 0) {
                const isBlack = (stone % 10) === 1;
                return (
                  <g key={`missing-${x}-${y}`}>
                    <circle 
                      cx={x * cellSize + offset} 
                      cy={y * cellSize + offset} 
                      r={4.8} 
                      fill={isBlack ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'} 
                      stroke="#ef4444"
                      strokeWidth="0.8"
                      strokeDasharray="1,1"
                    />
                  </g>
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
        </g>

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
