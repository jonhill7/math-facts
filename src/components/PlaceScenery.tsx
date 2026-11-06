// The look of the hatchery meadow in each world tour place. The plain Home
// Meadow is drawn by the Meadow itself; every other place recolors the sky,
// hills and ground (in styles.css, under .meadow-at-<place>) and adds its own
// landmarks here. Landmarks are mostly drawn with CSS shapes, plus a few old
// emoji that every device can draw.
//
// `far` things stand on the horizon (drawn before the ground, so the ground
// hides their feet); `near` things sit on the ground in front.

interface Props {
  place: string;
  layer: 'far' | 'near';
  night: boolean;
}

// A handful of things that fall or drift across the whole meadow (snow, petals).
const fall = (kind: string, n: number) =>
  Array.from({ length: n }, (_, i) => <span key={`${kind}-${i}`} className={`${kind} ${kind}-${i % 6}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-((i * 1.7) % 9)}s` }} />);

function Far({ place }: { place: string }) {
  switch (place) {
    case 'iceland':
      return (
        <>
          <span className="pl-volcano">
            <span className="pl-volcano-lava" />
          </span>
          <span className="pl-smoke pl-smoke-1" />
          <span className="pl-smoke pl-smoke-2" />
          <span className="pl-smoke pl-smoke-3" />
          <span className="pl-glacier" />
        </>
      );
    case 'brazil':
      return (
        <>
          <span className="pl-sugarloaf" />
          <span className="pl-sea">
            <span className="pl-waves" />
          </span>
        </>
      );
    case 'kenya':
      return (
        <>
          <span className="pl-kenya-sun" />
          <span className="pl-kilimanjaro" />
        </>
      );
    case 'japan':
      return (
        <>
          <span className="pl-fuji" />
          <span className="pl-torii">
            <span />
          </span>
        </>
      );
    case 'egypt':
      return (
        <>
          <span className="pl-pyramid pl-pyramid-big" />
          <span className="pl-pyramid pl-pyramid-small" />
        </>
      );
    case 'australia':
      return (
        <>
          <span className="pl-uluru" />
        </>
      );
    case 'antarctica':
      return (
        <>
          <span className="pl-berg pl-berg-1" />
          <span className="pl-berg pl-berg-2" />
        </>
      );
    case 'norway':
      return (
        <>
          <span className="pl-stars">✦ · ✧ · ✦ · · ✧ · ✦ · ✧ · ✦</span>
          <span className="pl-aurora pl-aurora-1" />
          <span className="pl-aurora pl-aurora-2" />
          <span className="pl-aurora pl-aurora-3" />
          <span className="pl-fjord pl-fjord-1" />
          <span className="pl-fjord pl-fjord-2" />
          <span className="pl-fjord-water" />
        </>
      );
    case 'india':
      return (
        <>
          <span className="pl-kite pl-kite-1" />
          <span className="pl-kite pl-kite-2" />
          <span className="pl-palace">
            <span className="pl-dome" />
            <span className="pl-minaret pl-minaret-l" />
            <span className="pl-minaret pl-minaret-r" />
          </span>
        </>
      );
    case 'peru':
      return (
        <>
          <span className="pl-andes pl-andes-1" />
          <span className="pl-andes pl-andes-2" />
          <span className="pl-ruins" />
          <span className="pl-mist" />
        </>
      );
    case 'moon':
      return (
        <>
          <span className="pl-stars">✦ · ✧ · ✦ · · ✧ · ✦ · ✧ · ✦ · ✧</span>
          <span className="pl-earth">🌍</span>
          <span className="pl-rocket">🚀</span>
        </>
      );
    default:
      return null;
  }
}

function Near({ place }: { place: string }) {
  switch (place) {
    case 'iceland':
      return (
        <>
          <span className="pl-hotspring">
            <span className="pl-steam pl-steam-1" />
            <span className="pl-steam pl-steam-2" />
          </span>
          <span className="pl-geyser">
            <span className="pl-geyser-jet" />
          </span>
          <span className="pl-moss pl-moss-1" />
          <span className="pl-moss pl-moss-2" />
        </>
      );
    case 'brazil':
      return (
        <>
          <span className="pl-palm pl-palm-1">🌴</span>
          <span className="pl-palm pl-palm-2">🌴</span>
          <span className="pl-shell">🐚</span>
        </>
      );
    case 'kenya':
      return (
        <>
          <span className="pl-giraffe">🦒</span>
          <span className="pl-zebra">🦓</span>
          <span className="pl-acacia">
            <span className="pl-acacia-top" />
          </span>
          <span className="pl-tufts" />
        </>
      );
    case 'japan':
      return (
        <>
          <span className="pl-sakura">
            <span className="pl-sakura-blossom" />
          </span>
          {fall('pl-petal', 14)}
        </>
      );
    case 'egypt':
      return (
        <>
          <span className="pl-camel">🐫</span>
          <span className="pl-palm pl-palm-egypt">🌴</span>
          <span className="pl-cactus">🌵</span>
        </>
      );
    case 'australia':
      return (
        <>
          <span className="pl-roo">🦘</span>
          <span className="pl-scrub pl-scrub-1" />
          <span className="pl-scrub pl-scrub-2" />
          <span className="pl-scrub pl-scrub-3" />
        </>
      );
    case 'antarctica':
      return (
        <>
          <span className="pl-penguin pl-penguin-1">🐧</span>
          <span className="pl-penguin pl-penguin-2">🐧</span>
          <span className="pl-ice" />
          {fall('pl-snow', 22)}
        </>
      );
    case 'norway':
      return (
        <>
          <span className="pl-pine pl-pine-1">🌲</span>
          <span className="pl-pine pl-pine-2">🌲</span>
          <span className="pl-pine pl-pine-3">🌲</span>
        </>
      );
    case 'india':
      return (
        <>
          <span className="pl-elephant">🐘</span>
          <span className="pl-peacock">🦚</span>
          <span className="pl-bloom pl-bloom-1">🌺</span>
          <span className="pl-bloom pl-bloom-2">🌼</span>
        </>
      );
    case 'peru':
      return (
        <>
          <span className="pl-terraces" />
          <span className="pl-llama">🦙</span>
        </>
      );
    case 'moon':
      return (
        <>
          <span className="pl-crater pl-crater-1" />
          <span className="pl-crater pl-crater-2" />
          <span className="pl-crater pl-crater-3" />
          <span className="pl-crater pl-crater-4" />
        </>
      );
    default:
      return null;
  }
}

// Places that are dark already, so night time doesn't dim them further.
const ALWAYS_DARK = new Set(['norway', 'moon']);

export function PlaceScenery({ place, layer, night }: Props) {
  if (place === 'meadow') return null;
  if (layer === 'far') return <Far place={place} />;
  return (
    <>
      <Near place={place} />
      {night && !ALWAYS_DARK.has(place) && <span className="pl-dusk" />}
    </>
  );
}
