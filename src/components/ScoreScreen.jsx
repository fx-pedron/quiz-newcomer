import { useEffect } from 'react';
import { AVATAR_COLORS } from '../hooks/useQuiz';

const MEDALS = ['🥇','🥈','🥉'];

export default function ScoreScreen({ players, scores, restartGame, goTo, launch }) {
  useEffect(() => { launch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted      = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const podiumOrder = [1, 0, 2]; // silver center-left, gold center, bronze center-right

  return (
    <div className="screen" id="screen-score" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
      <h2 className="title" style={{ fontSize: '32px', textAlign: 'center', marginTop: '16px' }}>
        🏆 Classement final
      </h2>

      {/* Podium */}
      <div className="podium">
        {podiumOrder.map(pos => {
          if (!sorted[pos]) return null;
          const [name, pts] = sorted[pos];
          return (
            <div key={pos} className={`podium-col podium-${pos + 1}`}>
              <div className="podium-name">{MEDALS[pos]} {name}</div>
              <div className="podium-score-text">{pts} pts</div>
              <div className="podium-block">{pos + 1}</div>
            </div>
          );
        })}
      </div>

      {/* Full ranking */}
      <div className="score-list">
        {sorted.map(([n, p], i) => {
          const avatarColor = AVATAR_COLORS[players.indexOf(n) % AVATAR_COLORS.length];
          return (
            <div key={n} className="score-row" style={{ animation: `slideUp .4s ${i * 0.07}s both` }}>
              <div className="score-rank">{i + 1}</div>
              <div style={{
                background: avatarColor,
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: "'Syne',sans-serif",
                flexShrink: 0,
              }}>
                {n[0].toUpperCase()}
              </div>
              <div className="score-name">{n}</div>
              <div className="score-pts">{p} pts</div>
            </div>
          );
        })}
      </div>

      <div className="btn-group" style={{ marginTop: '16px', paddingBottom: '32px' }}>
        <button className="btn btn-primary"   onClick={restartGame}>🔄 Rejouer</button>
        <button className="btn btn-secondary" onClick={() => goTo('splash')}>🏠 Accueil</button>
      </div>
    </div>
  );
}
