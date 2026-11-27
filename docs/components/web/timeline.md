# Timeline

A vertical list of events, each with a colored marker, a time, a title, and an optional body.

## Decision

| When | Use |
| :--- | :--- |
| A short feed of what happened and when | Timeline |
| Notes people left, each marked by its author's picture | Timeline, with `avatar` and `avatarLabel` on each item |
| A long history | [Paginated Table](paginated-table.md) |

## Usage

```js
import { createTimeline } from './configurationpage?name=myplugin_stolon.js';

container.appendChild(createTimeline({
    items: [{ time: '10:04', title: 'Library synced', body: '1,204 items.', status: 'green' }]
}).element);
```

Classes: `stolon-timeline`, `stolon-timeline-item`, `stolon-timeline-marker`. The handle is `{ element, getValue, setValue, setItems, setHeight, destroy }`.

Parts: `stolon-timeline-avatar`, `stolon-timeline-body`, `stolon-timeline-empty`, `stolon-timeline-text`, `stolon-timeline-time`, `stolon-timeline-title`, `stolon-timeline-wrap`.

## States and Modifiers

* An item is `{ time, datetime, title, body, pre, status, icon }`. `pre` is a block of mono text kept as written, such as a log or a stack trace, under the body, as `stolon-timeline-pre`. `status` is a status color name that colors the marker, and `icon` is a Material icon name, an icon for the status by default.
* `avatar` makes the marker the item's author, a round [Avatar](avatar.md) the marker's size, so the line between events still meets it. It takes a picture address, or a function that returns one, as the Avatar's `image` does. An avatar that is empty or fails to load shows the person icon, and `avatarLabel` is the person's name, for the picture's alt text and tooltip. The marker is `stolon-timeline-marker stolon-timeline-avatar`, and an avatar takes the place of the icon.
* A `datetime` makes the time a `time` element.
* A status also shows an icon in its marker and a hidden label, so the status never rests on color alone. `statusLabels` maps a status color name to the hidden label, such as `{ green: 'Done' }`.
* `emptyText` is a sentence shown while there are no events. It is the List's empty sentence, `stolon-list-empty outside stolon-timeline-empty`, after the events, and nothing shows without it.
* The events are a [List](list.md), so `height`, `maxHeight`, `minHeight`, and `setHeight` work as they do there. `height` is `'auto'` by default, so the timeline grows with its events.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createTimeline`

<code>function createTimeline(options?: TimelineOptions): TimelineHandle</code>

A vertical list of events, each with a colored marker, a time, a title, and an optional body. A status also shows an icon in its marker and a hidden label, so the status never rests on color alone.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>TimelineItem[]</code> | array of { time, datetime, title, body, pre, status, icon, avatar, avatarLabel } where pre is mono text kept as written, under the body, status is a status color name such as 'green', icon is a Material icon name (default an icon for the status), avatar is a picture address, or a function returning one, drawn as a round marker in place of the icon, with the person icon while it is empty or fails to load, and avatarLabel is the person's name, for the picture's alt text and tooltip [optional] |
| `emptyText` | <code>string</code> | sentence shown while there are no events [optional] |
| `statusLabels` | <code>Record&lt;string, string&gt;</code> | map of status color name to the hidden label a screen reader reads, such as { green: 'Done' } (default a word for each color) [optional] |
| `height` | <code>ListHeight</code> | the list's height, 'auto', 'fill', a number of pixels, or a CSS length (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the list grows to before it scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling list takes (default 160px) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): TimelineItem[]</code> |
| `setValue` | <code>(next: TimelineItem[]): void</code> |
| `setItems` | <code>(next: TimelineItem[]): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `TimelineItem` | One event on a timeline. status is a status color name, icon a Material icon name, pre a block of mono text kept as written, such as a log or a stack trace, and avatar a user's picture as the marker. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-timeline` | Vertical list of events joined by a line, each with a colored marker |
| `stolon-timeline-marker` | Round marker in the status color, with an optional icon in it |
| `stolon-timeline-item` | A marker that is a user's round picture, or the person icon on the avatar's gray circle, the marker's size so the line still meets it |
| `stolon-timeline-pre` | A block of mono text kept as written under an event's body, such as a log or a stack trace, which scrolls sideways inside itself |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/timeline.html" title="Timeline example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "timeline.html"
```
