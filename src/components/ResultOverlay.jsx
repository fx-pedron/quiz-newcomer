import { useState, useEffect } from 'react';

export default function ResultOverlay({ showResult, resultData, players, awardPts, nextQuestion }) {
  const [awarded, setAwarded] = useState(null);
  const [floats,  setFloats]  = useState([]);

  // Reset per question
  useEffect(() => {
    setAwarded(null);
    setFloats([]);
  }, [resultData]);

  const handleAward = (player, pts) => {
    if (awarded) return;
    setAwarded(player);
    awardPts(player, pts);
    const id = Date.now() + Math.random();
    const item = {
      id,
      text: `+${pts} ${player}`,
      left: `${25 + Math.random() * 50}%`,
      top:  `${35 + Math.random() * 30}%`,
    };
    setFloats(prev => [...prev, item]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1400);
  };

  return (
    <>
      {/* Floating +pts animations (outside overlay so they sit above everything) */}
      {floats.map(f => (
        <div key={f.id} className="pts-earned" style={{ left: f.left, top: f.top }}>
          {f.text}
        </div>
      ))}

      <div className={`result-overlay${showResult ? ' show' : ''}`}>
        {resultData && (
          <>
            <div className="result-emoji">{resultData.emoji}</div>
            <div className="result-label">{resultData.label}</div>
            <div className="result-correct-answer">{resultData.correctAnswer}</div>

            {resultData.pts > 0 && players.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                {awarded ? (
                  <span style={{ fontFamily: "'Syne',sans-serif", color: '#4dc94d', fontWeight: 700 }}>
                    ✓ +{resultData.pts} pts → {awarded}
                  </span>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                      Qui a répondu juste ?
                    </div>
                    {players.map(p => (
                      <AwardBtn key={p} name={p} pts={resultData.pts} onAward={handleAward} />
                    ))}
                  </>
                )}
              </div>
            )}

            <button className="btn btn-primary" onClick={nextQuestion}>Suivant →</button>
          </>
        )}
      </div>
    </>
  );
}

function AwardBtn({ name, pts, onAward }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onAward(name, pts)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Syne',sans-serif",
        fontWeight: 700,
        fontSize: '13px',
        padding: '8px 16px',
        borderRadius: '50px',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'rgba(77,201,77,.4)' : 'rgba(77,201,77,.2)',
        color: '#4dc94d',
        margin: '4px',
        transition: 'background .2s',
      }}
    >
      {name} +{pts}
    </button>
  );
}
