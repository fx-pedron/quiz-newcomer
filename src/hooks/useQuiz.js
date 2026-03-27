import { useState, useEffect, useRef, useCallback } from 'react';

export const STORAGE_KEY = 'fx-q-v3';

export const AVATAR_COLORS = [
  '#FF3CAC','#784BA0','#2B86C5','#FF5C5C','#FFD93D',
  '#6BCB77','#4D96FF','#FF9A3C','#C77DFF','#06D6A0',
];

export const CLRS = ['a','b','c','d'];
export const LBLS = ['A','B','C','D'];

const DEFAULT_QUESTIONS = [
  {
    text: "Dans quelle ville j'habite ?",
    type: 'single', answerType: 'text', answerCount: 4,
    answers: ["Paris","Bondy","Lyon","Bordeaux"],
    images: [null,null,null,null], correct: [1], time: 20,
  },
  {
    text: "Quelle(s) passion(s) j'ai ?",
    type: 'multi', answerType: 'text', answerCount: 4,
    answers: ["La randonnée","Le design","La cuisine","Le cinéma"],
    images: [null,null,null,null], correct: [1,3], time: 25,
  },
  {
    text: "Quel animal j'ai à la maison ?",
    type: 'single', answerType: 'text', answerCount: 4,
    answers: ["Un chat","Un chien","Un lapin","Aucun"],
    images: [null,null,null,null], correct: [1], time: 20,
  },
];

