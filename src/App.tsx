/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, X, Trophy, TrendingUp, Award, ChevronRight } from 'lucide-react';
import { GoBoard } from './components/GoBoard';
import { LEVELS, LEVEL_ORDER, Level, generateProblem, UserStats, DEFAULT_STATS, ACHIEVEMENTS } from './lib/gameLogic';

type GameState = 'menu' | 'memorize' | 'recall' | 'result' | 'gameover';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [currentLevelKey, setCurrentLevelKey] = useState<string | null>(null);
  const [currentStoneCount, setCurrentStoneCount] = useState<number>(0);
  
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [problemBoard, setProblemBoard] = useState<number[][]>([]);
  const [userBoard, setUserBoard] = useState<number[][]>([]);
  const [selectedTool, setSelectedTool] = useState<number>(1); // 1: black, 2: white, 0: eraser
  const [showErrors, setShowErrors] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Stats & Achievements
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [unlockedNotifs, setUnlockedNotifs] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('goMemoryStats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStats({
          ...DEFAULT_STATS,
          ...parsed,
          levelPlays: parsed.levelPlays || {},
          levelCorrect: parsed.levelCorrect || {},
          levelMaxStreak: parsed.levelMaxStreak || {},
          levelCurrentStreak: parsed.levelCurrentStreak || {},
          achievements: parsed.achievements || []
        });
      } catch (e) {
        console.error('Failed to parse stats', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('goMemoryStats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'memorize' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'memorize' && timeLeft === 0) {
      setGameState('recall');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const checkAchievements = (newStats: UserStats, levelId: string) => {
    const newlyUnlocked: string[] = [];
    const checkAndUnlock = (id: string, condition: boolean) => {
      if (!newStats.achievements.includes(id) && condition) {
        newStats.achievements.push(id);
        newlyUnlocked.push(id);
      }
    };

    const plays = newStats.levelPlays[levelId] || 0;
    const corrects = newStats.levelCorrect[levelId] || 0;
    const maxStreak = newStats.levelMaxStreak[levelId] || 0;

    checkAndUnlock(`${levelId}_play_1`, plays >= 1);
    checkAndUnlock(`${levelId}_play_10`, plays >= 10);
    checkAndUnlock(`${levelId}_play_50`, plays >= 50);
    checkAndUnlock(`${levelId}_play_100`, plays >= 100);

    checkAndUnlock(`${levelId}_correct_1`, corrects >= 1);
    checkAndUnlock(`${levelId}_correct_10`, corrects >= 10);
    checkAndUnlock(`${levelId}_correct_50`, corrects >= 50);
    checkAndUnlock(`${levelId}_correct_100`, corrects >= 100);

    checkAndUnlock(`${levelId}_streak_3`, maxStreak >= 3);
    checkAndUnlock(`${levelId}_streak_10`, maxStreak >= 10);

    if (newlyUnlocked.length > 0) {
      setUnlockedNotifs(prev => [...prev, ...newlyUnlocked]);
      setTimeout(() => {
        setUnlockedNotifs(prev => prev.filter(id => !newlyUnlocked.includes(id)));
      }, 4000);
    }
    return newStats;
  };

  const startProblem = (levelKey: string, level: Level, stoneCount: number) => {
    const newProblem = generateProblem(levelKey, stoneCount);
    setProblemBoard(newProblem.board);
    setUserBoard(Array(level.size).fill(null).map(() => Array(level.size).fill(0)));
    setGameState('memorize');
    setTimeLeft(30);
    setAttemptsLeft(level.attempts);
    setShowErrors(false);
    setMessage(null);
  };

  const handleStartGame = (levelKey: string) => {
    const level = LEVELS[levelKey];
    setCurrentLevel(level);
    setCurrentLevelKey(levelKey);
    setScore(0);
    setStreak(0);
    setCurrentStoneCount(level.stones[0]);
    startProblem(levelKey, level, level.stones[0]);
  };

  const handleNextLevel = () => {
    if (!currentLevelKey) return;
    const currentIndex = LEVEL_ORDER.indexOf(currentLevelKey);
    if (currentIndex < LEVEL_ORDER.length - 1) {
      const nextKey = LEVEL_ORDER[currentIndex + 1];
      handleStartGame(nextKey);
    }
  };

  const handleSubmit = () => {
    if (!currentLevel || !currentLevelKey) return;

    let isCorrect = true;
    for (let y = 0; y < currentLevel.size; y++) {
      for (let x = 0; x < currentLevel.size; x++) {
        if (problemBoard[y][x] !== userBoard[y][x]) {
          isCorrect = false;
          break;
        }
      }
      if (!isCorrect) break;
    }

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(score + (newStreak >= 3 ? 5 : 1));
      
      // Update Stats
      let newStats = { ...stats };
      newStats.totalPlayed += 1;
      newStats.totalCorrect += 1;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStreak);
      newStats.levelPlays[currentLevel.id] = (newStats.levelPlays[currentLevel.id] || 0) + 1;
      newStats.levelCorrect[currentLevel.id] = (newStats.levelCorrect[currentLevel.id] || 0) + 1;
      
      const currentLevelStreak = (newStats.levelCurrentStreak[currentLevel.id] || 0) + 1;
      newStats.levelCurrentStreak[currentLevel.id] = currentLevelStreak;
      newStats.levelMaxStreak[currentLevel.id] = Math.max(newStats.levelMaxStreak[currentLevel.id] || 0, currentLevelStreak);
      
      newStats = checkAchievements(newStats, currentLevel.id);
      setStats(newStats);

      // DDA: Increase difficulty
      const nextStones = Math.min(currentLevel.stones[1], currentStoneCount + 1);
      setCurrentStoneCount(nextStones);
      
      setGameState('result');
    } else {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      if (newAttempts === 0) {
        // Update Stats
        let newStats = { ...stats };
        newStats.totalPlayed += 1;
        newStats.levelPlays[currentLevel.id] = (newStats.levelPlays[currentLevel.id] || 0) + 1;
        newStats.levelCurrentStreak[currentLevel.id] = 0; // Reset level streak
        
        newStats = checkAchievements(newStats, currentLevel.id);
        setStats(newStats);

        // DDA: Decrease difficulty
        const nextStones = Math.max(currentLevel.stones[0], currentStoneCount - 1);
        setCurrentStoneCount(nextStones);

        setGameState('gameover');
        setShowErrors(true);
      } else {
        setMessage(`錯誤！還有 ${newAttempts} 次機會`);
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const isMaxDifficulty = currentLevel && currentStoneCount === currentLevel.stones[1];
  const hasNextLevel = currentLevelKey && LEVEL_ORDER.indexOf(currentLevelKey) < LEVEL_ORDER.length - 1;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans flex flex-col items-center py-8 px-4 relative overflow-x-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {unlockedNotifs.map(id => {
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          if (!ach) return null;
          return (
            <div key={id} className="bg-white border-l-4 border-amber-400 shadow-lg rounded-r-lg p-4 flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-2xl">{ach.icon}</div>
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">解鎖成就！</p>
                <p className="text-stone-800 font-bold">{ach.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm gap-4">
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stone-800 to-stone-600 shadow-sm border border-stone-900"></div>
            GoMemo
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-stone-200 shadow-sm border border-stone-300"></div>
          </h1>
          {gameState !== 'menu' && (
            <div className="flex gap-4 text-sm font-medium items-center">
              <div className="bg-stone-100 px-3 py-1 rounded-md">
                分數: <span className="text-emerald-600 font-bold">{score}</span>
              </div>
              <div className="bg-stone-100 px-3 py-1 rounded-md">
                連勝: <span className="text-amber-600 font-bold">{streak}</span>
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="text-stone-500 hover:text-stone-800 transition-colors"
              >
                退出
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col items-center min-h-[500px] justify-center relative">
          {gameState === 'menu' && (
            <div className="flex flex-col items-center w-full">
              {showStats ? (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                      <Trophy className="text-amber-500" /> 我的成就與紀錄
                    </h2>
                    <button onClick={() => setShowStats(false)} className="text-stone-500 hover:text-stone-800 font-medium">
                      返回選單
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col items-center text-center">
                      <span className="text-stone-500 text-xs sm:text-sm font-bold mb-1">總練習題數</span>
                      <span className="text-2xl font-black text-stone-800">{stats.totalPlayed}</span>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col items-center text-center">
                      <span className="text-stone-500 text-xs sm:text-sm font-bold mb-1">總答對題數</span>
                      <span className="text-2xl font-black text-emerald-600">{stats.totalCorrect}</span>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col items-center text-center">
                      <span className="text-stone-500 text-xs sm:text-sm font-bold mb-1">最高連勝</span>
                      <span className="text-2xl font-black text-amber-600">{stats.maxStreak}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-stone-700 mb-4 flex items-center gap-2">
                    <Award className="text-indigo-500" /> 獲得成就
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ACHIEVEMENTS.map(ach => {
                      const isUnlocked = stats.achievements.includes(ach.id);
                      return (
                        <div key={ach.id} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isUnlocked ? 'bg-white border-amber-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60 grayscale'}`}>
                          <div className="text-3xl">{ach.icon}</div>
                          <div>
                            <div className={`font-bold ${isUnlocked ? 'text-stone-800' : 'text-stone-500'}`}>{ach.name}</div>
                            <div className="text-xs text-stone-500">{ach.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="w-full animate-in fade-in duration-300">
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-semibold text-stone-700">選擇難度</h2>
                    <button onClick={() => setShowStats(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                      <TrendingUp className="w-4 h-4" /> 學習紀錄
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {LEVEL_ORDER.map((key) => {
                      const level = LEVELS[key];
                      return (
                        <button
                          key={level.id}
                          onClick={() => handleStartGame(key)}
                          className="p-4 border-2 border-stone-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md transition-all flex flex-col items-center group relative overflow-hidden"
                        >
                          <span className="text-lg font-bold text-stone-800 group-hover:text-emerald-700">
                            {level.name}
                          </span>
                          <span className="text-sm text-stone-500 mt-1">
                            {level.stones[0]}~{level.stones[1]} 顆子 | {level.attempts} 次機會
                          </span>
                          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300 w-0 group-hover:w-full"></div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 text-sm text-stone-600 bg-stone-50 p-5 rounded-xl w-full border border-stone-100">
                    <p className="font-bold mb-3 text-stone-800">規則說明：</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>觀察並記憶棋盤上的黑白子位置（最多30秒）。</li>
                      <li>在空白棋盤上還原剛才的棋子位置。</li>
                      <li>系統會根據您的表現自動微調題目難度（棋子數量）。</li>
                      <li>答對得 1 分，連續答對 3 題以上每題得 5 分！</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState === 'memorize' && currentLevel && (
            <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
              <div className="flex justify-between w-full mb-6 items-center px-2">
                <span className="font-bold text-lg text-stone-700">
                  {currentLevel.name} <span className="text-stone-400 mx-2">|</span> 記憶階段
                </span>
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <span className="text-amber-600 font-mono text-xl font-bold">{timeLeft}</span>
                  <span className="text-amber-600 text-sm font-medium">秒</span>
                </div>
              </div>
              <GoBoard size={currentLevel.size} boardState={problemBoard} interactive={false} />
              <button
                onClick={() => setGameState('recall')}
                className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                我記好了 (提早結束)
              </button>
            </div>
          )}

          {gameState === 'recall' && currentLevel && (
            <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
              <div className="flex justify-between w-full mb-6 items-center px-2">
                <span className="font-bold text-lg text-stone-700">
                  {currentLevel.name} <span className="text-stone-400 mx-2">|</span> 驗收階段
                </span>
                <span className="text-stone-500 text-sm font-medium bg-stone-100 px-3 py-1 rounded-full">
                  剩餘機會: <span className="text-stone-800 font-bold">{attemptsLeft}</span>
                </span>
              </div>

              <GoBoard
                size={currentLevel.size}
                boardState={userBoard}
                interactive={true}
                onIntersectionClick={(x, y) => {
                  const newBoard = [...userBoard];
                  newBoard[y] = [...newBoard[y]];
                  newBoard[y][x] = selectedTool;
                  setUserBoard(newBoard);
                }}
              />

              {/* Toolbar */}
              <div className="flex gap-4 mt-8 bg-stone-100 p-2 rounded-2xl shadow-inner border border-stone-200">
                <button
                  onClick={() => setSelectedTool(1)}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    selectedTool === 1
                      ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110'
                      : 'hover:bg-stone-200'
                  }`}
                  title="黑子"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-600 to-black shadow-sm" />
                </button>
                <button
                  onClick={() => setSelectedTool(2)}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    selectedTool === 2
                      ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110'
                      : 'hover:bg-stone-200'
                  }`}
                  title="白子"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-stone-300 shadow-sm border border-stone-200" />
                </button>
                <button
                  onClick={() => setSelectedTool(0)}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    selectedTool === 0
                      ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110'
                      : 'hover:bg-stone-200'
                  }`}
                  title="橡皮擦"
                >
                  <X className="w-8 h-8 text-stone-500" />
                </button>
              </div>

              {message && (
                <div className="mt-6 text-red-500 font-bold animate-bounce bg-red-50 px-4 py-2 rounded-full border border-red-100">
                  {message}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="mt-8 bg-stone-900 text-white px-10 py-3.5 rounded-full font-bold hover:bg-stone-800 transition-all shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto text-lg"
              >
                完成擺放
              </button>
            </div>
          )}

          {gameState === 'result' && currentLevel && (
            <div className="flex flex-col items-center w-full text-center py-8 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle2 className="w-14 h-14" />
              </div>
              <h2 className="text-4xl font-bold mb-3 text-stone-800">正確！</h2>
              <p className="text-stone-500 mb-6 text-lg">
                {streak >= 3 ? (
                  <span className="text-emerald-600 font-bold">連續答對 3 題以上，獲得 5 分！🔥</span>
                ) : (
                  '獲得 1 分！'
                )}
              </p>

              <div className="bg-stone-50 border border-stone-200 px-6 py-4 rounded-xl mb-8 w-full max-w-sm">
                <p className="text-stone-600 font-medium mb-1">
                  目前難度：<span className="text-stone-900 font-bold">{currentStoneCount} 顆子</span>
                </p>
                {isMaxDifficulty && hasNextLevel ? (
                  <p className="text-indigo-600 text-sm font-bold mt-2">
                    您已達到本階段最高難度！
                  </p>
                ) : (
                  <p className="text-emerald-600 text-sm font-bold mt-2">
                    下一題難度將提升！
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
                >
                  下一題
                </button>
                {isMaxDifficulty && hasNextLevel && (
                  <button
                    onClick={handleNextLevel}
                    className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg flex items-center justify-center gap-2"
                  >
                    挑戰下一階 <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState === 'gameover' && currentLevel && (
            <div className="flex flex-col items-center w-full text-center py-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <AlertCircle className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-stone-800">挑戰失敗</h2>
              <p className="text-stone-500 mb-6 text-lg">
                最終分數: <span className="font-bold text-stone-900 text-2xl ml-2">{score}</span>
              </p>

              <div className="bg-stone-50 border border-stone-200 px-6 py-3 rounded-xl mb-8 w-full max-w-sm">
                <p className="text-stone-600 font-medium">
                  下一題難度將降為：<span className="text-stone-900 font-bold">{currentStoneCount} 顆子</span>
                </p>
              </div>

              <div className="mb-8 w-full max-w-sm bg-stone-50 p-4 rounded-xl border border-stone-200">
                <p className="text-sm font-bold mb-3 text-stone-600 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  正確解答 (紅圈為錯誤處)
                </p>
                <GoBoard
                  size={currentLevel.size}
                  boardState={userBoard}
                  interactive={false}
                  showErrors={true}
                  problemBoard={problemBoard}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
                >
                  再試一次
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="bg-stone-900 text-white px-8 py-3.5 rounded-full font-bold hover:bg-stone-800 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
                >
                  回主選單
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

