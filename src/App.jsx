import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuiz }        from './hooks/useQuiz';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useConfetti }    from './hooks/useConfetti.jsx';
import SplashScreen       from './components/SplashScreen';
import EditorScreen       from './components/EditorScreen';
import PlayersScreen      from './components/PlayersScreen';
import LobbyScreen        from './components/LobbyScreen';
import GameScreen         from './components/GameScreen';
import ResultOverlay      from './components/ResultOverlay';
import ScoreScreen        from './components/ScoreScreen';
import PlayerApp          from './components/PlayerApp';

// Detect player mode from URL
const params = new URLSearchParams(window.location.search);
const joinCode = params.get('join');

export default function App() {
  const [playerMode, setPlayerMode] = useState(!!joinCode);

  if (playerMode) {
    return <PlayerApp initialCode={joinCode || ''} onBack={() => setPlayerMode(false)} />;
  }
  return <HostApp onJoin={() => setPlayerMode(true)} />;
}

function HostApp({ onJoin }) {
  const quiz              = useQuiz();
  const mp                = useMultiplayer();
  const { pieces, launch } = useConfetti();

  const onlineModeRef = useRef(false);
  const playerAnswersRef = useRef(new Map()); // name → { answers, timeLeft }
  const questionsRef = useRef(quiz.questions);
  const currentQRef = useRef(quiz.currentQ);
  const scoresRef = useRef(quiz.scores);
  questionsRef.current = quiz.questions;
  currentQRef.current = quiz.currentQ;
  scoresRef.current = quiz.scores;

  const sendQuestionToPlayers = useCallback((qIdx) => {
    const q = questionsRef.current[qIdx];
    mp.sendToPlayers({
      type: 'question',
      index: qIdx,
      total: questionsRef.current.length,
      text: q.text,
      qType: q.type,
      answerType: q.answerType,
      answerCount: q.answerCount ?? 4,
      answers: q.answers,
      images: q.images,
      questionImage: q.questionImage || null,
      time: q.time,
    });
  }, [mp]);

  // Listen for player answers
  useEffect(() => {
    return mp.onMessage((msg) => {
      if (msg.type !== 'from-player') return;
      const { name, data } = msg;
      if (data.type !== 'answer') return;
      if (!onlineModeRef.current) return;

      playerAnswersRef.current.set(name, data);

      // When all players answered, auto-score
      if (playerAnswersRef.current.size >= mp.players.length) {
        autoScoreAll();
      }
    });
  }, [mp]);

  const autoScoreAll = useCallback(() => {
    const q = questionsRef.current[currentQRef.current];
    const cSet = new Set(q.correct);

    for (const [name, { answers: chosen, timeLeft: tl }] of playerAnswersRef.current) {
      const chSet = new Set(chosen);
      const full = q.correct.every(c => chSet.has(c)) && chosen.every(c => cSet.has(c));
      const partial = q.type === 'multi' && !full && chosen.every(c => cSet.has(c)) && chosen.length > 0;
      let pts = 0;
      if (full) pts = Math.round(500 + (tl / q.time) * 500);
      else if (partial) pts = Math.round(100 + (tl / q.time) * 150);

      quiz.awardPts(name, pts);

      const correctLabels = q.correct.map(c => q.answers[c]).join(' + ');
      mp.sendToPlayer(name, {
        type: 'result',
        emoji: full ? '🎉' : partial ? '🤏' : '❌',
        label: full ? 'Parfait !' : partial ? 'Pas tout à fait…' : 'Raté !',
        correctAnswer: `Bonne(s) réponse(s) : ${correctLabels}`,
        pts,
      });
    }

    // Show result on host too (time-up style summary)
    const correctLabels = q.correct.map(c => q.answers[c]).join(' + ');
    quiz.setOnlineResult({
      emoji: '📊',
      label: `${playerAnswersRef.current.size} réponse(s) reçue(s)`,
      correctAnswer: `Bonne(s) réponse(s) : ${correctLabels}`,
      pts: 0,
      full: false,
      partial: false,
      chosen: [],
    });

    playerAnswersRef.current = new Map();
  }, [quiz, mp]);

  // When host clicks "next question" in online mode, send to players
  const handleNextQuestion = useCallback(() => {
    quiz.nextQuestion();
    const nextIdx = currentQRef.current + 1;
    if (onlineModeRef.current && nextIdx < questionsRef.current.length) {
      setTimeout(() => sendQuestionToPlayers(nextIdx), 100);
    } else if (onlineModeRef.current && nextIdx >= questionsRef.current.length) {
      // Send final scores to players
      setTimeout(() => {
        mp.sendToPlayers({ type: 'final-scores', scores: scoresRef.current });
      }, 300);
    }
  }, [quiz, mp, sendQuestionToPlayers]);

  const startOnlineGame = useCallback(() => {
    if (mp.players.length === 0) return;
    onlineModeRef.current = true;
    playerAnswersRef.current = new Map();
    quiz.setOnlinePlayers(mp.players);
    quiz.startGame();
    setTimeout(() => sendQuestionToPlayers(0), 100);
  }, [mp, quiz, sendQuestionToPlayers]);

  // When time is up in online mode, auto-score whoever answered
  useEffect(() => {
    if (!onlineModeRef.current) return;
    if (quiz.timeLeft !== 0 || quiz.currentScreen !== 'game') return;
    if (quiz.answered) return;
    // Give a short delay, then auto-score with whatever answers we have
    const id = setTimeout(() => {
      // Fill missing players with empty answers
      for (const p of mp.players) {
        if (!playerAnswersRef.current.has(p)) {
          playerAnswersRef.current.set(p, { answers: [], timeLeft: 0 });
        }
      }
      autoScoreAll();
    }, 500);
    return () => clearTimeout(id);
  }, [quiz.timeLeft, quiz.currentScreen, quiz.answered, mp.players, autoScoreAll]);

  const goToLobby = useCallback(async () => {
    await mp.createRoom();
    quiz.goTo('lobby');
  }, [mp, quiz]);

  return (
    <>
      {quiz.currentScreen === 'splash' && (
        <SplashScreen goTo={quiz.goTo} goToEditor={quiz.goToEditor} onJoin={onJoin} />
      )}

      {quiz.currentScreen === 'editor' && (
        <EditorScreen
          questions={quiz.questions}
          saveQuestions={quiz.saveQuestions}
          saveAndPlay={quiz.saveAndPlay}
          goTo={quiz.goTo}
        />
      )}

      {quiz.currentScreen === 'players' && (
        <PlayersScreen
          players={quiz.players}
          addPlayer={quiz.addPlayer}
          removePlayer={quiz.removePlayer}
          startGame={() => { onlineModeRef.current = false; quiz.startGame(); }}
          goTo={quiz.goTo}
          goToLobby={goToLobby}
        />
      )}

      {quiz.currentScreen === 'lobby' && (
        <LobbyScreen
          roomCode={mp.roomCode}
          players={mp.players}
          startGame={startOnlineGame}
          goTo={quiz.goTo}
          disconnect={mp.disconnect}
        />
      )}

      {quiz.currentScreen === 'game' && (
        <GameScreen
          questions={quiz.questions}
          currentQ={quiz.currentQ}
          answered={quiz.answered}
          selectedMulti={quiz.selectedMulti}
          timeLeft={quiz.timeLeft}
          totalTime={quiz.totalTime}
          pickAnswer={onlineModeRef.current ? () => {} : quiz.pickAnswer}
          confirmMulti={onlineModeRef.current ? () => {} : quiz.confirmMulti}
        />
      )}

      {quiz.currentScreen === 'score' && (
        <ScoreScreen
          players={quiz.players}
          scores={quiz.scores}
          restartGame={quiz.restartGame}
          resetScores={quiz.resetScores}
          goTo={quiz.goTo}
          launch={launch}
        />
      )}

      <ResultOverlay
        showResult={quiz.showResult}
        resultData={quiz.resultData}
        players={onlineModeRef.current ? [] : quiz.players}
        awardPts={quiz.awardPts}
        nextQuestion={handleNextQuestion}
      />

      <div className="confetti-wrap">{pieces}</div>
    </>
  );
}
