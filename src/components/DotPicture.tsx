import { CSSProperties } from 'react';
import { Fact } from '../engine/facts';
import { pictureFor, pictureRows } from '../engine/picture';

const GAP = 3;

// The picture hint after a miss: the fact as rows of dots, split into the
// chunks the strategy uses. Chunks pop in one after another. Counting by 5s
// or 10s shows standing columns instead, each labeled with the running total.
// hideAnswer is the help a kid asks for before answering: the same picture,
// without the line or labels that would give the answer away.
export function DotPicture({ fact, hideAnswer = false }: { fact: Fact; hideAnswer?: boolean }) {
  const pic = pictureFor(fact);
  const rows = pictureRows(pic);
  // Fit inside the game area (about 260 × 100 px of dots) however big the fact is.
  const across = pic.columns ? rows : pic.cols;
  const down = pic.columns ? pic.cols : rows;
  const fit = Math.min((pic.columns ? 290 : 200) / across, 100 / down) - GAP;
  const dot = Math.max(4, Math.min(16, Math.floor(fit)));
  const style = { '--dot': `${dot}px`, '--cols': pic.columns ? 1 : pic.cols } as CSSProperties;
  const sum = hideAnswer ? '' : ` ${pic.sum}.`;
  const label = pic.columns ? `Picture: ${rows} columns of ${pic.cols} dots.${sum}` : `Picture: ${rows} rows of ${pic.cols} dots.${sum}`;
  const bandLabel = (text: string, i: number) => {
    if (!hideAnswer) return text;
    if (fact.op === 'div') return ''; // "8 in each row" is the answer
    if (pic.columns && i === pic.bands.length - 1) return '?'; // the running total's last step
    return text;
  };
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
            {bandLabel(band.label, i) && <span className="dots-label">{bandLabel(band.label, i)}</span>}
          </div>
        ))}
      </div>
      {!hideAnswer && <figcaption className="dots-sum">{pic.sum}</figcaption>}
    </figure>
  );
}
