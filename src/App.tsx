import { useCallback, useEffect, useRef, useState } from 'react';
import { MasteryMap, masteredCount } from './components/MasteryMap';
import { PracticeSession, SessionSummary } from './components/PracticeSession';
import { ALL_FACTS, Fact } from './engine/facts';
import { recordAnswer } from './engine/scheduler';
import { LanternHunt } from './modes/LanternHunt';
import { PenaltyKicks, StatKey } from './modes/PenaltyKicks';
import { cloudEnabled, cloudStore, signInWithGoogle, signOutUser, User, watchUser } from './storage/firebase';
import { listGuests, localStore } from './storage/localStore';
import { ProgressStore, SaveData } from './storage/types';

type Mode = 'soccer' | 'lantern';
type Screen = { name: 'who' } | { name: 'home' } | { name: 'play'; mode: Mode } | { name: 'done'; mode: Mode; summary: SessionSummary } | { name: 'map' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<ProgressStore | null>(null);
  const [data, setData] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'who' });
  const [error, setError] = useState('');

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
      })),
    [update],
  );

  const onStat = useCallback(
    (key: StatKey) => update((d) => ({ ...d, stats: { ...d.stats, [key]: d.stats[key] + 1 } })),
    [update],
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
        <Home data={data} onPlay={(mode) => setScreen({ name: 'play', mode })} onMap={() => setScreen({ name: 'map' })} onSwitch={switchPlayer} />
      )}
      {screen.name === 'map' && data && <MasteryMap progress={data.progress} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'play' && data && (
        <PracticeSession
          progress={data.progress}
          onAnswer={onAnswer}
          holdAfterCorrect={screen.mode === 'lantern'}
          onQuit={() => {
            update((d) => ({ ...d }), true); // save right away
            setScreen({ name: 'home' });
          }}
          onFinish={(summary) => {
            update((d) => ({ ...d, stats: { ...d.stats, sessions: d.stats.sessions + 1, lastPlayed: Date.now() } }), true);
            setScreen({ name: 'done', mode: screen.mode, summary });
          }}
          stage={(props) =>
            screen.mode === 'soccer' ? <PenaltyKicks {...props} onStat={onStat} /> : <LanternHunt {...props} onStat={onStat} />
          }
        />
      )}
      {screen.name === 'done' && (
        <Done summary={screen.summary} onAgain={() => setScreen({ name: 'play', mode: screen.mode })} onHome={() => setScreen({ name: 'home' })} />
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

function Home({ data, onPlay, onMap, onSwitch }: { data: SaveData; onPlay: (m: Mode) => void; onMap: () => void; onSwitch: () => void }) {
  const mastered = masteredCount(data.progress);
  return (
    <div className="home">
      <div className="home-top">
        <h1>Hi, {data.name}!</h1>
        <button type="button" className="link-button" onClick={onSwitch}>
          Switch player
        </button>
      </div>
      <p className="muted">
        {data.stats.sessions === 0
          ? "Your first game is a warm-up to find the facts you already know."
          : `${mastered} of ${ALL_FACTS.length} facts mastered. Pick a game for today's practice.`}
      </p>
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
        <span>👾 {data.stats.monstersFound} monsters found</span>
        <span>🤗 {data.stats.tickles} tickle attacks</span>
      </div>
      <button type="button" className="big-button secondary" onClick={onMap}>
        See my fact map
      </button>
    </div>
  );
}

function Done({ summary, onAgain, onHome }: { summary: SessionSummary; onAgain: () => void; onHome: () => void }) {
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  return (
    <div className="done">
      <h1>Nice work!</h1>
      <p className="big-stat">{pct}% right</p>
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
