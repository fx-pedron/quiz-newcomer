import { useState, useRef } from 'react';

const LBLS = ['A','B','C','D'];
const BC   = ['badge-a','badge-b','badge-c','badge-d'];

export default function EditorScreen({ questions: init, saveQuestions, saveAndPlay, goTo }) {
  const [qs, setQs] = useState(() => JSON.parse(JSON.stringify(init)));
  const [saved, setSaved] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragRef = useRef(null);

  const handleDragStart = (i, e) => {
    dragRef.current = i;
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (i, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(i);
  };
  const handleDrop = (i, e) => {
    e.preventDefault();
    const from = dragRef.current;
    if (from === null || from === i) { setDragIdx(null); setOverIdx(null); return; }
    setQs(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const updateQ = (i, patch) =>
    setQs(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));

  const setQType = (i, t) =>
    setQs(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      const correct = t === 'single' && q.correct.length > 1 ? [q.correct[0]] : q.correct;
      return { ...q, type: t, correct };
    }));

  const setAnswerText = (i, j, val) =>
    setQs(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      const answers = [...q.answers];
      answers[j] = val;
      return { ...q, answers };
    }));

  const setCorrect = (i, j) => updateQ(i, { correct: [j] });

  const toggleMulti = (i, j, checked) =>
    setQs(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      const correct = checked
        ? [...new Set([...q.correct, j])]
        : q.correct.filter(x => x !== j);
      return { ...q, correct };
    }));

  // When reducing answerCount, drop correct indices that are now out of range
  const setAnswerCount = (i, n) =>
    setQs(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      const correct = q.correct.filter(c => c < n);
      return { ...q, answerCount: n, correct: correct.length ? correct : [0] };
    }));

  const uploadQuestionImg = (i, file) => {
    if (!file) { updateQ(i, { questionImage: null }); return; }
    const r = new FileReader();
    r.onload = e => updateQ(i, { questionImage: e.target.result });
    r.readAsDataURL(file);
  };

  const uploadImg = (i, j, file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = e =>
      setQs(prev => prev.map((q, idx) => {
        if (idx !== i) return q;
        const images = [...q.images];
        images[j] = e.target.result;
        return { ...q, images };
      }));
    r.readAsDataURL(file);
  };

  const addQuestion = () => {
    setQs(prev => [
      ...prev,
      { text: '', type: 'single', answerType: 'text', answerCount: 4, answers: ['','','',''], images: [null,null,null,null], correct: [0], time: 20 },
    ]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  };

  const deleteQuestion = (i) => {
    if (qs.length <= 1) return;
    setQs(prev => prev.filter((_, idx) => idx !== i));
  };

  const exportQuestions = () => {
    const json = JSON.stringify(qs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importQuestions = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data) && data.length > 0 && data[0].text !== undefined) {
          setQs(data);
          saveQuestions(data);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          alert('Format de fichier invalide');
        }
      } catch { alert('Erreur de lecture du fichier'); }
    };
    r.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto', padding: '32px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '28px' }}>✏️ Mes questions</h2>
          <div className="btn-group" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => goTo('splash')}>← Retour</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { saveQuestions(qs); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
              {saved ? '✓ Sauvegardé !' : '💾 Sauver'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => saveAndPlay(qs)}>▶ Jouer</button>
            <button className="btn btn-secondary btn-sm" onClick={exportQuestions} title="Exporter en JSON">📤 Exporter</button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }} title="Importer un fichier JSON">
              📥 Importer
              <input type="file" accept=".json" style={{ display: 'none' }}
                onChange={e => { importQuestions(e.target.files[0]); e.target.value = ''; }} />
            </label>
          </div>
        </div>

        {qs.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            i={i}
            isDragging={dragIdx === i}
            isOver={overIdx === i && dragIdx !== i}
            onDragStart={e => handleDragStart(i, e)}
            onDragOver={e => handleDragOver(i, e)}
            onDrop={e => handleDrop(i, e)}
            onDragEnd={handleDragEnd}
            onText={val => updateQ(i, { text: val })}
            onType={t => setQType(i, t)}
            onAnswerType={t => updateQ(i, { answerType: t })}
            onAnswerText={(j, val) => setAnswerText(i, j, val)}
            onCorrect={j => setCorrect(i, j)}
            onToggleMulti={(j, v) => toggleMulti(i, j, v)}
            onUploadImg={(j, f) => uploadImg(i, j, f)}
            onQuestionImg={f => uploadQuestionImg(i, f)}
            onTime={t => updateQ(i, { time: t })}
            onAnswerCount={n => setAnswerCount(i, n)}
            onDelete={() => deleteQuestion(i)}
          />
        ))}

        <button className="add-q-btn" onClick={addQuestion}>+ Ajouter une question</button>
      </div>
    </div>
  );
}

