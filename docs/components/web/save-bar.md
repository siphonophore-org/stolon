# Save Bar

A Save button with a status line above it. The line says the page has unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and color. It is built on the [Status Text](status-text.md) line every message uses.

## Decision

| When | Use |
| :--- | :--- |
| The bottom of any form that saves with a button | Save Bar. |
| A page of sections that each save on their own | `createSaveBars`, one bar per section |
| A field that saves on change | Nothing. The field saves itself. |

## Usage

```js
import { createSaveBar } from './configurationpage?name=myplugin_stolon.js';

var bar = createSaveBar({ onSave: function () { return shared.saveConfig(readForm()); } });
view.querySelector('#saveHost').appendChild(bar.element);
view.addEventListener('input', function () { bar.setDirty(true); });
```

The handle is `{ element, button, status, getState, setState, setDirty, save, destroy }`.

A page of sections, such as a settings page with one [Collapsible Section](collapsible-section.md) per tool, ends each section with its own bar through `createSaveBars`. It asks before the page is left while any section is unsaved.

```js
import { createConfigPage, createSaveBars, createCollapsibleSection } from './configurationpage?name=myplugin_stolon.js';

var bars = null;
createConfigPage(view, {
    pluginId: 'a1b2c3d4-0000-0000-0000-000000000000',
    bind: function (shared, page) {
        bars = createSaveBars(page);
        sections.forEach(function (s) {
            var section = createCollapsibleSection({ title: s.name, icon: s.icon, content: s.content });
            list.appendChild(section.element);
            bars.add(s.content, { onSave: function () { return shared.saveConfigWith(s.apply); } });
        });
    },
    load: function (shared) {
        shared.getConfig().then(function (config) { sections.forEach(function (s) { s.load(config); }); bars.clean(); });
    }
});
```

## States and Modifiers

| State | Line | Look |
| :--- | :--- | :--- |
| `pending` | Unsaved changes. | Warning icon, orange |
| `saving` | Saving… | Info icon, blue. The button is disabled |
| `saved` | Changes saved. | Check icon, green. Fades after `savedMs`, 4000 ms by default |
| `failed` | Could not save. | Error icon, red, announced as an alert. Stays until the next change or save |

* Save runs `onSave`. A promise it returns decides saved or failed, and anything else counts as saved. When `onSave` throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason, and `failedText` is the line otherwise.
* `setDirty(true)` shows the pending line, and `setDirty(false)` clears a pending or failed line.
* `setState(state, text)` shows any state, with its own text if given, and `''` shows nothing. `state` in the options sets the state to start in.
* `save()` runs Save from code and resolves `true` when it saved.
* Every line and the button label can be replaced: `saveText`, `pendingText`, `savingText`, `savedText`, `failedText`.
* `fill` makes the button span the width.
* Save is set at weight 600, as Jellyfin's buttons are. A `stolon-button-row` right above the bar sits one narrow gap above it, and a row's buttons drop Jellyfin's button margin, so they line up with Save.
* `createSaveBars(page)` returns `{ add, markDirty, clean, isDirty, destroy }`. `add(content, options)` appends a bar to the section and takes a Save Bar's options, with `form` set to the section and `fill` on by default. An `input` or `change` inside the section marks its bar unsaved, except in the bar itself and in the controls `ignore` names, a table's search and filters by default. A save that lands clears the section, and text that `onSave` resolves with is the saved line, such as "Saved, restart to apply.". `tracker`, from `createChangeTracker`, decides whether the section is unsaved, so an edit put back leaves it saved. `markDirty(bar)` marks a section from code, and `clean()` clears every one, for after the page loads its values.
* With `form`, Save first checks every field in it through the [validation core](field-message.md#validation). While one is invalid it does not run `onSave`, shows every message, focuses the first invalid field, and shows the failed line "Fix the fields marked in red.", which `invalidText` replaces.

## Gotchas

* `createSaveBars(page)` sets the page's `guardUnsaved`, so it replaces any guard the page set before. Fold another check into a section's `tracker` instead.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSaveBar`

<code>function createSaveBar(options?: SaveBarOptions): SaveBarHandle</code>

A Save button with a status line above it, built on the status line every message uses. The line says the page has unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and color. Save runs onSave, shows Saving while a promise it returns is pending, then Changes Saved or Could Not Save. When onSave throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason. The saved line fades after savedMs, and a failure stays until the next change or save. With form, Save first checks every field in it through the validation core, and refuses to save while one is invalid.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `form` | <code>ParentNode &#124; null</code> | the form, section, or page whose fields Save checks first [optional] |
| `invalidText` | <code>string</code> | the failed line while a field is invalid (default 'Fix the fields marked in red.') |
| `saveText` | <code>string</code> | the button's label (default 'Save') |
| `pendingText` | <code>string</code> | the line while changes are unsaved (default 'Unsaved changes.') |
| `savingText` | <code>string</code> | the line while saving (default 'Saving…') |
| `savedText` | <code>string</code> | the line after a save (default 'Changes saved.') |
| `failedText` | <code>string</code> | the line after a failed save, when onSave gives no message of its own (default 'Could not save.') |
| `savedMs` | <code>number</code> | how long the saved line stays (default 4000) |
| `fill` | <code>boolean</code> | true makes the button span the width (default false) |
| `state` | <code>SaveBarState</code> | the state to start in [optional] |
| `onSave` | <code>(): unknown</code> | function() run on Save, which may return a promise [optional] |

| Handle member | Type |
| :--- | :--- |
| `button` | <code>HTMLButtonElement</code> |
| `status` | <code>HTMLElement</code> |
| `getState` | <code>(): SaveBarState</code> |
| `setState` | <code>(state: SaveBarState, text?: string): void</code> |
| `setDirty` | <code>(dirty: boolean): void</code> |
| `save` | <code>(): Promise&lt;boolean&gt;</code> |
| `destroy` | <code>(): void</code> |

### `createSaveBars`

<code>function createSaveBars(page?: { guardUnsaved(dirty: () =&gt; boolean): void; } &#124; null): SaveBarsHandle</code>

Ends each section of one page with its own Save Bar, each saving on its own, and asks before the page is left while any is unsaved. An edit inside a section marks its bar unsaved, except in the bar itself and in a table's search and filters, which change only what shows. A save that lands clears the bar, and a save that resolves with text shows that text as the saved line.

| Handle member | Type |
| :--- | :--- |
| `add` | <code>(content: HTMLElement &#124; null, options?: SaveBarsSectionOptions): SaveBarHandle &#124; null</code> |
| `markDirty` | <code>(bar: SaveBarHandle): void</code> |
| `clean` | <code>(): void</code> |
| `isDirty` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SaveBarState` | The states a save bar shows above its button. '' shows nothing. |
| `SaveBarsSectionOptions` | What a section of createSaveBars takes, beside a Save Bar's own options. tracker decides whether the section is unsaved, in place of any edit. ignore names the controls whose edits change only what shows. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-save-bar` | A Save button with its status line above it, the line in the state's color with its icon centered on the first line |
| `stolon-button-row` | A row of buttons right above a Save Bar sits one narrow gap above it |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/save-bar.html" title="Save Bar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "save-bar.html"
```
