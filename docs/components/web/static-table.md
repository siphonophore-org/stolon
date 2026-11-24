# Static Table

A plain bordered table for a few fixed rows, such as a list of settings or a summary.

## Decision

| When | Use |
| :--- | :--- |
| A short table with no paging, search, or selection | Static Table |
| Rows that sort or filter | [Data Table](data-table.md) |
| A list read from a paged endpoint | [Paginated Table](paginated-table.md) |

## Usage

```html
<div class="stolon-static-table-scroll">
    <table class="stolon-static-table">
        <thead><tr><th>Name</th><th class="stolon-static-table-num">Size</th></tr></thead>
        <tbody><tr><td>Poster</td><td class="stolon-static-table-num">1,204</td></tr></tbody>
    </table>
</div>
```

Classes: `stolon-static-table`, `stolon-static-table-num`, `stolon-static-table-scroll`.

## States and Modifiers

* `stolon-static-table-num` goes on a `th` or `td` and right aligns digits of equal width.
* The scroll wrapper scrolls sideways when the table is wider than the container, so the page never does. At 375px a wide table scrolls inside it.
* A header cell does not wrap.

## Gotchas

* Give the table a `caption` or a heading above it when the data needs a name.
* There is no JavaScript.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-static-table-scroll` | Wrapper that scrolls a static table sideways when it is wider than its container |
| `stolon-static-table` | Plain bordered table with a tinted header row and a rule between rows |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/static-table.html" title="Static Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "static-table.html"
```
