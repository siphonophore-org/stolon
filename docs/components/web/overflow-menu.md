# Overflow Menu

A button, by default with the three dot icon, that opens a small menu of actions or links.

## Decision

| When | Use |
| :--- | :--- |
| The row actions of a table or card, when several buttons would crowd the row | Overflow Menu |
| A short list of pages to jump to, under a text button | `text`, with `href` on each item |
| The one action users need most | A [Row Button](row-button.md), never hidden in the menu |

## Usage

```js
import { createOverflowMenu } from './configurationpage?name=myplugin_stolon.js';

var menu = createOverflowMenu({
    items: [{ label: 'Edit', value: 'edit' }, { label: 'Remove', value: 'remove', destructive: true }],
    onSelect: function (value) { act(value, row); }
});
cell.appendChild(menu.element);
```

Classes: `stolon-menu`, `stolon-menu-start`, `stolon-menu-list`, `stolon-menu-item`, `stolon-menu-badge`, `stolon-menu-text-button`, `stolon-menu-text`. The handle is `{ element, setItems, getItems, setText, open, close, isOpen, destroy }`.

## States and Modifiers

* An item is `{ label, value, disabled, destructive, icon, href, current, badge }`. `destructive` shows it red. `onSelect(value, item, event)` gets the item's label as the value when it has no `value`.
* An item with `href` is a link. It follows its address unless `onSelect` calls `event.preventDefault()`, and a click with Ctrl, Cmd, or Shift opens it as the browser does.
* `current` marks the item for the page shown, with `aria-current` and the shared selection look, and the menu opens on it.
* `badge` is text or `{ label, color }` after the label, gray unless it names a color.
* `text` puts text and a dropdown chevron on the button in place of the icon, cut with an ellipsis when it does not fit. `setText` replaces it.
* `label` ("More actions") is the `aria-label` of the menu, and the title and `aria-label` of an icon button. `icon` defaults to `more_vert`.
* `align: 'end'` (default) opens toward the left from the button's right edge, and `'start'` opens toward the right.
* The button has `aria-haspopup` and `aria-expanded`. Arrow Down and Up open it and move between items, skipping a disabled one. Home and End jump. Enter and Space choose. Escape closes and returns focus. Tab or an outside click closes.
* The list is a `role="menu"` of `role="menuitem"` buttons and links. Space chooses a link too.

## Gotchas

* The list is fixed to the window, so a parent with `overflow: hidden` never clips it. It flips above the button when there is no room below, and it follows the button on a scroll.
* `setItems` replaces the items, so call it to change a label or disable an item.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createOverflowMenu`

<code>function createOverflowMenu(options?: OverflowMenuOptions): OverflowMenuHandle</code>

A button, by default with the three dot icon, that opens a small menu of actions. Arrow keys move between the items, Enter and Space choose one, Escape closes the menu and returns focus to the button, and a click outside closes it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>OverflowMenuItem[]</code> | array of { label, value, disabled, destructive, icon, href, current, badge }. An item with href is a link, current marks the page it stands for, and badge is text or { label, color } after the label [optional] |
| `label` | <code>string</code> | aria-label of the menu, and the title and aria-label of an icon button (default 'More actions') |
| `icon` | <code>string</code> | Material icon name on the button (default 'more_vert') |
| `text` | <code>string</code> | text on the button, with a dropdown chevron, in place of the icon [optional] |
| `align` | <code>'start' &#124; 'end'</code> | 'end' opens toward the left from the button's right edge, 'start' toward the right (default 'end') |
| `onSelect` | <code>(value: unknown, item: OverflowMenuItem, event: MouseEvent): void</code> | function(value, item, event) called when an item is chosen. A link item follows its href unless onSelect calls event.preventDefault() [optional] |

| Handle member | Type |
| :--- | :--- |
| `setItems` | <code>(next: OverflowMenuItem[]): void</code> |
| `getItems` | <code>(): OverflowMenuItem[]</code> |
| `setText` | <code>(text: string): void</code> |
| `open` | <code>(): void</code> |
| `close` | <code>(): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `OverflowMenuBadge` | A short badge after an item's label. color is a status color name, a hex code, or a badge state name. |
| `OverflowMenuItem` | One action in an overflow menu. An item with no value reports its label, and an item with an href is a link. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-menu` | Wrapper that places a menu button and its floating list |
| `stolon-menu-list` | Floating list of actions on the stolon-float surface, fixed to the viewport, placed by the menu under the button, or above it with no room, and aligned to its right edge or its left with stolon-menu-start |
| `stolon-menu-item` | One action row built as stolon-icon-text, which tints on hover and focus, and shows red as destructive |
| `stolon-menu-badge` | Badge at the end of a menu item, after its label, which keeps the row one line tall |
| `stolon-menu-text-button` | Menu button that shows its text and a dropdown chevron, set by the text option, the text cut with an ellipsis |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/overflow-menu.html" title="Overflow Menu example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "overflow-menu.html"
```
