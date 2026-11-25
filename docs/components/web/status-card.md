# Status Card

A bordered card on the surface color with an icon, a status pill, a bold title, and one quiet line of detail. It can show a large value for a metric, and an `href` or `onClick` makes the whole card a link or a button. `createStatusCardGrid` lays the cards out in balanced rows.

## Decision

| When | Use |
| :--- | :--- |
| The state of each part of a plugin, such as one card per tool on a dashboard | `createStatusCardGrid` |
| A headline number with a label, such as a count of items | `value` and `valueLabel` |
| A trend over time under the number | `sparkline` |
| The state of each of several things, such as each server's health | `dots` |
| How a total splits into parts, such as rows by state | `segments` |
| A few counts side by side, such as each state of a queue | `bars` |
| A card that opens the page it describes | `href`, or `onClick` for an in-page action |
| A plain row of colored counts | [Count Cards](count-cards.md) |
| A state on a row of a list or table | [Badge](badge.md) |

## Usage

```js
import { createStatusCardGrid } from './configurationpage?name=myplugin_stolon.js';

var grid = createStatusCardGrid({ cards: [
    { icon: 'vpn_lock', title: 'VPN', status: 'Check', statusColor: 'orange', detail: '3 of 7 peers online', href: '#vpn' },
    { icon: 'storage', title: 'Storage', status: 'Ok', statusColor: 'green', detail: 'Media at 82%', href: '#storage' }
] });
view.querySelector('#overview').appendChild(grid.element);

var vpn = grid.getCards()[0];
vpn.setStatus('Ok', 'green');
vpn.setDetail('7 of 7 peers online');
```

Classes: `stolon-status-cards` for the grid and `stolon-status-card` for a card, with the parts `stolon-status-card-head`, `stolon-status-card-icon`, `stolon-status-card-pill`, `stolon-status-card-title`, `stolon-status-card-value`, `stolon-status-card-detail`, `stolon-status-card-sparkline`, `stolon-status-card-dots`, `stolon-status-card-meter`, `stolon-status-card-bar`, `stolon-status-card-bar-part`, `stolon-status-card-columns`, and `stolon-status-card-column`. A card that links or acts carries `stolon-clickable`. The card handle is `{ element, getValue, setValue, setStatus, setDetail, setSparkline, setDots, setSegments, setBars, destroy }`, and the grid handle is `{ element, getCards, setCards, add, destroy }`.

## States and Modifiers

* `status` is the pill text, such as "Ok", "Check", "Off", or "Failed". The pill is a small [Badge](badge.md) and never wraps or shrinks.
* `statusColor` is a status color name, a hex code, or a badge state name. With no color, a status that is a badge state, such as "Failed" or "Running", takes that state's color, and any other status is gray.
* `detail` is one dimmed line. A line too long for the card ends in an ellipsis, with the full text as its tooltip. The title does the same.
* `value` is drawn large in even width digits, with `valueLabel` small after it. Each part hides while it is empty.
* `sparkline` is a list of numbers drawn as a [Sparkline](sparkline.md) under the value, named by the title, in the accent or `sparklineColor`.
* `dots` is a list of `{ color, label }` drawn as a row of [Status Dots](status-dot.md) in the sparkline's place, each named by its label. `segments` is a list of `{ label, value, color }` drawn as a bar in the same place, each part as wide as its share of the total. A bar whose values add to 0 is an empty track. `bars` takes the same list as a small column chart, each column as tall as its share of the largest, and a column of 0 is a faint stub. A card shows one of the four, and the slot is one height whichever it is, so the cards in a row line up.
* `href` makes the card a link and `onClick` makes it a button. Either one gives the card the shared card hover and the accent focus ring.
* `setValue(value, label)`, `setStatus(label, color)`, `setDetail(text)`, `setSparkline(values)`, `setDots(dots)`, `setSegments(segments)`, and `setBars(bars)` change a card in place.
* The grid keeps a card at least `minWidth` wide, 200 by default, and balances the rows so a wrapped row never holds one card alone. The cards in a row share one height.

## Gotchas

* A linked card is named by all of its text, so keep the title and detail short. The icon is hidden from assistive tech.
* `setCards` replaces every card and returns the new handles. A handle from before it no longer drives a card on the page.
* The page's `bindBalancedRows` also balances a `stolon-status-cards` group built in markup.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createStatusCard`

<code>function createStatusCard(options?: StatusCardOptions): StatusCardHandle</code>

