# Spinner

An inline spinner with a hidden status label. Its size is small, medium, or large.

## Decision

| When | Use |
| :--- | :--- |
| One request in flight, beside a button or inside a region | Spinner |
| Content that has a known shape | [Skeleton](skeleton.md) |
| A known percent | [Progress Ring](progress-ring.md) |

## Usage

```js
import { createSpinner } from './configurationpage?name=myplugin_stolon.js';

status.appendChild(createSpinner({ size: 'small', label: 'Saving' }).element);
```

Classes: `stolon-loading`, `stolon-loading-small`, `stolon-loading-medium`, `stolon-loading-large`, `stolon-loading-ring`. The handle is `{ element, getValue, setValue, destroy }`, where `getValue()` returns the label and `setValue(label)` replaces it.

The one animation in the kit is the `stolon-spin` keyframes, a turn from 0 to 360 degrees. A plugin may use it for its own element.

```css
.my-spinner { animation: stolon-spin 0.8s linear infinite; }
```

## States and Modifiers

* `stolon-loading` is an inline wrapper with `role="status"`, and `label` ("Loading") is the text a screen reader reads.
* With reduced motion asked for, the ring turns slower and still turns.
* `stolon-table-reload-btn.spinning .material-icons` uses `stolon-spin` for the [Paginated Table](paginated-table.md) reload button.

## Gotchas

* The `stolon-spinner` class belongs to the status page template. See [Status Page](status-page.md).
* The ring is `stolon-loading-ring`. There is no spinner class in the bundled CSS other than these.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSpinner`

<code>function createSpinner(options?: SpinnerOptions): SpinnerHandle</code>

An inline spinner with a hidden status label. Its size is small, medium, or large.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `size` | <code>'small' &#124; 'medium' &#124; 'large' &#124; string</code> | 'small', 'medium', or 'large' (default 'medium') |
| `label` | <code>string</code> | text a screen reader reads (default 'Loading') |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(label: string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `stolon-loading` | Inline spinner, a ring with one accent edge that turns, in three sizes |
| `stolon-settling` | A page or a tab held until its data has come in: what it holds stays laid out but unseen, under a spinner |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/spinner.html" title="Spinner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "spinner.html"
```
