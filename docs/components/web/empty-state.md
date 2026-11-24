# Empty State

Three ways to show an empty region, a boxed message, a compact message, and a small dimmed line. A [List](list.md), and every component built on it, shows its own empty text.

## Decision

| When | Use |
| :--- | :--- |
| A list with no rows yet | `shared.emptySection` |
| A list built with a List, a [Filtered List](filtered-list.md), or a table built on one | The List's `emptyText` |

## Usage

```html
<div class="stolon-empty-section">No servers yet. Add one below.</div>
<div class="stolon-empty">No records yet</div>
<div class="stolon-empty-inline">This folder is empty.</div>
```

```js
container.innerHTML = shared.emptySection('No source users available.');
container.innerHTML = shared.emptySection('No records yet', { inline: true });
```

Classes: `stolon-empty-section`, `stolon-empty`, `stolon-empty-inline`. A List's own empty text is `stolon-list-empty`.

## States and Modifiers

* `shared.emptySection(message, opts)` returns a `div` with the message escaped. It is `stolon-empty-section`, or the compact `stolon-empty` with `{ inline: true }`.
* `stolon-empty-section` is a bordered box with centered, faded text. Its border mixes `--stolon-fg`.
* `stolon-empty-inline` is a small dimmed line for a region that is not a List, and hides with the `hidden` attribute.

## Gotchas

* Only `emptySection` has a helper.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-empty-section` | Bordered box with centered muted text for an empty region |
| `stolon-empty-inline` | Small dimmed line that says a region holds nothing yet, for a region that is not a List |
| `stolon-empty` | Compact dimmed message for an empty list |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/empty-state.html" title="Empty State example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "empty-state.html"
```
