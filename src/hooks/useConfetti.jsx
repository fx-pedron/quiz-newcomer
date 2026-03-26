import { useState, useCallback } from 'react';

const COLS = ['#FF3CAC','#FFD93D','#6BCB77','#4D96FF','#FF5C5C','#C77DFF','#FF9A3C'];

export function useConfetti() {
  const [pieces, setPieces] = useState([]);

  const launch = useCallback(() => {
    const next = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left:         `${Math.random() * 100}%`,
      color:        COLS[Math.floor(Math.random() * COLS.length)],
      width:        `${6 + Math.random() * 8}px`,
      height:       `${6 + Math.random() * 8}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      duration:     `${1.5 + Math.random() * 2.5}s`,
      delay:        `${Math.random() * 1.5}s`,
    }));
    setPieces(next);
    setTimeout(() => setPieces([]), 6000);
  }, []);

  const elements = pieces.map(p => (
    <div
      key={p.id}
      className="confetti-piece"
      style={{
        left:              p.left,
        background:        p.color,
        width:             p.width,
        height:            p.height,
        borderRadius:      p.borderRadius,
        animationDuration: p.duration,
        animationDelay:    p.delay,
      }}
    />
  ));

  return { pieces: elements, launch };
}
