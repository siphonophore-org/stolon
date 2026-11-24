# Design Tokens

All tokens are CSS custom properties on `:root`, defined in `src/css/design-tokens.css`. They are global, so body level surfaces such as dialogs resolve them. A component never writes a hex value for something a token covers.

## Theme Tokens

These follow the live Jellyfin web client theme and fall back to the dark theme value when the theme variable is missing.

| Token | Use |
| :--- | :--- |
| `--stolon-accent` | The theme accent, from `--jf-palette-primary-main`. Focus rings, selected states, primary buttons, links in dialogs, and progress |
| `--stolon-accent-hover` | The accent a little darker, for hover on accent buttons |
| `--stolon-border` | The standard 1px line color, a share of the text color. Field, card, and divider borders |
| `--stolon-surface` | The raised surface behind inputs, cards, rows, and dropdowns, from `--jf-palette-background-paper` |
| `--stolon-page-bg` | The page behind a [User Page](user-page.md), from `--jf-palette-background-default` |
| `--stolon-fg` | The theme text color. A wash on an element that fades its own text |
| `--stolon-on-accent` | Text on an accent or status fill. It is fixed white, since the fill never follows the theme text color |
| `--stolon-on-warning` | Text on a light status fill such as green, orange, yellow, gray, and blue, where white is too faint. It is a fixed dark gray |
| `--stolon-accent-wash` | A faint accent fill for a selected row, at 12 percent |
| `--stolon-accent-wash-strong` | A stronger accent fill for a pressed toggle or a hovered tag button, at 22 percent |
| `--stolon-wash-faint` | The text color at 4 percent, for a resting surface such as a card |
| `--stolon-wash` | The text color at 8 percent, for a hover, a quiet button, or a thumbnail backdrop |
| `--stolon-wash-strong` | The text color at 12 percent, for a pressed or selected item, a track, or a border on a `--stolon-wash` fill |
| `--stolon-wash-heavy` | The text color at 18 percent, for a pressed item on a wash |
| `--stolon-line` | A divider between rows or under a heading, the text color at 10 percent |
| `--stolon-text-muted` | Text at 65 percent, for a secondary heading |
| `--stolon-text-faint` | Text at 50 percent, for a hint or an empty state |
| `--stolon-scrim` | The overlay behind a dialog, black at 70 percent |

A token that uses `color-mix()` starts on a plain color and upgrades where the engine supports it.

## Palette

Nine fixed colors, the same in light and dark themes. Every other color token is built from one of them.

| Token | Color |
| :--- | :--- |
| `--stolon-red` | `#e5534b` |
| `--stolon-orange` | `#f0883e` |
| `--stolon-yellow` | `#d4a72c` |
| `--stolon-green` | `#3fb950` |
| `--stolon-teal` | `#2ab3a6` |
| `--stolon-blue` | `#00a4dc` |
| `--stolon-purple` | `#aa5cc3` |
| `--stolon-pink` | `#e0609e` |
| `--stolon-gray` | `#9198a1` |

## Status Colors

Each status color is a palette color.

| Token | Use |
| :--- | :--- |
| `--stolon-success` | Success text, healthy dots, saved state |
| `--stolon-error` | Errors, destructive actions, invalid state |
| `--stolon-error-hover` | Hover on a destructive button |
| `--stolon-warning` | Caution, unsaved changes, a checking dot, a dirty row button |
| `--stolon-green-bg`, `--stolon-green-fg` | A green badge or card |
| `--stolon-red-bg`, `--stolon-red-fg` | A red badge or card |
| `--stolon-orange-bg`, `--stolon-orange-fg` | An orange badge or card |
| `--stolon-purple-bg`, `--stolon-purple-fg` | A purple badge or card |
| `--stolon-blue-bg`, `--stolon-blue-fg` | A blue badge or card |
| `--stolon-gray-bg`, `--stolon-gray-fg` | A gray badge or card |
| `--stolon-yellow-bg`, `--stolon-yellow-fg` | An extra tint for a badge or card |
| `--stolon-pink-bg`, `--stolon-pink-fg` | An extra tint for a badge or card |
| `--stolon-teal-bg`, `--stolon-teal-fg` | An extra tint for a badge or card |

The `-fg` token is the solid color and the `-bg` token is a 20 percent tint. Each color also has `-soft`, a 12 percent tint for a callout or a row, and `-edge`, a 40 percent tint for the border of that tint. The `stolon-custom` class makes the same pair, `--stolon-custom-bg` and `--stolon-custom-fg`, from a hex code in `--stolon-custom`, which `applyColor` sets. Yellow, pink, and teal are extra tints for badges, cards, avatars, and timeline markers. They carry no status meaning.

## Discord Colors

Discord's dark theme, for the [Notify Preview](notify-preview.md)'s Discord post only, so it looks as Discord shows it in any Jellyfin theme. No other component reads them.

