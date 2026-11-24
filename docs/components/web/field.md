# Field and Field Row

A compact label over control field, and a row that places several side by side.

## Decision

| When | Use |
| :--- | :--- |
| Dense lines of several fields, such as host and port | Field and Field Row |
| One field per row | The plain field containers on [Form Fields](form-fields.md) |

## Usage

```html
<div class="stolon-field-row">
    <div class="stolon-field">
        <label for="txtHost">Host</label>
        <input is="emby-input" type="text" id="txtHost" />
    </div>
    <div class="stolon-field stolon-field-fixed">
        <label for="txtPort">Port</label>
        <input is="emby-input" type="number" id="txtPort" />
    </div>
</div>
```

Classes: `stolon-field`, `stolon-field-fixed`, `stolon-field-row`.

## States and Modifiers

* `stolon-field-fixed` keeps the natural width instead of growing.
* Fields wrap onto the next line once narrower than 10em, so a row stacks at 375px.
* A text box in a field takes a select's height, so mixed rows line up.
* `stolon-edit-line` lays out a line of fields. See [Bulk Edit Bar and Edit Row](bulk-edit.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-field` | A compact label and control field for dense, multiple-per-line layouts |
| `stolon-field-fixed` | A field that keeps its natural width instead of growing to fill the row |
| `stolon-field-row` | A row that places fields side by side and wraps on narrow widths |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/field.html" title="Field and Field Row example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field.html"
```
