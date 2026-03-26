import { CLRS, LBLS } from '../hooks/useQuiz';

const FULL_DASH = 169.6; // 2π × 27

export default function GameScreen({
  questions, currentQ, answered, selectedMulti,
  timeLeft, totalTime, pickAnswer, confirmMulti,
}) {
  const q        = questions[currentQ];
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const hue      = progress > 0.5 ? 140 : progress > 0.25 ? 45 : 0;
  const stroke   = `hsl(${hue},80%,60%)`;
  const offset   = FULL_DASH * (1 - progress);

  return (
    <div className="screen" id="screen-game">
      {/* Header */}
      <div className="game-top">
        <div>
          <span className="game-progress">Question {currentQ + 1} / {questions.length}</span>
          <br />
          <span className={`game-mode-badge ${q.type === 'multi' ? 'badge-multi' : 'badge-single'}`}>
            {q.type === 'multi' ? '☑ Choix multiples' : '☑ Choix unique'}
          </span>
        </div>

        <div className="timer-ring">
          <svg viewBox="0 0 64 64">
            <circle className="timer-bg" cx="32" cy="32" r="27" />
            <circle
              className="timer-fg"
              cx="32" cy="32" r="27"
              strokeDasharray="169.6"
              strokeDashoffset={offset}
              style={{ stroke }}
            />
          </svg>
          <div className="timer-number" style={{ color: timeLeft <= 5 ? '#ff4444' : 'inherit' }}>
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="question-text">
        {q.text}
        {q.questionImage && (
          <img
            src={q.questionImage}
            alt=""
            style={{ display: 'block', maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '12px', margin: '16px auto 0' }}
          />
        )}
      </div>

      {/* Answers */}
      {q.answerType === 'image'
        ? <ImageAnswers q={q} count={q.answerCount ?? 4} answered={answered} selectedMulti={selectedMulti} pickAnswer={pickAnswer} />
        : <TextAnswers  q={q} count={q.answerCount ?? 4} answered={answered} selectedMulti={selectedMulti} pickAnswer={pickAnswer} />
      }

      {/* Multi confirm */}
      {q.type === 'multi' && (
        <button
          className="confirm-multi-btn"
          onClick={confirmMulti}
          disabled={answered || selectedMulti.size === 0}
        >
          ✔ Valider mes réponses
        </button>
      )}
    </div>
  );
}

function TextAnswers({ q, count, answered, selectedMulti, pickAnswer }) {
  return (
    <div className="answers-game">
      {q.answers.slice(0, count).map((a, i) => {
        const sel     = selectedMulti.has(i);
        const correct = answered && q.correct.includes(i);
        const wrong   = answered && !q.correct.includes(i);
        return (
          <button
            key={i}
            className={[
              'answer-btn',
              `answer-btn-${CLRS[i]}`,
              sel     ? 'selected-multi' : '',
              correct ? 'correct highlight' : '',
              wrong   ? 'wrong' : '',
            ].join(' ')}
            onClick={() => pickAnswer(i)}
            disabled={answered}
          >
            <span className="answer-icon">{LBLS[i]}</span>
            {a}
          </button>
        );
      })}
    </div>
  );
}

function ImageAnswers({ q, count, answered, selectedMulti, pickAnswer }) {
  return (
    <div className="answers-game-img">
      {q.answers.slice(0, count).map((a, i) => {
        const sel     = selectedMulti.has(i);
        const correct = answered && q.correct.includes(i);
        const wrong   = answered && !q.correct.includes(i);
        return (
          <button
            key={i}
            className={[
              'answer-img-btn',
              `aib-${CLRS[i]}`,
              sel     ? 'selected-multi' : '',
              correct ? 'correct highlight' : '',
              wrong   ? 'wrong' : '',
            ].join(' ')}
            onClick={() => pickAnswer(i)}
            disabled={answered}
          >
            {q.images[i]
              ? <img src={q.images[i]} alt={a} />
              : <div className="no-img-placeholder">📷 {a || 'Sans image'}</div>
            }
            <div className="answer-img-label">
              <span style={{ background: 'rgba(0,0,0,.4)', borderRadius: '6px', padding: '2px 8px', flexShrink: 0 }}>
                {LBLS[i]}
              </span>
              {a}
            </div>
          </button>
        );
      })}
    </div>
  );
}
