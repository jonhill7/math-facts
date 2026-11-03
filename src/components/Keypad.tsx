import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'go'];

// A big on-screen number pad for phones. The physical keyboard works too.
export function Keypad({ value, onChange, onSubmit, disabled }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) onChange((value + e.key).slice(0, 3));
      else if (e.key === 'Backspace') onChange(value.slice(0, -1));
      else if (e.key === 'Enter' && value) onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, onSubmit, disabled]);

  const press = (key: string) => {
    if (disabled) return;
    if (key === 'back') onChange(value.slice(0, -1));
    else if (key === 'go') {
      if (value) onSubmit();
    } else onChange((value + key).slice(0, 3));
  };

  return (
    <div className="keypad" aria-label="Number pad">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`key key-${key}`}
          disabled={disabled || (key === 'go' && !value)}
          onClick={() => press(key)}
          aria-label={key === 'back' ? 'Delete' : key === 'go' ? 'Enter answer' : key}
        >
          {key === 'back' ? '⌫' : key === 'go' ? 'Go' : key}
        </button>
      ))}
    </div>
  );
}
