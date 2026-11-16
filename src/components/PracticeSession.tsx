import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Fact } from '../engine/facts';
import { factFamily, hintFor } from '../engine/hints';
import { SNACKS_FAST, SNACKS_RIGHT } from '../engine/dragons';
import { DEFAULT_FAST_MS, Progress, startOfDay } from '../engine/scheduler';
import { speedGoalMs } from '../engine/speed';
import { buildSession, canRetry, requeueMiss, SessionOptions } from '../engine/session';
import { sounds } from '../sound';
import { Keypad } from './Keypad';
import { DotPicture } from './DotPicture';

export interface AnswerEvent {
  id: number;
  fact: Fact;
  correct: boolean;
  fast: boolean; // right and beat the fact's speed goal
  ms: number;
  goalMs: number; // this fact's speed goal (the same in every game)
  power: boolean; // this answer filled the power meter: the game does a power move
  boss: boolean; // asked during the boss round
  helped: boolean; // the kid asked for help first (or said "I don't know yet")
}

export interface StageProps {
  last: AnswerEvent | null;
  waiting: boolean; // true while the game wants the kid to do something
  resume: () => void; // the game calls this to move on to the next question
  turn: number; // goes up each time a new question appears
  fact?: Fact; // the question on screen now
}

export interface SessionSummary {
  answered: number;
  correct: number;
  fast: number;
  snacks: number;
  inTime: number; // right answers given before the time limit (games with a shot clock)
  powers: number; // power moves used
  boss: 'none' | 'beaten' | 'lost';
  firstTries: number; // answers that weren't a retry of a miss
  firstTryRight: number;
  retriesRight: number; // misses fixed later in the game
  remembered: Fact[]; // facts from earlier days answered right first try, ones missed before first
  revisit: Fact[]; // facts missed this game: they come back next time
}

export const BOSS_BONUS = 20; // snacks for beating a boss

interface Props {
  progress: Progress;
  onAnswer: (fact: Fact, correct: boolean, ms: number, helped: boolean) => void;
  onFinish: (summary: SessionSummary) => void;
  onQuit: () => void;
  stage: (props: StageProps) => ReactNode;
  holdAfterCorrect?: boolean; // wait for the game to call resume() after a right answer
  topRight?: ReactNode;
  options?: SessionOptions;
  fastMs?: number;
  facts?: Fact[]; // questions picked ahead of time (Sky Race), instead of building them here
  buddy?: ReactNode; // the kid's companion dragon, along for the game
  timeLimitFor?: (fact: Fact) => number; // games with a shot clock count right answers given in time
  pauseMs?: number; // how long to show a right answer before the next question
  chargeNeeded?: number; // fast answers in a row that fill the power meter
  snackBonus?: (fast: boolean) => number; // extra snacks per right answer (the Feast power)
  startCharge?: number; // the Head Start power: the meter begins part full
  chargeAfterPower?: number; // Head Start II and III: the meter refills partway after a power move
  keepsCharge?: (correct: boolean) => boolean; // Tailwind II and III: answers that don't empty the meter
  boss?: { name: string; icon: string; facts: Fact[]; forgive: number; bonus: number }; // a boss round at the end, from trouble facts
  decor?: string; // a picture of the place on the world tour
  alwaysRetry?: boolean; // Sky Race: every miss comes back, since the finish line needs every flap
}

// What the companion says after each answer.
function buddyLine(last: AnswerEvent, timeLimitMs?: number): string {
  if (last.power) return 'POWER UP!';
  if (last.helped) return last.correct ? 'You worked it out!' : "Let's learn this one!";
  if (last.correct && timeLimitMs !== undefined && last.ms > timeLimitMs) return 'Got it! Quicker next time!';
  if (last.correct && last.fast) return 'Yum! Triple snack!';
  if (last.correct) return 'Nice one!';
  return "We'll get it next time!";
}

type Phase = 'ask' | 'fix' | 'pause' | 'hold';

const noBonus = () => 0;

