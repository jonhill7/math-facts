import { CSSProperties, MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DragonState } from '../engine/dragons';
import { Ball, Critter, doingText, GROUND, isNight, startMeadow, step, syncMeadow, tapDragon, tapThing, thingById, throwBall } from '../engine/meadow';
import { itemById } from '../engine/shop';
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
    case 'munch':
      return '🫐';
    case 'splash':
      return c.id === 8 ? '❄️' : '💦'; // Octofrost freezes the splashes
    case 'warm':
      return '✨';
    case 'bounce':
      return '⭐';
    case 'dance':
      return '🎵';
    default:
      return null;
  }
}

// How each meadow thing is drawn. (x, y) is where it sits on the ground.
function ThingArt({ id, active, iced, night }: { id: string; active: boolean; iced: boolean; night: boolean }) {
  switch (id) {
    case 'meadow-berries':
      return (
        <span className="thing-bush">
          <span>🫐</span>
          <span>🍓</span>
          <span>🫐</span>
        </span>
      );
    case 'meadow-pond':
      return (
        <span className={`thing-pond ${iced ? 'thing-pond-ice' : ''} ${active ? 'thing-pond-splash' : ''}`}>
          <span>🪷</span>
        </span>
      );
    case 'meadow-cloud':
      return <span className="thing-cloud">☁️</span>;
    case 'meadow-campfire':
      return (
        <span className={`thing-fire ${night ? 'thing-fire-night' : ''}`}>
          <span className="thing-fire-glow" />
          <span className="thing-fire-flame">🔥</span>
          <span className="thing-fire-logs">🪵</span>
        </span>
      );
    case 'meadow-trampoline':
      return (
        <span className={`thing-tramp ${active ? 'thing-tramp-on' : ''}`}>
          <span className="thing-tramp-mat" />
        </span>
      );
    case 'meadow-drum':
      return (
        <span className={`thing-drum ${active ? 'thing-drum-on' : ''}`}>
          🥁
          {active && (
            <span className="critter-bubble" aria-hidden="true">
              <span>♪</span>
              <span>♫</span>
              <span>♪</span>
            </span>
          )}
        </span>
      );
    default:
      return null;
  }
}

function eyesFor(c: Critter): Eyes {
  if (c.activity === 'nap') return 'sleep';
  if (['happy', 'fetch', 'munch', 'splash', 'bounce', 'dance'].includes(c.activity) || (c.activity === 'play' && c.play !== 'roar')) return 'happy';
  return 'open';
}

interface Props {
  dragons: DragonState[];
  names: Record<string, string>;
  companionId: number;
  hat?: string;
  placed?: string[]; // meadow things bought in the shop and put out
  onShop?: () => void;
}

export function Meadow({ dragons, names, companionId, hat, placed = [], onShop }: Props) {
  const reduce = useReducedMotion();
  const [night] = useState(() => isNight(new Date()));
  const [critters, setCritters] = useState(() => startMeadow(dragons, Date.now(), Math.random));
  const [ball, setBall] = useState<(Ball & { key: number }) | null>(null);
  const meadowRef = useRef<HTMLDivElement>(null); // the whole meadow, which can be wider than the screen
  const scrollRef = useRef<HTMLDivElement>(null); // the window onto it, which swipes sideways on phones
  const [more, setMore] = useState({ left: false, right: false });
  const placedRef = useRef(placed);
  placedRef.current = placed;

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
          : step(cs, now, Math.random, night, placedRef.current),
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [reduce, night]);

  // On a narrow screen the meadow is wider than the window: start looking at
  // the companion, and show arrows when there's more to see either side.
  const checkMore = () => {
    const el = scrollRef.current;
    if (!el) return;
    setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const me = critters.find((c) => c.id === companionId);
    if (el && me && el.scrollWidth > el.clientWidth) el.scrollLeft = (me.x / 100) * el.scrollWidth - el.clientWidth / 2;
    checkMore();
    window.addEventListener('resize', checkMore);
    return () => window.removeEventListener('resize', checkMore);
    // Only when the meadow first opens.
  }, []);

  // The part of the meadow on screen right now, as percentages.
  const inView = () => {
    const el = scrollRef.current;
    if (!el || !el.scrollWidth) return { from: GROUND.left, to: GROUND.right };
    return { from: Math.max(GROUND.left, (el.scrollLeft / el.scrollWidth) * 100), to: Math.min(GROUND.right, ((el.scrollLeft + el.clientWidth) / el.scrollWidth) * 100) };
  };

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

  const pokeThing = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (id === 'meadow-drum') sounds.drum();
    else sounds.search();
    if (!reduce) setCritters((cs) => tapThing(cs, id, Date.now(), Math.random, companionId));
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
      <div className="meadow-frame">
        <div ref={scrollRef} className={`meadow ${night ? 'meadow-night' : ''} ${reduce ? 'meadow-still' : ''}`} onScroll={checkMore}>
          <div ref={meadowRef} className="meadow-world" onClick={tapGrass}>
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
            {placed.map((id) => {
              const t = thingById(id);
              const item = itemById(id);
              if (!t || !item) return null;
              const near = critters.filter((c) => c.activity === t.activity && Math.hypot(c.x - t.x, c.y - t.y) < 14);
              return (
                <button
                  key={id}
                  type="button"
                  className={`thing thing-at-${id.replace('meadow-', '')}`}
                  style={{ left: `${t.x}%`, top: `${t.y}%`, zIndex: 10 + Math.round(t.y) - (t.room === 1 ? 1 : 0) }}
                  onClick={(e) => pokeThing(id, e)}
                  aria-label={id === 'meadow-drum' ? 'Party drum. Tap to send your companion to start a dance party.' : `${item.name}. Tap to send your companion over.`}
                >
                  <ThingArt id={id} active={near.length > 0} iced={near.some((c) => c.id === 8)} night={night} />
                </button>
              );
            })}
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
        </div>
        {more.left && <span className="meadow-more meadow-more-left" aria-hidden="true">‹</span>}
        {more.right && <span className="meadow-more meadow-more-right" aria-hidden="true">›</span>}
      </div>
      <div className="meadow-tip">
        <span className="muted">
          {hatched === 0
            ? 'Your egg is snug in the nest. Tap it! Once it hatches, it will run around the meadow.'
            : hatched === 1
              ? 'Tap your dragon to say hi, or tap the grass to throw a ball. Hatch more eggs and they will play together.'
              : 'Tap a dragon to say hi, or tap the grass to throw a ball.'}
          {placed.length > 0 && hatched > 0 && ' Tap a thing to send your companion over to it.'}
          {(more.left || more.right) && ' Swipe sideways to see the whole meadow.'}
        </span>
        {onShop && placed.length === 0 && hatched > 0 && (
          <button type="button" className="chip" onClick={onShop}>
            🛍️ Get things for the meadow
          </button>
        )}
        {hatched > 0 && !reduce && (
          <button
            type="button"
            className="chip"
            onClick={() => {
              const { from, to } = inView();
              throwAt(from + 6 + Math.random() * Math.max(0, to - from - 12), GROUND.back + Math.random() * (GROUND.front - GROUND.back));
            }}
          >
            ⚽ Throw a ball
          </button>
        )}
      </div>
    </section>
  );
}
