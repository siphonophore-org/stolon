# Tags

Removable chips that wrap. The [Chip Select](chip-select.md), the [Tag Input](tag-input.md), and the [Placeholder Hint](placeholder-hint.md) draw them.

## Decision

| When | Use |
| :--- | :--- |
| A set of short values, with or without a remove control | Tags |
| Tags the user types | [Tag Input](tag-input.md) |
| Tags the user picks from a list | [Chip Select](chip-select.md) |
| A status | [Badge](badge.md) |

## Usage

```html
<div class="stolon-tags">
    <span class="stolon-tag">Action<button type="button" class="stolon-tag-remove material-icons" aria-label="Remove Action">close</button></span>
    <span class="stolon-tag stolon-tag-pill">Drama<button type="button" class="stolon-tag-remove material-icons" aria-label="Remove Drama">close</button></span>
    <span class="stolon-tag stolon-tag-off">Discord (off)</span>
    <button type="button" class="stolon-tag stolon-tag-button">{title}</button>
</div>
```

Classes: `stolon-tags`, `stolon-tag`, `stolon-tag-remove`, `stolon-tag-pill`, `stolon-tag-off`, `stolon-tag-button`.

## States and Modifiers

* A tag is the small size of the [size scale](design-tokens.md). `medium` and `large` beside `stolon-tag` take the larger sizes.
* `stolon-tag-pill` goes with `stolon-tag`. It is a round chip filled with `--stolon-blue-fg`, with its remove button inset in a filled circle.
* `stolon-tag-off` goes with `stolon-tag`. It is half opacity and struck through, for something switched off.
* `stolon-tag-button` is a tag that is a button, as the [Placeholder Hint](placeholder-hint.md) uses.
* `stolon-tag-remove` turns red on hover. A `button` with it shows an accent focus ring on keyboard focus.

## Gotchas

* A `span` with `stolon-tag-remove` is not focusable. A chip that must be removable by keyboard uses `<button type="button" class="stolon-tag-remove" aria-label="Remove Name">`, as `createChipSelect` does.
* There is no JavaScript for this markup.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-tags` | Row of removable tag chips that wraps |
| `stolon-tag` | Single rounded tag chip with a remove control |
| `stolon-tag.stolon-medium` | A tag at the medium or large size of the scale |
| `stolon-tag-remove` | Small x control at the end of a tag, a square the size of the tag's icon that turns red on hover. A button gets the same look as a span |
| `stolon-tag.stolon-tag-off` | Faded, struck through tag for something switched off, such as a turned off destination |
| `stolon-tag.stolon-tag-pill` | Round tag filled with the blue token, with dark text and its x inset in a filled circle a little smaller than the tag |
| `stolon-tag.stolon-green` | A tag tinted with a status color, or a hex code through custom |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/tags.html" title="Tags example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tags.html"
```