A bordered card on the surface color with an icon, a status pill, a bold title, and one quiet line of detail. An optional large value shows a metric, and an href or onClick makes the whole card a link or a button.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `icon` | <code>string</code> | Material icon name at the top left [optional] |
| `title` | <code>string</code> | bold name under the icon, cut with an ellipsis [optional] |
| `status` | <code>string</code> | short pill text at the top right, such as 'Ok' or 'Failed', which never wraps [optional] |
| `statusColor` | <code>string</code> | status color name, hex code, or badge state name of the pill (default the color of a badge state named by status, else gray) |
| `detail` | <code>string</code> | one dimmed line under the title, such as '3 of 7 peers online', cut with an ellipsis and titled with its full text [optional] |
| `value` | <code>unknown</code> | number or short text shown large under the title, such as 1204 [optional] |
| `valueLabel` | <code>string</code> | small text after the value, such as 'items' [optional] |
| `sparkline` | <code>Array&lt;number &#124; null &#124; undefined&gt; &#124; null</code> | numbers drawn as a small line under the value, through createSparkline, named by the title [optional] |
| `sparklineColor` | <code>string</code> | status color name or hex code of the line (default the accent) |
| `dots` | <code>StatusCardDot[] &#124; null</code> | array of { color, label }, a row of status dots in the sparkline's place, such as one per server, each named by its label [optional] |
| `segments` | <code>StatusCardSegment[] &#124; null</code> | array of { label, value, color }, a bar in the sparkline's place split into parts by value, such as rows by state. A bar whose values add to 0 is an empty track [optional] |
| `bars` | <code>StatusCardSegment[] &#124; null</code> | array of { label, value, color }, a small column chart in the sparkline's place, one column per entry as tall as its share of the largest. A column of 0 is a faint stub [optional] |
| `href` | <code>string</code> | address the card links to, which makes the card a link [optional] |
| `onClick` | <code>(event: MouseEvent): void</code> | function(event) called on a click, which makes the card a button when there is no href [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): unknown</code> |
| `setValue` | <code>(value: unknown, label?: string): void</code> |
| `setStatus` | <code>(label: string, color?: string): void</code> |
| `setDetail` | <code>(text: string): void</code> |
| `setSparkline` | <code>(values: Array&lt;number &#124; null &#124; undefined&gt; &#124; null): void</code> |
| `setDots` | <code>(dots: StatusCardDot[] &#124; null): void</code> |
| `setSegments` | <code>(segments: StatusCardSegment[] &#124; null): void</code> |
| `setBars` | <code>(bars: StatusCardSegment[] &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

### `createStatusCardGrid`

<code>function createStatusCardGrid(options?: StatusCardGridOptions): StatusCardGridHandle</code>

A grid of status cards in balanced rows, so a wrapped row never holds a single card. Every card in a row is the same height.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `cards` | <code>StatusCardOptions[]</code> | array of status card options, one card each [optional] |
| `minWidth` | <code>number</code> | least width of a card in pixels before the row wraps (default 200) |
| `maxColumns` | <code>number</code> | most cards in a row [optional] |

| Handle member | Type |
| :--- | :--- |
| `getCards` | <code>(): StatusCardHandle[]</code> |
| `setCards` | <code>(next: StatusCardOptions[]): StatusCardHandle[]</code> |
| `add` | <code>(card: StatusCardOptions): StatusCardHandle</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `StatusCardDot` | One dot in a status card's row of dots, such as one server and its health. |
| `StatusCardSegment` | One part of a status card's bar, such as the rows in one state. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-status-cards` | Grid of status cards a wide space apart, laid out in balanced rows by createStatusCardGrid |
| `stolon-status-card` | Rounded bordered card on the surface color with an icon and a status pill over a bold title and one quiet detail line. As a link or a button it takes the shared card hover and focus ring |
| `stolon-status-card-head` | Top row of a status card, the icon at the start and the pill at the end |
| `stolon-status-card-icon` | Material icon of a status card, one small control tall, in the muted text color |
| `stolon-status-card-pill` | Status pill at the top right of a status card, a badge that never wraps or shrinks |
| `stolon-status-card-title` | Bold title of a status card, cut with an ellipsis and titled with its full text |
| `stolon-status-card-value` | Large value of a status card, such as a count, in even width digits with a small label after it |
| `stolon-status-card-sparkline` | Sparkline under a status card's value, a narrow space below it |
| `stolon-status-card-dots` | Row of status dots under a status card's value in the sparkline's place, a sparkline tall, such as one dot per server |
| `stolon-status-card-meter` | Bar under a status card's value in the sparkline's place, a sparkline tall, split into parts by value, such as rows by state |
| `stolon-status-card-columns` | Small column chart under a status card's value in the sparkline's place, a sparkline tall, one column per entry as tall as its share of the largest |
| `stolon-status-card-detail` | Quiet detail line of a status card, dimmed, cut with an ellipsis, and titled with its full text |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/status-card.html" title="Status Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-card.html"
```
