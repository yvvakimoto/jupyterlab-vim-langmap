/**
 * Vim `langmap` string handling.
 *
 * The parser here is a deliberate port of `parseLangmap()` in
 * `@replit/codemirror-vim` so that the keyboard layout we derive for Lumino
 * shortcuts is guaranteed to agree with what the vim layer does with the very
 * same string. See `:help langmap` for the format.
 */

/**
 * Dvorak -> QWERTY command keys. Each pair is a "from" character (the one the
 * OS level Dvorak emulation produces) immediately followed by the "to"
 * character (the vim command it should act as).
 *
 * This is the `vim.langmap` string used by the VSCodeVim extension plus two
 * pairs it omits: `{_` and `}+`. Without them the physical `-` and `=` keys
 * still emit `{` and `}` when shifted, which vim reads as the paragraph
 * motions — so those motions fire from two different physical keys while `_`
 * and `+` are unreachable at their QWERTY positions.
 */
export const DVORAK_LANGMAP = `'q,\\,w,.e,pr,yt,fy,gu,ci,ro,lp,/[,=],aa,os,ed,uf,ig,dh,hj,tk,nl,s\\;,-',\\;z,qx,jc,kv,xb,bn,mm,w\\,,v.,z/,[-,]=,"Q,<W,>E,PR,YT,FY,GU,CI,RO,LP,?{,+},AA,OS,ED,UF,IG,DH,HJ,TK,NL,S:,_",:Z,QX,JC,KV,XB,BN,MM,W<,V>,Z?,{_,}+`;

/**
 * Split a list of characters, honouring backslash escapes (`\,` and `\;`).
 */
function getEscaped(list: string): string[] {
  return list.split(/\\?(.)/).filter(Boolean);
}

/**
 * Parse a vim `langmap` string into a `from -> to` character map.
 *
 * Both documented forms are supported:
 *  1. a list of pairs, e.g. `aAbBcC`
 *  2. a from-list, a semicolon and a to-list, e.g. `abc;ABC`
 *
 * Malformed parts are skipped rather than throwing, matching vim and
 * `@replit/codemirror-vim`.
 */
export function parseLangmap(langmapString: string): Record<string, string> {
  const keymap: Record<string, string> = {};
  if (!langmapString) {
    return keymap;
  }

  langmapString.split(/((?:[^\\,]|\\.)+),/).forEach(part => {
    if (!part) {
      return;
    }
    const semicolon = part.split(/((?:[^\\;]|\\.)+);/);
    if (semicolon.length === 3) {
      const from = getEscaped(semicolon[1]);
      const to = getEscaped(semicolon[2]);
      if (from.length !== to.length) {
        return;
      }
      for (let i = 0; i < from.length; i++) {
        keymap[from[i]] = to[i];
      }
    } else if (semicolon.length === 1) {
      const pairs = getEscaped(part);
      if (pairs.length % 2 !== 0) {
        return;
      }
      for (let i = 0; i < pairs.length; i += 2) {
        keymap[pairs[i]] = pairs[i + 1];
      }
    }
  });

  return keymap;
}
