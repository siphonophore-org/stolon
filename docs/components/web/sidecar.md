# Sidecar

A panel that slides in from the trailing edge, for inputs and for the details of a selected item. Its header, the title and the close button, and its shelf of buttons stay pinned while the body scrolls between them. It is modal, with the same focus, Escape, and scroll rules as a [Dialog](dialog.md).

## Decision

| When | Use |
| :--- | :--- |
| Opening a row of a [Filtered List](filtered-list.md) or a [Data Table](data-table.md) to show everything about it | Sidecar |
| Editing a record with change tracking | [Editor Sidecar](editor-sidecar.md) |
| Asking for a few values | [Prompt Sidecar](prompt-sidecar.md) |
| A sidecar the page writes in its markup and fills in | [Bound Sidecar](bound-sidecar.md) |
| An alert or a yes or no question | [Dialog](dialog.md) or [Confirm Dialog](confirm-dialog.md) |

## Usage

```js
import { sidecarOpener, createDataTable, createDefinitionList } from './configurationpage?name=myplugin_stolon.js';

var show = sidecarOpener(function (row) {
    return {
        title: row.name,
        subtitle: row.kind + ' on ' + row.peer,
        badge: { label: row.state, color: row.state },
        body: createDefinitionList({ items: [{ label: 'Items', value: row.items }, { label: 'Size', value: row.size }] }).element
    };
});
var table = createDataTable({ columns: columns, rows: rows, onOpen: show });
```

`openSidecar(options)` opens one directly and returns `{ element, content, close, dismiss, isOpen, setTitle, setContent, destroy }`, where `content` is the body.

The markup:

```html
<div class="stolon-dialog stolon-sidecar stolon-medium">
    <div class="stolon-dialog-content stolon-sidecar-panel stolon-medium" role="dialog" aria-modal="true">
        <div class="stolon-sidecar-head">
            <div class="stolon-sidecar-heading">
                <div class="stolon-sidecar-title-row"><h2 class="stolon-sidecar-title">Movies</h2><span class="stolon-badge stolon-green stolon-sidecar-badge">Synced</span></div>
                <p class="stolon-sidecar-subtitle">Library on Den</p>
            </div>
            <button type="button" class="stolon-row-btn stolon-dialog-close" title="Close" aria-label="Close"><span class="material-icons" aria-hidden="true">close</span></button>
        </div>
        <div class="stolon-sidecar-body"></div>
        <div class="stolon-sidecar-shelf"></div>
    </div>
</div>
```

Classes: `stolon-sidecar`, `stolon-sidecar-panel`, with the size modifiers `stolon-medium` and `stolon-large`, `stolon-sidecar-head`, `stolon-sidecar-heading`, `stolon-sidecar-title-row`, `stolon-sidecar-title`, `stolon-sidecar-badge`, `stolon-sidecar-subtitle`, `stolon-sidecar-body`, `stolon-sidecar-shelf`, and `stolon-dialog-close` on a [Row Button](row-button.md).

## States and Modifiers

* The header shows `title`, an optional `subtitle` under it, an optional `badge` beside it, `{ label, color }`, where `color` is a status color name, a hex code, or a [Badge](badge.md) state name, and the close button at its end.
* Only the body scrolls. The header and the shelf stay in place. `body` is HTML or a node.
* `buttons` is the shelf, as [Dialog](dialog.md) takes them, such as Delete, Cancel, and Save. A destructive button sits at the start and the rest at the end. With no buttons the shelf is hidden.
* `size` is `medium`, 560px wide (the default), or `large`, 800px. On a phone the sidecar fills the screen, clear of the notch and the home bar.
* It slides in from the right, or from the left on a right to left page. The slide is off under `prefers-reduced-motion: reduce`.
* `setContent({ title, subtitle, badge, body, buttons })` swaps what it shows without closing it. A shelf button that swaps the content, such as Next, keeps focus on the same button in the new shelf.
* `sidecarOpener(render, options)` returns a function for `onOpen`. The first item opens a sidecar, and each later item swaps its content in while it is open.
* Escape, the backdrop, and the close button close it, asking `beforeClose` first. Focus moves in, stays inside, and returns to the row that opened it, and the page behind does not scroll.
* `page` is the handle from `createConfigPage`. The sidecar closes when the page hides.