export function useQuiz() {
  const [questions, setQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_QUESTIONS; }
    catch { return DEFAULT_QUESTIONS; }
  });

  const [currentScreen, setCurrentScreen] = useState('splash');
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedMulti, setSelectedMulti] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalTime, setTotalTime] = useState(20);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Stable refs to avoid stale closures
  const answeredRef       = useRef(answered);
  const questionsRef      = useRef(questions);
  const currentQRef       = useRef(currentQ);
  const timeLeftRef       = useRef(timeLeft);
  const totalTimeRef      = useRef(totalTime);
  const selectedMultiRef  = useRef(selectedMulti);
  const currentScreenRef  = useRef(currentScreen);
  const playersRef        = useRef(players);

  answeredRef.current      = answered;
  questionsRef.current     = questions;
  currentQRef.current      = currentQ;
  timeLeftRef.current      = timeLeft;
  totalTimeRef.current     = totalTime;
  selectedMultiRef.current = selectedMulti;
  currentScreenRef.current = currentScreen;
  playersRef.current       = players;

  // ── Timer tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentScreen !== 'game' || answered || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [currentScreen, answered, timeLeft]);

  // ── Time up ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentScreenRef.current !== 'game' || answeredRef.current || timeLeft !== 0) return;
    const q = questionsRef.current[currentQRef.current];
    const correctLabels = q.correct.map(c => q.answers[c]).join(' + ');
    setAnswered(true);
    setResultData({
      emoji: '⏰',
      label: 'Temps écoulé !',
      correctAnswer: `Bonne(s) réponse(s) : ${correctLabels}`,
      pts: 0,
      full: false,
      partial: false,
      chosen: [],
    });
    setShowResult(true);
  }, [timeLeft]); // intentionally minimal — guards use refs

  // ── Core answer logic ────────────────────────────────────────────────────────
  const finalizeAnswer = useCallback((chosen) => {
    if (answeredRef.current) return;
    setAnswered(true);

    const q = questionsRef.current[currentQRef.current];
    const cSet = new Set(q.correct);
    const chSet = new Set(chosen);
    const full = q.correct.every(c => chSet.has(c)) && chosen.every(c => cSet.has(c));
    const partial = q.type === 'multi' && !full && chosen.every(c => cSet.has(c)) && chosen.length > 0;

    const tl = timeLeftRef.current;
    const tt = totalTimeRef.current;
    let pts = 0;
    if (full)    pts = Math.round(500 + (tl / tt) * 500);
    else if (partial) pts = Math.round(100 + (tl / tt) * 150);

    const correctLabels = q.correct.map(c => q.answers[c]).join(' + ');
    setResultData({
      emoji:         full ? '🎉' : partial ? '🤏' : '❌',
      label:         full ? 'Parfait !' : partial ? 'Pas tout à fait…' : 'Raté !',
      correctAnswer: `Bonne(s) réponse(s) : ${correctLabels}`,
      pts,
      full,
      partial,
      chosen,
    });
    setShowResult(true);
  }, []);

  const pickAnswer = useCallback((idx) => {
    if (answeredRef.current) return;
    const q = questionsRef.current[currentQRef.current];
    if (q.type === 'multi') {
      setSelectedMulti(prev => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
      });
    } else {
      finalizeAnswer([idx]);
    }
  }, [finalizeAnswer]);

  const confirmMulti = useCallback(() => {
    const chosen = [...selectedMultiRef.current];
    if (chosen.length > 0) finalizeAnswer(chosen);
  }, [finalizeAnswer]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const goTo = useCallback((screen) => {
    setCurrentScreen(screen);
    if (screen !== 'game') setShowResult(false);
  }, []);
  const goToEditor = useCallback(() => { setCurrentScreen('editor'); setShowResult(false); }, []);

  const saveQuestions = useCallback((qs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(qs));
      setQuestions(qs);
      return true;
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
      alert('Sauvegarde impossible : espace de stockage insuffisant. Essayez de réduire la taille des images ou utilisez l\'export JSON.');
      return false;
    }
  }, []);

  const saveAndPlay = useCallback((qs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(qs));
      setQuestions(qs);
      setCurrentScreen('players');
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
      alert('Sauvegarde impossible : espace de stockage insuffisant. Essayez de réduire la taille des images ou utilisez l\'export JSON.');
    }
  }, []);

  // ── Players ──────────────────────────────────────────────────────────────────
  const addPlayer    = useCallback((name) => setPlayers(p => [...p, name]), []);
  const removePlayer = useCallback((name) => setPlayers(p => p.filter(x => x !== name)), []);
  const setOnlinePlayers = useCallback((names) => setPlayers(names), []);

  // ── Game flow ─────────────────────────────────────────────────────────────────
  const loadQ = useCallback((qIdx) => {
    const q = questionsRef.current[qIdx];
    setCurrentQ(qIdx);
    setAnswered(false);
    setSelectedMulti(new Set());
    setTotalTime(q.time);
    setTimeLeft(q.time);
    setShowResult(false);
    setResultData(null);
  }, []);

  const startGame = useCallback(() => {
    const newScores = {};
    playersRef.current.forEach(p => (newScores[p] = 0));
    setScores(newScores);
    setCurrentScreen('game');
    loadQ(0);
  }, [loadQ]);

  const awardPts = useCallback((player, pts) => {
    setScores(prev => ({ ...prev, [player]: (prev[player] || 0) + pts }));
  }, []);

  const nextQuestion = useCallback(() => {
    setShowResult(false);
    const nextIdx = currentQRef.current + 1;
    if (nextIdx >= questionsRef.current.length) {
      setCurrentScreen('score');
    } else {
      loadQ(nextIdx);
    }
  }, [loadQ]);

  // ── Online result (host view in multiplayer) ──
  const setOnlineResult = useCallback((data) => {
    setAnswered(true);
    setResultData(data);
    setShowResult(true);
  }, []);

  const restartGame = useCallback(() => {
    const newScores = {};
    playersRef.current.forEach(p => (newScores[p] = 0));
    setScores(newScores);
    setCurrentScreen('game');
    loadQ(0);
  }, [loadQ]);

  const resetScores = useCallback(() => {
    const newScores = {};
    playersRef.current.forEach(p => (newScores[p] = 0));
    setScores(newScores);
    setCurrentScreen('players');
  }, []);

  return {
    questions, setQuestions, saveQuestions, saveAndPlay,
    currentScreen, goTo, goToEditor,
    players, addPlayer, removePlayer, setOnlinePlayers,
    scores, awardPts,
    currentQ, answered, selectedMulti,
    timeLeft, totalTime,
    showResult, resultData, setOnlineResult,
    startGame, pickAnswer, confirmMulti, nextQuestion, restartGame, resetScores,
  };
}
