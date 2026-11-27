# Count Cards

A row of large counts over labels, in the status card's look, each count in its status color.

## Decision

| When | Use |
| :--- | :--- |
| A summary of counts at the top of a page or tab | Count Cards. |
| A state with a detail line, or a count that opens its page | [Status Card](status-card.md). |
| Cards for records | `stolon-card-list` and `stolon-card-item`, or the [Record Card](record-card.md). Never confuse them with Count Cards. |

## Usage

```html
<div class="stolon-cards stolon-compact" id="mainStatusRow">
    <div class="stolon-card stolon-green"><span class="stolon-card-count">0</span><span class="stolon-card-label">Synced</span></div>
    <div class="stolon-card stolon-purple"><span class="stolon-card-count">0</span><span class="stolon-card-label">Pending</span></div>
</div>
```

```js
shared.renderCards('statusRow', [
    { label: 'Queued', count: 12, color: 'orange' },
    { label: 'Synced', count: 340, color: 'green' }
]);
```

Classes: `stolon-cards`, `stolon-card`, `stolon-card-count`, `stolon-card-label`, and the `stolon-compact`, `stolon-words`, `stolon-even`, and `stolon-fit` modifiers on `stolon-cards`.

## States and Modifiers

* `shared.renderCards(containerId, cards)` takes an id or element, adds `stolon-cards` to it, and fills `[{ label, count, color }]`. Count and label are set as text. A null count shows nothing. A missing element is ignored.
* The color modifiers are `stolon-green`, `stolon-red`, `stolon-orange`, `stolon-purple`, `stolon-blue`, `stolon-gray`, `stolon-yellow`, `stolon-pink`, and `stolon-teal`. `renderCards` also takes a hex code such as `#e91e63`, drawn with the `stolon-custom` modifier.
* The cards wrap in [Balanced Rows](balanced-rows.md), so five cards that do not fit in one row become three and two, never four and one. A card with `hidden` takes no place.
* A card in balanced rows fits the column `balanceRows` gives it. At 600px and below the count takes a smaller size from the scale. When any count is still wider than its card, the row takes `stolon-fit` and every count in it takes the large text size, so they keep one size. Only a count too wide even then ends in an ellipsis.
* A label wraps at a word onto a second line, and ends in an ellipsis only after that. When a label holds a word wider than its card, the row takes `stolon-fit-labels` and every label takes the small text size, and a word still too wide breaks rather than clips.
* `even` gives every card in the row one width, on as many columns as fit. Use it when a page shows many cards, such as a dashboard of ten, where balanced rows of six and four would give two card widths. A last row of one is avoided by taking a column fewer. At 600px and below even cards fit three across a 375px phone, so six counts take two rows.
* `words` is for cards whose values are words, such as Running, rather than numbers. The value takes the large text size and wraps, so it reads whole.
* `compact` makes a tighter row of small cards, with a smaller gap, padding, and label, for many counts on a phone.
* `--stolon-balance-max` caps the cards in a row. `style="--stolon-balance-max: 4"` never shows more than four.
* Cards in page markup are balanced by `createConfigPage`, or by `bindBalancedRows(view)` on a page built another way.
* Put a `title` on a card for a tooltip.

## Gotchas

* `stolon-fit` and `stolon-fit-labels` are set by Stolon as the row lays out. A plugin never sets them or overrides the count's or the label's size or overflow.
* `renderCards` draws only a known color name or a hex code. Any other color leaves the count in the text color.
* There is no keyboard behavior.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-cards` | Row of count cards that wraps to fit |
| `stolon-card` | Count card in the status card's look: a large count over a quiet label on the surface color, with the count in its status color |
| `stolon-card-count` | Large bold count at the top of a card, in the card's status color, cut with an ellipsis when the card is too narrow for it |
| `stolon-card-label` | Quiet label under the count, which wraps at a word onto a second line and ends in an ellipsis after it |
| `stolon-card.stolon-green` | Status color modifiers for a card, each coloring its count and, on a filter card, its outline |
| `stolon-cards.stolon-compact` | A tighter row of small count cards, for many counts in little room, such as on a phone |
| `stolon-cards.stolon-balanced` | A card in balanced rows fits its column, which balanceRows sizes, whatever the card's own least width |
| `stolon-cards.stolon-words` | A row of cards whose values are words, such as Running, in a smaller size that wraps, so each word reads whole |
| `stolon-cards.stolon-fit` | A row with a count wider than its card, which fitCounts marks, gives every count the large text size, so they keep one size and read whole |
| `stolon-cards.stolon-fit-labels` | A row with a label word wider than its card, which fitCounts marks, gives every label the small text size, and a word still too wide breaks rather than clips |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/count-cards.html" title="Count Cards example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "count-cards.html"
```
