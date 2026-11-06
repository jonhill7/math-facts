import { balance, buy, isOn, Item, ITEMS, owns, ShopState, Slot, SLOT_NAMES, toggleEquip, GLOVE_FILTER, BALL_GLOW } from '../engine/shop';
import { DragonState } from '../engine/dragons';
import { Dragon } from './Dragon';

interface Props {
  shop: ShopState;
  snacks: number; // every snack ever earned
  trophies: number;
  companion?: DragonState;
  onChange: (shop: ShopState) => void;
  onBack: () => void;
}

const SLOTS: Slot[] = ['hat', 'meadow', 'gloves', 'ball', 'lantern'];

// How an item looks on its button: gloves and balls show their tint or glow.
function ItemIcon({ item }: { item: Item }) {
  const filter = GLOVE_FILTER[item.id] ?? BALL_GLOW[item.id];
  if (item.slot === 'ball') return <span style={{ filter }}>⚽</span>;
  return <span style={filter ? { filter } : undefined}>{item.icon}</span>;
}

export function Shop({ shop, snacks, trophies, companion, onChange, onBack }: Props) {
  const left = balance(snacks, shop);
  const hat = ITEMS.find((i) => i.id === shop.equipped.hat)?.icon;
  return (
    <div className="shop">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Snack shop</h2>
      <div className="shop-top">
        {companion && companion.stage !== 'none' && <Dragon dragon={companion} size={4} hat={hat} />}
        <p>
          <strong className="shop-balance">🍖 {left} snacks to spend</strong>
          <small className="muted">Spending snacks never shrinks your dragon. Its level counts every snack it has ever eaten.</small>
        </p>
      </div>
      {SLOTS.map((slot) => (
        <section key={slot} className="shop-section">
          <h3>{SLOT_NAMES[slot]}</h3>
          {slot === 'meadow' && <p className="muted shop-note">Things for your dragons to play with in the hatchery. Put out as many as you like.</p>}
          <div className="shop-items">
            {ITEMS.filter((i) => i.slot === slot).map((item) => {
              const have = owns(shop, item, trophies);
              const on = isOn(shop, item);
              const canBuy = !have && !item.trophy && left >= item.price;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`shop-item ${on ? 'shop-item-on' : ''}`}
                  disabled={!have && !canBuy}
                  onClick={() => {
                    if (have) onChange(toggleEquip(shop, item));
                    else {
                      const next = buy(shop, item, snacks);
                      if (next) onChange(next);
                    }
                  }}
                >
                  <span className="shop-icon">
                    <ItemIcon item={item} />
                  </span>
                  <strong>{item.name}</strong>
                  {item.desc && <small className="shop-desc">{item.desc}</small>}
                  <small>
                    {on ? (slot === 'meadow' ? 'In the meadow ✓' : 'Wearing ✓') : have ? 'Tap to use' : item.trophy ? 'Win the league to unlock' : `🍖 ${item.price}`}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
