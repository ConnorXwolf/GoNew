/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useCallback, Component as ReactComponent } from 'react';
import { AlertCircle, CheckCircle2, X, Trophy, TrendingUp, Award, ChevronRight, LogIn, LogOut, User as UserIcon, Info } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { GoBoard } from './components/GoBoard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LEVELS, LEVEL_ORDER, Level, generateProblem, UserStats, DEFAULT_STATS, ACHIEVEMENTS } from './lib/gameLogic';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type GameState = 'menu' | 'memorize' | 'recall' | 'result' | 'gameover';

function GameContent() {
  const [user, loading, authError] = useAuthState(auth);
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    if (!user) {
      // Load from localStorage for guests
      const saved = localStorage.getItem('goMemoryStats');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setStats({
            ...DEFAULT_STATS,
            ...parsed,
          });
        } catch (e) {
          console.error('Failed to parse local stats', e);
        }
      }
      return;
    }

    // Subscribe to Firestore updates
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Merge Firestore stats with local structure
        setStats(prev => ({
          ...prev,
          totalPlayed: data.stats?.totalPlayed || 0,
          totalCorrect: data.stats?.totalCorrect || 0,
          maxStreak: data.stats?.maxStreak || 0,
          achievements: data.achievements || [],
          // We can expand this to sync level-specific stats if needed
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Save to localStorage (for guests)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('goMemoryStats', JSON.stringify(stats));
    }
  }, [stats, user]);

  const syncToFirestore = useCallback(async (updates: any) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

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
      newlyUnlocked.forEach(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
          toast.success(`解鎖成就：${ach.name}`, {
            description: ach.description,
            icon: <span className="text-xl">{ach.icon}</span>,
          });
        }
      });
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

      // Sync to Firestore if logged in
      if (user) {
        syncToFirestore({
          'stats.totalPlayed': increment(1),
          'stats.totalCorrect': increment(1),
          'stats.maxStreak': Math.max(stats.maxStreak, newStreak),
          'stats.lastSolvedDate': new Date().toISOString(),
          'achievements': newStats.achievements // Sync updated achievements
        });
      }

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

        // Sync to Firestore if logged in
        if (user) {
          syncToFirestore({
            'stats.totalPlayed': increment(1),
            'achievements': newStats.achievements
          });
        }

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
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col items-center py-8 px-4 relative overflow-x-hidden">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-stone-200 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stone-800 to-stone-600 shadow-sm border border-stone-900"></div>
              GoMemo
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-stone-200 shadow-sm border border-stone-300"></div>
            </h1>
            
            {/* Auth Section */}
            <div className="flex items-center gap-2 border-l pl-4 border-stone-200">
              {loading ? (
                <Skeleton className="w-8 h-8 rounded-full" />
              ) : user ? (
                <div className="flex items-center gap-2 group relative">
                  <Avatar className="w-8 h-8 border border-stone-200">
                    <AvatarImage src={user.photoURL || ''} referrerPolicy="no-referrer" />
                    <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-stone-400 font-bold uppercase">已登入</p>
                    <p className="text-xs font-bold text-stone-700 truncate max-w-[80px]">{user.displayName}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={logout}
                    className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={loginWithGoogle}
                  className="h-8 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-none"
                >
                  <LogIn className="w-4 h-4 mr-1" /> 登入同步
                </Button>
              )}
            </div>
          </div>

          {gameState !== 'menu' && (
            <div className="flex gap-3 text-sm font-medium items-center">
              <Badge variant="outline" className="bg-stone-50 border-stone-200 text-stone-600 px-3 py-1">
                分數: <span className="text-emerald-600 font-bold ml-1">{score}</span>
              </Badge>
              <Badge variant="outline" className="bg-stone-50 border-stone-200 text-stone-600 px-3 py-1">
                連勝: <span className="text-amber-600 font-bold ml-1">{streak}</span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGameState('menu')}
                className="text-stone-500 hover:text-stone-800 h-8"
              >
                退出
              </Button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <Card className="border-none shadow-sm overflow-hidden bg-white min-h-[550px] flex flex-col items-center justify-center relative">
          <CardContent className="w-full p-6 sm:p-10 flex flex-col items-center">
            {gameState === 'menu' && (
              <div className="flex flex-col items-center w-full">
                {showStats ? (
                  <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                        <Trophy className="text-amber-500" /> 學習紀錄
                      </h2>
                      <Button variant="ghost" onClick={() => setShowStats(false)} className="text-stone-500 font-medium">
                        返回選單
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <Card className="bg-stone-50 border-none shadow-none text-center p-4">
                        <p className="text-stone-500 text-xs font-bold mb-1 uppercase tracking-wider">總練習</p>
                        <p className="text-2xl font-black text-stone-800">{stats.totalPlayed}</p>
                      </Card>
                      <Card className="bg-stone-50 border-none shadow-none text-center p-4">
                        <p className="text-stone-500 text-xs font-bold mb-1 uppercase tracking-wider">答對</p>
                        <p className="text-2xl font-black text-emerald-600">{stats.totalCorrect}</p>
                      </Card>
                      <Card className="bg-stone-50 border-none shadow-none text-center p-4">
                        <p className="text-stone-500 text-xs font-bold mb-1 uppercase tracking-wider">最高連勝</p>
                        <p className="text-2xl font-black text-amber-600">{stats.maxStreak}</p>
                      </Card>
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
                              <div className={`font-bold text-sm ${isUnlocked ? 'text-stone-800' : 'text-stone-500'}`}>{ach.name}</div>
                              <div className="text-[10px] text-stone-500 leading-tight">{ach.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full animate-in fade-in duration-300">
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-stone-800">歡迎回來，棋士</h2>
                        <p className="text-stone-500 text-sm">選擇一個難度開始鍛鍊您的記憶力</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowStats(true)} 
                        className="font-bold text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" /> 學習紀錄
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      {LEVEL_ORDER.map((key) => {
                        const level = LEVELS[key];
                        return (
                          <Button
                            key={level.id}
                            variant="outline"
                            onClick={() => handleStartGame(key)}
                            className="h-auto p-6 border-2 border-stone-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center group relative overflow-hidden"
                          >
                            <span className="text-xl font-bold text-stone-800 group-hover:text-emerald-700">
                              {level.name}
                            </span>
                            <span className="text-xs text-stone-400 mt-2 font-medium uppercase tracking-widest">
                              {level.stones[0]}~{level.stones[1]} 顆子 | {level.attempts} 次機會
                            </span>
                            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300 w-0 group-hover:w-full"></div>
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Separator className="my-10" />
                    
                    <div className="text-sm text-stone-600 bg-stone-50 p-6 rounded-2xl w-full border border-stone-100">
                      <div className="flex items-center gap-2 mb-4 text-stone-800">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <p className="font-bold">規則說明</p>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                          <p>觀察並記憶棋盤上的黑白子位置（最多30秒）。</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                          <p>在空白棋盤上還原剛才的棋子位置。</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                          <p>系統會根據您的表現自動微調題目難度（棋子數量）。</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState === 'memorize' && currentLevel && (
              <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                <div className="flex justify-between w-full mb-8 items-center px-2">
                  <div className="flex flex-col">
                    <Badge variant="secondary" className="w-fit mb-1">{currentLevel.name}</Badge>
                    <h3 className="text-xl font-bold text-stone-800">記憶階段</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">剩餘時間</p>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 font-mono text-3xl font-black">{timeLeft}</span>
                      <span className="text-amber-600 text-sm font-bold">s</span>
                    </div>
                  </div>
                </div>
                
                <Progress value={(timeLeft / 30) * 100} className="w-full mb-8 h-1.5 bg-stone-100" />
                
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 shadow-inner">
                  <GoBoard size={currentLevel.size} boardState={problemBoard} interactive={false} />
                </div>
                
                <Button
                  onClick={() => setGameState('recall')}
                  className="mt-10 bg-emerald-600 text-white px-10 py-6 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg text-lg"
                >
                  我記好了，開始挑戰
                </Button>
              </div>
            )}

            {gameState === 'recall' && currentLevel && (
              <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                <div className="flex justify-between w-full mb-8 items-center px-2">
                  <div className="flex flex-col">
                    <Badge variant="secondary" className="w-fit mb-1">{currentLevel.name}</Badge>
                    <h3 className="text-xl font-bold text-stone-800">挑戰階段</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">剩餘機會</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: currentLevel.attempts }).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${i < attemptsLeft ? 'bg-red-500' : 'bg-stone-200'}`}></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 shadow-inner">
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
                </div>

                {/* Toolbar */}
                <div className="flex gap-4 mt-10 bg-stone-100 p-2 rounded-2xl shadow-inner border border-stone-200">
                  <Button
                    variant={selectedTool === 1 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(1)}
                    className={`w-16 h-16 rounded-xl transition-all ${selectedTool === 1 ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-600 to-black shadow-sm" />
                  </Button>
                  <Button
                    variant={selectedTool === 2 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(2)}
                    className={`w-16 h-16 rounded-xl transition-all ${selectedTool === 2 ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-stone-300 shadow-sm border border-stone-200" />
                  </Button>
                  <Button
                    variant={selectedTool === 0 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(0)}
                    className={`w-16 h-16 rounded-xl transition-all ${selectedTool === 0 ? 'bg-white shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <X className="w-8 h-8 text-stone-500" />
                  </Button>
                </div>

                {message && (
                  <div className="mt-6 text-red-500 font-bold animate-bounce bg-red-50 px-6 py-2 rounded-full border border-red-100 text-sm">
                    {message}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  className="mt-10 bg-stone-900 text-white px-12 py-7 rounded-full font-bold hover:bg-stone-800 transition-all shadow-md hover:shadow-lg w-full sm:w-auto text-xl"
                >
                  提交答案
                </Button>
              </div>
            )}

            {gameState === 'result' && currentLevel && (
              <div className="flex flex-col items-center w-full text-center py-10 animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <h2 className="text-4xl font-black mb-4 text-stone-900 tracking-tight">完美還原！</h2>
                <p className="text-stone-500 mb-10 text-lg max-w-xs">
                  {streak >= 3 ? (
                    <span className="text-emerald-600 font-bold">火熱連勝中！獲得 5 分加成 🔥</span>
                  ) : (
                    '您的記憶力非常出色，獲得 1 分！'
                  )}
                </p>

                <Card className="bg-stone-50 border-none shadow-none px-8 py-6 rounded-2xl mb-10 w-full max-w-sm">
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">目前難度</p>
                  <p className="text-2xl font-black text-stone-900">{currentStoneCount} 顆子</p>
                  {isMaxDifficulty && hasNextLevel ? (
                    <Badge className="mt-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">已達本階最高難度</Badge>
                  ) : (
                    <Badge className="mt-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">下一題難度提升</Badge>
                  )}
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button
                    onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                    className="bg-emerald-600 text-white px-10 py-7 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md text-lg"
                  >
                    下一題
                  </Button>
                  {isMaxDifficulty && hasNextLevel && (
                    <Button
                      onClick={handleNextLevel}
                      className="bg-indigo-600 text-white px-10 py-7 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md text-lg flex items-center gap-2"
                    >
                      挑戰下一階 <ChevronRight className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameover' && currentLevel && (
              <div className="flex flex-col items-center w-full text-center py-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black mb-2 text-stone-900">挑戰結束</h2>
                <div className="flex items-center gap-3 mb-10">
                  <p className="text-stone-400 text-sm font-bold uppercase tracking-widest">最終得分</p>
                  <span className="font-black text-stone-900 text-4xl">{score}</span>
                </div>

                <div className="mb-10 w-full max-w-sm bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold mb-4 text-stone-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    正確解答對照
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
                  <Button
                    onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                    variant="outline"
                    className="px-10 py-7 rounded-full font-bold border-stone-200 text-lg"
                  >
                    再試一次
                  </Button>
                  <Button
                    onClick={() => setGameState('menu')}
                    className="bg-stone-900 text-white px-10 py-7 rounded-full font-bold hover:bg-stone-800 transition-all shadow-md text-lg"
                  >
                    回主選單
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <footer className="mt-10 text-center text-stone-400 text-xs font-medium uppercase tracking-[0.2em]">
          &copy; 2024 GOMEMO &bull; 圍棋記憶鍛鍊系統
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <GameContent />
    </ErrorBoundary>
  );
}

