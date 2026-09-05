/**
 * Keycode table handling for Lumino keyboard shortcuts.
 *
 * JupyterLab resolves every one of its own keybindings (the Jupyter *Command*
 * mode: `dd`, `x`, `c`, `v`, `a`, `b`, `z`, the command palette, menu
 * mnemonics, ...) through `@lumino/keyboard`, whose `KeycodeLayout` does
 * exactly one thing:
 *
 *     keyForKeydownEvent(event) { return this._codes[event.keyCode] || ''; }
 *
 * So swapping in a permuted keycode table moves *all* Lumino shortcuts back to
 * QWERTY physical positions in one shot, with no per-shortcut overrides.
 *
 * Note `event.keyCode` does not distinguish shift: `,` and `<` are both 188.
 * That is why only the unshifted half of a langmap is relevant here.
 */

/**
 * A verbatim copy of the `EN_US` keycode table shipped in `@lumino/keyboard`.
 *
 * Copied rather than read off the `EN_US` singleton because its `_codes` field
 * is private; relying on it would be reaching into internals.
 */
export const EN_US_CODES: { [key: number]: string } = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  16: 'Shift',
  17: 'Ctrl',
  18: 'Alt',
  19: 'Pause',
  27: 'Escape',
  32: 'Space',
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
  45: 'Insert',
  46: 'Delete',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  59: ';',
  61: '=',
  65: 'A',
  66: 'B',
  67: 'C',
  68: 'D',
  69: 'E',
  70: 'F',
  71: 'G',
  72: 'H',
  73: 'I',
  74: 'J',
  75: 'K',
  76: 'L',
  77: 'M',
  78: 'N',
  79: 'O',
  80: 'P',
  81: 'Q',
  82: 'R',
  83: 'S',
  84: 'T',
  85: 'U',
  86: 'V',
  87: 'W',
  88: 'X',
  89: 'Y',
  90: 'Z',
  91: 'Meta',
  93: 'ContextMenu',
  96: '0',
  97: '1',
  98: '2',
  99: '3',
  100: '4',
  101: '5',
  102: '6',
  103: '7',
  104: '8',
  105: '9',
  106: '*',
  107: '+',
  109: '-',
  110: '.',
  111: '/',
  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12',
  173: '-',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
  224: 'Meta'
};

/** Modifier key names, as passed to the `EN_US` layout. */
export const MODIFIER_KEYS = ['Shift', 'Ctrl', 'Alt', 'Meta'];

/**
 * Unshifted characters of the main alphanumeric block mapped to the keycodes
 * that can produce them.
 *
 * Several punctuation keys have two historical keycodes (Firefox reports
 * 59/61/173 where Chrome reports 186/187/189), so both are listed. The numeric
 * keypad (96-111) is deliberately absent: it is a physically separate block
 * that the OS level Dvorak emulation does not touch, and remapping e.g.
 * keypad-`/` along with the main `/` would be wrong.
 */
const MAIN_BLOCK_CODES: { [key: string]: number[] } = (() => {
  const codes: { [key: string]: number[] } = {
    ';': [59, 186],
    '=': [61, 187],
    ',': [188],
    '-': [173, 189],
    '.': [190],
    '/': [191],
    '`': [192],
    '[': [219],
    '\\': [220],
    ']': [221],
    "'": [222]
  };
  for (let i = 0; i < 26; i++) {
    codes[String.fromCharCode(97 + i)] = [65 + i];
  }
  return codes;
})();

/** Shifted punctuation mapped back to the unshifted character on the same key. */
const SHIFT_TO_BASE: { [key: string]: string } = {
  ':': ';',
  '+': '=',
  '<': ',',
  _: '-',
  '>': '.',
  '?': '/',
  '~': '`',
  '{': '[',
  '|': '\\',
  '}': ']',
  '"': "'"
};

/**
 * Translate a langmap target character into the key name Lumino uses.
 *
 * Letters become uppercase (`'j'` -> `'J'`), and shifted punctuation is folded
 * back onto its unshifted base because `event.keyCode` carries no shift state.
 */
function luminoKeyName(to: string): string | null {
  if (/^[a-z]$/.test(to)) {
    return to.toUpperCase();
  }
  if (/^[A-Z]$/.test(to)) {
    return to;
  }
  if (Object.prototype.hasOwnProperty.call(SHIFT_TO_BASE, to)) {
    return SHIFT_TO_BASE[to];
  }
  if (Object.prototype.hasOwnProperty.call(MAIN_BLOCK_CODES, to)) {
    return to;
  }
  return null;
}

/**
 * Build a permuted keycode table from a parsed langmap.
 *
 * Only pairs whose "from" side is an unshifted main-block character are used;
 * the shifted half of a langmap is redundant here (see the note at the top of
 * this file). Everything the langmap does not mention keeps its `EN_US`
 * meaning, so digits, function keys, arrows and the keypad are untouched.
 */
export function buildKeycodeTable(keymap: Record<string, string>): {
  [key: number]: string;
} {
  const codes: { [key: number]: string } = { ...EN_US_CODES };
  const has = (obj: object, key: string) =>
    Object.prototype.hasOwnProperty.call(obj, key);

  for (const rawFrom of Object.keys(keymap)) {
    let from: string;
    if (has(MAIN_BLOCK_CODES, rawFrom)) {
      from = rawFrom;
    } else if (/^[A-Z]$/.test(rawFrom)) {
      // An uppercase-only pair stands in for its lowercase form, but a real
      // lowercase pair always wins so the result stays deterministic.
      if (has(keymap, rawFrom.toLowerCase())) {
        continue;
      }
      from = rawFrom.toLowerCase();
    } else {
      continue;
    }

    const to = luminoKeyName(keymap[rawFrom]);
    if (to === null) {
      continue;
    }
    for (const code of MAIN_BLOCK_CODES[from]) {
      codes[code] = to;
    }
  }

  return codes;
}
