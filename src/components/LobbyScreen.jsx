import { useState, useEffect } from 'react';
import { AVATAR_COLORS } from '../hooks/useQuiz';

export default function LobbyScreen({ roomCode, players, startGame, goTo, disconnect }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let url;
        // In dev mode, use LAN IP for local play; in prod, use the public URL
        if (import.meta.env.DEV) {
          const res = await fetch('/api/network');
          const { ips } = await res.json();
          const ip = ips[0] || location.hostname;
          const port = location.port ? `:${location.port}` : '';
          url = `http://${ip}${port}?join=${roomCode}`;
        } else {
          url = `${location.origin}${location.pathname}?join=${roomCode}`;
        }
        if (!cancelled) setJoinUrl(url);

        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200, margin: 1,
          color: { dark: '#1a0533', light: '#ffffff' },
        });
        if (!cancelled) setQrUrl(dataUrl);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [roomCode]);

  const handleBack = () => { disconnect(); goTo('players'); };

  return (
    <div className="screen" style={{ gap: '24px', maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
      <h2 className="title" style={{ fontSize: '28px', marginBottom: '4px' }}>📡 Salon en ligne</h2>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Code du salon
        </div>
        <div style={{
          fontFamily: "'Syne',sans-serif", fontSize: '48px', fontWeight: 800,
          letterSpacing: '12px', background: 'var(--card)', borderRadius: '16px',
          padding: '16px 24px', display: 'inline-block',
        }}>
          {roomCode}
        </div>
      </div>

      {qrUrl && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
            Scanne ce QR code pour rejoindre
          </div>
          <img src={qrUrl} alt="QR Code" style={{ borderRadius: '12px', width: '200px' }} />
        </div>
      )}

      {joinUrl && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', wordBreak: 'break-all' }}>
          ou ouvre : <strong style={{ color: '#fff' }}>{joinUrl}</strong>
        </div>
      )}

      <div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
          {players.length} joueur{players.length !== 1 ? 's' : ''} connecté{players.length !== 1 ? 's' : ''}
        </div>
        <div className="players-wrap">
          {players.map((p, i) => (
            <div key={p} className="player-tag animate-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="player-avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff' }}>
                {p[0].toUpperCase()}
              </div>
              {p}
            </div>
          ))}
          {players.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: '14px', fontStyle: 'italic' }}>
              En attente de joueurs…
            </div>
          )}
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: '8px' }}>
        <button className="btn btn-secondary" onClick={handleBack}>← Retour</button>
        <button className="btn btn-primary" onClick={startGame} disabled={players.length === 0}>
          🚀 Lancer la partie !
        </button>
      </div>
    </div>
  );
}
