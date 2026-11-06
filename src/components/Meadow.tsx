import { CSSProperties, MouseEvent, useEffect, useRef, useState } from 'react';
import { DragonState } from '../engine/dragons';
import { Ball, Critter, doingText, GROUND, isNight, startMeadow, step, syncMeadow, tapDragon, throwBall } from '../engine/meadow';
import { sounds } from '../sound';
import { Dragon, Eyes } from './Dragon';

// The hatchery meadow: every dragon found so far, wandering about, napping and
// playing together. Tap a dragon to say hi, or tap the grass to throw a ball.

// What each kind of dragon does when you tap it.
const REACTION: Record<number, string> = {
  1: '🪨', // Pebble Wyrm
  2: '💕', // Twin-Tail
  3: '🌿', // Thornback
  4: '🪶', // Quadwing
  5: '⭐', // Starfin
  6: '🔷', // Hexscale
  7: '🔥', // Ember Drake
  8: '❄️', // Octofrost
  9: '💨', // Ninefold Gale
  10: '🏔️', // Tenpeak Titan
  11: '🪞', // Mirror Drake
  12: '💎', // Dozen Crown
};

// Drawing size of each stage, in em (the meadow's font size grows on big screens).
const SIZE: Record<string, number> = { egg: 2.4, hatchling: 3, young: 3.7, grown: 4.5 };

const TICK_MS = 300;

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const q = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!q) return;
    const on = () => setReduce(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return reduce;
}

function bubbleFor(c: Critter): string | null {
  switch (c.activity) {
    case 'nap':
      return 'z';
    case 'play':
      return c.play === 'nuzzle' ? '💛' : c.play === 'roar' ? REACTION[c.id] : '✨';
    case 'happy':
      return REACTION[c.id] ?? '✨';
    case 'fetch':
      return '🎉';
    default:
      return null;
  }
}

function eyesFor(c: Critter): Eyes {
  if (c.activity === 'nap') return 'sleep';
  if (c.activity === 'happy' || c.activity === 'fetch' || (c.activity === 'play' && c.play !== 'roar')) return 'happy';
  return 'open';
}

interface Props {
  dragons: DragonState[];
  names: Record<string, string>;
  companionId: number;
  hat?: string;
}

