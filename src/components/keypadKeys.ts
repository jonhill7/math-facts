// What a physical key press does to the number pad. Kept apart from the
// component so it can be tested without a browser.

export interface KeyLike {
  key: string;
  target: EventTarget | null;
  preventDefault: () => void;
}

export interface KeypadState {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const MAX_DIGITS = 3;

// Is the key aimed at some other control the player has focused (like the Quit
// button), rather than at the number pad?
function aimedElsewhere(target: EventTarget | null): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('button, a, input, select, textarea')) && !el.closest('.keypad');
}

export function handleKeypadKey(e: KeyLike, { value, onChange, onSubmit, disabled }: KeypadState): void {
  if (aimedElsewhere(e.target)) return;
  let handled = true;
  if (/^[0-9]$/.test(e.key)) {
    if (!disabled) onChange((value + e.key).slice(0, MAX_DIGITS));
  } else if (e.key === 'Backspace') {
    if (!disabled) onChange(value.slice(0, -1));
  } else if (e.key === 'Enter') {
    if (!disabled && value) onSubmit();
  } else {
    handled = false;
  }
  // A keypad button clicked with the mouse keeps keyboard focus. Without this,
  // the browser would also "press" that focused button on Enter, so the digit
  // last clicked would land in the answer box right after submitting.
  if (handled) e.preventDefault();
}
