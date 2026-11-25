# Confirm Dialog

A [Dialog](dialog.md) that asks a yes or no question and resolves to a boolean. It is compact, the title and the message, unless it shows a context or a typed confirm, which make it full.

## Decision

| When | Use |
| :--- | :--- |
| Before an action that removes or overwrites data | Confirm Dialog |
| Before deleting a specific item, shown with its poster and name | Confirm Dialog with a context |
| A user who must also edit values | [Editor Sidecar](editor-sidecar.md) |

## Usage

```js
import { confirmDialog } from './configurationpage?name=myplugin_stolon.js';

confirmDialog('Its links stop playing. Downloaded files stay.', {
    title: 'Remove Den', confirmText: 'Remove', destructive: true
}).then(function (confirmed) { if (confirmed === true) { removeServer(); } });
```

## Writing a Confirm

* The title names the action and what it acts on, such as "Remove Den" or "Delete 3 files". The message says what follows from it. Never repeat the title as a question.
* The confirm button repeats the action's verb, such as Remove or Delete, rather than Confirm or OK.

## States and Modifiers

* `opts` is `{ title, confirmText, cancelText, destructive, context, typeToConfirm, typeLabel, mismatchText }`. The buttons default to "Confirm" and "Cancel", and there is no default title, so pass one.
* The message is text, written as it is, never as HTML.
* `context` is a node or a string of HTML shown under the message, such as a poster and the name of what is deleted. It makes the dialog full, with the message as its subtitle.
* `destructive` makes the confirm button `stolon-button stolon-destructive`. Otherwise it is `stolon-button stolon-primary`. A destructive confirm is never focused first, so Cancel takes focus and Enter cannot confirm by accident.
* It resolves `true` only for the confirm button. Escape, the backdrop, and Cancel resolve `false`. It never rejects.

### Typed Confirm

`typeToConfirm` asks the reader to type a word before a confirm that cannot be undone, such as deleting a database. It makes the dialog full, with the field in the context.

```js
confirmDialog('Every link in it goes, and this cannot be undone.', {
    title: 'Delete the sync database', confirmText: 'Delete', destructive: true, typeToConfirm: 'Database'
}).then(function (confirmed) { if (confirmed === true) { deleteDatabase(); } });
```

* The field is labelled "Type Database to confirm.", from `typeLabel`, where `{value}` is the word.
* The confirm button stays disabled until the field holds the word exactly, case and spaces included.
* Enter confirms only when the word matches. Otherwise the field shows `mismatchText`, "The text does not match.", under it through the [Field Message](field-message.md), which clears once the text matches or is emptied.
* The field takes focus on open, except on a touch screen, and the destructive button never does.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `confirmDialog`

<code>function confirmDialog(message: string, opts?: ConfirmDialogOptions): Promise&lt;boolean&gt;</code>

Opens a yes or no dialog that resolves to true when confirmed and false otherwise. It is compact, the title and the message under it, unless it has a context or a typed confirm, which make it full, with the message as the subtitle over the context. The title names the action and what it acts on, such as 'Remove Server B', and the message says what follows from it, never the title again as a question. With typeToConfirm the confirm button stays off until the field holds that exact text, and Enter confirms only then.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> | the dialog title, which names the action and what it acts on [optional] |
| `confirmText` | <code>string</code> | the confirm button label (default 'Confirm') |
| `cancelText` | <code>string</code> | the cancel button label (default 'Cancel') |
| `destructive` | <code>boolean</code> | true makes the confirm button destructive (default false) |
| `context` | <code>string &#124; Node</code> | HTML or a node shown under the message, such as a poster and the name of what is deleted, which makes the dialog full [optional] |
| `typeToConfirm` | <code>string</code> | text the reader must type exactly before confirming, such as the name of what is deleted [optional] |
| `typeLabel` | <code>string</code> | the field's label, where {value} is the text to type (default 'Type {value} to confirm.') |
| `mismatchText` | <code>string</code> | the error under the field when Enter is pressed before it matches (default 'The text does not match.') |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/confirm-dialog.html" title="Confirm Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "confirm-dialog.html"
```
