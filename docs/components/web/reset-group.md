# Reset Group

A stack of rows that pair a description with an action button, as for per table resets.

## Decision

| When | Use |
| :--- | :--- |
| A list of destructive actions, each with a sentence of explanation | Reset Group |
| Ordinary settings | [Form Fields](form-fields.md) |

## Usage

```html
<h3 class="stolon-subsection-title">Reset Individual Tables</h3>
<div class="stolon-reset-group">
    <div class="stolon-reset-row">
        <span class="stolon-collapsible-tile stolon-red" aria-hidden="true"><span class="material-icons">video_library</span></span>
        <div class="stolon-reset-info">
            <div>Content Sync</div>
            <div class="fieldDescription">Forgets content tracking.</div>
        </div>
        <button is="emby-button" type="button" class="raised stolon-button stolon-destructive stolon-small"><span>Reset</span></button>
    </div>
</div>
```

Or build it in script:

```js
import { createResetGroup, createResetRow } from './configurationpage?name=myplugin_stolon.js';

var history = createResetRow({ icon: 'history', label: 'History sync', help: 'Forgets history tracking.', destructive: true, onClick: resetHistory });
var group = createResetGroup([history, { icon: 'tune', label: 'Settings', help: 'Puts every setting back to its default.', button: 'Restore', action: 'reset-settings' }]);
view.querySelector('#resets').appendChild(group.element);
history.setEmpty(counts.History === 0);
```

Classes: `stolon-reset-group`, `stolon-reset-row`, `stolon-reset-row-nuclear`, `stolon-reset-info`, and the row's tile, `stolon-collapsible-tile` from the [Collapsible Section](collapsible-section.md).

## States and Modifiers

* `stolon-reset-row-nuclear` gives the one dangerous row a red tint and no rule.
* The last row has no rule.
* At 600px and below the button moves under the text and starts where the text starts, so the text keeps the full width.
* A row leads with an icon tile. It takes the accent, red for a `destructive` row, and gray while the row is `empty`, with nothing to reset. `setEmpty(empty)` changes it later, and `getValue()` reads it.
* `button` is the label (default "Reset") or a button already built. A built button is an `emby-button`, destructive for a destructive row and secondary otherwise, with `action` as its `data-action`. It is small, and `size: 'medium'` or `'large'` sizes it to sit beside buttons of that size.
* `createResetGroup(rows)` takes row handles or the options for new ones, and its `rows` are the handles in order. `destroy()` stops every row's `onClick`.

## Gotchas

* Pair each button with a [Confirm Dialog](confirm-dialog.md). A row in markup has no JavaScript, and `createResetRow` only calls `onClick`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createResetRow`

<code>function createResetRow(options: ResetRowOptions): ResetRowHandle</code>

Builds one stolon-reset-row: an icon tile, what the row does, one sentence on what follows, and its button. The tile takes the accent, red for a destructive row, and gray while the row is empty.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `icon` (required) | <code>string</code> | the Material icon in the tile, which names the action |
| `label` (required) | <code>string</code> | what the row does |
| `help` | <code>string</code> | one sentence on what follows [optional] |
| `button` | <code>string &#124; HTMLButtonElement</code> | the button's label, or a button already built (default 'Reset') [optional] |
| `action` | <code>string</code> | the button's data-action, for a page that handles every row's click in one place [optional] |
| `destructive` | <code>boolean</code> | true for a row that loses data, with a destructive button and a red tile (default false) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for the button it builds, such as medium beside medium buttons (default 'small') |
| `empty` | <code>boolean</code> | true while there is nothing to reset, which grays the tile (default false) |
| `onClick` | <code>(button: HTMLButtonElement): void</code> | function(button) called when the button is pressed [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `button` | <code>HTMLButtonElement</code> |
| `getValue` | <code>(): boolean</code> |
| `setEmpty` | <code>(empty: boolean): void</code> |
| `destroy` | <code>(): void</code> |

### `createResetGroup`

<code>function createResetGroup(rows: Array&lt;ResetRowOptions &#124; ResetRowHandle&gt;): ResetGroupHandle</code>

Builds a stolon-reset-group holding reset rows, in order.

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `rows` | <code>ResetRowHandle[]</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `stolon-reset-group` | Container for a stack of reset or action rows |
| `stolon-reset-row` | Row pairing an action description with its button |
| `stolon-reset-row-nuclear` | Row with a faint red tint for the most destructive action |
| `stolon-reset-info` | Column that holds the description beside an action button |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/reset-group.html" title="Reset Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "reset-group.html"
```
