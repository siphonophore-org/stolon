# Count Cards

A row of large counts over labels, tinted by status.

## Decision

| When | Use |
| :--- | :--- |
| A summary of counts at the top of a page or tab | Count Cards. |
| Counts that each need a trend | [Stat Card](stat-card.md). |
| Cards for records | `stolon-card-list` and `stolon-card-item`, or the [Record Card](record-card.md). Never confuse them with Count Cards. |

## Usage

```html
<div class="stolon-cards compact" id="mainStatusRow">
    <div class="stolon-card green"><span class="stolon-card-count">0</span><span class="stolon-card-label">Synced</span></div>
    <div class="stolon-card purple"><span class="stolon-card-count">0</span><span class="stolon-card-label">Pending</span></div>
</div>
```

```js
shared.renderCards('statusRow', [
    { label: 'Queued', count: 12, color: 'orange' },
    { label: 'Synced', count: 340, color: 'green' }
]);
```

Classes: `stolon-cards`, `stolon-card`, `stolon-card-count`, `stolon-card-label`.

## States and Modifiers

* `shared.renderCards(containerId, cards)` takes an id or element, adds `stolon-cards` to it, and fills `[{ label, count, color }]`. Count and label are set as text. A null count shows nothing. A missing element is ignored.
* The color modifiers are `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, and `teal`. `renderCards` also takes a hex code such as `#e91e63`, drawn with the `custom` modifier.
* The cards wrap in [Balanced Rows](balanced-rows.md), so five cards that do not fit in one row become three and two, never four and one. A card with `hidden` takes no place.
* `compact` makes a tighter row of small cards, with a smaller gap, padding, and label, for many counts on a phone.
* `--stolon-balance-max` caps the cards in a row. `style="--stolon-balance-max: 4"` never shows more than four.
* Cards in page markup are balanced by `createConfigPage`, or by `bindBalancedRows(view)` on a page built another way.
* Put a `title` on a card for a tooltip.

## Gotchas

* `renderCards` draws only a known color name or a hex code. Any other color leaves the card untinted.
* There is no keyboard behavior.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-cards` | Row of count cards that wraps to fit |
| `stolon-card` | Rounded card showing a large count over a label, tinted by status |
| `stolon-card-count` | Large bold count at the top of a card |
| `stolon-card-label` | Small label under the count |
| `stolon-card.green` | Status color modifiers for a card, each tinting the fill, text, and border |
| `stolon-cards.compact` | A tighter row of small count cards, for many counts in little room, such as on a phone |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/count-cards.html" title="Count Cards example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "count-cards.html"
```
