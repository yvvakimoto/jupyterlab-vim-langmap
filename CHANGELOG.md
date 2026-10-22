# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## Unreleased

- Fix `Ctrl+S`, `Ctrl+/`, `Ctrl+Shift+C` and other Ctrl/Alt/Meta shortcuts
  when the OS remapper passes modified keys through: they were remapped a
  second time, so e.g. `Ctrl+S` fell through to the browser's "Save page".
  `remapCtrl` now governs the JupyterLab shortcut layout as well as vim.
- `remapCtrl` now defaults to `false`, matching Yamabuki R's default.

## 0.1.0

First release.

- Remap vim Normal / Visual / operator-pending keys back to QWERTY physical
  positions via `Vim.langmap()`, without touching text input, the Ex and search
  prompts, or the character arguments of `f` / `r` / `m` / registers.
- Remap JupyterLab's own keybindings (Jupyter Command mode, the command
  palette, menu mnemonics) by swapping the `@lumino/keyboard` layout.
- Built-in Dvorak preset, plus a `langmap` setting accepting any vim
  `langmap` string.
- `remapCtrl` to include or exclude Ctrl/Alt/Meta combinations, and separate
  switches for the vim and JupyterLab halves.

<!-- <END NEW CHANGELOG ENTRY> -->
