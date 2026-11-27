# Balanced Rows

Groups of equal tiles wrap in rows of even size, so a wrapped row never holds a single tile. Four tiles that do not fit in one row become two rows of two, five become three and two, and seven become three, two, and two.

## Decision

| When | Use |
| :--- | :--- |
| Stolon's own groups, such as count cards, choice cards, the check grid, and a [List](list.md) in its grid layout | Nothing. Stolon balances them, and a page built with `createConfigPage` also balances every such group on it. |
| A group of tiles a plugin builds itself, such as a row of plain cards | `balanceRows`. |
| Text chips that size to their words, such as tags, pills, and breadcrumbs | No `balanceRows`. They wrap like text. |

## Usage

```js
import * as base from './configurationpage?name=myplugin_stolon.js';

var balance = base.balanceRows(container, { minWidth: 160, maxColumns: 4 });
// later, on viewhide
balance.destroy();
```

`bindBalancedRows(view)` balances every count card group, choice group, and check grid under a page, and the ones added later. Both return `{ update, destroy }`.

## States and Modifiers

* `minWidth` is the least a tile takes, 160 by default, and sets how many tiles fit in a row. `maxColumns` caps a row.
* A group's CSS may set `--stolon-balance-min` and `--stolon-balance-max` instead, which win over the options, such as `style="--stolon-balance-max: 4"` in page markup.
* The rows stay within one tile of each other. When a row would hold one tile, the group uses fewer, fuller rows instead.
* Below two columns, as on a phone, each tile takes its own row.
* `even`, or `stolon-even` on the group, gives every tile one width. The group takes as many columns as fit, one fewer while the last row would hold a single tile, and a short last row lines up with the columns above it. Use it when tiles of two widths would read as two kinds, such as a dashboard of count cards.
* It lays out again when the group resizes or its tiles change. `update()` lays it out on demand. `onLayout(container)` runs after each layout, as count cards use it to fit their counts.

## Gotchas

* The group becomes a grid with the `stolon-balanced` class, so a group's own `display` and column rules give way to it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `bindBalancedRows`

<code>function bindBalancedRows(root: ParentNode): BalanceHandle</code>

Balances every group of tiles under a root, such as count cards, status cards, choice cards, and a check grid, so a wrapped row never holds a single tile. It also balances groups added later. createConfigPage runs it on every page.

| Class | What it looks like |
| :--- | :--- |
| `stolon-balanced` | Tiles in rows of even size, so no row holds a single tile, laid out by balanceRows |
| `stolon-balanced.stolon-even` | Tiles that all share one width on a fixed column count, so a short last row lines up with the rows above it |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/balanced-rows.html" title="Balanced Rows example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "balanced-rows.html"
```
