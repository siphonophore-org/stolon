# Web Client Shell

A frame for a page a plugin hosts that looks like Jellyfin's own web client. It loads the installed web client's stylesheets and fonts, follows the viewer's theme and custom CSS, and draws the web client's app bar, user menu, and drawer around the plugin's content. `HostedPage` serves it with `Frame = HostedPageFrame.WebClient`, or signed out, as the web client's login page, with `Frame = HostedPageFrame.WebClientSignedOut`. See [Pages and Templates](../csharp/pages-and-templates.md#hostedpageframe) for the C# side, and [Web Client Markup](web-client-markup.md) for the builders of the content.

## Decision

| When | Use |
| :--- | :--- |
| A page signed in viewers open beside their libraries, such as a request page | Web Client Shell |
| The web client's cards, dialogs, fields, and details page inside it | [Web Client Markup](web-client-markup.md) |
| A page anyone with a link opens, such as an invite sign up | Web Client Shell with `Frame = HostedPageFrame.WebClientSignedOut` |
| Loading, sign in required, not authorized, or not found in the web client's look | `StatusPage.ServeWebClient`, see [Status Page](status-page.md#in-the-web-client-shell) |
| A page an administrator wrote, shown in a frame | `WebClientContentStyle.Inject`, see [Author Content in a Frame](#author-content-in-a-frame) |
| A page in Stolon's own look, outside the web client | [User Page](user-page.md) |
| A short message, such as "page not found" | [Status Page](status-page.md) |
| Anything inside the dashboard | A [config page](config-page.md) |

## Usage

`HostedPage` writes the frame. The plugin writes its content in the web client's own markup and starts the shell from its script.

```csharp
private static readonly HostedPage Page = new("myplugin", HostedPageAccess.User, HostedPageContent.Resource(typeof(Plugin).Assembly, "Web.things.html"))
{
    Frame = HostedPageFrame.WebClient,
    Mark = "Things",
    MarkIcon = "inventory_2",
    Translations = "MyPlugin/Translations"
};
```

```html
<div class="padded-left padded-right" id="things"></div>
<script type="module">
const base = await import('./web/configurationpage?name=myplugin_stolon.js');
const session = await base.startWebClientShell({
    menuItems: [{ text: 'Alerts', icon: 'Notifications', select: function () { openAlerts(); } }]
});
if (session) {
    const answer = await session.request('MyPlugin/Things');
    const things = await answer.json();
    document.getElementById('things').innerHTML = base.webCardSection({
        id: 'things-row',
        title: 'Things',
        scroll: true,
        inner: things.map(function (t) { return base.webCard({ title: t.Name, image: t.Image, key: t.Id }); }).join('')
    });
}
</script>
```

The frame, which `HostedPage` writes:

* `stolon-shell` on the body, with the web client's page backdrop behind the content.
* `stolon-shell-bar`, the web client's app bar on Jellyfin's `skinHeader`, with the server's name and logo, the libraries in `stolon-shell-nav`, and the viewer's avatar in `stolon-shell-end`.
* `stolon-shell-menu`, the user menu and the libraries that do not fit the bar, and `stolon-shell-drawer`, which takes over below 900px.
* `stolon-shell-main`, under the bar, stacked over the web client's fixed background as its own pages are, with `stolon-shell-column` and `stolon-shell-form` around the sign in card's gate and `stolon-shell-content`, the plugin's content.

The bar's entries are Favorites, the menu links of the web client's `config.json`, the page's own entry, named by `Mark` and `MarkIcon` unless a menu link points at the page, and the viewer's libraries. As many show as fit the width, and the rest go under More, as the web client lays them out. The user menu has Profile and Settings, the plugin's `menuItems`, Dashboard and Metadata manager for an administrator, Quick Connect when the server has it on, and Sign out.

### Access

The access rules are `HostedPage`'s, checked by the same page script as the [User Page](user-page.md). A signed out viewer of a `User` page gets the sign in card under the bar, and the content stays hidden. An `Anyone` page starts with no viewer, so its bar shows the server alone.

## Signed Out

`Frame = HostedPageFrame.WebClientSignedOut` draws the page as the web client's login page, for a page anyone with a link opens, such as an invite sign up, an invite that is no longer good, or the page after sign up.

* `stolon-shell-signed-out` on the body. The bar holds the server's logo alone, a link to the web client, with no libraries, avatar, user menu, or drawer, at every width.
* `stolon-shell-column` takes the login page's `standalonePage padded-left padded-right padded-bottom-page`, and `stolon-shell-form` takes its form's `readOnlyContent margin-auto-x`, 54em wide on a wide screen and the full width on a phone.
* A page screen in the gate, such as not found, drops its own logo, since the bar shows it.
* The frame never shows a viewer, even one this browser has a sign-in for.

Write the content in the login page's markup: a `form` with its heading in `sectionTitle`, fields in `inputContainer` with `emby-input`, `fieldDescription` under a field, and `raised button-submit block emby-button` for the main button.

```csharp
private static readonly HostedPage Signup = new("myplugin", HostedPageAccess.Anyone, HostedPageContent.Resource(typeof(Plugin).Assembly, "Web.signup.html"))
{
    Frame = HostedPageFrame.WebClientSignedOut
};
```

```html
<form class="manualLoginForm" id="signup">
<div class="padded-left padded-right flex align-items-center justify-content-center"><h1 class="sectionTitle">Create your account</h1></div>
<div class="inputContainer">
<label class="inputLabel inputLabelUnfocused" for="name">User</label>
<input is="emby-input" class="emby-input" id="name" type="text" required />
<div class="fieldDescription">Your name on this server.</div>
</div>
<button is="emby-button" type="submit" class="raised button-submit block emby-button"><span>Create account</span></button>
</form>
<script type="module">
const base = await import('./web/configurationpage?name=myplugin_stolon.js');
await base.startWebClientShell();
</script>
```

<iframe class="stolon-preview" src="../../../assets/previews/web-client-shell-signed-out.html" title="Web Client Shell signed out example" loading="lazy"></iframe>

## Author Content in a Frame

`WebClientContentStyle` gives author content, such as a page an administrator wrote and the plugin shows in a frame, the web client's look: its Noto Sans and Material Icons faces from the installed web client, its root size and line height, light text on its dark background, its link color, headings, tables, fields, and raised and submit buttons. The style reads the `--jf-palette-*` variables first, so a document that sets them follows another theme.

```csharp
var html = WebClientContentStyle.Inject(this, authorDocument);
```

`Inject` puts the style block first in the document's head, so the author's own styles after it win. `Style` returns the block alone. The font addresses are relative to the page the request opened, which a `srcdoc` frame resolves its addresses against.

<iframe class="stolon-preview" src="../../../assets/previews/web-client-content.html" title="Web Client content style example" loading="lazy"></iframe>

## How It Finds the Web Client's Stylesheets

The names of the web client's files carry a content hash, so `HostedPage` reads them from the installed web client's folder, in this order.

1. The rules its `index.html` carries in its own style block, such as `.hide` and the layout helpers.
2. The stylesheets its `index.html` links, in its order.
3. Three numbered stylesheets, found by what they hold: the site rules with the root and phone font sizes, the app layout's details banner, and the text area.
4. The route stylesheets of search, an item's details, and an item list.
5. Its Noto Sans faces and font stacks, set inline. Its other faces are left out, since they make the stylesheet that holds them a megabyte.

What it finds is kept until `index.html` changes, so a Jellyfin update reaches the page on its next load.

## Themes and Custom CSS

The shell follows every way an administrator or a viewer changes the web client's look, in the order the web client applies them.

| Order | What | Where it comes from |
| :--- | :--- | :--- |
| 1 | The web client's stylesheets | Its folder, as above |
| 2 | The viewer's theme, `web/themes/<theme>/theme.css` | The `<userId>-appTheme` setting, else `appTheme`, else the default theme of the web client's `config.json`, else dark |
| 3 | Stolon's styles, then the plugin's page styles | The shared Stolon CSS, then the content |
| 4 | The server's custom CSS, `Branding/Css` | Dashboard, General, Custom CSS. Left out when the viewer turned on "disable server custom CSS", the `<userId>-disableCustomCss` setting |
| 5 | The viewer's own custom CSS | Display settings, the `<userId>-customCss` setting |

* The theme is written before the first paint from the sign-in the web client stored for the server, and checked again against the web client's themes once the viewer is known. A theme name holds letters, digits, hyphens, and underscores only.
* `data-theme` on the root names the theme, and the page script sets the palette variables the web client's Material UI theme writes at runtime, such as `--jf-palette-background-paper`, for each of the web client's six themes.
* Both custom stylesheets go at the end of the page, after the content, so they win as in the web client. The viewer's CSS is the text of a style element, never markup.
* `applyWebClientLook` applies all of this, and `startWebClientShell` calls it.

Custom CSS reaches the shell because its markup keeps Jellyfin's class names exactly. CSS aimed at Material UI's generated class names, such as `css-1x2y3z`, or at a part of the web client the shell does not copy, cannot match.

## When the Web Client Is Missing or Changes

* With no web client folder, the shell links none of its stylesheets, fonts, or logo. The page shows Stolon's bar, menu, and drawer on the browser's plain styles.
* A Jellyfin update gives the files new names, and the shell finds them on the next load.
* A class the web client renames leaves that part of the page unstyled. `WebClientCheck.RunAsync` warns about it at startup, and about a web client that changed since the last start. See [WebClientCheck](../csharp/pages-and-templates.md#webclientcheck).

## The Parity Check

`scripts/web-client-parity.js` compares a plugin's shell page with the web client side by side, in the browser.

1. Sign in to the server's `/web/`.
2. Open the browser's developer console.
3. Set `window.parityOptions = { page: 'myplugin/' }` and paste the whole file.

It opens both pages in frames at 375, 820, and 1400px wide, and compares the app bar, the user menu, and the drawer. Each page pair prints a table of the boxes and styles that differ, and the whole report stays in `window.parityReport`. It only reads, and its only clicks are on the buttons its scenarios open, inside its own frames.

A plugin passes its own scenarios and probes, such as its details page against the web client's. Run it again without pasting.

```js
webClientParity({
    page: 'myplugin/',
    widths: [375, 1400],
    context: async function (ctx) {
        const found = await ctx.api.getItems(ctx.userId, { IncludeItemTypes: 'Movie', Recursive: true, Limit: 1 });
        ctx.movie = found.Items[0];
        return ctx;
    },
    scenarios: ['appBar', {
        id: 'movie',
        groups: ['appBar', 'details'],
        sections: function () { return ['Cast']; },
        web: function (ctx) { return '#/details?id=' + ctx.movie.Id; },
        page: function (ctx) { return '#/details?id=' + ctx.movie.Id; },
        ready: { web: ['.itemName'], page: ['.itemName'] }
    }]
});
```

The built in probe groups are `appBar`, `userMenu`, `drawer`, `details`, `dialog`, and `search`, and `webClientParity.sectionProbes(title)` gives the probes of a row of cards. Some differences are content, not layout, such as an overview's text or artwork that has not loaded. Run it on localhost or over HTTPS, and keep its tab in front, since a background tab pauses the menus' transitions.

## Gotchas

* The docs previews have none of the web client's stylesheets, since Stolon does not ship Jellyfin's CSS. It shows the bar, the user menu, and the drawer, which Stolon draws, and the content in the browser's plain styles. Look at a page on a real server, or run the parity check, to see it as viewers do.
* The bar's Material UI parts, such as the avatar and the menu entries, keep Material UI's class names beside Stolon's, such as `MuiMenuItem-root`, for custom CSS that aims at them. Stolon's `stolon-shell-` classes carry their look.
* The palette the page script writes covers the web client's own six themes. A theme a server adds gets the dark palette under its own stylesheet.
* The shell's script shows keyboard focus on the web client's buttons and links, which its stylesheets turn off, dims a disabled `emby-button` and checkbox, and lets the details page's `mainDetailButtons` wrap onto a second line on a narrow screen.
* The avatar shows the viewer's picture only when they have one, so a viewer with none never makes the page ask for a missing image.
* Sign out ends the session on the server and forgets it in the web client's storage, as the web client's own sign out does, then opens the web client.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `WEB_CLIENT_PALETTES`

<code>var WEB_CLIENT_PALETTES: Record&lt;string, Record&lt;string, string&gt;&gt;</code>

The variables the web client's Material UI theme sets for each of its themes, by theme id.

### `applyWebClientLook`

<code>function applyWebClientLook(options?: WebClientLookOptions): WebClientLook</code>

Follows the viewer's web client look in the order the web client applies it: their theme, then the server's custom CSS from Branding/Css unless they turned it off, then their own custom CSS from Display settings. Both custom stylesheets go last in the page, after Stolon's and the plugin's styles, so they win as in the web client. The viewer's CSS is set as the text of a style element. Call it again once the viewer is known.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `userId` | <code>string &#124; null</code> | the viewer, whose settings it reads, or null for no signed in viewer [optional] |
| `themes` | <code>WebClientTheme[] &#124; null</code> | the themes the web client's config.json lists (default the web client's six) |
| `storage` | <code>Storage &#124; null</code> | where the web client keeps its settings (default localStorage) |

### `startWebClientShell`

<code>function startWebClientShell(options?: WebClientShellOptions): Promise&lt;WebClientShellSession &#124; null&gt;</code>

Starts a page HostedPage serves in the web client shell. It follows the viewer's layout, theme, and custom CSS, checks the viewer as startUserPage does, and fills the app bar with their libraries, the user menu, and the drawer. A viewer who may not see the page gets the user page's card. In the signed out frame the page keeps the web client login page's header and shows no viewer, and a status page moves into the signed in shell once it finds the viewer's sign-in. Later calls return the same promise, so the page's own script calls it for the session.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `menuItems` | <code>WebClientMenuItem[]</code> | the plugin's own user menu entries, after Settings [optional] |

| Type | What it is |
| :--- | :--- |
| `WebClientMenuItem` | An entry a plugin adds to the user menu, after Settings: a link with href, or select for one the page answers itself. |
| `WebClientShellSession` | What startWebClientShell resolves to: the viewer's session, a toast in the web client's look, and destroy. |
| `WebClientTheme` | A theme of the web client's config.json. |
| `WebClientLook` | What applyWebClientLook applied: the theme, and whether the server's and the viewer's custom CSS are on the page. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-shell` | A page in the web client shell, laid out as the web client's pages are, its look from the web client's own stylesheets |
| `stolon-shell-bar` | The app bar, fixed at the top, clear until the page scrolls and then the theme's bar color, as the web client's |
| `stolon-shell-icon-button` | The bar's round icon button, such as the drawer's menu button |
| `stolon-shell-server` | The server's name and logo, a link to the web client's home, as Material UI's large text button |
| `stolon-shell-nav` | The libraries in the bar, Favorites, the menu links, and the viewer's libraries, as Material UI's text buttons, the page it is on in the accent |
| `stolon-shell-end` | The end of the bar, with the viewer's avatar, which opens the user menu |
| `stolon-shell-menu` | A menu, the user menu or the libraries that do not fit the bar, as Material UI's menu: it grows in from its corner |
| `stolon-shell-drawer` | The drawer, from the left over a dimmed page on a screen narrower than 900px, as the web client's |
| `stolon-shell-main` | The page under the bar, which the plugin's content fills, and the gate where the page script asks the viewer to sign in. It stacks over the web client's fixed background, as the web client's own pages do |
| `stolon-shell-column` | The column and form the page's gate and content sit in. Signed out they take the web client login page's classes, its page's padding and its form's width |
| `stolon-shell-signed-out` | The signed out frame, as the web client's login page: the bar holds the server's logo alone, a link home, and the page sits in the login form's column |
| `stolon-screen-spinner` | A status page's spinner under its sentence, the web client's loading spinner placed in the screen |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/web-client-shell.html" title="Web Client Shell example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "web-client-shell.html"
```

The signed out frame:

```html
--8<-- "web-client-shell-signed-out.html"
```

The content style:

```html
--8<-- "web-client-content.html"
```
