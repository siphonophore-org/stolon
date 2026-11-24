# Web Client Markup

Builders that return the web client's own markup as HTML, for a page in the [Web Client Shell](web-client-shell.md): cards and rows of cards, dialogs and their footers, form fields, checkboxes, the filter popover, the details page, the toaster, and empty and loading states. Each copies a file of jellyfin-web 12.4, which is GPL-2.0-or-later, and names it in a comment above it. The web client's stylesheets draw what they build.

## Decision

| When | Use |
| :--- | :--- |
| Content of a page in the shell that should look like the web client | Web Client Markup |
| An item's details laid out as the web client's details page | `adoptDetailsTemplate`, with `HostedPage.DetailsTemplate` |
| A page in the user page frame or the dashboard | The kit's own components, such as [Media Card](media-card.md) and [Dialog](dialog.md) |

## Usage

Each builder escapes the text it is given and returns a string, so the page joins them and sets them as `innerHTML`.

```js
const base = await import('./web/configurationpage?name=myplugin_stolon.js');
const session = await base.startWebClientShell();
const items = await (await session.request('MyPlugin/Things')).json();
document.getElementById('results').innerHTML = base.webCardSection({
    id: 'things',
    title: 'Things',
    scroll: true,
    inner: items.map(function (t) {
        return base.webCard({ title: t.Name, image: t.Image, type: 'Movie', secondary: String(t.Year), key: t.Id });
    }).join('')
});
```

* A class copied from Jellyfin keeps Jellyfin's name exactly, such as `card`, `cardBox`, and `formDialogFooterItem`, since the web client's stylesheets and any custom CSS style it. A class Stolon adds starts with `stolon-web-`, or `stolon-shell-` for the bar, menus, and drawer.
* Material UI's parts keep Material UI's class names, such as `MuiAccordion-root`, and Stolon's class beside each carries its look, since Material UI's styles exist only inside the web client.
* The page answers what a card or button does through its own attributes: `data-stolon-card` on a card's links, `data-stolon-action` on its hover menu's buttons, `data-stolon-list` on a row's heading, `data-stolon-menu` on a menu button, and `data-stolon-scroll` on a row's scroll arrows.
* Every Jellyfin class the builders write is in the list `WebClientCheck` checks at startup, and a test keeps the two the same.

### The Details Page

`adoptDetailsTemplate(view)` puts the web client's details page template, which `HostedPage` writes when `DetailsTemplate` is set, into a view. The parts the page fills take ids, such as `detailName`, `detailMisc`, `detailButtons`, `detailOverview`, and `detailGroup`, and the parts with nothing yet start hidden, as the web client's do. It returns false, and leaves the view as it was, when there is no template or it lacks a part.

```js
const view = document.getElementById('details');
if (base.adoptDetailsTemplate(view)) {
    document.getElementById('detailName').innerHTML = base.webBdi(item.Name);
    document.getElementById('detailMisc').innerHTML = base.webOfficialRating(item.Rating) + base.webStarRating(item.Score);
    document.getElementById('detailMisc').classList.remove('hide');
    base.webFillDetailSection(view.querySelector('#castCollapsible'), 'cast', 'Cast & Crew', people);
}
```

## Gotchas

* A builder's markup is the web client's at version 12.4. When the web client changes, `WebClientCheck` reports a class it lacks, and the parity check shows what moved. Compare against the file named above the builder.
* A card's hover menu shows on a desktop layout, `layout-desktop` on the root, and its corner buttons always show on a phone. Build cards after `startWebClientShell` sets the layout.
* Markup passed into a builder, such as `buttonHtml` or a row's `inner`, is placed as given, so pass only what another builder returned.
* The docs preview shows the markup as text, since the web client's stylesheets are not in the docs.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `webCssUrl`

<code>function webCssUrl(url: string): string</code>

Percent encodes what could end a CSS url() early, quotes, brackets, backslashes, and control characters, and wraps it.

### `WEB_SPINNER`

<code>var WEB_SPINNER: string</code>

The inside of the web client's loading spinner, for an element with mdl-spinner and mdlSpinnerActive.

### `webEmptyState`

<code>function webEmptyState(title: string, text: string, buttonHtml?: string): string</code>

An empty state in the web client's type and colors under one of its icons. The web client has no such message, so its layout is Stolon's.

### `webSecondaryText`

<code>function webSecondaryText(text: string, className?: string): string</code>

