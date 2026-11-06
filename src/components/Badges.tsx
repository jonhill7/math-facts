import { Badge, BADGE_GROUPS, BADGE_SECTIONS, BadgeInput, badgeProgress, BADGES, Earned } from '../engine/badges';

interface Props {
  data: BadgeInput & { badges: Earned };
  onBack: () => void;
}

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// "Penalty Kicks: goals" is already under the Penalty Kicks heading, so the row just says "Goals".
const rowName = (name: string) => {
  const short = name.includes(': ') ? name.slice(name.indexOf(': ') + 2) : name;
  return short[0].toUpperCase() + short.slice(1);
};

// The badge case: every badge, earned ones in color with the day they were
// earned, the rest grayed out with how close the kid is.
export function Badges({ data, onBack }: Props) {
  const earned = BADGES.filter((b) => b.id in data.badges);
  const recent = [...earned].sort((a, b) => data.badges[b.id] - data.badges[a.id]).slice(0, 3);
  return (
    <div className="badges">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Badges</h2>
      <p className="muted">
        You've earned {earned.length} of {BADGES.length} badges. Badges are yours to keep forever, even if a streak ends.
      </p>
      {recent.length > 0 && (
        <p className="badges-recent">
          Latest: {recent.map((b) => `${b.icon} ${b.name}`).join(' · ')}
        </p>
      )}
      {BADGE_SECTIONS.map((sec) => {
        const groups = BADGE_GROUPS.filter((g) => g.section === sec.name);
        const list = BADGES.filter((b) => groups.some((g) => g.id === b.group));
        const got = list.filter((b) => b.id in data.badges).length;
        return (
          <section key={sec.name} className="badge-group">
            <h3>
              <span aria-hidden="true">{sec.icon}</span> {sec.name} <small>{got} of {list.length}</small>
            </h3>
            {/* One row per ladder, easiest badge first, so each row reads as a path to climb. */}
            {groups.map((g) => {
              const ladder = BADGES.filter((b) => b.group === g.id).sort((a, b) => a.goal - b.goal);
              if (!ladder.length) return null;
              const gotHere = ladder.filter((b) => b.id in data.badges).length;
              return (
                <div key={g.id} className="badge-ladder">
                  <h4>
                    <span aria-hidden="true">{g.icon}</span> {rowName(g.name)} <small>{gotHere} of {ladder.length}</small>
                  </h4>
                  <div className="badge-grid">
                    {ladder.map((b) => (
                      <BadgeCard key={b.id} badge={b} at={data.badges[b.id]} progress={badgeProgress(b, data)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function BadgeCard({ badge, at, progress }: { badge: Badge; at?: number; progress: number }) {
  const got = at !== undefined;
  // Speed badges are titles, not counts, so they don't show "2 of 4".
  const showCount = !got && badge.unit && badge.group !== 'speed';
  return (
    <div className={`badge-card badge-${badge.tier} ${got ? 'badge-got' : 'badge-locked'}`} title={badge.text}>
      <span className="badge-medal" aria-hidden="true">
        {badge.icon}
      </span>
      <strong>{badge.name}</strong>
      <small>{badge.text}</small>
      {got ? (
        <small className="badge-date">Earned {when(at)}</small>
      ) : showCount ? (
        <>
          <span className="badge-bar" aria-label={`${progress} of ${badge.goal}`}>
            <span style={{ width: `${(progress / badge.goal) * 100}%` }} />
          </span>
          <small className="badge-date">
            {progress.toLocaleString('en-US')} of {badge.goal.toLocaleString('en-US')} {badge.unit}
          </small>
        </>
      ) : null}
    </div>
  );
}
