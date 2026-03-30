import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Brain,
  Grid3X3,
  Target,
  Trophy,
  Eraser,
  Circle,
  BarChart3,
  LogIn,
  LogOut,
  User as UserIconLucide,
  Cloud,
  Eye,
  EyeOff,
  Home,
  Mail,
  Lock,
  Loader2,
  Languages,
  Shuffle,
  Calendar,
  BookOpen
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { 
  auth, 
  db, 
  logout, 
  handleFirestoreError, 
  OperationType,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from './firebase';
import { GoBoard } from './components/GoBoard';
import { PROBLEMS as DEFAULT_PROBLEMS } from './constants';
import { Problem, Stone, SRSData } from './types';
import { translations, Language } from './translations';
import { calculateSM2, INITIAL_SRS_DATA } from './lib/srsService';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('gomemo_lang');
    return (saved as Language) || 'zh';
  });

  const t = translations[language];

  const LEVELS = [
    { id: '全部', label: t.all },
    { id: '幼幼班', label: t.toddler },
    { id: '初學', label: t.beginner },
    { id: '基礎', label: t.basic },
    { id: '中階', label: t.intermediate },
    { id: '高階', label: t.advanced },
    { id: '極限', label: t.extreme }
  ];

  const [allProblems] = useState<Problem[]>(DEFAULT_PROBLEMS);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('幼幼班');
  const [selectedBoardSize, setSelectedBoardSize] = useState<number>(9);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [stones, setStones] = useState<Stone[]>([]);
  const [userStones, setUserStones] = useState<Stone[]>([]);
  const [selectedTool, setSelectedTool] = useState<'black' | 'white' | 'eraser'>('black');
  const [lastMove, setLastMove] = useState<Stone | undefined>();
  const [status, setStatus] = useState<'idle' | 'memorizing' | 'placing' | 'correct' | 'wrong' | 'result'>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [memoryTimer, setMemoryTimer] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const [peekUsed, setPeekUsed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [hasAttemptedCurrent, setHasAttemptedCurrent] = useState(false);
  const [hasWonCurrent, setHasWonCurrent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [srsData, setSrsData] = useState<Record<string, SRSData>>(() => {
    const saved = localStorage.getItem('gomemo_srs_v1');
    return saved ? JSON.parse(saved) : {};
  });
  const [isReviewMode, setIsReviewMode] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  
  const [user, authLoading] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      const fetchSRS = async () => {
        try {
          const srsRef = collection(db, 'userSRS', user.uid, 'problems');
          const snapshot = await getDocs(srsRef);
          const data: Record<string, SRSData> = {};
          snapshot.forEach(doc => {
            data[doc.id] = doc.data() as SRSData;
          });
          setSrsData(prev => {
            const merged = { ...prev, ...data };
            localStorage.setItem('gomemo_srs_v1', JSON.stringify(merged));
            return merged;
          });
        } catch (error) {
          console.error("Failed to fetch SRS data:", error);
        }
      };
      fetchSRS();
    }
  }, [user]);

  const updateSRS = async (problemId: string, quality: number) => {
    const currentSRS = srsData[problemId] || INITIAL_SRS_DATA(problemId);
    const { interval, repetitions, easeFactor } = calculateSM2(
      quality,
      currentSRS.repetitions,
      currentSRS.interval,
      currentSRS.easeFactor
    );
    
    const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
    
    const newData: SRSData = {
      problemId,
      repetitions,
      interval,
      easeFactor,
      nextReviewDate,
      lastReviewDate: Date.now(),
    };
    
    setSrsData(prev => {
      const next = { ...prev, [problemId]: newData };
      localStorage.setItem('gomemo_srs_v1', JSON.stringify(next));
      return next;
    });
    
    if (user) {
      try {
        const docRef = doc(db, 'userSRS', user.uid, 'problems', problemId);
        await setDoc(docRef, newData);
      } catch (error) {
        console.error("Failed to update SRS data:", error);
      }
    }
  };
  
  const [stats, setStats] = useState<Record<string, { attempted: number, correct: number }>>(() => {
    const saved = localStorage.getItem('gomemo_stats_v3');
    const initialStats = {
      '幼幼班': { attempted: 0, correct: 0 },
      '初學': { attempted: 0, correct: 0 },
      '基礎': { attempted: 0, correct: 0 },
      '中階': { attempted: 0, correct: 0 },
      '高階': { attempted: 0, correct: 0 },
      '極限': { attempted: 0, correct: 0 },
    };
    if (saved) {
      return { ...initialStats, ...JSON.parse(saved) };
    }
    return initialStats;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('gomemo_stats_v3', JSON.stringify(stats));
    
    // Sync to Firestore if logged in
    if (user && !authLoading) {
      const syncToCloud = async () => {
        setIsSyncing(true);
        try {
          const statsRef = doc(db, 'userStats', user.uid);
          await setDoc(statsRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            stats: stats,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Sync failed:", error);
        } finally {
          setIsSyncing(false);
        }
      };
      
      // Debounce sync
      const timeoutId = setTimeout(syncToCloud, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [stats, user, authLoading]);

  // Fetch stats from Firestore on login
  useEffect(() => {
    if (user && !authLoading) {
      const fetchStats = async () => {
        try {
          const statsRef = doc(db, 'userStats', user.uid);
          const docSnap = await getDoc(statsRef);
          
          if (docSnap.exists()) {
            const cloudStats = docSnap.data().stats;
            // Merge logic: take the higher numbers (or just overwrite if cloud is source of truth)
            setStats(cloudStats);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `userStats/${user.uid}`);
        }
      };
      fetchStats();
    }
  }, [user, authLoading]);

  useEffect(() => {
    localStorage.setItem('gomemo_lang', language);
  }, [language]);

  // Handle initial SRS data load for Review mode
  const [srsInitialized, setSrsInitialized] = useState(false);
  useEffect(() => {
    if (isReviewMode && !srsInitialized && Object.keys(srsData).length > 0) {
      const filtered = allProblems.filter(p => {
        const sizeMatch = p.boardSize === selectedBoardSize;
        const srs = srsData[p.id];
        return sizeMatch && srs && srs.nextReviewDate <= Date.now();
      });
      const shuffled = shuffleArray([...filtered]);
      setFilteredProblems(shuffled);
      setCurrentProblemIndex(0);
      setSrsInitialized(true);
    }
  }, [isReviewMode, srsData, selectedBoardSize, srsInitialized]);

  useEffect(() => {
    setSrsInitialized(false);
    const filtered = allProblems.filter(p => {
      const sizeMatch = p.boardSize === selectedBoardSize;
      if (isReviewMode) {
        const srs = srsData[p.id];
        return sizeMatch && srs && srs.nextReviewDate <= Date.now();
      } else {
        const levelMatch = selectedLevel === '全部' || p.level === selectedLevel;
        return levelMatch && sizeMatch;
      }
    });
    // Shuffle the filtered problems only when the filter criteria change
    const shuffled = shuffleArray([...filtered]);
    setFilteredProblems(shuffled);
    setCurrentProblemIndex(0);
  }, [selectedLevel, selectedBoardSize, isReviewMode, allProblems, refreshKey]);

  const currentProblem = filteredProblems[currentProblemIndex];

  const resetProblem = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!currentProblem) return;
    setStones([]);
    setUserStones([]);
    setLastMove(undefined);
    setStatus('idle');
    setShowExplanation(false);
    setMemoryTimer(0);
    setAttempts(selectedLevel === '極限' ? 1 : 3);
    setPeekUsed(false);
    setHasAttemptedCurrent(false);
    setHasWonCurrent(false);
    setZoomOffset({ x: 0, y: 0 });
    setIsZoomed(false);
  }, [currentProblem, selectedLevel]);

  useEffect(() => {
    resetProblem();
  }, [resetProblem]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthProcessing(true);
    try {
      if (authMode === 'register') {
        if (password !== confirmPassword) {
          setAuthError(t.passwordMismatch);
          setIsAuthProcessing(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
    } catch (err: any) {
      setAuthError(err.message || t.authFailed);
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const startTraining = () => {
    if (!currentProblem) return;
    
    if (!hasAttemptedCurrent && selectedLevel !== '全部') {
      setStats(prev => ({
        ...prev,
        [selectedLevel]: {
          ...prev[selectedLevel],
          attempted: prev[selectedLevel].attempted + 1
        }
      }));
      setHasAttemptedCurrent(true);
    }

    // Phase 1: Memorization
    setStatus('memorizing');
    setStones([...currentProblem.initialStones, ...currentProblem.solution]);
    setMemoryTimer(30);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setMemoryTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Phase 2: Placing
          setStatus('placing');
          setStones(currentProblem.initialStones);
          setUserStones([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecallNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('placing');
    setStones(currentProblem!.initialStones);
    setUserStones([]);
    setMemoryTimer(0);
  };

  const peekProblem = () => {
    if (status !== 'placing' || peekUsed || selectedLevel === '極限') return;
    
    setPeekUsed(true);
    const currentUserStones = [...userStones];
    setStatus('memorizing');
    setStones([...currentProblem!.initialStones, ...currentProblem!.solution]);
    setMemoryTimer(10);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setMemoryTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('placing');
          setStones([...currentProblem!.initialStones, ...currentUserStones]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleIntersectionClick = (x: number, y: number) => {
    if (!currentProblem || status !== 'placing' || attempts === 0) return;

    const isInitialStone = currentProblem.initialStones.some(s => s.x === x && s.y === y);
    if (isInitialStone) return;

    const existingIndex = userStones.findIndex(s => s.x === x && s.y === y);
    
    if (selectedTool === 'eraser') {
      if (existingIndex >= 0) {
        // Remove the clicked stone and all stones placed AFTER it
        const newStones = userStones.slice(0, existingIndex);
        setUserStones(newStones);
        setStones([...currentProblem.initialStones, ...newStones]);
        
        // Update lastMove to the new last stone
        if (newStones.length > 0) {
          setLastMove(newStones[newStones.length - 1]);
        } else {
          setLastMove(undefined);
        }
      }
      return;
    }

    // Automatic color: Move 1 (index 0) is black, Move 2 (index 1) is white...
    const autoColor = userStones.length % 2 === 0 ? 'black' : 'white';
    const newMove: Stone = { x, y, color: autoColor, moveNumber: userStones.length + 1 };
    
    if (existingIndex >= 0) {
      // If clicking an existing user stone (not in eraser mode), we could either do nothing or replace it.
      // But since it's a sequence, replacing might break the sequence logic.
      // Let's just do nothing if it's already there to avoid confusion.
      return;
    } else {
      const newStones = [...userStones, newMove];
      setUserStones(newStones);
      setStones([...currentProblem.initialStones, ...newStones]);
      setLastMove(newMove);
    }
  };

  const checkAnswer = () => {
    if (!currentProblem) return;

    const targetStones = currentProblem.solution;
    
    // Check if every target stone is present in userStones and counts match
    // For sequence training, we should also check the order if moveNumber is present
    const isCorrect = userStones.length === targetStones.length && targetStones.every((target, idx) => {
      const user = userStones[idx];
      return user && user.x === target.x && user.y === target.y && user.color === target.color;
    });

    if (isCorrect) {
      if (!hasWonCurrent && selectedLevel !== '全部') {
        setStats(prev => ({
          ...prev,
          [selectedLevel]: {
            ...prev[selectedLevel],
            correct: prev[selectedLevel].correct + 1
          }
        }));
        setHasWonCurrent(true);
      }
      
      // SRS Update: 5 if no peek, 3 if peek used
      updateSRS(currentProblem.id, peekUsed ? 3 : 5);
      
      setStatus('correct');
      setScore(s => s + 100);
      // Show explanation after a short delay
      setTimeout(() => setShowExplanation(true), 500);
      // Hide the "Correct" overlay after 1 second and transition to result state
      setTimeout(() => setStatus('result'), 1000);
    } else {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);
      
      if (newAttempts > 0) {
        setStatus('wrong');
        setTimeout(() => setStatus('placing'), 1000);
      } else {
        setStatus('wrong');
        // SRS Update: 0 if failed all attempts
        updateSRS(currentProblem.id, 0);
        // After 3 attempts, show the answer and hide the overlay after 1 second
        setTimeout(() => {
          setStatus('result');
          setShowExplanation(true);
        }, 1000);
      }
    }
  };

  const handleExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setStones([]);
    setUserStones([]);
    setLastMove(undefined);
    setPeekUsed(false);
    setShowExplanation(false);
    setHasAttemptedCurrent(false);
    setHasWonCurrent(false);
    setAttempts(selectedLevel === '極限' ? 1 : 3);
    setIsZoomed(false);
    setZoomOffset({ x: 0, y: 0 });
    setMemoryTimer(0);
  };

  const nextProblem = () => {
    if (filteredProblems.length === 0) return;
    
    // Pick a random index instead of sequential
    if (filteredProblems.length > 1) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * filteredProblems.length);
      } while (nextIndex === currentProblemIndex);
      setCurrentProblemIndex(nextIndex);
    } else {
      setCurrentProblemIndex(0);
    }
  };

  const prevProblem = () => {
    if (filteredProblems.length === 0) return;
    // For random mode, prev can just be another random one or we can keep it sequential
    // Let's keep it sequential for those who want to go back to what they just saw
    setCurrentProblemIndex((prev) => (prev - 1 + filteredProblems.length) % filteredProblems.length);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isZoomed) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length !== 2) {
        setIsDragging(false);
        return;
      }
      clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setIsDragging(true);
    dragStartRef.current = { x: clientX - zoomOffset.x, y: clientY - zoomOffset.y };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isZoomed) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length !== 2) {
        setIsDragging(false);
        return;
      }
      clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setZoomOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const toggleZoom = () => {
    if (isZoomed) {
      setZoomOffset({ x: 0, y: 0 });
    }
    setIsZoomed(!isZoomed);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 p-3 sm:p-6 flex justify-between items-center bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-zinc-700 to-zinc-900 p-0.5 rounded-xl shadow-lg shadow-black/40 overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/19xCTTWs6febeENzNvmf8snJNdr2k96s1" 
              alt="GoMemo Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">{t.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6 lg:gap-8">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <Languages className="w-3 h-3 sm:w-4 sm:h-4 text-white/40 ml-1 sm:ml-2" />
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] sm:text-sm font-bold text-white/60 focus:outline-none pr-1 sm:pr-2 cursor-pointer hover:text-white transition-colors"
            >
              <option value="zh" className="bg-[#1a1a1a]">中文</option>
              <option value="en" className="bg-[#1a1a1a]">EN</option>
              <option value="ja" className="bg-[#1a1a1a]">日本語</option>
            </select>
          </div>

          <div className="h-6 sm:h-8 w-px bg-white/10 hidden xs:block" />
          
          {/* Auth Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {authLoading ? (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3 bg-white/5 pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-1 sm:py-1.5 rounded-full border border-white/10 group">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/20 bg-orange-500/20 flex items-center justify-center">
                  <UserIconLucide className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-sm font-bold text-white/60 leading-none truncate max-w-[60px] sm:max-w-none">{user.displayName || user.email}</span>
                  <button 
                    onClick={() => logout()}
                    className="text-[8px] sm:text-sm text-white/30 uppercase tracking-widest hover:text-red-400 transition-colors text-left"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 group-hover:text-white" />
                <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-white/60 group-hover:text-white hidden xs:block">{t.loginSync}</span>
              </button>
            )}
          </div>

          <div className="h-6 sm:h-8 w-px bg-white/10 hidden sm:block" />
          
          {selectedLevel !== '極限' && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] sm:text-sm text-white/30 uppercase font-mono tracking-widest">{t.remainingAttempts}</span>
              <div className="flex gap-1 mt-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${i < attempts ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            </div>
          )}

          <div className="h-6 sm:h-8 w-px bg-white/10 hidden sm:block" />
          
          <button 
            onClick={() => setShowStats(true)}
            className="flex flex-col items-center group transition-all relative"
          >
            <span className="text-[10px] sm:text-sm text-white/30 uppercase font-mono tracking-widest group-hover:text-orange-400 hidden sm:block">{t.learningProgress}</span>
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mt-0.5 sm:mt-1 group-hover:scale-110 transition-transform" />
            {isSyncing && (
              <Cloud className="w-2 h-2 sm:w-3 sm:h-3 text-blue-400 absolute -top-1 -right-1 sm:-right-2 animate-bounce" />
            )}
          </button>

          <div className="h-6 sm:h-8 w-px bg-white/10 hidden sm:block" />
          
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] sm:text-sm text-white/30 uppercase font-mono tracking-widest">{t.totalMastery}</span>
            <span className="text-lg sm:text-2xl font-mono text-orange-400 tabular-nums">{score.toString().padStart(4, '0')}</span>
          </div>
          <div className="h-6 sm:h-8 w-px bg-white/10 hidden xs:block" />
          <div className="flex items-center gap-1.5 sm:gap-3 bg-white/5 px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-white/10">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
            <span className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-blue-400">{currentProblemIndex + 1}/{filteredProblems.length}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8 lg:p-12 flex flex-col gap-8">
        {/* Main Content: Filters & Board */}
        <div className="w-full flex flex-col items-center justify-start gap-8">
          {/* Filters */}
          <div className="w-full flex flex-col gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.mode}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsReviewMode(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                      !isReviewMode 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {t.training}
                  </button>
                  <button
                    onClick={() => setIsReviewMode(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                      isReviewMode 
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {t.review}
                    {Object.values(srsData).filter(s => s.nextReviewDate <= Date.now()).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                        {Object.values(srsData).filter(s => s.nextReviewDate <= Date.now()).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.boardSize}</label>
                <div className="flex gap-2">
                  {[9, 13, 19].map(size => (
                    <button
                      key={size}
                      onClick={() => { 
                        setSelectedBoardSize(size); 
                        setCurrentProblemIndex(0);
                        setRefreshKey(prev => prev + 1);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                        selectedBoardSize === size 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {size === 9 ? t.size9 : size === 13 ? t.size13 : t.size19}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!isReviewMode && (
              <div className="space-y-2">
                <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.difficulty}</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { 
                        setSelectedLevel(l.id); 
                        setCurrentProblemIndex(0);
                        setRefreshKey(prev => prev + 1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                        selectedLevel === l.id 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Bar (Timer & Mode) */}
          <div className="w-full h-10 sm:h-12 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {status === 'memorizing' && (
                <motion.div 
                  key="timer"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="flex items-center gap-2 sm:gap-4 bg-orange-500 text-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-2xl shadow-xl shadow-orange-500/20 border border-white/20"
                >
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-cover animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-sm uppercase font-black tracking-widest leading-none opacity-60">{t.memorizing}</span>
                    <span className="text-lg sm:text-xl font-mono font-black tabular-nums leading-none">{memoryTimer}s</span>
                  </div>
                </motion.div>
              )}
              {status === 'placing' && (
                <motion.div 
                  key="recall"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="flex items-center gap-2 sm:gap-4 bg-blue-500 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-2xl shadow-xl shadow-blue-500/20 border border-white/20"
                >
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-cover" />
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-sm uppercase font-black tracking-widest leading-none opacity-60">{t.recallMode}</span>
                    <span className="text-[10px] sm:text-sm font-black uppercase tracking-widest leading-none">{t.inProgress}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full flex justify-center">
            <div className="relative group">
              {/* Exit Button - Top Left Above Board */}
              {status !== 'idle' && (
                <button
                  onClick={handleExit}
                  className="absolute -top-14 left-0 z-30 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-all group/exit"
                  title={t.exit}
                >
                  <Home className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover/exit:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {t.exit}
                  </span>
                </button>
              )}

              {/* Attempts Display - Top Right Above Board (Mobile Only) */}
              {status !== 'idle' && selectedLevel !== '極限' && (
                <div className="absolute -top-14 right-0 z-30 flex flex-col items-end sm:hidden">
                  <span className="text-[10px] text-white/30 uppercase font-mono tracking-widest">{t.remainingAttempts}</span>
                  <div className="flex gap-1 mt-1">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${i < attempts ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Board Container with Hardware feel */}
              <div 
                className={`relative p-2 sm:p-4 bg-[#1a1a1a] rounded-[2rem] border border-white/10 shadow-2xl shadow-black overflow-hidden ${isZoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >

              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] pointer-events-none z-20" />
              
              <motion.div
                animate={{
                  scale: isZoomed ? 1.5 : 1,
                  x: zoomOffset.x,
                  y: zoomOffset.y
                }}
                transition={{ 
                  scale: { duration: 0.3 },
                  x: { type: 'spring', damping: 25, stiffness: 200 },
                  y: { type: 'spring', damping: 25, stiffness: 200 }
                }}
                className="relative z-10"
              >
                {currentProblem && status !== 'idle' ? (
                  <GoBoard 
                    stones={stones}
                    errorStones={(showExplanation || status === 'correct' || attempts === 0) ? currentProblem.solution : []}
                    viewRange={currentProblem.viewRange}
                    onIntersectionClick={handleIntersectionClick}
                    lastMove={lastMove}
                    showMoveNumbers={true}
                    boardSize={currentProblem.boardSize || 19}
                  />
                ) : (
                  <div className="w-full aspect-square flex flex-col items-center justify-center text-white/20 bg-black/20 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                    <Brain className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-mono uppercase tracking-widest">
                      {status === 'idle' 
                        ? (isReviewMode && filteredProblems.length === 0 ? t.noDueReviews : t.selectProblemToStart) 
                        : t.noProblems}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
            
            {/* Status Overlays */}
            <AnimatePresence>
              {status === 'correct' && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -20 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="bg-emerald-500 text-black px-6 sm:px-10 py-3 sm:py-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                    <div className="flex flex-col">
                      <span className="text-xl sm:text-2xl font-black uppercase italic leading-none">{t.correct}</span>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80">{t.masteredPattern}</span>
                    </div>
                  </div>
                </motion.div>
              )}
              {status === 'wrong' && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0, x: -20 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="bg-red-500 text-white px-6 sm:px-10 py-3 sm:py-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                    <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                    <div className="flex flex-col">
                      <span className="text-xl sm:text-2xl font-black uppercase italic leading-none">
                        {attempts === 0 ? t.gameOver : t.wrong}
                      </span>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80">
                        {attempts === 0 ? t.masteredPattern : t.tryAgain}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Quick Actions during Memorization */}
            {status === 'memorizing' && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={startRecallNow}
                className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all active:scale-95 border border-white/10 flex items-center gap-2"
              >
                <Target className="w-4 h-4 text-orange-400" />
                <span>{t.startRecallNow}</span>
              </motion.button>
            )}

            {/* Tool Selection */}
            {status === 'placing' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                  {/* Next Move Indicator */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase tracking-tighter text-white/40 font-mono">Next</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border border-white/20 ${userStones.length % 2 === 0 ? 'bg-black' : 'bg-white'}`} />
                      <span className="text-sm font-mono font-bold text-orange-400">#{userStones.length + 1}</span>
                    </div>
                  </div>

                  <div className="w-px h-4 bg-white/10 mx-1" />

                  <button
                    onClick={() => setSelectedTool(selectedTool === 'eraser' ? 'black' : 'eraser')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      selectedTool === 'eraser' ? 'bg-red-500 text-white font-bold' : 'text-white/40 hover:text-red-400'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-widest">{t.eraser}</span>
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button
                    onClick={toggleZoom}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isZoomed ? 'bg-orange-500 text-black font-bold' : 'text-white/40 hover:text-orange-400'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-widest">{t.magnify}</span>
                  </button>
                </div>

                {selectedLevel !== '極限' && !peekUsed && (
                  <button
                    onClick={peekProblem}
                    className="flex items-center gap-2 px-6 py-2 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 transition-all active:scale-95 group"
                  >
                    <Brain className="w-4 h-4 group-hover:animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-widest">{t.peek}</span>
                  </button>
                )}
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevProblem}
                  className="p-3 sm:p-4 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                  title="上一題"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="h-6 sm:h-8 w-px bg-white/10" />
                <button 
                  onClick={resetProblem}
                  className="px-4 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-white/10 flex items-center gap-2 sm:gap-3 transition-all active:scale-95 group"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 group-hover:rotate-[-180deg] transition-transform duration-500" />
                  <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{t.reset}</span>
                </button>
              </div>
              
              <div className="h-6 sm:h-8 w-px bg-white/10 hidden sm:block" />
              
              <div className="flex items-center gap-2">
                {status === 'idle' ? (
                  <button 
                    onClick={startTraining}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black flex items-center gap-2 sm:gap-3 transition-all active:scale-95 group shadow-lg shadow-orange-500/20"
                  >
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{t.startTraining}</span>
                  </button>
                ) : (status === 'placing' && attempts > 0) ? (
                  <button 
                    onClick={checkAnswer}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white flex items-center gap-2 sm:gap-3 transition-all active:scale-95 group shadow-lg shadow-blue-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{t.checkAnswer}</span>
                  </button>
                ) : status === 'result' ? (
                  <div className="px-6 sm:px-8 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 text-white/40">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{t.learningProgress}</span>
                  </div>
                ) : (
                  <div className="px-6 sm:px-8 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 text-white/20">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{t.inProgress}...</span>
                  </div>
                )}
                <div className="h-6 sm:h-8 w-px bg-white/10" />
                <button 
                  onClick={nextProblem}
                  className="p-3 sm:p-4 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                  title="下一題"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Next Problem Button after Completion */}
            {(status === 'correct' || status === 'result' || attempts === 0 || showExplanation) && (
              <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 font-black uppercase tracking-widest ${
                    (status === 'correct' || (status === 'result' && hasWonCurrent))
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                      : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}
                >
                  {(status === 'correct' || (status === 'result' && hasWonCurrent)) ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{t.correct}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>{attempts === 0 ? t.gameOver : t.wrong}</span>
                    </>
                  )}
                </motion.div>
                
                {attempts === 0 && !hasWonCurrent ? (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleExit}
                    className="w-full py-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Home className="w-6 h-6" />
                    <span>{t.backToHome}</span>
                  </motion.button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={nextProblem}
                    className="w-full py-6 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-black font-black text-xl transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <span>{t.nextProblem}</span>
                    <ChevronRight className="w-6 h-6" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/5 p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-20">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <p className="text-sm font-mono uppercase tracking-[0.4em] text-white/20">
            {t.footer}
          </p>
        </div>
      </footer>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStats && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStats(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-orange-500/20 p-1.5 sm:p-2 rounded-xl">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{t.statsTitle}</h2>
                </div>
                <button 
                  onClick={() => setShowStats(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white/40" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {LEVELS.filter(l => l.id !== '全部').map(level => {
                  const s = stats[level.id] || { attempted: 0, correct: 0 };
                  const rate = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
                  
                  return (
                    <div key={level.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-white/90">{level.label}</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-sm text-white/40 font-mono">{t.attempted}: <span className="text-white/80">{s.attempted}</span></span>
                          <span className="text-sm text-white/40 font-mono">{t.correctCount}: <span className="text-emerald-400/80">{s.correct}</span></span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-white/30 uppercase tracking-widest font-mono">{t.accuracy}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black font-mono text-orange-400">{rate}</span>
                          <span className="text-sm font-bold text-orange-400/60">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => {
                    if (confirm(t.clearStatsConfirm)) {
                      const newStats: any = {};
                      LEVELS.filter(l => l.id !== '全部').forEach(l => {
                        newStats[l.id] = { attempted: 0, correct: 0 };
                      });
                      setStats(newStats);
                    }
                  }}
                  className="text-sm text-white/20 hover:text-red-400 uppercase tracking-[0.2em] font-mono transition-colors"
                >
                  {t.clearStats}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-orange-500/20 p-1.5 sm:p-2 rounded-xl">
                    <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{authMode === 'login' ? t.login : t.register}</h2>
                </div>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white/40" />
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.username}</label>
                    <div className="relative">
                      <UserIconLucide className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t.usernamePlaceholder}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-mono text-white/30 uppercase tracking-widest ml-2">{t.confirmPassword}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {authError && (
                  <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                    {authError}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={isAuthProcessing}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAuthProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    authMode === 'login' ? t.loginBtn : t.registerBtn
                  )}
                </button>

                <div className="text-center mt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError('');
                      setConfirmPassword('');
                    }}
                    className="text-sm text-white/40 hover:text-white transition-colors"
                  >
                    {authMode === 'login' ? t.noAccount : t.hasAccount}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