A line in the web client's secondary text color.

### `webNoResultsText`

<code>function webNoResultsText(query: string): string</code>

The web client's no results sentence for a search, in the page's language.

### `webRaisedButton`

<code>function webRaisedButton(id: string, text: string): string</code>

A raised button.

### `webBlockButton`

<code>function webBlockButton(id: string, text: string, type: string): string</code>

A full width raised button, as the web client's forms end with, in one of its button colors.

### `createWebToaster`

<code>function createWebToaster(parent: HTMLElement): WebToasterHandle</code>

Makes the web client's toast container in a parent, and returns the handle that shows a toast in it. A toast still showing is reused for the next message.

| Handle member | Type |
| :--- | :--- |

### `WEB_ICONS`

<code>var WEB_ICONS: Record&lt;string, string&gt;</code>

The Material icons the web client draws in its bar, menus, and drawer, as SVG paths (@mui/icons-material).

### `webIcon`

<code>function webIcon(name: string): string</code>

One of the web client's Material icons as an SVG, or a Material Icons font glyph for a name WEB_ICONS lacks.

### `webLibraryIcon`

<code>function webLibraryIcon(view: WebUserView): string</code>

A library's icon, by its collection type.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `Id` (required) | <code>string</code> |  |
| `Name` | <code>string</code> |  |
| `CollectionType` | <code>string &#124; null</code> |  |
| `Type` | <code>string</code> |  |
| `ServerId` | <code>string</code> |  |

### `webLibraryRoute`

<code>function webLibraryRoute(view: WebUserView): string</code>

A library's page in the web client, as the hash after web/.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `Id` (required) | <code>string</code> |  |
| `Name` | <code>string</code> |  |
| `CollectionType` | <code>string &#124; null</code> |  |
| `Type` | <code>string</code> |  |
| `ServerId` | <code>string</code> |  |

### `webUserViewsShown`

<code>function webUserViewsShown(count: number, width?: number): number</code>

How many of the bar's entries show before More, at a window width.

### `webNavButton`

<code>function webNavButton(href: string, iconHtml: string, text: string, current?: boolean, external?: boolean): string</code>

One of the bar's entries, a library or a link, as Material UI's text button with a start icon.

### `webNavMoreButton`

<code>function webNavMoreButton(): string</code>

The bar's More button, with Material UI's drop down arrow, which opens the menu of entries that do not fit.

### `webMenuItem`