function QuestionCard({ q, i, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onText, onType, onAnswerType, onAnswerText, onCorrect, onToggleMulti, onUploadImg, onQuestionImg, onTime, onAnswerCount, onDelete }) {
  const count = q.answerCount ?? 4;
  return (
    <div
      className="question-card animate-up"
      style={{
        animationDelay: `${i * 0.05}s`,
        opacity: isDragging ? 0.4 : 1,
        borderColor: isOver ? 'var(--c1)' : undefined,
        borderStyle: isOver ? 'dashed' : undefined,
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            style={{ cursor: 'grab', fontSize: '16px', color: 'var(--muted)', userSelect: 'none', padding: '2px 4px' }}
            title="Glisser pour réordonner"
          >⠿</span>
          <span className="q-number">Question {i + 1}</span>
        </div>
        <button className="delete-btn" onClick={onDelete}>✕</button>
      </div>

      <textarea
        className="q-input"
        rows={2}
        placeholder="Ta question ici…"
        value={q.text}
        onChange={e => onText(e.target.value)}
      />

      {/* Illustration optionnelle */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Photo d'illustration (optionnel)
        </div>
        {q.questionImage ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={q.questionImage}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '10px', objectFit: 'contain', background: 'rgba(255,255,255,.04)' }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <label className="type-pill" style={{ cursor: 'pointer', fontSize: '11px' }}>
                🔄 Changer
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onQuestionImg(e.target.files[0])} />
              </label>
              <button className="type-pill" style={{ fontSize: '11px' }} onClick={() => onQuestionImg(null)}>✕ Retirer</button>
            </div>
          </div>
        ) : (
          <label className="img-preview-wrap" style={{ maxWidth: '200px', aspectRatio: '16/9' }}>
            <div className="img-upload-label">📷 Ajouter une photo</div>
            <input type="file" accept="image/*" className="img-upload-input" onChange={e => onQuestionImg(e.target.files[0])} />
          </label>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Type de réponse
          </div>
          <div className="type-selector">
            <button className={`type-pill ${q.type === 'single' ? 'active' : ''}`} onClick={() => onType('single')}>☑ Choix unique</button>
            <button className={`type-pill ${q.type === 'multi'  ? 'active' : ''}`} onClick={() => onType('multi')}>☑☑ Choix multiples</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Format des réponses
          </div>
          <div className="type-selector">
            <button className={`type-pill ${q.answerType === 'text'  ? 'active' : ''}`} onClick={() => onAnswerType('text')}>📝 Texte</button>
            <button className={`type-pill ${q.answerType === 'image' ? 'active' : ''}`} onClick={() => onAnswerType('image')}>🖼 Images</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Nb. de réponses
          </div>
          <div className="type-selector">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`type-pill ${count === n ? 'active' : ''}`}
                onClick={() => onAnswerCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnswerEditor
        q={q}
        i={i}
        count={count}
        onAnswerText={onAnswerText}
        onCorrect={onCorrect}
        onToggleMulti={onToggleMulti}
        onUploadImg={onUploadImg}
      />

      <div className="q-footer">
        <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⏱ Temps :
          <select className="timer-select" value={q.time} onChange={e => onTime(+e.target.value)}>
            {[10,15,20,30,45,60].map(t => <option key={t} value={t}>{t}s</option>)}
          </select>
        </label>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {q.type === 'multi' ? 'Cases à cocher = plusieurs bonnes réponses' : 'Rond = bonne réponse unique'}
        </span>
      </div>
    </div>
  );
}

function AnswerEditor({ q, i, count, onAnswerText, onCorrect, onToggleMulti, onUploadImg }) {
  const visible = q.answers.slice(0, count);
  if (q.answerType === 'image') {
    return (
      <div className="answers-grid">
        {visible.map((a, j) => (
          <div key={j} className="img-answer-col">
            <label className="img-preview-wrap">
              {q.images[j] && <img src={q.images[j]} alt="" />}
              <div className="img-upload-label">
                {q.images[j] ? '🔄 Changer' : '📷 Ajouter une image'}
              </div>
              <input
                type="file"
                accept="image/*"
                className="img-upload-input"
                onChange={e => onUploadImg(j, e.target.files[0])}
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className={`answer-badge ${BC[j]}`}>{LBLS[j]}</div>
              <input
                className="answer-input"
                placeholder="Légende (optionnel)"
                value={a}
                onChange={e => onAnswerText(j, e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type={q.type === 'multi' ? 'checkbox' : 'radio'}
                name={`c${i}`}
                checked={q.correct.includes(j)}
                onChange={e => q.type === 'multi' ? onToggleMulti(j, e.target.checked) : onCorrect(j)}
                className="correct-check"
                title="Bonne réponse"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="answers-grid">
      {visible.map((a, j) => (
        <div key={j} className="answer-row">
          <div className={`answer-badge ${BC[j]}`}>{LBLS[j]}</div>
          <input
            className="answer-input"
            placeholder={`Réponse ${LBLS[j]}`}
            value={a}
            onChange={e => onAnswerText(j, e.target.value)}
          />
          <input
            type={q.type === 'multi' ? 'checkbox' : 'radio'}
            name={`c${i}`}
            checked={q.correct.includes(j)}
            onChange={e => q.type === 'multi' ? onToggleMulti(j, e.target.checked) : onCorrect(j)}
            className="correct-check"
            title="Bonne réponse"
          />
        </div>
      ))}
    </div>
  );
}
