import { useState, useEffect, useRef } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { AVATAR_COLORS } from '../hooks/useQuiz';

const CLRS = ['a','b','c','d'];
const LBLS = ['A','B','C','D'];

export default function PlayerApp({ initialCode }) {
  const mp = useMultiplayer();
  const [phase, setPhase] = useState('join'); // join | lobby | question | answered | result | scores
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode || '');
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [resultInfo, setResultInfo] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const timerRef = useRef(null);
  const nameRef = useRef('');
  nameRef.current = name;

  useEffect(() => {
    const unsub = mp.onMessage((msg) => {
      if (msg.type === 'joined') {
        setPhase('lobby');
      }
      if (msg.type === 'host-left') {
        setPhase('join');
        setQuestion(null);
        setResultInfo(null);
      }
      // Messages from host (relayed as direct data)
      if (msg.type === 'question') {
        setQuestion(msg);
        setTimeLeft(msg.time);
        setTotalTime(msg.time);
        setSelected(new Set());
        setResultInfo(null);
        setPhase('question');
        startTimer(msg.time);
      }
      if (msg.type === 'result') {
        clearTimer();
        setResultInfo(msg);
        setPhase('result');
      }
      if (msg.type === 'final-scores') {
        setFinalScores(msg.scores);
        const sorted = Object.entries(msg.scores).sort((a, b) => b[1] - a[1]);
        const rank = sorted.findIndex(([n]) => n === nameRef.current) + 1;
        setMyRank(rank);
        setPhase('scores');
      }
      if (msg.type === 'game-restart') {
        setPhase('lobby');
        setQuestion(null);
        setResultInfo(null);
        setFinalScores(null);
      }
    });
    return unsub;
  }, [mp]);

  const startTimer = (t) => {
    clearTimer();
    let remaining = t;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) clearTimer();
    }, 1000);
  };
  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => clearTimer(), []);

  const handleJoin = async () => {
    const trimName = name.trim();
    const trimCode = code.trim().toUpperCase();
    if (!trimName || !trimCode) return;
    await mp.joinRoom(trimCode, trimName);
  };

  const pickAnswer = (idx) => {
    if (phase !== 'question') return;
    if (question.qType === 'multi') {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
      });
    } else {
      setSelected(new Set([idx]));
      setPhase('answered');
      clearTimer();
      mp.sendToHost({ type: 'answer', answers: [idx], timeLeft });
    }
  };

  const confirmMulti = () => {
    if (selected.size === 0) return;
    setPhase('answered');
    clearTimer();
    mp.sendToHost({ type: 'answer', answers: [...selected], timeLeft });
  };

  // ── JOIN ──
  if (phase === 'join') {
    return (
      <div className="screen" style={{ gap: '20px', maxWidth: '400px', margin: '0 auto', padding: '40px 24px' }}>
        <h2 className="title" style={{ fontSize: '26px' }}>🎮 Rejoindre</h2>
        {mp.error && <div style={{ color: '#ff4444', fontSize: '13px' }}>{mp.error}</div>}
        <input
          className="q-input" placeholder="Code du salon" maxLength={4}
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
        />
        <input
          className="q-input" placeholder="Ton prénom" maxLength={20}
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button className="btn btn-primary" onClick={handleJoin} style={{ width: '100%' }}>
          Rejoindre 🚀
        </button>
      </div>
    );
  }

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="screen" style={{ gap: '20px', maxWidth: '400px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <h2 className="title" style={{ fontSize: '24px' }}>✅ Connecté !</h2>
        <div style={{ fontSize: '18px' }}>Bienvenue <strong>{name}</strong></div>
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
          En attente du lancement de la partie…
        </div>
        <div className="players-wrap" style={{ justifyContent: 'center' }}>
          {mp.players.map((p, i) => (
            <div key={p} className="player-tag">
              <div className="player-avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff' }}>
                {p[0].toUpperCase()}
              </div>
              {p}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── QUESTION ──
  if (phase === 'question' && question) {
    const count = question.answerCount ?? 4;
    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    const hue = progress > 0.5 ? 140 : progress > 0.25 ? 45 : 0;
    return (
      <div className="screen" style={{ gap: '16px', padding: '24px 16px' }}>
        <div className="game-top">
          <span className="game-progress">Q{question.index + 1}/{question.total}</span>
          <div className="timer-ring">
            <svg viewBox="0 0 64 64">
              <circle className="timer-bg" cx="32" cy="32" r="27" />
              <circle className="timer-fg" cx="32" cy="32" r="27"
                strokeDasharray="169.6"
                strokeDashoffset={169.6 * (1 - progress)}
                style={{ stroke: `hsl(${hue},80%,60%)` }}
              />
            </svg>
            <div className="timer-number" style={{ color: timeLeft <= 5 ? '#ff4444' : 'inherit' }}>
              {timeLeft}
            </div>
          </div>
        </div>

        <div className="question-text" style={{ fontSize: '18px' }}>
          {question.text}
          {question.questionImage && (
            <img src={question.questionImage} alt=""
              style={{ display: 'block', maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '12px', margin: '12px auto 0' }}
            />
          )}
        </div>

        {question.answerType === 'image' ? (
          <div className="answers-game-img">
            {question.answers.slice(0, count).map((a, i) => (
              <button key={i}
                className={`answer-img-btn aib-${CLRS[i]} ${selected.has(i) ? 'selected-multi' : ''}`}
                onClick={() => pickAnswer(i)}>
                {question.images?.[i]
                  ? <img src={question.images[i]} alt={a} />
                  : <div className="no-img-placeholder">📷 {a || 'Sans image'}</div>
                }
                <div className="answer-img-label">
                  <span style={{ background: 'rgba(0,0,0,.4)', borderRadius: '6px', padding: '2px 8px' }}>{LBLS[i]}</span>
                  {a}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="answers-game">
            {question.answers.slice(0, count).map((a, i) => (
              <button key={i}
                className={`answer-btn answer-btn-${CLRS[i]} ${selected.has(i) ? 'selected-multi' : ''}`}
                onClick={() => pickAnswer(i)}>
                <span className="answer-icon">{LBLS[i]}</span>
                {a}
              </button>
            ))}
          </div>
        )}

        {question.qType === 'multi' && (
          <button className="confirm-multi-btn" onClick={confirmMulti} disabled={selected.size === 0}>
            ✔ Valider
          </button>
        )}
      </div>
    );
  }

  // ── ANSWERED (waiting) ──
  if (phase === 'answered') {
    return (
      <div className="screen" style={{ gap: '20px', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: '48px' }}>✅</div>
        <div style={{ fontSize: '18px' }}>Réponse envoyée !</div>
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>En attente des résultats…</div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && resultInfo) {
    return (
      <div className="screen" style={{ gap: '20px', textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '64px' }}>{resultInfo.emoji}</div>
        <div style={{ fontSize: '22px', fontWeight: 700 }}>{resultInfo.label}</div>
        <div style={{ fontSize: '16px', color: 'var(--muted)' }}>{resultInfo.correctAnswer}</div>
        <div style={{
          fontSize: '36px', fontWeight: 800, fontFamily: "'Syne',sans-serif",
          background: 'linear-gradient(135deg, var(--c1), var(--c2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          +{resultInfo.pts} pts
        </div>
      </div>
    );
  }

  // ── SCORES ──
  if (phase === 'scores' && finalScores) {
    const sorted = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
    return (
      <div className="screen" style={{ gap: '20px', padding: '40px 24px', maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="title" style={{ fontSize: '26px', textAlign: 'center' }}>🏆 Résultats</h2>
        {myRank && (
          <div style={{ textAlign: 'center', fontSize: '18px' }}>
            Tu es <strong>{myRank === 1 ? '🥇 1er' : myRank === 2 ? '🥈 2e' : myRank === 3 ? '🥉 3e' : `${myRank}e`}</strong> !
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(([p, pts], i) => (
            <div key={p} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: p === name ? 'rgba(255,60,172,.15)' : 'var(--card)',
              borderRadius: '12px', padding: '12px 16px',
              border: p === name ? '1px solid var(--c1)' : '1px solid transparent',
            }}>
              <span style={{ fontWeight: 700, width: '24px' }}>{i + 1}.</span>
              <div className="player-avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff', width: '32px', height: '32px', fontSize: '14px' }}>
                {p[0].toUpperCase()}
              </div>
              <span style={{ flex: 1 }}>{p}</span>
              <strong>{pts} pts</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="screen" style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Chargement…</div>
    </div>
  );
}
