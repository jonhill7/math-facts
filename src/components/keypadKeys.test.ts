import { describe, expect, it, vi } from 'vitest';
import { handleKeypadKey, type KeyLike } from './keypadKeys';

// A stand-in for a DOM element: `closest` answers from the selectors it matches.
function element(matches: string[]) {
  return {
    closest: (selector: string) => (selector.split(',').some((s) => matches.includes(s.trim())) ? {} : null),
  } as unknown as EventTarget;
}

function press(key: string, target: EventTarget | null, value = '') {
  const e: KeyLike = { key, target, preventDefault: vi.fn() };
  const state = { value, onChange: vi.fn(), onSubmit: vi.fn() };
  handleKeypadKey(e, state);
  return { e, ...state };
}

const keypadButton = element(['button', '.keypad']);

describe('physical keys on the number pad', () => {
  it('submits on Enter without also pressing the keypad button that has focus', () => {
    const { e, onSubmit, onChange } = press('Enter', keypadButton, '12');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled(); // stops the browser clicking the focused digit
  });

  it('still blocks the focused button on Enter when there is nothing to submit yet', () => {
    const { e, onSubmit } = press('Enter', keypadButton, '');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('types digits and deletes, up to three digits', () => {
    expect(press('7', null, '12').onChange).toHaveBeenCalledWith('127');
    expect(press('7', null, '123').onChange).toHaveBeenCalledWith('123');
    expect(press('Backspace', null, '12').onChange).toHaveBeenCalledWith('1');
  });

  it('does nothing while the pad is disabled, but still blocks the focused button', () => {
    const e: KeyLike = { key: 'Enter', target: keypadButton, preventDefault: vi.fn() };
    const state = { value: '12', onChange: vi.fn(), onSubmit: vi.fn(), disabled: true };
    handleKeypadKey(e, state);
    expect(state.onSubmit).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('leaves other keys and other focused controls alone', () => {
    expect(press('a', keypadButton).e.preventDefault).not.toHaveBeenCalled();
    const quit = press('Enter', element(['button']), '12');
    expect(quit.onSubmit).not.toHaveBeenCalled();
    expect(quit.e.preventDefault).not.toHaveBeenCalled();
  });
});
