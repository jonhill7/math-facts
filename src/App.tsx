import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Dragon } from './components/Dragon';
import { companionFor, Hatchery, stageText } from './components/Hatchery';
import { MasteryMap, masteredCount } from './components/MasteryMap';
import { PracticeSession, SessionSummary } from './components/PracticeSession';
import { ALL_FACTS, Fact } from './engine/facts';
import { DragonState, grewBetween, levelFor, SNACKS_FAST, SNACKS_RIGHT } from './engine/dragons';
import { DEFAULT_FAST_MS, Progress, recordAnswer } from './engine/scheduler';
import { practiced, streakStatus } from './engine/streak';
import { LanternHunt } from './modes/LanternHunt';
import { PenaltyKicks, pickRival, StatKey } from './modes/PenaltyKicks';
import { cloudEnabled, cloudStore, signInWithGoogle, signOutUser, User, watchUser } from './storage/firebase';
import { listGuests, localStore } from './storage/localStore';
import { ProgressStore, SaveData } from './storage/types';
import { setMuted, sounds } from './sound';

type Mode = 'soccer' | 'lantern';
type Screen =
  | { name: 'who' }
  | { name: 'home' }
  | { name: 'play'; mode: Mode; before: Progress; rival: string }
  | { name: 'done'; mode: Mode; summary: SessionSummary; grew: DragonState[]; rival: string }
  | { name: 'map' }
  | { name: 'hatchery' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<ProgressStore | null>(null);
  const [data, setData] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'who' });
  const [error, setError] = useState('');
  const latest = useRef<SaveData | null>(null);
  latest.current = data;
  setMuted(data?.settings.muted ?? false);

  // Signed in with Google: load that kid's progress from the cloud.
  useEffect(
    () =>
      watchUser((u) => {
        setUser(u);
        if (u) openStore(cloudStore(u));
      }),
    [],
  );

  const openStore = (s: ProgressStore) => {
    setStore(s);
    s.load()
      .then((d) => {
        loaded.current = d;
        setData(d);
        setScreen({ name: 'home' });
      })
      .catch(() => setError('Could not load your progress. Check the internet connection and try again.'));
  };

  // Save shortly after each change, so a session doesn't write on every answer.
  const loaded = useRef<SaveData | null>(null);
  const saveSoon = useRef(false);
  useEffect(() => {
    if (!store || !data || data === loaded.current) return;
    const write = () => store.save(data).catch(() => setError('Progress did not save. Check the internet connection.'));
    if (saveSoon.current) {
      saveSoon.current = false;
      write();
      return;
    }
    const timer = window.setTimeout(write, 1500);
    return () => window.clearTimeout(timer);
  }, [store, data]);

  const update = useCallback((change: (d: SaveData) => SaveData, now = false) => {
    if (now) saveSoon.current = true;
    setData((d) => (d ? change(d) : d));
  }, []);

  const onAnswer = useCallback(
    (fact: Fact, correct: boolean, ms: number) =>
      update((d) => ({
        ...d,
        progress: { ...d.progress, [fact.id]: recordAnswer(d.progress[fact.id], correct, ms, Date.now()) },
        stats: correct
          ? { ...d.stats, snacks: d.stats.snacks + (ms <= DEFAULT_FAST_MS ? SNACKS_FAST : SNACKS_RIGHT) }
          : d.stats,
      })),
    [update],
  );

  const onStat = useCallback(
    (key: StatKey) => update((d) => ({ ...d, stats: { ...d.stats, [key]: d.stats[key] + 1 } })),
    [update],
  );

  const muteButton = data && (
    <button
      type="button"
      className="mute-button"
      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, muted: !d.settings.muted } }), true)}
      aria-label={data.settings.muted ? 'Turn sound on' : 'Turn sound off'}
    >
      {data.settings.muted ? '🔇' : '🔊'}
    </button>
  );

  const switchPlayer = async () => {
    if (user) await signOutUser();
    setStore(null);
    setData(null);
    setScreen({ name: 'who' });
  };

  return (
    <main className="app">
      {error && (
        <div className="error" role="alert" onClick={() => setError('')}>
          {error} <span className="muted">(tap to close)</span>
        </div>
      )}
      {screen.name === 'who' && <WhoIsPlaying onGuest={(name) => openStore(localStore(name))} onError={setError} />}
      {screen.name === 'home' && data && (
        <Home
          data={data}
          onPlay={(mode) => setScreen({ name: 'play', mode, before: data.progress, rival: pickRival() })}
          onMap={() => setScreen({ name: 'map' })}
          onHatchery={() => setScreen({ name: 'hatchery' })}
          onSwitch={switchPlayer}
          muteButton={muteButton}
        />
      )}
      {screen.name === 'map' && data && <MasteryMap progress={data.progress} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'hatchery' && data && (
        <Hatchery
          progress={data.progress}
          companion={data.companion}
          onPick={(table) => update((d) => ({ ...d, companion: table }), true)}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'play' && data && (
        <PracticeSession
          progress={data.progress}
          onAnswer={onAnswer}
          holdAfterCorrect={screen.mode === 'lantern'}
          topRight={muteButton}
          onQuit={() => {
            update((d) => ({ ...d }), true); // save right away
            setScreen({ name: 'home' });
          }}
          onFinish={(summary) => {
            const won = screen.mode === 'soccer' && summary.correct > summary.answered - summary.correct;
            update(
              (d) => ({
                ...d,
                stats: {
                  ...d.stats,
                  sessions: d.stats.sessions + 1,
                  lastPlayed: Date.now(),
                  matchesWon: d.stats.matchesWon + (won ? 1 : 0),
                },
                streak: practiced(d.streak, Date.now()),
              }),
              true,
            );
            setScreen({
              name: 'done',
              mode: screen.mode,
              summary,
              rival: screen.rival,
              grew: grewBetween(screen.before, latest.current?.progress ?? {}),
            });
          }}
          stage={(props) =>
            screen.mode === 'soccer' ? <PenaltyKicks {...props} onStat={onStat} rival={screen.rival} /> : <LanternHunt {...props} onStat={onStat} monstersFoundTotal={data.stats.monstersFound} />
          }
        />
      )}
      {screen.name === 'done' && (
        <Done
          summary={screen.summary}
          match={screen.mode === 'soccer' ? screen.rival : undefined}
          grew={screen.grew}
          onAgain={() => data && setScreen({ name: 'play', mode: screen.mode, before: data.progress, rival: pickRival() })}
          onHome={() => setScreen({ name: 'home' })}
        />
      )}
    </main>
  );
}