## Gotchas

* A string `body` is HTML, so escape data in it.
* The sidecar is modal, so the rows behind it cannot be clicked while it is open. Swap items from inside it, such as with Previous and Next.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openSidecar`

<code>function openSidecar(opts?: SidecarOptions): SidecarHandle</code>

Opens a sidecar, a panel that slides in from the trailing edge, for inputs and for the details of a selected item. Its header, the title with an optional subtitle and badge and the close button, and its shelf of buttons stay pinned while the body scrolls between them. The shelf is hidden when there are no buttons. On a phone it fills the screen. It closes on Escape, a backdrop click, and the close button, each asking beforeClose first, traps focus, locks the page scroll, and returns focus.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `size` | <code>'medium' &#124; 'large'</code> | 'medium' (560px wide) or 'large' (800px) (default 'medium') |
| `ariaLabel` | <code>string</code> |  |
| `className` | <code>string</code> |  |
| `dismissable` | <code>boolean</code> |  |
| `beforeClose` | <code>(): boolean &#124; PromiseLike&lt;boolean &#124; void&gt;</code> |  |
| `onClose` | <code>(value: unknown): void</code> |  |
| `autofocus` | <code>AutofocusTarget</code> |  |
| `returnFocus` | <code>ReturnFocusTarget</code> |  |
| `page` | <code>{ addCleanup(fn: () =&gt; void): unknown</code> |  |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `content` | <code>HTMLDivElement</code> |
| `close` | <code>(value?: unknown): void</code> |
| `dismiss` | <code>(): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `setTitle` | <code>(text: string): void</code> |
| `setContent` | <code>(next: SidecarContent): void</code> |
| `destroy` | <code>(): void</code> |

### `sidecarOpener`

<code>function sidecarOpener&lt;T&gt;(render: (item: T) =&gt; SidecarContent, opts?: SidecarOptions): (item: T) =&gt; SidecarHandle</code>

Returns a function that shows an item in a sidecar, for a Filtered List's or Data Table's onOpen. It opens the sidecar for the first item, and while that sidecar is open it swaps in the next item's content without closing it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `size` | <code>'medium' &#124; 'large'</code> |  |
| `ariaLabel` | <code>string</code> |  |
| `className` | <code>string</code> |  |
| `dismissable` | <code>boolean</code> |  |
| `beforeClose` | <code>(): boolean &#124; PromiseLike&lt;boolean &#124; void&gt;</code> |  |
| `onClose` | <code>(value: unknown): void</code> |  |
| `autofocus` | <code>AutofocusTarget</code> |  |
| `returnFocus` | <code>ReturnFocusTarget</code> |  |
| `page` | <code>{ addCleanup(fn: () =&gt; void): unknown</code> |  |

| Type | What it is |
| :--- | :--- |
| `SidecarContent` | What a sidecar shows: a title, an optional subtitle and badge, the body, and the shelf's buttons. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-dialog.stolon-sidecar` | A sidecar's overlay, whose panel docks to the trailing edge of the window at full height |
| `stolon-dialog-content.stolon-sidecar-panel` | The sidecar panel, 560px wide or 800px when large, that slides in from the trailing edge, with its header and shelf pinned and its body scrolling between them |
| `stolon-sidecar-head` | The pinned header, the title with its badge and subtitle, and the close button at the end |
| `stolon-sidecar-title` | The sidecar title |
| `stolon-sidecar-badge` | The badge beside the sidecar title |
| `stolon-sidecar-subtitle` | The dimmed line under the sidecar title |
| `stolon-sidecar-body` | The body, the only part that scrolls |
| `stolon-sidecar-shelf` | The pinned shelf of buttons, Delete at the start and Cancel and Save at the end, hidden when it has no buttons |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/sidecar.html" title="Sidecar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sidecar.html"
```