| Token | Use |
| :--- | :--- |
| `--stolon-discord-bg` | The message background |
| `--stolon-discord-embed` | An embed's background |
| `--stolon-discord-edge` | An embed's bar with no color, and a code border |
| `--stolon-discord-text` | The text |
| `--stolon-discord-strong` | Names, titles, and field names |
| `--stolon-discord-muted` | The time |
| `--stolon-discord-link` | A link and a linked title |
| `--stolon-discord-brand` | The avatar with no picture and the app tag |

## Status Color Meanings

A color means the same thing in every component and every plugin. Use "orange" for the warning color in class names, never "amber" or "warning". The callout class `stolon-callout-warn` and the status modifier `stolon-warn` are the one exception, since they name a notice and not a color.

| Color | Means | Callout | Badge states |
| :--- | :--- | :--- | :--- |
| Green | Done, healthy, on | `stolon-callout-success` | Active, Synced, Downloaded, Completed, Enabled |
| Red | Failed, blocked, destructive | `stolon-callout-error` | Disabled, Errored, Error, Deleting, Pending-Deletion, Failed |
| Orange | Waiting, caution | `stolon-callout-warn` | Expired, Queued, Paused |
| Purple | Working, held | None | Locked, Running, Downloading, Pending, Pending-Download |
| Blue | Information, role | `stolon-callout-info` | Admin, Imported, Pending-Replacement |
| Gray | Inactive, muted | `stolon-callout-neutral` | Ignored, Group, Skipped, Unknown |

Never use color alone. A badge always has a word, and a dot always has a `title`. See [Badge](badge.md) and [Status Dot](status-dot.md).

## Spacing and Typography

* There are two spacings. `--stolon-gap-wide` (24px) sits between components, such as one field row and the next, and under a title. `--stolon-gap-narrow` (12px) sits inside a component, such as a label and its field, a field and its hint, and the items or buttons in a group. Every gap and margin in the kit is one of them.
* The size scale is `--stolon-size-small`, `--stolon-size-medium`, and `--stolon-size-large` (24, 32, and 40px tall), with the matching `--stolon-font-*`, `--stolon-pad-*`, `--stolon-icon-*`, and `--stolon-line-*` line heights. Fields read it through `--stolon-field-height`, `--stolon-field-font`, and `--stolon-field-pad`, which default to medium.
* A config page uses the whole width of the screen. Stolon lifts the 54em cap Jellyfin puts on a form, so tables, card grids, and the tool shell reach the end of the page. A field fills its section, so fields, section headings, and Save line up at one width, and a field in a row of fields shares the row.
* `--stolon-chevron-primary` (24px) and `--stolon-chevron-secondary` (18px) are the two chevron sizes.
* `--stolon-mono` is a mono stack for paths, ids, addresses, and code. The `stolon-mono` class applies it. See [Utility Classes](utility-classes.md).
* `--stolon-sans` is the web client's font stack, for a [User Page](user-page.md) only, since every other page inherits Jellyfin's font.
* `--stolon-radius-small`, `--stolon-radius-medium`, `--stolon-radius-large`, and `--stolon-radius-round` (4, 6, 8, and 999px) are the corner radii.
* `--stolon-shadow-float` and `--stolon-shadow-dialog` are the two shadows, and `--stolon-layer-float` (1000) and `--stolon-layer-dialog` (10000) are the two stacking layers.
* There are no other typography or spacing tokens. Text inherits the page font.

## Color Helpers

Every colored component takes a `color` option that is a status color name or a hex code. The bundle exports the helpers those components use, for a plugin's own colored markup.

```js
import { applyColor, colorClass, colorStyle } from './configurationpage?name=myplugin_stolon.js';

applyColor(el, '#e91e63');
var html = '<span class="stolon-badge ' + colorClass(color, 'stolon-gray') + '"' + colorStyle(color) + '>Ready</span>';
```

* `COLOR_NAMES` lists the nine status color names.
* `applyColor(el, color, fallback)` swaps in the class for a color. For a hex code it adds `stolon-custom` and sets `--stolon-custom` and `--stolon-custom-on`.
* `colorClass(color, fallback)` returns that class, and `colorStyle(color)` returns the matching `style` attribute for markup built as text.
* `isHexColor(color)` says whether a value is a hex code, and `textOn(hex)` returns black or white text for a fill.
* `parseColor(text)` reads a hex code or `rgb()` text, `toHexColor(rgba, alpha)` writes one back, and `resolveColor(color, scope)` also reads a status color name through its token.
* `mixColors(parts, scope)` mixes `{ color, weight }` parts as paint does, so red and yellow make orange.

## Light and Dark

The kit has no theme switch of its own. Accent, surface, and text follow the web client's palette variables, and lines and washes are shares of the text color. The palette and the dialog backdrop are fixed colors, and every tint is mixed from the palette. The standalone [Status Page](status-page.md) is always dark. The toggle in the corner of the example below switches the preview between light and dark.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-custom` | A custom color from a hex code, which applyColor sets as --stolon-custom with --stolon-custom-on for text on its fill |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/design-tokens.html" title="Design Tokens example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "design-tokens.html"
```