export function Meadow({ dragons, names, companionId, hat }: Props) {
  const reduce = useReducedMotion();
  const [night] = useState(() => isNight(new Date()));
  const [critters, setCritters] = useState(() => startMeadow(dragons, Date.now(), Math.random));
  const [ball, setBall] = useState<(Ball & { key: number }) | null>(null);
  const meadowRef = useRef<HTMLDivElement>(null);

  // New eggs and dragons that grew show up without resetting everyone else.
  // (Keyed on the stages so it only runs when one changes.)
  const stages = dragons.map((d) => d.stage).join();
  useEffect(() => {
    setCritters((cs) => syncMeadow(cs, dragons, Date.now(), Math.random));
  }, [stages]);

  // The clock that keeps everyone busy. With reduced motion, dragons stay put
  // and only react to taps.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      setCritters((cs) =>
        reduce
          ? cs.map((c) => (c.until <= now && c.activity !== 'idle' ? { ...c, activity: 'idle', until: Number.MAX_SAFE_INTEGER } : c))
          : step(cs, now, Math.random, night),
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [reduce, night]);

  // The ball goes away once its chaser has finished celebrating.
  useEffect(() => {
    if (!ball) return;
    const chaser = critters.find((c) => c.id === ball.chaser);
    const busy = chaser && (chaser.activity === 'fetch' || (chaser.activity === 'walk' && chaser.then?.activity === 'fetch'));
    if (busy) return;
    const t = window.setTimeout(() => setBall(null), chaser ? 0 : 1500);
    return () => window.clearTimeout(t);
  }, [ball, critters]);

  const tap = (c: Critter, e: MouseEvent) => {
    e.stopPropagation();
    if (c.stage === 'egg') sounds.wobble();
    else sounds.chirp(c.stage);
    setCritters((cs) => tapDragon(cs, c.id, Date.now()));
  };

  const throwAt = (x: number, y: number) => {
    if (reduce) return;
    const { critters: next, ball: b } = throwBall(critters, x, y, Date.now());
    setCritters(next);
    setBall({ ...b, key: Date.now() });
    sounds.search();
  };

  const tapGrass = (e: MouseEvent<HTMLDivElement>) => {
    const box = meadowRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    if (y < GROUND.back - 8) return; // that's the sky
    throwAt(x, y);
  };

  const hatched = critters.filter((c) => c.stage !== 'egg').length;

  return (
    <section className="meadow-wrap" aria-label="Dragon meadow">
      <div ref={meadowRef} className={`meadow ${night ? 'meadow-night' : ''} ${reduce ? 'meadow-still' : ''}`} onClick={tapGrass}>
        <div className="meadow-scenery" aria-hidden="true">
          <span className="meadow-sun">{night ? '🌙' : ''}</span>
          {night && <span className="meadow-stars">✦ · ✧ · ✦ · ✧</span>}
          <span className="meadow-cloud meadow-cloud-1">☁️</span>
          <span className="meadow-cloud meadow-cloud-2">☁️</span>
          <span className="meadow-hill meadow-hill-back" />
          <span className="meadow-hill meadow-hill-front" />
          <span className="meadow-grass" />
          <span className="meadow-tree">🌳</span>
          <span className="meadow-rock">🪨</span>
          <span className="meadow-flower meadow-flower-1">🌼</span>
          <span className="meadow-flower meadow-flower-2">🌷</span>
          <span className="meadow-flower meadow-flower-3">🌼</span>
          <span className="meadow-nest" />
        </div>
        {critters.map((c) => {
          const d = dragons.find((x) => x.species.id === c.id);
          if (!d) return null;
          const shown = { ...d, stage: c.stage };
          const given = names[String(c.id)] || d.species.name;
          const depth = 0.72 + ((c.y - GROUND.back) / (GROUND.front - GROUND.back)) * 0.33;
          const bubble = bubbleFor(c);
          const style = {
            left: `${c.x}%`,
            top: `${c.y}%`,
            zIndex: 10 + Math.round(c.y),
            transitionDuration: `${c.moveMs}ms`,
            '--depth': depth,
          } as CSSProperties;
          return (
            <button
              key={c.id}
              type="button"
              className={`critter critter-${c.activity} critter-${c.stage} ${c.play ? `critter-play-${c.play}` : ''} ${c.id === companionId ? 'critter-companion' : ''}`}
              style={style}
              onClick={(e) => tap(c, e)}
              aria-label={`${given}, ${doingText(c)}. Tap to say hi.`}
            >
              <span className="critter-depth">
                <span className="critter-flip" style={{ transform: `scaleX(${c.facing})` }}>
                  <span className="critter-body">
                    <Dragon dragon={shown} size={SIZE[c.stage] ?? 3} hat={c.id === companionId ? hat : undefined} eyes={eyesFor(c)} />
                  </span>
                </span>
              </span>
              {bubble === 'z' ? (
                <span className="critter-zzz" aria-hidden="true">
                  <span>z</span>
                  <span>z</span>
                  <span>Z</span>
                </span>
              ) : (
                bubble && (
                  <span className="critter-bubble" aria-hidden="true">
                    <span>{bubble}</span>
                    <span>{bubble}</span>
                    <span>{bubble}</span>
                  </span>
                )
              )}
              {c.activity === 'happy' && <span className="critter-name">{given}</span>}
            </button>
          );
        })}
        {ball && (
          <span key={ball.key} className="meadow-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%`, zIndex: 10 + Math.round(ball.y) }} aria-hidden="true">
            <span>⚽</span>
          </span>
        )}
      </div>
      <div className="meadow-tip">
        <span className="muted">
          {hatched === 0
            ? 'Your egg is snug in the nest. Tap it! Once it hatches, it will run around the meadow.'
            : hatched === 1
              ? 'Tap your dragon to say hi, or tap the grass to throw a ball. Hatch more eggs and they will play together.'
              : 'Tap a dragon to say hi, or tap the grass to throw a ball.'}
        </span>
        {hatched > 0 && !reduce && (
          <button
            type="button"
            className="chip"
            onClick={() => throwAt(GROUND.left + 10 + Math.random() * (GROUND.right - GROUND.left - 20), GROUND.back + Math.random() * (GROUND.front - GROUND.back))}
          >
            ⚽ Throw a ball
          </button>
        )}
      </div>
    </section>
  );
}
