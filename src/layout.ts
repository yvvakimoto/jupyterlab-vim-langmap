/**
 * A Lumino keyboard layout that can leave modified keys alone.
 *
 * Many OS level remappers (Yamabuki R among them) stop translating while
 * Ctrl, Alt or Win is held, so `Ctrl+S` arrives with the keyCode of the
 * physical `s` key. Running that through the permuted table as well would
 * remap it a second time — `Ctrl+S` would resolve as `Ctrl+;` and fall
 * through to the browser's "Save page". This layout consults the permuted
 * table only for unmodified keys unless told otherwise.
 */

import { IKeyboardLayout } from '@lumino/keyboard';

export class ModifierAwareLayout implements IKeyboardLayout {
  /**
   * @param name - The human readable name for the layout.
   * @param remapped - The layout used for keys pressed without a modifier.
   * @param plain - The layout used for Ctrl/Alt/Meta combinations when
   *   `remapModified` is false.
   * @param remapModified - Use `remapped` for modified keys too.
   */
  constructor(
    readonly name: string,
    private readonly remapped: IKeyboardLayout,
    private readonly plain: IKeyboardLayout,
    private readonly remapModified: boolean
  ) {}

  // The permuted table is a permutation of the main block, so `remapped` and
  // `plain` share one key set and either can answer these.
  keys(): string[] {
    return this.remapped.keys();
  }

  isValidKey(key: string): boolean {
    return this.remapped.isValidKey(key);
  }

  isModifierKey(key: string): boolean {
    return this.remapped.isModifierKey(key);
  }

  keyForKeydownEvent(event: KeyboardEvent): string {
    const modified = event.ctrlKey || event.altKey || event.metaKey;
    const layout = modified && !this.remapModified ? this.plain : this.remapped;
    return layout.keyForKeydownEvent(event);
  }
}
