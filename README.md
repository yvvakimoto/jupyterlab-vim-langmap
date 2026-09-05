# jupyterlab-vim-langmap

Put vim's command keys back on their QWERTY physical positions, without touching what you type.

If you emulate Dvorak (or any other layout) at the OS level — Yamabuki R, PowerToys, `setxkbmap`, a programmable keyboard — then [jupyterlab-vim](https://github.com/jupyterlab-contrib/jupyterlab-vim) sees the remapped characters, so `hjkl` lands wherever Dvorak puts those letters rather than under your fingers. Vim solves this with `langmap` and VSCodeVim exposes it as `vim.langmap`, but jupyterlab-vim has no equivalent setting.

This extension takes one langmap string and applies it to both layers of JupyterLab that read the keyboard.

## What it changes

| Layer      | Keys                                                                                           | Mechanism                                                         |
| ---------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| vim        | Normal, Visual and operator-pending, inside cell and file editors                              | `Vim.langmap()`, built into `@replit/codemirror-vim`              |
| JupyterLab | Jupyter Command mode (`dd`, `x`, `c`, `v`, `a`, `b`, `z`), the command palette, menu mnemonics | swaps the `@lumino/keyboard` layout, which resolves every binding |

## What it leaves alone

- **Text you type in Insert mode.** The langmap only feeds command matching; the character itself is still inserted by the browser from the original key event.
- **The Ex and search prompts.** `:w` and `/pattern` are typed in your actual layout, matching vim's own behaviour.
- **Character arguments** of `f`, `t`, `r`, `m`, registers and marks. The vim layer suppresses translation for the key right after those commands, so `fx` searches for a real `x`.

Counts, operators and operator-pending motions all work, because the langmap is applied when the key event is turned into a key name — before any command matching happens.

## Install

```bash
pip install jupyterlab-vim-langmap
```

jupyterlab-vim comes along as a dependency. Reload the browser tab afterwards.

## Settings

Settings → Advanced Settings Editor → **Vim langmap**.

| Setting                   | Default    | Meaning                                                                       |
| ------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `enabled`                 | `true`     | Master switch. Turning it off restores both layers to their defaults.         |
| `preset`                  | `"dvorak"` | The built-in Dvorak → QWERTY mapping, or `"custom"` to use `langmap` below.   |
| `langmap`                 | `""`       | Any vim `langmap` string. Only read when `preset` is `"custom"`.              |
| `remapCtrl`               | `true`     | Also remap Ctrl/Alt/Meta combinations, so `Ctrl-d` stays on the physical `d`. |
| `applyToVim`              | `true`     | The vim half.                                                                 |
| `applyToJupyterShortcuts` | `true`     | The JupyterLab half.                                                          |

The `langmap` format is the one from vim's `:set langmap=` and VSCodeVim's `vim.langmap`: comma-separated parts, each either a run of from/to character pairs (`aAbB`) or `fromlist;tolist` (`abc;ABC`). Escape a literal comma or semicolon with a backslash.

### The built-in preset vs. VSCodeVim's `vim.langmap`

The `dvorak` preset is the Dvorak string that circulates for VSCodeVim **plus the two pairs it omits**, `{_` and `}+`.

Without them the physical `-` and `=` keys still emit `{` and `}` when shifted, which vim reads as the paragraph motions. So those motions fire from two different physical keys while `_` and `+` are unreachable where QWERTY puts them. If you would rather match your VSCode configuration exactly, set `preset` to `"custom"` and paste the original string into `langmap`.

### When to turn `applyToJupyterShortcuts` off

JupyterLab's own keybindings are resolved from `event.keyCode`. Some OS-level remappers rewrite the virtual key code, others leave it on the physical key — and in the second case JupyterLab's shortcuts are already in QWERTY positions, so remapping them again would move them off.

To find out which kind you have, download [`tools/keylog.html`](https://github.com/yvvakimoto/jupyterlab-vim-langmap/blob/main/tools/keylog.html) and open it in a browser. With your remapper on, press a few letter keys and then the same keys with Ctrl held: it reports `event.key`, `event.code` and `event.keyCode` for each, and tells you which settings you need. (The file ships in the repository, not in the wheel.)

## Development

```bash
pip install -e ".[dev]"
jupyter labextension develop --overwrite .
jlpm watch
```

Then run `jupyter lab` in another terminal.

To check the pure logic — the langmap parser, and that the keycode remap is a permutation of the main key block so no shortcut becomes unreachable:

```bash
npx tsc --module commonjs --target ES2018 --rootDir . --outDir .check-build src/langmap.ts src/keycodes.ts
node tools/check-langmap.cjs .check-build/src
```

### Design notes

The vim `langmap` lives in module-level state inside `@replit/codemirror-vim`, so this extension has to touch the **same module instance** jupyterlab-vim uses. `package.json` declares

```json
"sharedPackages": { "@replit/codemirror-vim": { "bundled": false } }
```

which tells webpack to consume the copy jupyterlab-vim contributes to the module federation share scope rather than bundling one. The consequence is that a future jupyterlab-vim which moves outside `^6.2.1` would leave the vim half inactive — it logs a warning to the console when that happens.

The langmap sits in a different layer from key mappings (`Vim.map` / `Vim.mapclear`), so jupyterlab-vim's `mapclear` at startup does not wipe it and plugin activation order does not matter.

On the JupyterLab side, `@lumino/keyboard` resolves every keybinding through a single `keyCode → key name` table, so one permuted table covers Command mode, the palette and menu mnemonics at once — no per-shortcut overrides. Only the unshifted half of a langmap is used there, because `event.keyCode` carries no shift state.

## License

BSD-3-Clause
