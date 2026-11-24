# Media Card

`createMediaCard` draws one media item with its artwork, a title, a second line, badges, a status badge with its `detail`, `error`, and `size` lines, a meta line, and action buttons. It is a list row with the artwork at the start, or a grid tile with the artwork on top.

The action buttons, such as a remove X, are pinned to the card's top right corner, inset by its padding, and the text leaves room for them. A row card narrower than its wide layout turns `compact` from its own width: a smaller artwork slot centered on the row, the title on up to two lines, one second line that ends in an ellipsis, one chip row of the badges and the status with its detail, and an error line only when there is one. A dot between parts of a line is drawn before the part that follows, so a part that wraps never leaves one behind.

## Decision

| When | Use |
| :--- | :--- |
| Any list or grid of library items, such as a sync queue, a history, or picked titles | Media Card |
| Giving each item the artwork shape Jellyfin uses for it | `mediaShape(itemType)` |
| Label and value rows with no artwork | [Record Card](record-card.md) |
| Searching the library and picking items | [Media Picker](media-picker.md) |

## Usage

```js
import { createList, createMediaCard, mediaShape } from './configurationpage?name=myplugin_stolon.js';

var card = createMediaCard({
    shape: mediaShape(row.ItemType),
    itemId: row.ItemId,
    title: row.Title,
    titleSuffix: row.EpisodeName,
    user: { name: row.UserName, imageUrl: ApiClient.getUserImageUrl(row.UserId, { type: 'Primary', height: 32 }) },
    subtitle: 'watch history to source-b',
    badges: [{ label: 'History', color: 'blue' }],
    status: { label: 'Pending', color: 'orange' },
    meta: 'waiting for delivery',
    actions: [{ label: 'Discard', icon: 'close', value: 'discard' }],
    onAction: function (value) { discard(row.Id); }
});
container.appendChild(card.element);
```

Put many cards in a [List](list.md). `layout: 'rows'` draws bordered rows with dividers, and `layout: 'grid'` with cards made with `layout: 'card'` draws tiles.

```js
var queue = createList({
    items: rows,
    layout: 'rows',
    render: function (row) { return createMediaCard({ title: row.Title, subtitle: row.State }); }
});
var posters = createList({
    items: rows,
    layout: 'grid',
    render: function (row) { return createMediaCard({ layout: 'card', itemId: row.ItemId, title: row.Title }); }
});
```

An image that comes from another request arrives through the handle.

```js
fetchPoster(row).then(function (url) { card.setValue({ imageUrl: url }); });
```

Classes: `stolon-media-card`. The handle is `{ element, getValue, setValue, destroy }`.

Parts: `stolon-media-card-slot`, `stolon-media-card-thumb`, `stolon-media-card-placeholder`, `stolon-media-card-image`, `stolon-media-card-info`, `stolon-media-card-title`, `stolon-media-card-name`, `stolon-media-card-suffix`, `stolon-media-card-sub`, `stolon-media-card-episode`, `stolon-media-card-user`, `stolon-media-card-user-name`, `stolon-media-card-subtitle`, `stolon-media-card-badges`, `stolon-media-card-chips`, `stolon-media-card-side`, `stolon-media-card-side-line`, `stolon-media-card-size`, `stolon-media-card-status`, `stolon-media-card-detail`, `stolon-media-card-error`, `stolon-media-card-meta`, `stolon-media-card-actions`, `stolon-media-card-action`.

## States and Modifiers

