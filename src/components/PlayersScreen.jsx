import { useState } from 'react';
import { AVATAR_COLORS } from '../hooks/useQuiz';

export default function PlayersScreen({ players, addPlayer, removePlayer, startGame, goTo, goToLobby }) {
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed)                    { setError('Saisis un prénom.');            return; }
    if (players.length >= 12)        { setError('Maximum 12 joueurs.');          return; }
    if (players.includes(trimmed))   { setError('Ce joueur est déjà ajouté.');   return; }
    setError('');
    addPlayer(trimmed);
    setName('');
  };

  const handleStart = () => {
    if (!players.length) { setError('Ajoute au moins un joueur !'); return; }
    startGame();
  };

  return (
    <div
      className="screen"
      id="screen-players"
      style={{ gap: '24px', maxWidth: '500px', margin: '0 auto', padding: '40px 24px' }}
    >
      <h2 className="title" style={{ fontSize: '28px', marginBottom: '4px' }}>👥 Les joueurs</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '8px' }}>Ajoute les prénoms des participants</p>

      <div className="player-input-row">
        <input
          className="q-input"
          style={{ flex: 1 }}
          placeholder="Prénom…"
          maxLength={20}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd}>Ajouter</button>
      </div>

      <div className="players-wrap">
        {players.map((p, i) => (
          <div key={p} className="player-tag">
            <div
              className="player-avatar"
              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff' }}
            >
              {p[0].toUpperCase()}
            </div>
            {p}
            <button className="player-remove" onClick={() => removePlayer(p)}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ color: '#ff4444', fontSize: '13px', minHeight: '18px' }}>{error}</div>

      <div className="btn-group" style={{ marginTop: '8px' }}>
        <button className="btn btn-secondary" onClick={() => goTo('splash')}>← Retour</button>
        <button className="btn btn-primary" onClick={handleStart}>🚀 Lancer !</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>— ou —</div>
        <button className="btn btn-secondary" onClick={goToLobby} style={{ background: 'linear-gradient(135deg, var(--c1), var(--c2))', border: 'none', color: '#fff' }}>
          📡 Mode en ligne (QR code)
        </button>
      </div>
    </div>
  );
}
