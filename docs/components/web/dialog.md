# Dialog

A modal for an alert or a confirmation, at one of two fixed sizes, that never scrolls. Anything with inputs, or anything long enough to scroll, goes in a [Sidecar](sidecar.md).

## Decision

| When | Use |
| :--- | :--- |
| Telling the user something they must acknowledge | Dialog, compact |
| A yes or no question | [Confirm Dialog](confirm-dialog.md), compact |
| A yes or no question about a specific thing, shown with it, such as a poster and a name | [Confirm Dialog](confirm-dialog.md) with a context, full |
| Inputs, a record, or the details of a selected item | [Sidecar](sidecar.md) |

## Usage

```js
import { openDialog } from './configurationpage?name=myplugin_stolon.js';

openDialog({
    title: 'Sync paused',
    description: 'Server B stopped answering. Zooid tries again in five minutes.',
    buttons: [{ text: 'OK', className: 'stolon-button stolon-primary', value: 'ok' }]
});

openDialog({
    title: 'Delete Charade',
    subtitle: 'The file goes from this server and stops syncing.',
    context: posterAndName,
    buttons: [
        { text: 'Cancel', className: 'stolon-button stolon-secondary', value: 'cancel' },
        { text: 'Delete', className: 'stolon-button stolon-destructive', value: 'delete' }
    ],
    onClose: function (value) { if (value === 'delete') remove(); }
});
```

The handle is `{ element, content, close, dismiss, setTitle }`. `element` is the overlay, and `content` is the context of a full dialog, else the description.

The markup of each size:

```html
<div class="stolon-dialog stolon-compact">
    <div class="stolon-dialog-content stolon-compact" role="dialog" aria-modal="true">
        <h2 class="stolon-modal-title">Sync paused</h2>
        <p class="stolon-modal-description">Server B stopped answering. Zooid tries again in five minutes.</p>
        <div class="stolon-modal-button-row"><button type="button" class="raised stolon-modal-button stolon-button stolon-primary">OK</button></div>
    </div>
</div>

<div class="stolon-dialog stolon-full">
    <div class="stolon-dialog-content stolon-full" role="dialog" aria-modal="true">
        <h2 class="stolon-modal-title">Delete Charade</h2>
        <p class="stolon-modal-subtitle">The file goes from this server and stops syncing.</p>
        <div class="stolon-modal-context"></div>
        <div class="stolon-modal-button-row"></div>
    </div>
</div>
```

Classes: `stolon-dialog`, `stolon-dialog-content`, with the size modifiers `stolon-compact` and `stolon-full`, `stolon-modal-title`, `stolon-modal-description`, `stolon-modal-subtitle`, `stolon-modal-context`, `stolon-modal-field`, `stolon-modal-field-label`, `stolon-modal-button-row`, `stolon-modal-button`.

## Writing a Dialog

* The title names the action and what it acts on, such as "Remove Server B". The description or subtitle says what follows from it. Never repeat the title as a question, such as "Remove server" over "Remove this server?".
* Keep the description to one or two short sentences. A dialog that needs more words, or a field, is a sidecar.

## States and Modifiers

* `size` is `compact` or `full`. With no size, a dialog with a `context` is full, and any other is compact.
* Compact is the title, the `description`, and the buttons, 420px wide at most. Full is the title, the `subtitle`, the `context`, and the buttons, 560px at most. Both take the screen's width less its margin on a phone.
* `description` and `subtitle` are text. `context` is a node, or a string of HTML, so escape data in it.
* The panel never scrolls. What does not fit is cut off, so content that might not fit belongs in a sidecar.
* A dialog has no close button. Escape and a backdrop `mousedown` dismiss it, asking `beforeClose` first, and `dismissable: false` turns both off.
* `ariaLabel` names a dialog with no `title`. Without it the name is the description or subtitle, else "Dialog".
* `buttons` is `[{ text, icon, className, value, action(close, dismiss, button) }]`. `icon` is a Material icon name drawn before the text. Without `action` a button closes with its `value`. `dismiss` closes the way Escape does, asking `beforeClose`. The buttons share the row equally and wrap on a phone, with a destructive one last.
* Focus on open goes to `autofocus`, else the first field in the context, else a button that is not destructive, else the panel. A `stolon-button stolon-destructive` button is never focused automatically.
* Tab and Shift+Tab cycle inside the panel. Only the top dialog or sidecar answers Escape. The page behind does not scroll while a dialog is open.
* On close, focus returns to the control that opened it, else `returnFocus`, else the first heading of the config page. A dialog or sidecar still open underneath takes focus back.
* `page` is the handle from `createConfigPage`. The dialog closes when the page hides, without asking `beforeClose`.
* `setTitle(text)` changes the title and adds or removes the heading and `aria-labelledby` as needed.
* A button that is disabled, such as a typed confirm's button before the text matches, is dimmed.
* Links in a dialog that are not buttons take the accent color.

