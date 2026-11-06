import { GLOVE_TONES, gloveMatrix } from '../engine/shop';

// The SVG color filters that gear like colored gloves uses (see GLOVE_FILTER).
// Rendered once, hidden, so any element can say `filter: url(#gloves-red)`.
export function GearFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      {Object.keys(GLOVE_TONES).map((id) => (
        <filter key={id} id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={gloveMatrix(id)} />
        </filter>
      ))}
    </svg>
  );
}
