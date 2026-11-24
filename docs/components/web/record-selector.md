# Record Selector

A stacked dropdown with an action row under it, for picking one record and acting on it. The [User Selector](user-selector.md) is built on it.

## Decision

| When | Use |
| :--- | :--- |
| Picking one record from a short list, with New and Remove beside it | Record Selector |
| Records whose order matters, or that each open an editor | [Sortable Card List](sortable-card-list.md) |

## Usage

```html
<div class="stolon-selector">
    <select class="stolon-selector-dropdown"><option>Primary</option><option>Backup</option></select>
    <div class="stolon-selector-actions">
        <button class="stolon-button"><span class="material-icons">add</span><span>New</span></button>
        <button class="stolon-button"><span class="material-icons">delete</span><span>Remove</span></button>
    </div>
</div>
```

Classes: `stolon-selector`, `stolon-selector-dropdown`, `stolon-selector-actions`.

## States and Modifiers

* The action row is optional, and its buttons do not grow.
* The dropdown takes its fill, border, and chevron from [Form Fields](form-fields.md).
* A record selector takes one wide gap below it on a config page and in a dialog, as the field containers do.

## Gotchas

* There is no JavaScript for this markup.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-selector` | Stacked dropdown and action row for picking a record |
| `stolon-selector-dropdown` | Full width dropdown for the picker, styled by the shared field rules in form.css |
| `stolon-selector-actions` | Wrapping row of action buttons under the dropdown |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/record-selector.html" title="Record Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-selector.html"
```
