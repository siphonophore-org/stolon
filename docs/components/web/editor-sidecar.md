# Editor Sidecar

The record editor a config page builds, in a [Sidecar](sidecar.md). Its shelf has Delete (unless the record is new), any extra actions, and Save, and the close button in its header leaves. It asks before it discards edits and tracks its own changes.

## Decision

| When | Use |
| :--- | :--- |
| Adding or editing one record, such as a server | Editor Sidecar |
| A quick value | [Prompt Sidecar](prompt-sidecar.md) |

## Usage

```js
import { openEditorSidecar } from './configurationpage?name=myplugin_stolon.js';

var editor = openEditorSidecar({
    title: 'Edit Den',
    body: editorNode,
    page: page,
    isNew: false,
    serialize: function () { return JSON.stringify(readEditor()); },
    ready: loadingPromise,
    onSave: function (close) { return saveServer().then(function () { return true; }, function () { return false; }); },
    onDelete: function (close) { confirmDelete().then(function (yes) { if (yes) { deleteServer(); close('deleted'); } }); }
});
```

It returns the `openSidecar` handle plus `isDirty()` and `markClean()`.

## States and Modifiers

* `title`, `subtitle`, `body`, `className`, `size`, `onClose`, `autofocus`, and `returnFocus` are as on [Sidecar](sidecar.md). It is `large` unless `size` is set.
* `page` is the `createConfigPage` handle. An open editor then counts toward `guardUnsaved` and closes when the page hides.
* `isNew` marks a record not saved yet. It has no Delete button.
* `serialize()` returns a stable string of the editor state. `ready` is a promise to wait on before taking the clean snapshot, for fields still loading.
* `saveText` and `deleteText` replace "Save" and "Delete". `cancelText` is accepted and unused, since the header's close button leaves.
* `onSave(close)` returns `false`, or a promise of `false`, to stay open. Save is disabled while a returned promise is pending, and a rejection enables it again. A true or undefined result closes with `'saved'`.
* `actions` adds buttons to the shelf, such as Duplicate. Each is `{ text, icon, variant, onClick(handle, button) }`, where `icon` is a Material icon name before the text and `variant` is `'secondary'` (default), `'primary'`, or `'destructive'`. The shelf reads Delete and any destructive action first, then the other actions, then Save. An action leaves the editor open, and `onClick` closes it through the handle when it should.
* `onDelete(close)` closes the sidecar itself. Delete shows only when this is set and `isNew` is false.
* Dismissing with changes opens a compact destructive confirm, "Unsaved changes" over "Closing now loses your edits.", with Keep editing and Discard.

## Gotchas

* The clean snapshot is taken when `ready` settles. Call `markClean()` after a save that keeps the sidecar open.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openEditorSidecar`

<code>function openEditorSidecar(opts?: EditorSidecarOptions): EditorSidecarHandle</code>

Opens an editor for one record in a sidecar, with Delete and Save on its shelf and the header's close button to leave, and asks before it discards edits. Given the createConfigPage handle, it counts toward the page unsaved guard and closes when the page hides.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `page` | <code>Pick&lt;PageHandle, 'trackEditor' &#124; 'untrackEditor'&gt; &#124; null</code> | the createConfigPage handle [optional] |
| `isNew` | <code>boolean</code> | true for a record not saved yet, which has no Delete button (default false) |
| `serialize` | <code>(): string</code> | function() returning a stable string of the editor's state, for its change tracking |
| `ready` | <code>unknown</code> | a promise to wait on before taking the clean snapshot, such as fields still loading [optional] |
| `saveText` | <code>string</code> |  |
| `deleteText` | <code>string</code> |  |
| `cancelText` | <code>string</code> |  |
| `actions` | <code>EditorSidecarAction[]</code> | [{ text, icon, variant, onClick(handle, button) }] extra shelf buttons, such as Duplicate, drawn after Delete and before Save. variant is 'secondary', 'primary', or 'destructive' (default 'secondary'), and a destructive one sits beside Delete [optional] |

| Handle member | Type |
| :--- | :--- |
| `isDirty` | <code>(): boolean</code> |
| `markClean` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `EditorSidecarAction` | One extra shelf button of an editor, such as Duplicate. icon is a Material icon name, and variant picks its look. |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/editor-sidecar.html" title="Editor Sidecar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "editor-sidecar.html"
```
