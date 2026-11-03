import { ReactNode, useCallback, useRef, useState } from 'react';
import { Fact } from '../engine/facts';
import { hintFor } from '../engine/hints';
import { SNACKS_FAST, SNACKS_RIGHT } from '../engine/dragons';
import { DEFAULT_FAST_MS, Progress } from '../engine/scheduler';
import { buildSession, requeueMiss } from '../engine/session';
import { sounds } from '../sound';
import { Keypad } from './Keypad';

export interface AnswerEvent {
  id: number;
  fact: Fact;
  correct: boolean;
  fast: boolean;
  ms: number;
}

export interface StageProps {
  last: AnswerEvent | null;
  waiting: boolean; // true while the game wants the kid to do something
  resume: () => void; // the game calls this to move on to the next question
}

export interface SessionSummary {
  answered: number;
  correct: number;
  fast: number;
  snacks: number;
}

interface Props {
  progress: Progress;
  onAnswer: (fact: Fact, correct: boolean, ms: number) => void;
  onFinish: (summary: SessionSummary) => void;
  onQuit: () => void;
  stage: (props: StageProps) => ReactNode;
  holdAfterCorrect?: boolean; // wait for the game to call resume() after a right answer
  topRight?: ReactNode;
}

type Phase = 'ask' | 'fix' | 'pause' | 'hold';

export function PracticeSession({ progress, onAnswer, onFinish, onQuit, stage, holdAfterCorrect, topRight }: Props) {
  const [queue, setQueue] = useState<Fact[]>(() => buildSession(progress, Date.now()));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [input, setInput] = useState('');
  const [last, setLast] = useState<AnswerEvent | null>(null);
  const shownAt = useRef(Date.now());
  const summary = useRef<SessionSummary>({ answered: 0, correct: 0, fast: 0, snacks: 0 });

  const fact = queue[index];

  const next = useCallback(() => {
    setInput('');
    if (index + 1 >= queue.length) {
      onFinish(summary.current);
      return;
    }
    setIndex(index + 1);
    setPhase('ask');
    shownAt.current = Date.now();
  }, [index, queue.length, onFinish]);

  const submit = useCallback(() => {
    if (!fact) return;
    const value = Number(input);
    if (phase === 'fix') {
      // After a miss the kid types the right answer once before moving on.
      if (value === fact.answer) next();
      else setInput('');
      return;
    }
    if (phase !== 'ask') return;
    const ms = Date.now() - shownAt.current;
    const correct = value === fact.answer;
    const fast = correct && ms <= DEFAULT_FAST_MS;
    summary.current.answered++;
    if (correct) summary.current.correct++;
    if (fast) summary.current.fast++;
    if (correct) summary.current.snacks += fast ? SNACKS_FAST : SNACKS_RIGHT;
    onAnswer(fact, correct, ms);
    setLast({ id: (last?.id ?? 0) + 1, fact, correct, fast, ms });
    if (correct) {
      if (!holdAfterCorrect) sounds.kick();
      else sounds.right();
      setPhase(holdAfterCorrect ? 'hold' : 'pause');
      if (!holdAfterCorrect) setTimeout(next, 900);
    } else {
      sounds.wrong();
      setQueue(requeueMiss(queue, index));
      setPhase('fix');
      setInput('');
    }
  }, [fact, input, phase, next, onAnswer, last, holdAfterCorrect, queue, index]);

  if (!fact) return null;
  const progressPct = Math.round((index / queue.length) * 100);

  return (
    <div className="session">
      <div className="session-top">
        <button type="button" className="link-button" onClick={onQuit}>
          ← Stop
        </button>
        <div className="progress-bar" aria-label={`Question ${index + 1} of ${queue.length}`}>
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="snack-count" aria-label={`${summary.current.snacks} dragon snacks earned`}>
          🍖 {summary.current.snacks}
          {last?.correct && (
            <span key={last.id} className="snack-pop">
              +{last.fast ? SNACKS_FAST : SNACKS_RIGHT}
            </span>
          )}
        </span>
        {topRight}
      </div>

      <div className="stage">{stage({ last, waiting: phase === 'hold', resume: next })}</div>

      <div className={`question ${phase === 'fix' ? 'question-fix' : ''}`}>
        <span className="question-text">{fact.text} =</span>
        <span className="answer-box">{input || (phase === 'pause' ? fact.answer : '?')}</span>
      </div>

      {phase === 'fix' && (
        <div className="hint" role="status">
          <strong>
            {fact.text} = {fact.answer}
          </strong>
          <span>{hintFor(fact)}</span>
          <span className="hint-ask">Type {fact.answer} to keep going.</span>
        </div>
      )}

      <Keypad value={input} onChange={setInput} onSubmit={submit} disabled={phase === 'pause' || phase === 'hold'} />
    </div>
  );
}
