import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import {
  getKeyboardLayout,
  setKeyboardLayout,
  IKeyboardLayout,
  KeycodeLayout
} from '@lumino/keyboard';

import { DVORAK_LANGMAP, parseLangmap } from './langmap';
import { buildKeycodeTable, EN_US_CODES, MODIFIER_KEYS } from './keycodes';
import { ModifierAwareLayout } from './layout';

const PLUGIN_ID = 'jupyterlab-vim-langmap:plugin';
const LAYOUT_NAME = 'jupyterlab-vim-langmap';

interface IConfig {
  enabled: boolean;
  preset: string;
  langmap: string;
  remapCtrl: boolean;
  applyToVim: boolean;
  applyToJupyterShortcuts: boolean;
}

/** Minimal shape we need out of the vim API. */
interface IVimApi {
  langmap(langmapString: string, remapCtrl: boolean): void;
}

/**
 * The `langmap` state inside `@replit/codemirror-vim` is module level, so we
 * must reach the *same* module instance jupyterlab-vim uses. `package.json`
 * declares the package as `bundled: false`, which makes webpack consume the
 * copy jupyterlab-vim contributes to the federation share scope instead of
 * bundling one of our own.
 *
 * That also means the import fails outright when jupyterlab-vim is missing,
 * hence the dynamic import behind a guard.
 */
let vimApi: IVimApi | null = null;
let vimLoadAttempted = false;

async function loadVimApi(): Promise<IVimApi | null> {
  if (vimLoadAttempted) {
    return vimApi;
  }
  vimLoadAttempted = true;
  try {
    const mod = await import('@replit/codemirror-vim');
    vimApi = mod.Vim as unknown as IVimApi;
  } catch (reason) {
    console.warn(
      '[jupyterlab-vim-langmap] could not reach @replit/codemirror-vim. ' +
        'The vim half of the remap is inactive. Is jupyterlab-vim installed ' +
        'and enabled?',
      reason
    );
    vimApi = null;
  }
  return vimApi;
}

/** The layout JupyterLab was using before we touched anything. */
let originalLayout: IKeyboardLayout | null = null;

function readConfig(settings: ISettingRegistry.ISettings): IConfig {
  const get = <T>(name: string, fallback: T): T => {
    const value = settings.get(name).composite;
    return value === undefined ? fallback : (value as unknown as T);
  };
  return {
    enabled: get('enabled', true),
    preset: get('preset', 'dvorak'),
    langmap: get('langmap', ''),
    remapCtrl: get('remapCtrl', false),
    applyToVim: get('applyToVim', true),
    applyToJupyterShortcuts: get('applyToJupyterShortcuts', true)
  };
}

/**
 * The single langmap string everything else is derived from. Empty means
 * "remap nothing".
 */
function resolveLangmap(config: IConfig): string {
  if (!config.enabled) {
    return '';
  }
  return config.preset === 'custom' ? config.langmap : DVORAK_LANGMAP;
}

async function apply(config: IConfig): Promise<void> {
  const langmapString = resolveLangmap(config);

  // (A) vim Normal / Visual / operator-pending, inside cell editors.
  //
  // This sits in `vimKeyFromEvent()`, i.e. ahead of command matching, so
  // operators, counts and the operator-pending context all come along for
  // free. Character arguments (`f{char}`, `r{char}`, marks, registers) are
  // excluded by the vim layer itself via `expectLiteralNext`, and the Ex and
  // search prompts never see a langmap at all — both are what we want.
  const vim = await loadVimApi();
  if (vim) {
    // `remapCtrl` must be exactly `false` to switch Ctrl combos off; anything
    // else (including `undefined`) counts as enabled on the vim side.
    vim.langmap(
      config.applyToVim ? langmapString : '',
      config.remapCtrl ? true : false
    );
  }

  // (B) Jupyter Command mode and every other Lumino keybinding.
  //
  // `remapCtrl` governs this half too: with it off, Ctrl/Alt/Meta combinations
  // resolve through the untouched layout, so `Accel S` and `Accel /` keep
  // working when the OS remapper passes modified keys through.
  if (langmapString && config.applyToJupyterShortcuts) {
    const codes = buildKeycodeTable(parseLangmap(langmapString));
    setKeyboardLayout(
      new ModifierAwareLayout(
        LAYOUT_NAME,
        new KeycodeLayout(LAYOUT_NAME, codes, MODIFIER_KEYS),
        originalLayout ??
          new KeycodeLayout('en-us', EN_US_CODES, MODIFIER_KEYS),
        config.remapCtrl
      )
    );
  } else if (originalLayout) {
    setKeyboardLayout(originalLayout);
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'Remap vim command-mode keys back to QWERTY positions when the OS emulates Dvorak',
  autoStart: true,
  requires: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry) => {
    originalLayout = getKeyboardLayout();

    const run = (settings: ISettingRegistry.ISettings) => {
      apply(readConfig(settings)).catch(reason => {
        console.error('[jupyterlab-vim-langmap] failed to apply', reason);
      });
    };

    settingRegistry
      .load(PLUGIN_ID)
      .then(settings => {
        run(settings);
        settings.changed.connect(run);
      })
      .catch(reason => {
        console.error(
          '[jupyterlab-vim-langmap] failed to load settings',
          reason
        );
      });
  }
};

export default plugin;