function WhoIsPlaying({ onGuest, onError }: { onGuest: (name: string) => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('');
  const guests = listGuests();
  const signIn = () =>
    signInWithGoogle().catch((e: { code?: string }) => {
      if (e.code !== 'auth/popup-closed-by-user') onError('Google sign-in did not work. Try again, or play as a guest.');
    });

  return (
    <div className="who">
      <h1>
        Math Facts <span aria-hidden="true">⚽🔦</span>
      </h1>
      <p className="muted">Multiplication and division up to 12 × 12. About 5 minutes a day.</p>

      {cloudEnabled ? (
        <button type="button" className="big-button google" onClick={signIn}>
          Sign in with Google to save progress
        </button>
      ) : (
        <p className="note">Google sign-in isn't set up yet, so progress saves in this browser only.</p>
      )}

      <h2>{cloudEnabled ? 'Or play as a guest' : "Who's playing?"}</h2>
      {guests.length > 0 && (
        <div className="guest-list">
          {guests.map((g) => (
            <button key={g} type="button" className="chip" onClick={() => onGuest(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <form
        className="guest-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onGuest(name.trim());
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" maxLength={20} aria-label="Nickname" />
        <button type="submit" className="chip" disabled={!name.trim()}>
          Play
        </button>
      </form>
    </div>
  );
}

interface HomeProps {
  data: SaveData;
  onPlay: (m: Mode) => void;
  onMap: () => void;
  onHatchery: () => void;
  onSwitch: () => void;
  muteButton: ReactNode;
}

function Home({ data, onPlay, onMap, onHatchery, onSwitch, muteButton }: HomeProps) {
  const mastered = masteredCount(data.progress);
  const companion = companionFor(data.progress, data.companion);
  const hatched = companion && !['none', 'egg'].includes(companion.stage);
  const level = levelFor(data.stats.snacks);
  const streak = streakStatus(data.streak, Date.now());
  return (
    <div className="home">
      <div className="home-top">
        <h1>Hi, {data.name}!</h1>
        <span className="home-actions">
          {muteButton}
          <button type="button" className="link-button" onClick={onSwitch}>
            Switch player
          </button>
        </span>
      </div>
      <p className="muted">
        {data.stats.sessions === 0
          ? "Your first game is a warm-up to find the facts you already know."
          : `${mastered} of ${ALL_FACTS.length} facts mastered. Pick a game for today's practice.`}
      </p>
      {data.stats.sessions > 0 && (
        <div className={`streak ${streak.doneToday ? 'streak-done' : ''}`}>
          <span className="streak-flame">{streak.count > 0 ? '🔥' : '🌱'}</span>
          <span>
            <strong>{streak.count > 0 ? `${streak.count}-day streak` : 'Start a new streak today!'}</strong>
            <small>
              {streak.doneToday
                ? "Today's practice is done. See you tomorrow!"
                : streak.atRisk
                  ? 'You used your rest day. Play today to keep your streak!'
                  : 'Play one game today to keep it going. You get one rest day a week.'}
            </small>
          </span>
        </div>
      )}
      <button type="button" className="companion" onClick={onHatchery}>
        {companion && companion.stage !== 'none' ? <Dragon dragon={companion} size={3} /> : <span className="dragon">🥚</span>}
        <span className="companion-text">
          {hatched && companion ? (
            <>
              <strong>
                {companion.species.name} · level {level.level}
              </strong>
              <span className="dragon-meter" aria-label={`${level.into} of ${level.needed} snacks to the next level`}>
                <span style={{ width: `${(level.into / level.needed) * 100}%` }} />
              </span>
              <small>Right answers are snacks. Fast ones are triple snacks!</small>
            </>
          ) : (
            <>
              <strong>{companion && companion.stage === 'egg' ? 'You found a dragon egg!' : 'Find your first dragon egg'}</strong>
              <small>{companion && companion.stage === 'egg' ? stageText(companion) : 'Play a game to start.'}</small>
            </>
          )}
        </span>
      </button>
      <div className="modes">
        <button type="button" className="mode-card soccer" onClick={() => onPlay('soccer')}>
          <span className="mode-emoji">⚽</span>
          <strong>Penalty Kicks</strong>
          <span>Fast answers fly into the top corner.</span>
        </button>
        <button type="button" className="mode-card lantern" onClick={() => onPlay('lantern')}>
          <span className="mode-emoji">🔦</span>
          <strong>Lantern Hunt</strong>
          <span>Find the Tickle Monster before it finds you.</span>
        </button>
      </div>
      <div className="stats">
        <span>⚽ {data.stats.goals} goals</span>
        <span>⭐ {data.stats.topCorners} top corners</span>
        <span>🏆 {data.stats.matchesWon} matches won</span>
        <span>👾 {data.stats.monstersFound} monsters found</span>
        <span>🤗 {data.stats.tickles} tickle attacks</span>
        <span>🍖 {data.stats.snacks} dragon snacks</span>
      </div>
      <button type="button" className="big-button" onClick={onHatchery}>
        Dragon hatchery 🐉
      </button>
      <button type="button" className="big-button secondary" onClick={onMap}>
        See my fact map
      </button>
    </div>
  );
}

interface DoneProps {
  summary: SessionSummary;
  match?: string; // rival team name after a soccer match
  grew: DragonState[];
  onAgain: () => void;
  onHome: () => void;
}

function Done({ summary, match, grew, onAgain, onHome }: DoneProps) {
  useEffect(() => {
    if (grew.length) sounds.hatch();
  }, [grew]);
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  return (
    <div className="done">
      <h1>Nice work!</h1>
      {match && <MatchResult us={summary.correct} them={summary.answered - summary.correct} rival={match} />}
      <p className="big-stat">{pct}% right</p>
      <p className="snack-total">🍖 Your dragon ate {summary.snacks} snacks!</p>
      {grew.map((d) => (
        <div key={d.species.table} className="grew">
          <Dragon dragon={d} size={2.6} />
          <span>
            <strong>
              {d.stage === 'egg'
                ? `New egg: ${d.species.name}!`
                : d.stage === 'hatchling'
                  ? `${d.species.name} hatched!`
                  : `${d.species.name} grew!`}
            </strong>
            <small>{d.species.power}</small>
          </span>
        </div>
      ))}
      <p className="muted">
        {summary.correct} of {summary.answered} right, {summary.fast} super fast. Facts you missed will come back soon, and the ones you
        know will wait longer.
      </p>
      <button type="button" className="big-button" onClick={onAgain}>
        Play again
      </button>
      <button type="button" className="big-button secondary" onClick={onHome}>
        Done for today
      </button>
    </div>
  );
}

function MatchResult({ us, them, rival }: { us: number; them: number; rival: string }) {
  const text = us > them ? `🏆 You beat the ${rival}` : us === them ? `🤝 A draw with the ${rival}` : `The ${rival} won this time`;
  return (
    <p className="match-result">
      {text}, {us}–{them}!
    </p>
  );
}
