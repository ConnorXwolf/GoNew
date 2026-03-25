/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useCallback, Component as ReactComponent } from 'react';
import { AlertCircle, CheckCircle2, X, Trophy, TrendingUp, Award, ChevronRight, LogIn, LogOut, User as UserIcon, Info, Settings, Moon, Sun, Languages } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { GoBoard } from './components/GoBoard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LEVELS, LEVEL_ORDER, Level, generateProblem, UserStats, DEFAULT_STATS, getAchievements } from './lib/gameLogic';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType, registerWithEmail, loginWithEmail } from './lib/firebase';
import { translations, Language } from './lib/i18n';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

type GameState = 'menu' | 'memorize' | 'recall' | 'result' | 'gameover';

function AuthModal({ lang }: { lang: Language }) {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success(t.loginSuccess);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(t.loginFail, { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await registerWithEmail(email, password, name);
      toast.success(t.registerSuccess);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(t.registerFail, { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      toast.success(t.loginSuccess);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(t.loginFail, { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800">
            <LogIn className="w-4 h-4" /> {t.login} / {t.register}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">{t.welcome}</DialogTitle>
          <DialogDescription className="text-center">
            {t.loginDesc}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">{t.login}</TabsTrigger>
            <TabsTrigger value="register">{t.register}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="example@mail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.processing : t.login}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">{t.nickname}</Label>
                <Input 
                  id="reg-name" 
                  type="text" 
                  placeholder={t.nicknamePlaceholder} 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">{t.email}</Label>
                <Input 
                  id="reg-email" 
                  type="email" 
                  placeholder="example@mail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">{t.password}</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.processing : t.register}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-stone-200 dark:border-stone-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-stone-950 px-2 text-stone-500">{t.orUse}</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full gap-2 border-stone-300 dark:border-stone-700" 
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.googleLogin}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

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
  const [isPeeking, setIsPeeking] = useState(false);
  const [peekTimeLeft, setPeekTimeLeft] = useState(0);
  const [hasPeeked, setHasPeeked] = useState(false);
  const [lastProblemId, setLastProblemId] = useState<string | null>(null);

  // Stats & Achievements
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [unlockedNotifs, setUnlockedNotifs] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // New state for i18n and theme
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('goMemoLang');
    return (saved as Language) || 'zh';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('goMemoTheme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('goMemoLang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('goMemoTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPeeking && peekTimeLeft > 0) {
      timer = setInterval(() => {
        setPeekTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPeeking && peekTimeLeft === 0) {
      setIsPeeking(false);
    }
    return () => clearInterval(timer);
  }, [isPeeking, peekTimeLeft]);

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

    const milestones = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    milestones.forEach(m => {
      checkAndUnlock(`${levelId}_play_${m}`, plays >= m);
      checkAndUnlock(`${levelId}_correct_${m}`, corrects >= m);
    });

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(id => {
        const ach = getAchievements(lang).find(a => a.id === id);
        if (ach) {
          toast.success(`${t.unlockedAchievement}：${ach.name}`, {
            description: ach.description,
            icon: <span className="text-xl">{ach.icon}</span>,
          });
        }
      });
    }
    return newStats;
  };

  const startProblem = (levelKey: string, level: Level, stoneCount: number) => {
    const newProblem = generateProblem(levelKey, stoneCount, lastProblemId || undefined);
    setProblemBoard(newProblem.board);
    setLastProblemId(newProblem.id);
    setUserBoard(Array(level.size).fill(null).map(() => Array(level.size).fill(0)));
    setGameState('memorize');
    setTimeLeft(30);
    setAttemptsLeft(level.attempts);
    setShowErrors(false);
    setMessage(null);
    setIsPeeking(false);
    setPeekTimeLeft(0);
    setHasPeeked(false);
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

  const handlePeek = () => {
    if (isPeeking || hasPeeked || (currentLevel && currentLevel.id === 'extreme')) return;
    setIsPeeking(true);
    setPeekTimeLeft(10);
    setHasPeeked(true);
  };

  const handleSubmit = () => {
    if (!currentLevel || !currentLevelKey) return;

    let isCorrect = true;
    for (let y = 0; y < currentLevel.size; y++) {
      for (let x = 0; x < currentLevel.size; x++) {
        const pStone = problemBoard[y][x];
        const uStone = userBoard[y][x];
        const pColor = pStone === 0 ? 0 : (pStone % 2 === 1 ? 1 : 2);
        if (pColor !== uStone) {
          isCorrect = false;
          break;
        }
      }
      if (!isCorrect) break;
    }

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // New Scoring: 5 points per correct, +15 for every 3 streak
      const streakBonus = newStreak > 0 && newStreak % 3 === 0 ? 15 : 0;
      setScore(score + 5 + streakBonus);
      
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
        setMessage(`${t.wrongAnswer}！${t.remainingAttempts} ${newAttempts} ${t.times}`);
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const isMaxDifficulty = currentLevel && currentStoneCount === currentLevel.stones[1];
  const hasNextLevel = currentLevelKey && LEVEL_ORDER.indexOf(currentLevelKey) < LEVEL_ORDER.length - 1;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 font-sans flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4 relative overflow-x-hidden">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-stone-800 to-stone-600 shadow-sm border border-stone-900"></div>
              GoMemo
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-white to-stone-200 shadow-sm border border-stone-300"></div>
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Auth Section */}
              <div className="flex items-center gap-2 border-l pl-2 sm:pl-4 border-stone-200 dark:border-stone-800">
                {loading ? (
                  <Skeleton className="w-8 h-8 rounded-full" />
                ) : user ? (
                  <div className="flex items-center gap-1 sm:gap-2 group relative">
                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border border-stone-200 dark:border-stone-800 shadow-sm">
                      <AvatarImage src={user.photoURL || undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] sm:text-xs">
                        {user.displayName?.charAt(0) || <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start leading-none">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[80px]">
                        {user.displayName || t.goEnthusiast}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => {
                        logout();
                        toast.info(t.loggedOut);
                      }}
                    >
                      <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                ) : (
                  <AuthModal lang={lang} />
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-bold text-stone-400 uppercase tracking-widest">
                    {t.settings}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      {t.darkMode}
                    </div>
                    <Switch 
                      checked={theme === 'dark'} 
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                      <Languages className="w-4 h-4" />
                      {t.language}
                    </div>
                    <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">繁體中文</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {gameState !== 'menu' && (
            <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-sm font-medium items-center w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 dark:border-stone-800">
              <Badge variant="outline" className="bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 px-2 sm:px-3 py-0.5 sm:py-1">
                {t.score}: <span className="text-emerald-600 font-bold ml-1">{score}</span>
              </Badge>
              <Badge variant="outline" className="bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 px-2 sm:px-3 py-0.5 sm:py-1">
                {t.streak}: <span className="text-amber-600 font-bold ml-1">{streak}</span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGameState('menu')}
                className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 h-7 sm:h-8 text-[10px] sm:text-xs"
              >
                {t.exit}
              </Button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-stone-900 min-h-[500px] flex flex-col items-center justify-center relative">
          <CardContent className="w-full p-4 sm:p-10 flex flex-col items-center">
            {gameState === 'menu' && (
              <div className="flex flex-col items-center w-full">
                {showStats ? (
                  <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Trophy className="text-amber-500" /> {t.learningRecord}
                      </h2>
                      <Button variant="ghost" onClick={() => setShowStats(false)} className="text-stone-500 font-medium">
                        {t.backToMenu}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-8">
                      <Card className="bg-stone-50 dark:bg-stone-800 border-none shadow-none text-center p-3 sm:p-4">
                        <p className="text-stone-500 dark:text-stone-400 text-[10px] sm:text-xs font-bold mb-1 uppercase tracking-wider">{t.totalPlayed}</p>
                        <p className="text-xl sm:text-2xl font-black text-stone-800 dark:text-stone-100">{stats.totalPlayed}</p>
                      </Card>
                      <Card className="bg-stone-50 dark:bg-stone-800 border-none shadow-none text-center p-3 sm:p-4">
                        <p className="text-stone-500 dark:text-stone-400 text-[10px] sm:text-xs font-bold mb-1 uppercase tracking-wider">{t.totalCorrect}</p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalCorrect}</p>
                      </Card>
                      <Card className="bg-stone-50 dark:bg-stone-800 border-none shadow-none text-center p-3 sm:p-4 col-span-2 sm:col-span-1">
                        <p className="text-stone-500 dark:text-stone-400 text-[10px] sm:text-xs font-bold mb-1 uppercase tracking-wider">{t.maxStreak}</p>
                        <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{stats.maxStreak}</p>
                      </Card>
                    </div>

                    <h3 className="text-lg font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                      <Award className="text-indigo-500" /> {t.achievements}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {getAchievements(lang).map(ach => {
                        const isUnlocked = stats.achievements.includes(ach.id);
                        return (
                          <div key={ach.id} className={`p-2 sm:p-3 rounded-xl border flex items-center gap-2 sm:gap-3 transition-all ${isUnlocked ? 'bg-white border-amber-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60 grayscale'}`}>
                            <div className="text-2xl sm:text-3xl">{ach.icon}</div>
                            <div className="min-w-0">
                              <div className={`font-bold text-[10px] sm:text-sm truncate ${isUnlocked ? 'text-stone-800' : 'text-stone-500'}`}>{ach.name}</div>
                              <div className="text-[8px] sm:text-[10px] text-stone-500 leading-tight truncate">{ach.description}</div>
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
                        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">{t.welcomeBack}</h2>
                        <p className="text-stone-500 dark:text-stone-400 text-sm">{t.selectDifficulty}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowStats(true)} 
                        className="font-bold text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" /> {t.learningRecord}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                      {LEVEL_ORDER.map((key) => {
                        const level = LEVELS[key];
                        return (
                          <Button
                            key={level.id}
                            variant="outline"
                            onClick={() => handleStartGame(key)}
                            className="h-auto p-4 sm:p-6 border-2 border-stone-100 dark:border-stone-800 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex flex-col items-center group relative overflow-hidden"
                          >
                            <span className="text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                              {level.name(lang)}
                            </span>
                            <span className="text-[10px] sm:text-xs text-stone-400 dark:text-stone-500 mt-1 sm:mt-2 font-medium uppercase tracking-widest">
                              {level.stones[0]}~{level.stones[1]} {t.stones} | {level.attempts} {t.attempts}
                            </span>
                            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300 w-0 group-hover:w-full"></div>
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Separator className="my-10" />
                    
                    <div className="text-sm text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 p-6 rounded-2xl w-full border border-stone-100 dark:border-stone-700">
                      <div className="flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-100">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <p className="font-bold">{t.rulesTitle}</p>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold shrink-0 text-stone-600 dark:text-stone-300">1</div>
                          <p>{t.rule1}</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold shrink-0 text-stone-600 dark:text-stone-300">2</div>
                          <p>{t.rule2}</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold shrink-0 text-stone-600 dark:text-stone-300">3</div>
                          <p>{t.rule3}</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState === 'memorize' && currentLevel && (
              <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                <div className="flex justify-between w-full mb-4 sm:mb-8 items-center px-1 sm:px-2">
                  <div className="flex flex-col">
                    <Badge variant="secondary" className="w-fit mb-0.5 sm:mb-1 text-[10px] sm:text-xs">{currentLevel.name(lang)}</Badge>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100">{t.memorizePhase}</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[8px] sm:text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-0.5 sm:mb-1">{t.timeLeft}</p>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-2xl sm:text-3xl font-black">{timeLeft}</span>
                      <span className="text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold">s</span>
                    </div>
                  </div>
                </div>
                
                <Progress value={(timeLeft / 30) * 100} className="w-full mb-6 sm:mb-8 h-1 sm:h-1.5 bg-stone-100 dark:bg-stone-800" />
                
                <div className="bg-stone-50 dark:bg-stone-800 p-2 sm:p-4 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-inner w-full flex justify-center">
                  <GoBoard size={currentLevel.size} boardState={problemBoard} interactive={false} showMoveNumbers={true} />
                </div>
                
                <Button
                  onClick={() => setGameState('recall')}
                  className="mt-6 sm:mt-10 bg-emerald-600 text-white px-8 sm:px-10 py-5 sm:py-6 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg text-base sm:text-lg w-full sm:w-auto"
                >
                  {t.startChallenge}
                </Button>
              </div>
            )}

            {gameState === 'recall' && currentLevel && (
              <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                <div className="flex justify-between w-full mb-4 sm:mb-8 items-center px-1 sm:px-2">
                  <div className="flex flex-col">
                    <Badge variant="secondary" className="w-fit mb-0.5 sm:mb-1 text-[10px] sm:text-xs">{currentLevel.name(lang)}</Badge>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100">{t.recallPhase}</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[8px] sm:text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-0.5 sm:mb-1">{t.remainingAttempts}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: currentLevel.attempts }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${i < attemptsLeft ? 'bg-red-500' : 'bg-stone-200 dark:bg-stone-700'}`}></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 dark:bg-stone-800 p-2 sm:p-4 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-inner w-full flex justify-center">
                  <GoBoard
                    size={currentLevel.size}
                    boardState={isPeeking ? problemBoard : userBoard}
                    interactive={!isPeeking}
                    showMoveNumbers={isPeeking}
                    onIntersectionClick={(x, y) => {
                      const newBoard = [...userBoard];
                      newBoard[y] = [...newBoard[y]];
                      newBoard[y][x] = selectedTool;
                      setUserBoard(newBoard);
                    }}
                  />
                </div>

                {isPeeking && (
                  <div className="mt-3 sm:mt-4 flex flex-col items-center animate-pulse">
                    <p className="text-amber-600 dark:text-amber-400 font-bold text-[10px] sm:text-sm uppercase tracking-widest mb-1">{t.memorizePhase}</p>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-xl sm:text-2xl font-black">{peekTimeLeft}</span>
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold">s</span>
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex gap-2 sm:gap-4 mt-6 sm:mt-10 bg-stone-100 dark:bg-stone-800 p-1.5 sm:p-2 rounded-2xl shadow-inner border border-stone-200 dark:border-stone-700">
                  <Button
                    variant={selectedTool === 1 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(1)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl transition-all ${selectedTool === 1 ? 'bg-white dark:bg-stone-900 shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-stone-600 to-black shadow-sm" />
                  </Button>
                  <Button
                    variant={selectedTool === 2 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(2)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl transition-all ${selectedTool === 2 ? 'bg-white dark:bg-stone-900 shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-white to-stone-300 shadow-sm border border-stone-200 dark:border-stone-700" />
                  </Button>
                  <Button
                    variant={selectedTool === 0 ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setSelectedTool(0)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl transition-all ${selectedTool === 0 ? 'bg-white dark:bg-stone-900 shadow-md ring-2 ring-emerald-500 scale-110' : ''}`}
                  >
                    <X className="w-6 h-6 sm:w-8 sm:h-8 text-stone-500" />
                  </Button>
                </div>

                {message && (
                  <div className="mt-4 sm:mt-6 text-red-500 font-bold animate-bounce bg-red-50 dark:bg-red-900/20 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border border-red-100 dark:border-red-900/30 text-[10px] sm:text-sm">
                    {message}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-10 w-full sm:w-auto">
                  {currentLevel.id !== 'extreme' && !hasPeeked && (
                    <Button
                      variant="outline"
                      onClick={handlePeek}
                      className="px-6 sm:px-8 py-5 sm:py-7 rounded-full font-bold border-stone-200 dark:border-stone-700 text-base sm:text-lg dark:text-stone-100 flex-1 sm:flex-none"
                    >
                      {t.peek}
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={isPeeking}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-10 sm:px-12 py-5 sm:py-7 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-md hover:shadow-lg flex-1 sm:flex-none text-lg sm:text-xl"
                  >
                    {t.submitAnswer}
                  </Button>
                </div>
              </div>
            )}

            {gameState === 'result' && currentLevel && (
              <div className="flex flex-col items-center w-full text-center py-10 animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-8 shadow-inner">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <h2 className="text-4xl font-black mb-4 text-stone-900 dark:text-stone-100 tracking-tight">{t.correctAnswer}</h2>
                <p className="text-stone-500 dark:text-stone-400 mb-10 text-lg max-w-xs">
                  {streak > 0 && streak % 3 === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t.streakBonus}</span>
                  ) : (
                    t.goodMemory
                  )}
                </p>

                <Card className="bg-stone-50 dark:bg-stone-800 border-none shadow-none px-8 py-6 rounded-2xl mb-10 w-full max-w-sm">
                  <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-widest mb-2">{t.currentDifficulty}</p>
                  <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{currentStoneCount} {t.stones}</p>
                  {isMaxDifficulty && hasNextLevel ? (
                    <Badge className="mt-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border-none">{t.maxDifficultyReached}</Badge>
                  ) : (
                    <Badge className="mt-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border-none">{t.difficultyIncreased}</Badge>
                  )}
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button
                    onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                    className="bg-emerald-600 text-white px-10 py-7 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md text-lg"
                  >
                    {t.nextProblem}
                  </Button>
                  {isMaxDifficulty && hasNextLevel && (
                    <Button
                      onClick={handleNextLevel}
                      className="bg-indigo-600 text-white px-10 py-7 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md text-lg flex items-center gap-2"
                    >
                      {t.nextLevel} <ChevronRight className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameover' && currentLevel && (
              <div className="flex flex-col items-center w-full text-center py-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black mb-2 text-stone-900 dark:text-stone-100">{t.gameOver}</h2>
                <div className="flex items-center gap-3 mb-10">
                  <p className="text-stone-400 dark:text-stone-500 text-sm font-bold uppercase tracking-widest">{t.finalScore}</p>
                  <span className="font-black text-stone-900 dark:text-stone-100 text-4xl">{score}</span>
                </div>

                <div className="mb-10 w-full max-w-sm bg-stone-50 dark:bg-stone-800 p-6 rounded-2xl border border-stone-100 dark:border-stone-700">
                  <p className="text-xs font-bold mb-4 text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center justify-center gap-2">
                    {t.correctAnswerComparison}
                  </p>
                  <GoBoard
                    size={currentLevel.size}
                    boardState={userBoard}
                    interactive={false}
                    showErrors={true}
                    problemBoard={problemBoard}
                    showMoveNumbers={true}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button
                    onClick={() => currentLevelKey && currentLevel && startProblem(currentLevelKey, currentLevel, currentStoneCount)}
                    variant="outline"
                    className="px-10 py-7 rounded-full font-bold border-stone-200 dark:border-stone-700 text-lg dark:text-stone-100"
                  >
                    {t.tryAgain}
                  </Button>
                  <Button
                    onClick={() => setGameState('menu')}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-10 py-7 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-md text-lg"
                  >
                    {t.backToMenu}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <footer className="mt-10 text-center text-stone-400 dark:text-stone-500 text-xs font-medium uppercase tracking-[0.2em]">
          &copy; 2024 GOMEMO &bull; {t.footer}
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