<code>function webMenuItem(iconHtml: string, text: string, href?: string &#124; null, key?: string, external?: boolean): string</code>

An entry of a menu, the user menu or More, as Material UI's menu item. A link with href, or a button the page answers itself, marked with data-stolon-menu.

### `webMenuDivider`

<code>function webMenuDivider(): string</code>

The divider between a menu's groups, as Material UI's.

### `webDrawerItem`

<code>function webDrawerItem(href: string, iconHtml: string, text: string, current?: boolean, external?: boolean): string</code>

An entry of the drawer.

### `webDrawerList`

<code>function webDrawerList(itemsHtml: string, divider?: boolean, subheader?: string): string</code>

A group of drawer entries, after a divider unless it is the first, under a heading when given one.

### `WEB_FORM_DIALOG`

<code>var WEB_FORM_DIALOG: WebDialogClasses</code>

The classes a form dialog ends up with once the web client opens it, such as its prompt.

### `WEB_CONFIRM_DIALOG`

<code>var WEB_CONFIRM_DIALOG: WebDialogClasses</code>

The classes of the web client's centered message dialog, such as a confirmation.

### `webConfirmDialogWidth`

<code>function webConfirmDialogWidth(windowWidth: number): string</code>

The widest the message dialog's content grows, from two buttons and their spacing within the window, as dialog.js sets it.

### `webFormDialogFooter`

<code>function webFormDialogFooter(text: string, type?: string): string</code>

A form dialog's footer, one wide raised button as its submit, as components/prompt/prompt.template.html lays it out.

### `webConfirmDialogFooter`

<code>function webConfirmDialogFooter(text: string, type?: string): string</code>

The message dialog's footer, Cancel then the action.

### `webCancelDialogFooter`

<code>function webCancelDialogFooter(text: string, type?: string): string</code>

A form dialog's footer with Cancel beside the action, both the same width.

### `webActionsDialogFooter`

<code>function webActionsDialogFooter(buttons: WebDialogAction[]): string</code>

A form dialog's footer of several actions side by side, each as wide as Cancel and its action are.

### `webConfirmDialogBody`

<code>function webConfirmDialogBody(text: string): string</code>

The message dialog's text, with a place for an error under it.

### `webResetFiltersButton`

<code>function webResetFiltersButton(id: string, label: string, disabled?: boolean): string</code>

Reset filters, the library toolbar's primary text button with the FilterAltOff icon.

### `webFilterPopover`

<code>function webFilterPopover(id: string, label: string, sectionsHtml: string): string</code>

The library toolbar's filter popover, Material UI's popover paper, which the page places under its Filter button.

### `webFilterAccordion`

<code>function webFilterAccordion(id: string, title: string, checkboxesHtml: string): string</code>

A filter section, its heading a button that opens it over its checkboxes. The page toggles aria-expanded and the region's hidden attribute.

### `webFilterCheckbox`

<code>function webFilterCheckbox(inputAttrs: WebAttributes, label: string, checked?: boolean): string</code>

A filter checkbox with its label.

### `webSelectOptions`

<code>function webSelectOptions(options: WebSelectOption[]): string</code>

A select's options, for filling it again.

### `webSelectField`

<code>function webSelectField(id: string, label: string, options: WebSelectOption[]): string</code>

A select with its label and arrow.

### `webTextareaField`

<code>function webTextareaField(options: WebTextareaOptions): string</code>

A text area with its label above and its descriptions under it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `id` (required) | <code>string</code> | the text area's id |
| `label` (required) | <code>string</code> | its label |
| `maxLength` (required) | <code>number</code> | the most characters it takes |
| `rows` | <code>number</code> | its height in lines (default 3) |
| `placeholder` | <code>string</code> | an example value [optional] |
| `descriptions` | <code>Array&lt;string &#124; WebDescription&gt;</code> | the lines under it [optional] |

### `webFieldDescription`

<code>function webFieldDescription(text: string, id?: string): string</code>

A field's description line, under it.

### `WEB_CHECKBOX_LIST`

<code>var WEB_CHECKBOX_LIST: string</code>

The classes of a checkbox list in the web client's paper list.

### `webCheckboxListContainer`

<code>function webCheckboxListContainer(label: string, boxId: string, text: string): string</code>

A checkbox list's heading and the box its checkboxes go in, which holds a line of text until they are known.

### `webCheckbox`

<code>function webCheckbox(inputAttrs: WebAttributes, label: string, note?: string &#124; null, checked?: boolean, disabled?: boolean): string</code>

A checkbox as the web client upgrades it.

### `webSettingsCheckbox`

<code>function webSettingsCheckbox(id: string, label: string, descriptionId: string): string</code>

A settings checkbox with its description under it, as the web client's settings pages set them out. It starts off and disabled, and the description is filled in later.

### `webLinkButton`

<code>function webLinkButton(buttonAttrs: WebAttributes, text: string): string</code>

A text link button, as the web client's Select all and Show more.

### `webPaperList`

<code>function webPaperList(rowsHtml: string, className?: string): string</code>

Rows in the web client's paper list.

### `WEB_CARD_ROW`

<code>var WEB_CARD_ROW: string</code>

The card shape of a row that scrolls sideways.

### `WEB_CARD_GRID`

<code>var WEB_CARD_GRID: string</code>

The card shape of a grid that wraps, as the web client's list pages lay out.

### `webDefaultColorIndex`

<code>function webDefaultColorIndex(name: string): number</code>

The web client's placeholder color for a card with no image, 1 to 5, picked by its name.

### `webDefaultCardIcon`

<code>function webDefaultCardIcon(type?: string): string</code>

The icon a card with no image shows, by its item type.

### `webCardImage`

<code>function webCardImage(url: string &#124; null &#124; undefined, title: string, type?: string, link?: WebCardLink &#124; null, className?: string): string</code>

A card's picture, the image as its background once it nears the screen, or the web client's colored placeholder with the type's icon. Given a link, the picture is the card's link.

### `webIndicator`

<code>function webIndicator(indicator: WebIndicator &#124; null &#124; undefined): string</code>

The played indicator's round badge, with the page's own icon and color class.

### `webProgressBar`

<code>function webProgressBar(share: number): string</code>

A card's progress bar.

### `webCard`

<code>function webCard(options: WebCardOptions): string</code>

A card, as the web client builds one: the picture, a hover menu on a desktop, and its lines of text under it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` (required) | <code>string</code> | the card's name, the first line and its link's text |
| `href` | <code>string</code> | where the card goes (default #) |
| `key` | <code>string</code> | a data-stolon-card value for the page to open it by [optional] |
| `shape` | <code>string</code> | the card shape, WEB_CARD_ROW or WEB_CARD_GRID (default WEB_CARD_ROW) |
| `type` | <code>string</code> | the item type, for the placeholder's icon [optional] |
| `image` | <code>string &#124; null</code> | the picture's address [optional] |
| `imageClass` | <code>string</code> | a class of the page's own on the picture while it loads [optional] |
| `secondary` | <code>string</code> | the second line [optional] |
| `status` | <code>string</code> | words added to the link's accessible name [optional] |
| `indicator` | <code>WebIndicator &#124; null</code> | a round badge on the picture [optional] |
| `progress` | <code>number &#124; null</code> | a progress bar on the picture, from 0 to 1 [optional] |
| `fab` | <code>WebOverlayButton &#124; null</code> | the hover menu's middle button, on a desktop [optional] |
| `buttons` | <code>WebOverlayButton[]</code> | the hover menu's corner buttons, always shown on a phone [optional] |
| `personCard` | <code>boolean</code> | true for a person's card [optional] |
| `oneLine` | <code>boolean</code> | true for a card with no second line [optional] |

### `webPosterCard`

<code>function webPosterCard(shape: string, url: string &#124; null &#124; undefined, title: string, type?: string, className?: string): string</code>

A card's frame around a picture with no text, such as the details page's poster.

### `webPlaceholderCards`

<code>function webPlaceholderCards(count: number, shape?: string): string</code>

Loading placeholder cards, built from the real card's box and both lines of its text.

### `webPlaceholderGrid`

<code>function webPlaceholderGrid(count: number, shape?: string): string</code>

A grid of loading placeholder cards.

### `webPlaceholderLines`

<code>function webPlaceholderLines(count: number): string</code>

Loading placeholder lines of text.

### `webScrollButtons`

<code>function webScrollButtons(id: string): string</code>

A row's scroll arrows, hidden and disabled until the page finds the row runs past the screen.

### `webCardSection`

<code>function webCardSection(options: WebCardSectionOptions): string</code>

A row of cards on a page of rows. With a list page, the heading is a link with its chevron, as the home page's rows (src/components/homesections/homesections.js). Otherwise it is the search page's plain heading (SearchResultsRow.tsx).

| Option | Type | What it does |
| :--- | :--- | :--- |
| `id` (required) | <code>string</code> | the row's id |
| `title` (required) | <code>string</code> | its heading |
| `inner` (required) | <code>string</code> | its cards, from webCard |
| `scroll` | <code>boolean</code> | true for a row that scrolls sideways, else a grid that wraps [optional] |
| `listHref` | <code>string &#124; null</code> | where the heading goes, for a row with a list page [optional] |
| `listKey` | <code>string</code> | a data-stolon-list value for the page to open the list by [optional] |

### `webSearchSuggestions`

<code>function webSearchSuggestions(items: WebLink[]): string</code>

An empty search's suggestions.

### `webPlaceholderRow`

<code>function webPlaceholderRow(count: number): string</code>

A row's loading placeholder, the search page's row with its heading and cards.

### `webDetailGrid`

<code>function webDetailGrid(title: string, inner: string): string</code>

A heading over a wrapping grid, as a person's details page lists their titles.

### `webChildrenGrid`

<code>function webChildrenGrid(inner: string): string</code>

A wrapping grid for the details page's children, such as a show's seasons.

### `webFillDetailSection`

<code>function webFillDetailSection(section: HTMLElement, id: string, title: string, inner: string): void</code>

Fills one of the details page's sections of cards, such as its cast: the heading, the scroll arrows, then the cards. Empty cards hide it.

### `adoptDetailsTemplate`

<code>function adoptDetailsTemplate(view: HTMLElement, template?: HTMLTemplateElement &#124; null, missing?: string[]): boolean</code>

Puts the web client's details page template into a view, so an item's details are laid out by the web client's own markup. The parts the page fills take ids: itemBackdrop, detailLogo, detailImage, detailImageMobile, detailMisc, detailButtons, detailRows, detailTagline, detailOverview, overviewControls, overviewExpand, detailBorn, detailBirthPlace, detailDied, detailLinks, detailGroup, and detailSections. The name goes in detailName and detailOriginal. The parts with nothing yet start hidden, as the web client's do, and its own buttons are taken out.

### `webBdi`

<code>function webBdi(text: string): string</code>

Text kept in its own direction, as itemDetails/index.js renderName writes a name.

### `webMediaInfoItem`

<code>function webMediaInfoItem(html: string, className?: string): string</code>

One item of the details page's info row.

### `webOfficialRating`

<code>function webOfficialRating(text: string): string</code>

The info row's age rating.

### `webStarRating`

<code>function webStarRating(score: number): string</code>

The info row's community rating, a star and the score to one place.

### `webCriticRating`

<code>function webCriticRating(value: number): string</code>

The info row's critic rating, fresh from 60.

### `webInfoRow`

<code>function webInfoRow(html: string, className?: string): string</code>

A row of the details page's info, with a class of the page's own.

### `webDetailButton`

<code>function webDetailButton(id: string &#124; null, iconName: string, title: string, disabled?: boolean): string</code>

A flat detail button with an icon, its words as the tooltip and the accessible name.

### `webDetailLinkButton`

<code>function webDetailLinkButton(href: string, iconName: string, title: string, external?: boolean): string</code>

A detail button that is a link.

### `webFavoriteButton`

<code>function webFavoriteButton(id: string, isFavorite: boolean): string</code>

The favorite button.

### `webMediaInfoContent`

<code>function webMediaInfoContent(sectionsHtml: string): string</code>

The media info dialog's content, centered.

### `webMediaInfoSource`

<code>function webMediaInfoSource(title: string, innerHtml: string): string</code>

One source of the media info dialog, its name then its streams.

### `webMediaInfoStream`

<code>function webMediaInfoStream(title: string, attributesHtml: string): string</code>

One stream of a source, its heading then its attributes.

### `webMediaInfoAttribute`

<code>function webMediaInfoAttribute(label: string, valueHtml: string): string</code>

One attribute of a stream, a bold label then its value, a line each.

### `webDetailsGroupItem`

<code>function webDetailsGroupItem(label: string, value: string, raw?: boolean): string</code>

An item of the details group, a label then its values.

### `webPersonLinks`

<code>function webPersonLinks(links: WebItemLink[]): string</code>

A line of links, such as directors or genres, separated by commas.

### `webExternalLinks`

<code>function webExternalLinks(links: WebLink[]): string</code>

The external links line, each opening in a new tab.

| Type | What it is |
| :--- | :--- |
| `WebAttributes` | Attributes a builder writes on an element, each name a plain attribute name and each value escaped. |
| `WebDialogClasses` | The classes of a dialog's box, header, content, and footer. |
| `WebDialogAction` | One button of webActionsDialogFooter. type is the web client's button color, or none for a plain raised button. |
| `WebSelectOption` | One option of a select. |
| `WebDescription` | A line of webTextareaField's descriptions, with an id for one the page writes into. |
| `WebCardLink` | The card's link, for webCardImage: its attributes, its accessible name, and markup laid over the picture. |
| `WebIndicator` | A card's round badge: a Material icon, its words as the tooltip, and a class of the page's own for its color. |
| `WebOverlayButton` | A button of a card's hover menu, answered by the page through data-stolon-action. |
| `WebLink` | One link of webSearchSuggestions. |
| `WebItemLink` | One link of a details group line, with a data-stolon-card value for the page to open it by. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-web-empty` | An empty state, the web client's icon over a heading and a line, centered, for what the web client has no message of its own for |
| `stolon-web-error` | An error line under a form or in a dialog, red, hidden while empty |
| `stolon-web-inherit` | A link in a line of text that keeps the text's color, such as a director's name |
| `stolon-web-toast` | A toast with room for one action, such as Undo |
| `stolon-web-reset-filters` | Reset filters, Material UI's primary text button with its icon, as the library toolbar's |
| `stolon-web-filters` | The filter popover, Material UI's popover paper with a section per filter, each a heading that opens its checkboxes |
| `stolon-web-skeleton-padder` | A loading placeholder card or line, a pulsing bar in place of text and a pulsing picture |
| `stolon-web-appear` | Content that fades in once it has waited a moment, so a quick answer never flashes a placeholder |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/web-client-markup.html" title="Web Client Markup example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "web-client-markup.html"
```
