import { useEffect } from 'react';
import { handleKeypadKey } from './keypadKeys';

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
    const onKey = (e: KeyboardEvent) => handleKeypadKey(e, { value, onChange, onSubmit, disabled });
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
          // Don't let a mouse click leave keyboard focus on the button, so a
          // later Enter or Space from the keyboard can't press it again.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(key)}
          aria-label={key === 'back' ? 'Delete' : key === 'go' ? 'Enter answer' : key}
        >
          {key === 'back' ? '⌫' : key === 'go' ? 'Go' : key}
        </button>
      ))}
    </div>
  );
}
