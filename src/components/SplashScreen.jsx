export default function SplashScreen({ goTo, goToEditor }) {
  const icons = [
    { emoji: '🙋', bg: 'var(--a)', shadow: 'rgba(226,27,60,.5)',  rot: '-4deg' },
    { emoji: '🕵️', bg: 'var(--b)', shadow: 'rgba(19,104,206,.5)', rot: '3deg'  },
    { emoji: '❓', bg: 'var(--d)', shadow: 'rgba(255,166,2,.5)',   rot: '-2deg' },
    { emoji: '🎯', bg: 'var(--c)', shadow: 'rgba(38,137,12,.5)',   rot: '5deg'  },
  ];

  return (
    <div className="screen" id="screen-splash">
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
        <div className="splash-tag">✦ Quiz de présentation</div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {icons.map(({ emoji, bg, shadow, rot }) => (
            <div
              key={emoji}
              style={{
                background: bg,
                fontSize: 'clamp(36px,7vw,70px)',
                width: 'clamp(70px,12vw,120px)',
                height: 'clamp(70px,12vw,120px)',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 32px ${shadow}`,
                transform: `rotate(${rot})`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <h1 className="splash-title">Tu me connais ?</h1>
        <p className="splash-sub">Montre que tu sais qui je suis — réponds vite pour marquer plus de points !</p>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => goTo('players')}>▶ &nbsp;Jouer</button>
          <button className="btn btn-secondary" onClick={goToEditor}>✏️ &nbsp;Éditer les questions</button>
        </div>
      </div>
    </div>
  );
}
