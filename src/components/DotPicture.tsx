import { CSSProperties } from 'react';
import { Fact } from '../engine/facts';
import { pictureFor, pictureRows } from '../engine/picture';

const GAP = 3;

// The picture hint after a miss: the fact as rows of dots, split into the
// chunks the strategy uses. Chunks pop in one after another. Counting by 5s
// or 10s shows standing columns instead, each labeled with the running total.
export function DotPicture({ fact }: { fact: Fact }) {
  const pic = pictureFor(fact);
  const rows = pictureRows(pic);
  // Fit inside the game area (about 260 × 100 px of dots) however big the fact is.
  const across = pic.columns ? rows : pic.cols;
  const down = pic.columns ? pic.cols : rows;
  const fit = Math.min((pic.columns ? 290 : 200) / across, 100 / down) - GAP;
  const dot = Math.max(4, Math.min(16, Math.floor(fit)));
  const style = { '--dot': `${dot}px`, '--cols': pic.columns ? 1 : pic.cols } as CSSProperties;
  const label = pic.columns
    ? `Picture: ${rows} columns of ${pic.cols} dots. ${pic.sum}.`
    : `Picture: ${rows} rows of ${pic.cols} dots. ${pic.sum}.`;
  const step = pic.bands.length > 4 ? 90 : 350;

  return (
    <figure className={`dots ${pic.columns ? 'dots-columns' : ''}`} style={style} aria-label={label}>
      <div className="dots-bands" aria-hidden="true">
        {pic.bands.map((band, i) => (
          <div key={i} className={`dots-band dots-${band.tone}`} style={{ animationDelay: `${i * step}ms` }}>
            <div className="dots-grid">
              {Array.from({ length: band.rows * pic.cols }, (_, j) => (
                <span key={j} className="dot" />
              ))}
            </div>
            {band.label && <span className="dots-label">{band.label}</span>}
          </div>
        ))}
      </div>
      <figcaption className="dots-sum">{pic.sum}</figcaption>
    </figure>
  );
}