## Gotchas

* A button with an `action` must call `close` itself.
* A dialog opened in the page body is outside `.pluginConfigurationPage`. The field rules already cover `.stolon-dialog`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openDialog`

<code>function openDialog(opts?: DialogOptions): DialogHandle</code>

Opens a modal for an alert or a confirmation, at one of two fixed sizes, that never scrolls. Compact shows the title, the description, and the buttons. Full shows the title, the subtitle, the context, such as a poster and the name of what is deleted, and the buttons. It has no close button. Escape and a backdrop click dismiss it, each asking opts.beforeClose first, focus is trapped in the panel, and it is restored on close. Inputs and anything that needs to scroll go in a sidecar.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `size` | <code>'compact' &#124; 'full'</code> | 'compact' or 'full' (default 'full' with a context, else 'compact') |
| `title` | <code>string</code> | the heading, which names the action and what it acts on [optional] |
| `description` | <code>string</code> | the sentence under a compact dialog's title, as text [optional] |
| `subtitle` | <code>string</code> | the sentence under a full dialog's title, as text [optional] |
| `context` | <code>string &#124; Node</code> | a full dialog's context, HTML or a node [optional] |
| `ariaLabel` | <code>string</code> | accessible name when there is no title (default the description or subtitle, else 'Dialog') [optional] |
| `className` | <code>string</code> | classes added to the panel [optional] |
| `dismissable` | <code>boolean</code> | allow Escape and backdrop dismissal (default true) |
| `beforeClose` | <code>(): boolean &#124; PromiseLike&lt;boolean &#124; void&gt;</code> | function() returning false, or a promise of false, to keep the dialog open when it is dismissed [optional] |
| `buttons` | <code>DialogButton[]</code> | [{ text, icon, className, value, action(close, dismiss, button) }] in the button row, where dismiss closes as Escape does, asking beforeClose first, icon is a Material icon name before the text, and button is the clicked element [optional] |
| `onClose` | <code>(value: unknown): void</code> | function(value) called once when the dialog closes [optional] |
| `autofocus` | <code>AutofocusTarget</code> | the element or a selector within the dialog to focus on open, or false to focus the panel itself (default the first field in the context, else a button that is not destructive) [optional] |
| `returnFocus` | <code>ReturnFocusTarget</code> | an element, a selector, or a function returning one, to focus on close when the control that opened the dialog is gone [optional] |
| `page` | <code>{ addCleanup(fn: () =&gt; void): unknown</code> | the page handle from createConfigPage, so the dialog closes when the page hides [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `content` | <code>HTMLElement</code> |
| `close` | <code>(value?: unknown): void</code> |
| `dismiss` | <code>(): void</code> |
| `setTitle` | <code>(text: string): void</code> |

| Type | What it is |
| :--- | :--- |
| `DialogButton` | One button. icon is a Material icon name drawn before the text, action gets close, dismiss, and the clicked button, and without it a click closes with value. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-dialog` | Full screen dimmed overlay that centers its panel |
| `stolon-dialog-content` | Centered modal panel for an alert or a confirmation, at a fixed size, that never scrolls, whose padding every part inside it is set by |
| `stolon-dialog-content.stolon-compact` | The compact size, for a title, a description, and its buttons |
| `stolon-dialog-content.stolon-full` | The full size, for a title, a subtitle, a context such as a poster and a name, and its buttons |
| `stolon-dialog-close` | The close button in a sidecar's header |
| `stolon-modal-title` | Modal heading |
| `stolon-modal-description` | The sentence under a compact dialog's title |
| `stolon-modal-subtitle` | The line under a full dialog's title |
| `stolon-modal-context` | A full dialog's context, such as a poster and the name of what is deleted |
| `stolon-modal-field` | Field block with a label inside a dialog or a sidecar |
| `stolon-modal-field-label` | Dimmed label above such a field |
| `stolon-modal-button-row` | A dialog's row of equal width buttons |
| `stolon-modal-button` | A dialog or sidecar button |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/dialog.html" title="Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "dialog.html"
```
