# jupyterlab-vim-langmap

Vim のコマンドキーだけを QWERTY 物理配列位置に戻す JupyterLab 拡張。

やまぶきR などで OS レベルに Dvorak 配列をエミュレートしていると、
[jupyterlab-vim](https://github.com/jupyterlab-contrib/jupyterlab-vim) の
Normal / Visual モードのキーまで Dvorak 位置になってしまう。
この拡張は VSCodeVim の `vim.langmap` と同じ文字列を 1 本受け取り、
コマンドキーだけを QWERTY 位置に戻す。文字入力は Dvorak のまま。

## 何が変わるか

| レイヤ | 対象 | 実現方法 |
| --- | --- | --- |
| vim | セル編集中の Normal / Visual / operator-pending | `Vim.langmap()`（`@replit/codemirror-vim` のネイティブ機能） |
| JupyterLab | Jupyter Command モード（`dd` `x` `c` `v` `a` `b` `z`）、コマンドパレット、メニューのニーモニック | `@lumino/keyboard` のキーボードレイアウト差し替え |

変わらないもの:

- **vim Insert モードの文字入力** — langmap はコマンドマッチングに使われるだけで、
  文字の挿入はブラウザ側が元のキーイベントから行う
- **Ex コマンド (`:w`) と検索 (`/pattern`) のプロンプト** — vim 側がプロンプト入力を
  langmap の対象外にしている
- **`f{char}` / `r{char}` / `m{char}` / `"{reg}` の引数** — `expectLiteralNext` により
  直後の 1 キーは変換されないので、`fx` は本当に `x` を探す

## インストール

```bash
pip install jupyterlab-vim-langmap
```

jupyterlab-vim が依存として一緒に入る。JupyterLab を再起動（ブラウザのリロードでも可）。

## 設定

Settings → Advanced Settings Editor → **Vim langmap**。

| 設定 | 既定 | 説明 |
| --- | --- | --- |
| `enabled` | `true` | マスタースイッチ。off で両レイヤとも既定に戻る |
| `preset` | `"dvorak"` | 内蔵の Dvorak → QWERTY マッピング。`"custom"` で下の `langmap` を使う |
| `langmap` | `""` | 任意の vim `langmap` 文字列（`preset: "custom"` のときのみ） |
| `remapCtrl` | `true` | `Ctrl-d` などの併用キーも QWERTY 位置に揃える |
| `applyToVim` | `true` | vim 側のリマップ |
| `applyToJupyterShortcuts` | `true` | JupyterLab 側のリマップ |

`langmap` の書式は vim の `:set langmap=` と同じ。カンマ区切りで、各パートは
文字ペアの並び（`aAbB`）か `fromlist;tolist` 形式（`abc;ABC`）。
リテラルのカンマ・セミコロンはバックスラッシュでエスケープする。

### 内蔵プリセットと VSCodeVim の `vim.langmap` の差分

内蔵の `dvorak` プリセットは VSCodeVim でよく使われる Dvorak 用 `vim.langmap`
文字列に **`{_` と `}+` の 2 ペアを足したもの**。元の文字列にはこの 2 つが無く、
物理 `-` / `=` キーを Shift したときに `{` `}` がそのまま vim に渡ってしまい、
段落移動が 2 つの物理キーから発火する一方で `_` と `+` が QWERTY 位置から
打てなくなる。VSCode 側の設定と完全に一致させたい場合は `preset: "custom"` にして
元の文字列を `langmap` に貼る。

### `applyToJupyterShortcuts` を切るべきケース

OS レベルのリマッパが `event.keyCode` を物理キーのまま残す実装だと、
JupyterLab のショートカットは最初から QWERTY 位置にある。その場合はこの設定を
`false` にする。判断には `tools/keylog.html` をブラウザで開いて実測する
（押したキーから自動で判定を表示する）。

## 開発

```bash
pip install -e ".[dev]"
jupyter labextension develop --overwrite .
jlpm watch          # 別ターミナルで jupyter lab
```

純ロジック（langmap パーサとキーコード表）の検査:

```bash
npx tsc --module commonjs --target ES2018 --rootDir . --outDir .check-build src/langmap.ts src/keycodes.ts
node tools/check-langmap.cjs .check-build/src
```

### 設計メモ

`@replit/codemirror-vim` の `langmap` はモジュールグローバルなので、
jupyterlab-vim が使っているのと**同じモジュールインスタンス**に触る必要がある。
`package.json` の `jupyterlab.sharedPackages` で
`"@replit/codemirror-vim": { "bundled": false }` と宣言し、自前バンドルを作らずに
jupyterlab-vim が module federation の共有スコープへ登録したコピーを使う。

langmap はキーマップ（`Vim.map` / `Vim.mapclear`）とは独立した層にあるため、
jupyterlab-vim が起動時に行う `mapclear` に消されない。プラグインの起動順は問わない。

## ライセンス

BSD-3-Clause
