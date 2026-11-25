# Bound Sidecar

The [Sidecar](sidecar.md) behavior for a `stolon-sidecar` already written in the page markup, whose body the page fills in.

## Decision

| When | Use |
| :--- | :--- |
| A detail sidecar the page fills in before it opens | Bound Sidecar |
| Content built in code | [Sidecar](sidecar.md) |

## Usage

```html
<div id="itemDetail" class="stolon-dialog stolon-sidecar stolon-hidden">
    <div class="stolon-dialog-content stolon-sidecar-panel stolon-medium" role="dialog" aria-modal="true" aria-labelledby="itemTitle">
        <div class="stolon-sidecar-head">
            <div class="stolon-sidecar-heading"><div class="stolon-sidecar-title-row"><h2 id="itemTitle" class="stolon-sidecar-title"></h2></div></div>
            <button type="button" class="stolon-row-btn stolon-dialog-close" title="Close" aria-label="Close"><span class="material-icons" aria-hidden="true">close</span></button>
        </div>
        <div id="itemContent" class="stolon-sidecar-body"></div>
        <div class="stolon-sidecar-shelf"></div>
    </div>
</div>
```

```js
import { bindSidecar } from './configurationpage?name=myplugin_stolon.js';

var detail = bindSidecar('itemDetail', { root: view, onClose: function (value) { onDetailClosed(); } });
detail.open();
```

The handle is `{ element, open, close(value), isOpen, destroy }`.

## States and Modifiers

* `opts` is `{ root, dismissable, beforeClose, onOpen, onClose(value), autofocus, returnFocus }`. `root` is where an id is looked up, the document by default.
* `beforeClose()` returns `false`, or a promise of `false`, to keep the sidecar open when it is dismissed. `close(value)` called from code closes it without asking.
* It shows and hides with the `stolon-hidden` class. It closes on a backdrop `mousedown`, on Escape when it is on top, and on its `.stolon-dialog-close`, each asking `beforeClose` first.
* `onOpen` runs before focus moves in, so the page fills the sidecar first. The shelf is then hidden when none of its buttons shows.
* It traps focus and restores it on close, with the same rules as [Dialog](dialog.md).
* It adds `role="dialog"`, `aria-modal`, and a label from the title to `.stolon-sidecar-panel` when neither the panel nor the overlay carries a role.
* `destroy()` closes the sidecar and removes the listeners.

## Gotchas

* Closed markup must have the `stolon-hidden` class or it shows.
* Keep the markup inside the page so it is hidden with it.
* It throws when the element is not found.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `bindSidecar`

<code>function bindSidecar(overlay: HTMLElement &#124; string &#124; null, opts?: BindSidecarOptions): BoundSidecarHandle</code>

Gives a sidecar already in the page markup the behavior openSidecar builds, so it shows and hides by the stolon-hidden class, closes on a backdrop click, Escape, and its .stolon-dialog-close button, each asking opts.beforeClose first, and traps and restores focus. The panel gets dialog semantics when the markup does not set them. A shelf with no visible button is hidden.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `root` | <code>ParentNode &#124; null</code> | element to resolve an id within (default document) |
| `dismissable` | <code>boolean</code> | allow backdrop, Escape, and close button dismissal (default true) |
| `beforeClose` | <code>(): boolean &#124; PromiseLike&lt;boolean &#124; void&gt;</code> | function() returning false, or a promise of false, to keep the sidecar open when it is dismissed [optional] |
| `autofocus` | <code>AutofocusTarget</code> |  |
| `returnFocus` | <code>ReturnFocusTarget</code> |  |
| `onOpen` | <code>(): void</code> | function() called after the sidecar shows [optional] |
| `onClose` | <code>(value: unknown): void</code> | function(value) called once per close [optional] |

| Handle member | Type |
| :--- | :--- |
| `open` | <code>(): void</code> |
| `close` | <code>(value?: unknown): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/bound-sidecar.html" title="Bound Sidecar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bound-sidecar.html"
```