* `layout` is `'row'` (default), drawn as `stolon-media-card-row`, or `'card'`, drawn as `stolon-media-card-tile`.
* `shape` is `'portrait'` (default), `'wide'`, `'square'`, or `'round'`, set as a modifier on `stolon-media-card-thumb`. `mediaShape` returns `'wide'` for Episode, Video, TvChannel, Program, and MusicVideo, `'round'` for Person and User, `'square'` for MusicAlbum, Audio, and Playlist, and `'portrait'` for the rest.
* The placeholder icon is `movie`, `tv`, `album`, or `person` by shape, and `icon` replaces it. It shows until the image loads, and stays when there is no image or the image fails.
* `image` wins over `imageUrl`, and `imageUrl` wins over `itemId`. `image` is an address, or a function that returns an address, a Blob, or a promise of one, with the placeholder shown until it arrives. `itemId` builds the address through `ApiClient.getImageUrl` with `imageType` (default `'Primary'`) and `imageMaxHeight` (default 128 for a row and 400 for a card). Images load lazily.
* `badges` and `status` are each a [Badge](badge.md), `stolon-badge`, and the status also carries `stolon-media-card-status`. Their `color` is `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, `teal`, a hex code, or a `BADGE_STATES` state name such as `'Errored'`, and any other color draws gray.
* `metaIsError: true` adds `error` to `stolon-media-card-meta`.
* `href` or `onClick` adds `clickable`, makes the card focusable with the `link` or `button` role named by its title, and opens it on click, Enter, and Space. A click on an action button does not open the card. An action with `disabled: true` is greyed out in its place, so cards in a list keep their actions and badges in line.
* `setValue` merges the options it gets and draws the card again.
* Inside a `rows` list a row drops its own border and corners, so the list draws the frame. Inside a `grid` list a tile is as tall as the tallest in its row.
* A row holds its artwork in one slot, as wide as a wide thumbnail and as tall as a portrait one, centered on the row, so every title in a list starts at the same place and every thumbnail shares one center line. Portrait, square, and round share one width from the size scale, a portrait is that width at 2:3, and a wide one fills the slot at 16:9.
* The status column of a row puts the size, dimmed, and then the status badge on its first line, with the detail, the error, and the meta line under it.
* A row narrower than 520 pixels, measured by its own width, turns `stolon-compact`: a smaller slot and one text column of the title on up to two lines, one second line of the episode, the user, and the subtitle with a dot before each part after the first, one chip row of the badges, the status, its detail, and the size, and the error on its own line.
* An image stays invisible until it loads and hides when it fails, so the browser's broken image mark never shows over the placeholder.
* In a [Filtered List](filtered-list.md) with selection, the checkbox sits at the row's padding, centered on the row, with the narrow gap before the slot.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `mediaShape`

<code>function mediaShape(itemType: string &#124; null &#124; undefined): MediaShape</code>

Picks the artwork shape Jellyfin uses for an item type.

### `createMediaCard`

<code>function createMediaCard(options?: MediaCardOptions): MediaCardHandle</code>

One media item with its artwork, as a list row with the artwork at the start or as a grid tile with the artwork on top. The artwork shows an icon until the image loads, and keeps it when there is no image or the image fails.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `layout` | <code>'row' &#124; 'card'</code> | 'row' for a list row or 'card' for a grid tile (default 'row') |
| `shape` | <code>MediaShape</code> | 'portrait', 'wide', 'square', or 'round' artwork (default 'portrait'). mediaShape(itemType) picks one |
| `image` | <code>ThumbSource</code> | image address, or a function returning an address, a Blob, or a promise of one, shown when it arrives [optional] |
| `imageUrl` | <code>string &#124; null</code> | image address, which may arrive later through setValue [optional] |
| `itemId` | <code>string &#124; null</code> | item id that builds the address through ApiClient.getImageUrl when there is no imageUrl [optional] |
| `imageType` | <code>string</code> | the image type for itemId (default 'Primary') |
| `imageMaxHeight` | <code>number</code> | maxHeight for itemId (default 128 for a row and 400 for a card) |
| `icon` | <code>string</code> | Material icon name of the placeholder (default chosen from the shape) |
| `title` | <code>string</code> | the item's name [optional] |
| `titleSuffix` | <code>string &#124; null</code> | a secondary part after the title, such as an episode name [optional] |
| `subtitle` | <code>string &#124; null</code> | the second line [optional] |
| `user` | <code>MediaCardUser &#124; null</code> | { name, imageUrl } shown with a small avatar at the start of the second line [optional] |
| `badges` | <code>MediaCardBadge[]</code> | [{ label, color }] drawn as stolon-badge [optional] |
| `status` | <code>MediaCardStatus &#124; null</code> | { label, color } drawn as a stolon-badge, or null [optional] |
| `meta` | <code>string &#124; null</code> | a short line beside the status, such as a time or an error [optional] |
| `metaIsError` | <code>boolean</code> | true draws meta in the error color (default false) |
| `detail` | <code>string &#124; null</code> | a line after the status, such as 'Pending, retry in 2m' [optional] |
| `error` | <code>string &#124; null</code> | a line after the status in the error color, such as why it failed, with its full text as the tooltip [optional] |
| `size` | <code>number &#124; string &#124; null</code> | a size beside the status, as bytes, such as 1288490188 for 1.2 GB, or as text [optional] |
| `actions` | <code>MediaCardAction[]</code> | [{ label, icon, value, disabled }] drawn as icon buttons, where disabled greys one out and keeps its place [optional] |
| `href` | <code>string &#124; null</code> | address the whole card opens [optional] |
| `onClick` | <code>(): void</code> | function() called when the whole card is clicked or activated with Enter or Space [optional] |
| `onAction` | <code>(value: string): void</code> | function(value) called when an action button is clicked [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): MediaCardOptions</code> |
| `setValue` | <code>(next: MediaCardOptions &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `MediaShape` | The shape of a media card's artwork. Posters are portrait, episodes are wide, albums are square, and people are round. |
| `MediaCardBadge` | A badge on a media card, drawn as stolon-badge with its color modifier. |
| `MediaCardStatus` | The status on a media card, drawn as a stolon-badge in a status color. |
| `MediaCardAction` | An icon button on a media card. onAction receives its value. disabled greys it out in its place, so cards in a list keep their actions in line. |
| `MediaCardUser` | A user shown at the start of a media card's subtitle line, with a small avatar. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-media-card` | One media item with its artwork, a title, a second line, badges, and a side column for status, meta, and actions |
| `stolon-media-card-row` | List row with the artwork at the start and the side column at the end, its text starting at the top so a pinned action lines up with the title |
| `stolon-media-card-tile` | Grid tile with the artwork on top, filling the tile's width |
| `stolon-media-card-thumb` | Artwork box in one of four shapes, a stolon-thumb frame holding the placeholder icon under the image. In a row, portrait, square, and round share one width, a portrait is that width at 2:3, and a wide one fills the slot at 16:9 |
| `stolon-media-card-info` | Text column with the title, the second line, and the badges |
| `stolon-media-card-suffix` | Secondary part of the title after a dot, such as an episode name |
| `stolon-media-card-sub` | Second line, with an optional small avatar and name before the subtitle |
| `stolon-media-card-badges` | Wrapping row of badges under the second line |
| `stolon-media-card-side` | Column at the end of a row with the status badge, the meta line, and the action buttons, compact when it holds only buttons |
| `stolon-media-card-side-line` | The first line of the status column, the size dimmed and then the badge, kept on one line |
| `stolon-media-card-actions` | The action buttons, such as a remove X, pinned to the card's top right corner and inset by its padding, so they line up with the title |
| `stolon-media-card.stolon-has-actions` | A card with pinned actions leaves room for them, so its title, status, and lines never run under them |
| `stolon-media-card-size` | The size beside the status, in even width digits |
| `stolon-media-card-detail` | The status's detail line, and an error line in the error color that ends in an ellipsis with its full text as the tooltip |
| `stolon-media-card-meta` | Short faded line beside the status, in the error color with error |
| `stolon-list.stolon-rows` | A media row inside a bordered list, where the list draws the frame and the dividers |
| `stolon-filtered-checked` | A media row that a list's checkbox leads, where the checkbox takes the row's leading padding and the narrow gap sits between it and the artwork |
| `stolon-list.stolon-grid` | A media tile inside a grid list, as tall as the tallest tile in its row |
| `stolon-media-card-row.stolon-compact` | A row card narrower than its wide layout, which the card sets from its own width: a smaller artwork slot, and one text column of the title, one second line, one chip row, and an error line |
| `stolon-media-card-chips` | A compact card's one chip row: the badges and the status, then the status's detail, which ends in an ellipsis to keep the row on one line, then the size |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/media-card.html" title="Media Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "media-card.html"
```
