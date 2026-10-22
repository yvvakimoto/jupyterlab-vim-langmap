/**
 * Sanity check for the pure logic in src/langmap.ts, src/keycodes.ts and
 * src/layout.ts.
 *
 * The sources are ESM/TypeScript, so compile them to CommonJS first and point
 * this script at the output directory:
 *
 *   npx tsc --module commonjs --target ES2018 --rootDir . \
 *       --outDir .check-build src/langmap.ts src/keycodes.ts src/layout.ts
 *   node tools/check-langmap.cjs .check-build/src
 */
const path = require('path');

const outDir = path.resolve(process.argv[2] || '.check-build/src');
const { DVORAK_LANGMAP, parseLangmap } = require(
  path.join(outDir, 'langmap.js')
);
const { buildKeycodeTable, EN_US_CODES } = require(
  path.join(outDir, 'keycodes.js')
);
const { ModifierAwareLayout } = require(path.join(outDir, 'layout.js'));

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(
      `FAIL  ${label}\n        expected ${e}\n        actual   ${a}`
    );
    failures++;
  }
}

// ---------------------------------------------------------------- langmap ---
const keymap = parseLangmap(DVORAK_LANGMAP);

// The 35 unshifted pairs, written out independently of the source string.
const LOWER = {
  "'": 'q',
  ',': 'w',
  '.': 'e',
  p: 'r',
  y: 't',
  f: 'y',
  g: 'u',
  c: 'i',
  r: 'o',
  l: 'p',
  '/': '[',
  '=': ']',
  a: 'a',
  o: 's',
  e: 'd',
  u: 'f',
  i: 'g',
  d: 'h',
  h: 'j',
  t: 'k',
  n: 'l',
  s: ';',
  '-': "'",
  ';': 'z',
  q: 'x',
  j: 'c',
  k: 'v',
  x: 'b',
  b: 'n',
  m: 'm',
  w: ',',
  v: '.',
  z: '/',
  '[': '-',
  ']': '='
};
const UPPER = {
  '"': 'Q',
  '<': 'W',
  '>': 'E',
  P: 'R',
  Y: 'T',
  F: 'Y',
  G: 'U',
  C: 'I',
  R: 'O',
  L: 'P',
  '?': '{',
  '+': '}',
  A: 'A',
  O: 'S',
  E: 'D',
  U: 'F',
  I: 'G',
  D: 'H',
  H: 'J',
  T: 'K',
  N: 'L',
  S: ':',
  _: '"',
  ':': 'Z',
  Q: 'X',
  J: 'C',
  K: 'V',
  X: 'B',
  B: 'N',
  M: 'M',
  W: '<',
  V: '>',
  Z: '?',
  // Absent from the VSCodeVim string; see the comment on DVORAK_LANGMAP.
  '{': '_',
  '}': '+'
};

check('langmap entry count', Object.keys(keymap).length, 35 + 35);
for (const [from, to] of Object.entries({ ...LOWER, ...UPPER })) {
  check(`langmap ${JSON.stringify(from)}`, keymap[from], to);
}

// Escapes and the alternate `from;to` form must both work.
check('escaped comma pair', parseLangmap('\\,w'), { ',': 'w' });
check('escaped semicolon pair', parseLangmap('s\\;'), { s: ';' });
check('semicolon list form', parseLangmap('abc;xyz'), {
  a: 'x',
  b: 'y',
  c: 'z'
});
check('odd length part is skipped', parseLangmap('abc'), {});
check('empty string', parseLangmap(''), {});

// --------------------------------------------------------------- keycodes ---
const codes = buildKeycodeTable(keymap);

const VK = {
  "'": [222],
  ',': [188],
  '.': [190],
  '/': [191],
  '=': [61, 187],
  ';': [59, 186],
  '-': [173, 189],
  '[': [219],
  ']': [221],
  '`': [192],
  '\\': [220]
};
for (let i = 0; i < 26; i++) {
  VK[String.fromCharCode(97 + i)] = [65 + i];
}
const luminoName = ch => (/^[a-z]$/.test(ch) ? ch.toUpperCase() : ch);

for (const [from, to] of Object.entries(LOWER)) {
  for (const code of VK[from]) {
    check(`codes[${code}] (physical ${from})`, codes[code], luminoName(to));
  }
}

// Nothing outside the main block may move.
check('digit 0 untouched', codes[48], '0');
check('F1 untouched', codes[112], 'F1');
check('keypad / untouched', codes[111], '/');
check('keypad - untouched', codes[109], '-');
check('backslash untouched', codes[220], '\\');
check('backtick untouched', codes[192], '`');
check('Enter untouched', codes[13], 'Enter');
check(
  'table size unchanged',
  Object.keys(codes).length,
  Object.keys(EN_US_CODES).length
);

// The remap must be a permutation: the 35 physical keys produce exactly the
// 35 key names they produced before, just rearranged. Anything else means a
// shortcut became unreachable.
const mainCodes = [];
for (const list of Object.values(VK)) {
  mainCodes.push(list[0]);
}
const before = mainCodes.map(c => EN_US_CODES[c]).sort();
const after = mainCodes.map(c => codes[c]).sort();
check('main block is a permutation', after, before);

// ----------------------------------------------------------------- layout ---
// Stand-ins for KeycodeLayout, which needs nothing beyond the table lookup.
const tableLayout = table => ({
  keys: () => [],
  isValidKey: () => true,
  isModifierKey: () => false,
  keyForKeydownEvent: event => table[event.keyCode] || ''
});
const layoutFor = remapModified =>
  new ModifierAwareLayout(
    'test',
    tableLayout(codes),
    tableLayout(EN_US_CODES),
    remapModified
  );
const kd = (keyCode, mods = {}) => ({
  keyCode,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods
});

const passThrough = layoutFor(false);
check('unmodified o -> S', passThrough.keyForKeydownEvent(kd(79)), 'S');
check(
  'shift alone still remaps',
  passThrough.keyForKeydownEvent(kd(79, { shiftKey: true })),
  'S'
);
check(
  'Ctrl+s stays S',
  passThrough.keyForKeydownEvent(kd(83, { ctrlKey: true })),
  'S'
);
check(
  'Ctrl+/ stays /',
  passThrough.keyForKeydownEvent(kd(191, { ctrlKey: true })),
  '/'
);
check(
  'Alt+x stays X',
  passThrough.keyForKeydownEvent(kd(88, { altKey: true })),
  'X'
);
check(
  'remapModified remaps Ctrl+o to S',
  layoutFor(true).keyForKeydownEvent(kd(79, { ctrlKey: true })),
  'S'
);
check(
  'remapModified remaps Ctrl+s to ;',
  layoutFor(true).keyForKeydownEvent(kd(83, { ctrlKey: true })),
  ';'
);

// ------------------------------------------------------------------ result ---
if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('all checks passed');