export function PracticeSession({
  progress,
  onAnswer,
  onFinish,
  onQuit,
  stage,
  holdAfterCorrect,
  topRight,
  options,
  fastMs = DEFAULT_FAST_MS,
  facts,
  buddy,
  timeLimitFor,
  pauseMs = 900,
  chargeNeeded = 3,
  snackBonus = noBonus,
  boss,
  decor,
  startCharge = 0,
  chargeAfterPower = 0,
  keepsCharge,
  alwaysRetry,
}: Props) {
  // The boss round's facts go at the end of the game.
  const [queue, setQueue] = useState<Fact[]>(() => {
    const main = facts ?? buildSession(progress, Date.now(), options);
    return boss ? [...main, ...boss.facts] : main;
  });
  const [bossStart, setBossStart] = useState(() => (boss ? queue.length - boss.facts.length : Infinity));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [input, setInput] = useState('');
  const [last, setLast] = useState<AnswerEvent | null>(null);
  const [charge, setCharge] = useState(startCharge); // fast answers in a row toward the next power move
  const [helped, setHelped] = useState(false); // help is showing for the question on screen
  // Refs, not state: next() can run from a timer set before the last answer re-rendered.
  const bossHits = useRef(0);
  const bossMisses = useRef(0);
  const shownAt = useRef(Date.now());
  const summary = useRef<SessionSummary>({ answered: 0, correct: 0, fast: 0, snacks: 0, inTime: 0, powers: 0, boss: 'none', firstTries: 0, firstTryRight: 0, retriesRight: 0, remembered: [], revisit: [] });
  const retried = useRef<string[]>([]); // one entry per miss added back to the game
  const retryPending = useRef<Record<string, number>>({}); // retries of each fact still to come

  // Time with the app hidden (another tab, the screen off) isn't thinking time.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt) {
        shownAt.current += Date.now() - hiddenAt;
        hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const fact = queue[index];
  const inBoss = index >= bossStart;

  const next = useCallback(() => {
    setInput('');
    if (index + 1 >= queue.length) {
      if (boss) summary.current.boss = bossMisses.current <= boss.forgive ? 'beaten' : 'lost';
      if (summary.current.boss === 'beaten' && boss) summary.current.snacks += boss.bonus;
      onFinish(summary.current);
      return;
    }
    setIndex(index + 1);
    setPhase('ask');
    setHelped(false);
    shownAt.current = Date.now();
  }, [index, queue.length, onFinish, boss]);

  const submit = useCallback((dontKnow = false) => {
    if (!fact) return;
    const value = dontKnow ? NaN : Number(input);
    if (phase === 'fix') {
      // After a miss the kid types the right answer once before moving on.
      if (value === fact.answer) next();
      else setInput('');
      return;
    }
    if (phase !== 'ask') return;
    const ms = Date.now() - shownAt.current;
    const correct = value === fact.answer;
    const goalMs = speedGoalMs(fact, fastMs);
    // An answer after help still counts as right, but it isn't a speed bonus.
    const fast = correct && !helped && ms <= goalMs;
    const timeLimitMs = timeLimitFor?.(fact);
    // Fast answers in a row charge the power meter. Anything else empties it
    // (unless a Tailwind keeps it).
    const newCharge = fast ? charge + 1 : keepsCharge?.(correct) ? charge : 0;
    const power = newCharge >= chargeNeeded;
    setCharge(power ? chargeAfterPower : newCharge);
    summary.current.answered++;
    if (correct) summary.current.correct++;
    if (fast) summary.current.fast++;
    if (power) summary.current.powers++;
    if (correct && timeLimitMs !== undefined && ms <= timeLimitMs) summary.current.inTime++;
    if (correct) summary.current.snacks += (fast ? SNACKS_FAST : SNACKS_RIGHT) + snackBonus(fast);
    // First tries and retries, and what the kid remembered from earlier days.
    const s = summary.current;
    const isRetry = (retryPending.current[fact.id] ?? 0) > 0;
    if (isRetry) {
      retryPending.current[fact.id]--;
      if (correct) s.retriesRight++;
    } else {
      s.firstTries++;
      if (correct) s.firstTryRight++;
      const before = progress[fact.id];
      if (correct && !helped && before && before.lastSeen < startOfDay(Date.now()) && !s.remembered.includes(fact)) {
        const missedBefore = before.seen > before.correct;
        s.remembered = missedBefore ? [fact, ...s.remembered] : [...s.remembered, fact];
      }
    }
    if (!correct && !s.revisit.includes(fact)) s.revisit = [...s.revisit, fact];
    if (inBoss) {
      if (correct) bossHits.current++;
      else bossMisses.current++;
    }
    onAnswer(fact, correct, ms, helped || dontKnow);
    setLast({ id: (last?.id ?? 0) + 1, fact, correct, fast, ms, goalMs, power, boss: inBoss, helped: helped || dontKnow });
    if (correct) {
      if (power) sounds.power();
      else if (!holdAfterCorrect && timeLimitMs === undefined) sounds.kick();
      else sounds.right();
      setPhase(holdAfterCorrect ? 'hold' : 'pause');
      if (!holdAfterCorrect) setTimeout(next, pauseMs);
    } else {
      if (!dontKnow) sounds.wrong(); // "I don't know yet" is a fine answer: no buzzer
      setPhase('fix');
      setInput('');
      // A missed fact comes back a little later, but never into the boss round,
      // and only a few times a game so a hard day doesn't drag on.
      if (!inBoss && (alwaysRetry || canRetry(retried.current, fact))) {
        retried.current = [...retried.current, fact.id];
        retryPending.current[fact.id] = (retryPending.current[fact.id] ?? 0) + 1;
        const requeued = requeueMiss(queue, index);
        const at = requeued.indexOf(fact, index + 1);
        if (at >= bossStart) {
          requeued.splice(at, 1);
          requeued.splice(bossStart, 0, fact);
          setBossStart(bossStart + 1);
        }
        setQueue(requeued);
      }
    }
  }, [fact, input, phase, next, onAnswer, last, holdAfterCorrect, queue, index, fastMs, timeLimitFor, pauseMs, charge, chargeNeeded, snackBonus, inBoss, bossStart, chargeAfterPower, keepsCharge, helped, alwaysRetry, progress]);

  if (!fact) return null;
  const progressPct = Math.round((index / queue.length) * 100);

  return (
    <div className={`session ${inBoss ? 'session-boss' : ''}`}>
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
              +{(last.fast ? SNACKS_FAST : SNACKS_RIGHT) + snackBonus(last.fast)}
            </span>
          )}
        </span>
        {topRight}
      </div>

      {boss && inBoss && (
        <div className="boss-bar" role="status">
          <span className="boss-icon" aria-hidden="true">
            {boss.icon}
          </span>
          <strong>BOSS: {boss.name}</strong>
          <span className="boss-hearts" aria-label={`${boss.facts.length - bossHits.current} hits left`}>
            {Array.from({ length: boss.facts.length }, (_, i) => (
              <span key={i} className={i < bossHits.current ? 'boss-heart-hit' : ''}>
                ❤️
              </span>
            ))}
          </span>
          {bossMisses.current > boss.forgive && <small>It got away this time. Keep going!</small>}
          {bossMisses.current > 0 && bossMisses.current <= boss.forgive && <small>🏔️ Boss Breaker saved you from that miss!</small>}
        </div>
      )}

      <div className="stage">
        {stage({ last, waiting: phase === 'hold', resume: next, turn: index, fact })}
        {(phase === 'fix' || (phase === 'ask' && helped)) && (
          // After a miss (or when the kid asks for help) the picture hint covers
          // the game, right where the kid is looking.
          <div className="stage-hint">
            <DotPicture fact={fact} hideAnswer={phase === 'ask'} />
          </div>
        )}
        {decor && (
          <span className="stage-decor" aria-hidden="true">
            {decor}
          </span>
        )}
        {buddy && (
          <div className={`buddy ${last ? (last.correct ? 'buddy-cheer' : 'buddy-oops') : ''}`} key={last?.id ?? 0}>
            {buddy}
            {last && <span className="buddy-bubble">{buddyLine(last, timeLimitFor?.(last.fact))}</span>}
          </div>
        )}
        <div className={`power-meter ${last?.power ? 'power-meter-fired' : ''}`} key={`p${last?.id ?? 0}`} aria-label={`Power meter ${charge} of ${chargeNeeded}`}>
          {Array.from({ length: chargeNeeded }, (_, i) => (
            <span key={i} className={i < charge || last?.power ? 'power-on' : ''}>
              ⚡
            </span>
          ))}
        </div>
      </div>

      <div className={`question ${phase === 'fix' ? 'question-fix' : ''}`}>
        <span className="question-text">{fact.text} =</span>
        <span className="answer-box">{input || (phase === 'pause' ? fact.answer : '?')}</span>
        {phase === 'ask' && !helped && (
          <button type="button" className="help-button" onMouseDown={(e) => e.preventDefault()} onClick={() => setHelped(true)}>
            💡 Help
          </button>
        )}
        {(phase === 'pause' || phase === 'hold') && last?.correct && (
          // Every right answer gets a tick. A fast one says it earned the speed bonus.
          <span key={last.id} className={`verdict ${last.fast ? 'verdict-fast' : ''}`} role="status">
            {last.fast ? '⚡ Fast!' : '✓ Right!'}
          </span>
        )}
      </div>

      {phase === 'ask' && helped && (
        <div className="hint hint-help" role="status">
          <span>{hintFor(fact, true)}</span>
          <span className="hint-ask">
            Work it out, then type your answer.{' '}
            <button type="button" className="link-button" onMouseDown={(e) => e.preventDefault()} onClick={() => submit(true)}>
              I don't know yet
            </button>
          </span>
        </div>
      )}

      {phase === 'fix' && (
        <div className="hint" role="status">
          <strong>
            {fact.text} = {fact.answer}
          </strong>
          <span>{hintFor(fact)}</span>
          <span className="hint-family">Same family: {factFamily(fact).join(' · ')}</span>
          <span className="hint-ask">Type {fact.answer} to keep going.</span>
        </div>
      )}

      <Keypad value={input} onChange={setInput} onSubmit={() => submit()} disabled={phase === 'pause' || phase === 'hold'} />
    </div>
  );
}
