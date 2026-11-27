# Pages and Templates

Standalone pages that a plugin serves outside the dashboard, such as invite links, public download pages, and "page not found".

A page that regular users open from a link, such as an invite or a device setup page, is a `HostedPage` in the [User Page](../web/user-page.md) frame. A page for signed in viewers that should look like Jellyfin itself, such as a request page, is a `HostedPage` in the [Web Client Shell](../web/web-client-shell.md). A short message, such as "page not found", renders through `StatusPage`, which fills the embedded `status` template. `PublicPage` adds the response headers and the favicon that those pages need.

## HostedPage

Serves a page at a root path of the server, such as `/invites/{code}` or `/wireguard`, in the `page` template. A plugin declares the page once, with its prefix for the shared pages, who may open it, and its content, and serves it from a controller action.

```csharp
[ApiController]
[Route("invites")]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed class InvitePageController : ControllerBase
{
    private static readonly HostedPage Page = new(
        "myplugin",
        HostedPageAccess.Anyone,
        HostedPageContent.Resource(typeof(Plugin).Assembly, "Web.invite.html"))
    {
        Title = "Invite",
        Mark = "Invite",
        MarkIcon = "person_add",
        Translations = "MyPlugin/Translations"
    };

    [HttpGet("{code}")]
    [AllowAnonymous]
    [Produces("text/html")]
    public ContentResult Invite(string code) =>
        Page.Serve(this, new Dictionary<string, string> { ["CODE"] = code });
}
```

`Serve` answers with the whole document. It sets the `PublicPage` hardening headers, `X-Content-Type-Options: nosniff`, and `frame-ancestors 'self'`. It writes the server's name in the header, the language the request asks for, and links the plugin's shared Stolon CSS and JS, the web client's favicon, and the web client's Material Icons face, all found from the request's services.

The page sets its base address to the server root, written relative to the request path, such as `../` for `/invites/abc`. Every link in the frame and in the content works under a base path and behind a reverse proxy that strips a prefix, with no script to work out the root.

### Why a Controller

A plugin declares the page in its own controller, and Stolon serves it.

* Jellyfin's plugin model routes a plugin's pages through MVC controllers, as the siblings' invite and request pages do. A plugin has no supported hook to add a route without one.
* Stolon compiles into every plugin, so a controller in Stolon would exist once per plugin, with the same routes, and the routes would collide.
* A route attribute keeps the path where Jellyfin and the reader expect it, beside the plugin's other routes.

### Access

A browser that opens a link sends no Jellyfin token, since the web client keeps its sign-in in local storage and sends it as a header. So the page itself is served to anyone, and access is enforced in two places.

| Access | The page action | The page's API calls | The page script |
| :--- | :--- | :--- | :--- |
| `Anyone` | `[AllowAnonymous]` | `[AllowAnonymous]`, with the plugin's own checks such as a code and a rate limit | Shows the content at once |
| `User` | `[AllowAnonymous]` | `[Authorize]` | Shows the content to a signed in viewer, and a sign in card to anyone else |
| `Administrator` | `[AllowAnonymous]` | `[Authorize(Policy = HostedPage.AdministratorPolicy)]` | Shows the content to an administrator, and a card that turns away anyone else |
| `SelectedUsers` | `[AllowAnonymous]` | `[Authorize]`, then `HostedPage.AllowsAsync` | Asks the plugin's access check, then shows the content to a listed viewer or an administrator, and a card that turns away anyone else |

### Selected Users

A `SelectedUsers` page is for the people the plugin names in its own settings, such as the users who may send invites. Administrators are always admitted. `AllowedUsers` reads the list on every check, so a change to the settings applies at once.

```csharp
private static readonly HostedPage Page = new("myplugin", HostedPageAccess.SelectedUsers, HostedPageContent.Resource(typeof(Plugin).Assembly, "Web.invites.html"))
{
    AllowedUsers = () => Plugin.Instance!.Configuration.InviteManagers,
    AccessCheck = "MyPlugin/Invites/Access"
};

[HttpGet("Access")]
[Authorize]
public Task<IActionResult> Access() => Page.CheckAccessAsync(this, _authorization);

[HttpGet("Mine")]
[Authorize]
public async Task<IActionResult> Mine()
{
    if (!await Page.AllowsAsync(this, _authorization))
    {
        return Forbid();
    }

    return Ok(_invites.ListFor(User));
}
```

* `AccessCheck` is the address of an action that answers with `CheckAccessAsync`: 204 for a viewer the page admits and 403 for anyone else. The page script asks it after sign in and shows a viewer who is not listed a card in place of the content.
* Every API call the page makes checks `AllowsAsync` itself. The access check only decides what the page shows.
* `Allows(userId, isAdministrator)` is the same rule for code that already knows the user.
* An API key names no user, so a `SelectedUsers` page refuses it. With no `AllowedUsers`, the page admits administrators only.

The page script, `startUserPage`, reads the sign-in the web client stored for this server, checks it with `Users/Me`, and gives the plugin's script a session that calls the API as the viewer. See [User Page](../web/user-page.md).

### Not Found

`NotFound(this)` answers a missing item, such as an invite code that does not exist, with the page's frame, status code 404, and the not found screen in place of the content. It needs no sign in, and sends none of the page's content. See [Page Screens](../web/page-screens.md).

**Gotchas**

* Never put private data in the page or its values. Anyone with the address can read the page, so the data comes from an API call that Jellyfin authorizes.
* Values are HTML encoded, so pass text, never markup. Markup belongs in the content.
* A route with a token, such as `{code}`, also matches `favicon.ico` under it. The page links the favicon from the web client, so the plugin needs no favicon route.
* The prefix is the one the plugin passes to `GetSharedPages`, since the page links `web/configurationpage?name=<prefix>_stolon.css` and `.js`.
* The web client's favicon and icon face are read from its `index.html` and the stylesheets it links, and kept until `index.html` changes. Without a web client the page has neither.
* A request to `/wireguard` and to `/wireguard/` both work. Each gets the base address for its own depth.

## HostedPageAccess

Who may open a `HostedPage`: `Anyone`, `User` for any signed in user, `Administrator`, or `SelectedUsers` for the users the plugin lists and every administrator. The page writes it on its body as `data-stolon-access`, and the page script checks it. See [Access](#access) for the attribute each one takes.

## HostedPageContent

What a `HostedPage` serves inside its frame, read once on first use. `HostedPageContent.Resource` reads an HTML fragment the plugin embeds, by its full name or the end of it after a dot. `HostedPageContent.Template` reads a Stolon template, or any resource whose name ends in `.Templates.<name>.html`.

```xml
<EmbeddedResource Include="Web\invite.html" />
```

**Gotchas**

* Missing content throws `InvalidOperationException` on the first request, with the name it looked for.
* The fragment fills its `{{KEY}}` tokens in one pass from the values `Serve` takes. A token with no value stays as written.

## HostedPageFrame

The frame a `HostedPage` is drawn in. `UserPage` is the default, Stolon's own look from the `page` template, which needs no signed in viewer, such as an invite page. `WebClient` is the [Web Client Shell](../web/web-client-shell.md) from the `webclient` template, which loads the installed web client's stylesheets and fonts and draws its app bar, user menu, and drawer, so a page for signed in viewers looks like Jellyfin itself. `WebClientSignedOut` is the same shell as the web client's login page, with the server's logo alone in the bar and the page in the login form's column, for a page anyone with a link opens. See [Signed Out](../web/web-client-shell.md#signed-out).

```csharp
private static readonly HostedPage Page = new("myplugin", HostedPageAccess.User, HostedPageContent.Resource(typeof(Plugin).Assembly, "Web.things.html"))
{
    Frame = HostedPageFrame.WebClient,
    Mark = "Things",
    MarkIcon = "inventory_2",
    Translations = "MyPlugin/Translations",
    DetailsTemplate = true,
    Manifest = "things/manifest.webmanifest"
};

[HttpGet]
[AllowAnonymous]
[Produces("text/html")]
public ContentResult Things() => Page.Serve(this);
```

* In the shell, `Mark` and `MarkIcon` name the page's own entry among the libraries in the bar and the drawer. A menu link in the web client's `config.json` that points at the page takes its place.
* `DetailsTemplate` writes the web client's details page template into the page, for `adoptDetailsTemplate`. See [WebClientDetailsTemplate](#webclientdetailstemplate).
* `Manifest` links a web app manifest, so a browser offers to install the page. See [WebClientApp](#webclientapp).
* The access rules are the same in every frame. A signed out viewer of a `User` page gets the sign in card under the bar.
* A plugin moves a page between frames with this one property. Its content keeps working, but each frame's look comes from the markup it is written in, Stolon's classes for `UserPage` and the web client's for the other two.
* `WebClientSignedOut` never shows a viewer, even one this browser has a sign-in for.

**Gotchas**

* The stylesheets are found from the web client's `index.html`, by what the numbered ones hold, and by the names of the search, details, and list route stylesheets. They are kept until `index.html` changes. Without a web client the shell links none, and the page shows Stolon's bar on the browser's plain styles.
* The server's custom CSS and the viewer's own are added by the page script after the content, so they win. See [Themes and Custom CSS](../web/web-client-shell.md#themes-and-custom-css).

## WebClientDetailsTemplate

The web client's details page template, `src/controllers/itemDetails/index.html` in jellyfin-web, read from the installed web client so a page lays out an item's details with the web client's own markup. Any item fits it, such as a movie, a show, or a person. `Load` gives the installed template when it has every part the page fills in, and Stolon's copy from jellyfin-web 12.4 otherwise. `HostedPage` calls it when `DetailsTemplate` is set.

```csharp
var html = WebClientDetailsTemplate.Load(paths.WebPath);
```

**Gotchas**

* The web client ships the template as a string in a script chunk. It is decoded, never run, and cut down to plain markup: no scripts, no handlers, no script addresses, and only an allowed set of elements and attributes.
* `Missing` lists the parts a template lacks, as `.class` and `#id`. `WebClientCheck` logs them at startup.
* The answer is kept until the web client's `index.html` changes.

## WebClientCheck

Checks a web client shell page against the installed web client at startup. It warns about each class the page uses that the web client lacks, since a renamed class leaves that part unstyled, and about a web client that changed since the plugin last started, the cue to run the [parity check](../web/web-client-shell.md#the-parity-check). Stolon's own shell and markup classes are always checked.

```csharp
public sealed class WebClientCheckService(IServerApplicationPaths paths, ILogger<WebClientCheckService> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = WebClientCheck.RunAsync(paths, logger, "things page", EmbeddedPage(), ["thingCard"], checkDetailsTemplate: true, cancellationToken);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
```

| Finding | Level |
| :--- | :--- |
| A class the web client lacks | Warning |
| The web client changed since the last start | Warning |
| No details page template, or one that lacks a part, so Stolon's copy stands in | Warning |
| The web client could not be read | Warning |
| How many classes it checked, or no web client to check | Debug |

**Gotchas**

* `markup` is the plugin's own page and scripts. The check reads their `class="..."` attributes, as `ClassesToCheck` lists them. A class built from parts, such as `'button-' + type`, is invisible to it, so pass it in `classes`.
* The page's own classes are left out: a class its own `<style>` blocks style, or one its scripts only look up, such as with `querySelector('.thingRow')`. A class in Stolon's shell list or in `classes` is always checked, so name any other web client class the page restyles or looks up in `classes`.
* Material UI's classes, which the web client builds at runtime, and Stolon's own `stolon-` classes are never reported.
* The build last seen is kept in `stolon-webclient-<page>.json` in the plugin configuration folder. The first start only notes it.
* It runs on a background task, reads every stylesheet and script of the web client, and never throws.

## WebClientApp

Lets a browser install a web client shell page as an app. `Manifest` writes the web app manifest, with the page's folder as its start and scope, and `ServiceWorker` writes a worker that keeps the page for an offline start, serves versioned assets from its cache, and loads Stolon's [web push script](notifications.md#webpushworker) so the app shows notifications.

```csharp
private static readonly string AppManifest = WebClientApp.Manifest(
    "Jellyfin Things", "Things", "Things for Jellyfin",
    [new WebClientAppIcon("icons/192.png", "192x192"), new WebClientAppIcon("icons/512.png", "512x512"), new WebClientAppIcon("icons/maskable.png", "512x512", "maskable")]);

[HttpGet("manifest.webmanifest")]
[AllowAnonymous]
public ContentResult AppManifestFile() => WebClientApp.ServeManifest(Response, AppManifest);

[HttpGet("sw.js")]
[AllowAnonymous]
public ContentResult Worker() => WebClientApp.ServeWorker(Response, WebClientApp.ServiceWorker("things"));

[HttpGet("push-worker.js")]
[AllowAnonymous]
public ContentResult PushWorker() => WebPushWorker.Serve(Response);
```

**Gotchas**

* Serve the manifest and the worker beside the page, so their relative addresses and the worker's scope are the page's folder.
* The cache prefix holds lowercase letters, digits, and hyphens, and names the worker's caches, so two plugins' apps never clear each other's.
* Pass `null` as the push worker for an app with no notifications. The page registers the worker itself, as in [Web Push](../../Notifications.md#web-push).
* The worker keeps navigation preload off. On a cold start WebKit asks for a preloaded page and again for the worker's own, and can pair one answer's `Content-Security-Policy` with the other's body, so a page whose scripts carry a nonce opens blank.

## WebClientAppIcon

One icon of a web app manifest: its address relative to the manifest, its size, its purpose, `any` or `maskable`, and its type, `image/png` by default.

## TemplateLoader

Loads an embedded HTML template by name and fills `{{KEY}}` tokens in one pass.

A template is found by suffix, which is the first resource in the plugin's assembly whose name ends with `.Templates.<name>.html`. The targets file embeds the package's own `status` template that way. To use your own template, embed it with a logical name that ends in `.Templates.<name>.html`.

```csharp
var html = TemplateLoader.Fill("status", new Dictionary<string, string>
{
    ["TITLE"] = "Download",
    ["HEADING"] = "Heading text",
    ["MESSAGE"] = "Message text",
    ["SPINNER"] = string.Empty,
    ["BUTTON"] = string.Empty,
    ["CONTENT"] = string.Empty
});
```

**Gotchas**

* A template is read once and cached for the life of the process. A missing resource throws `InvalidOperationException`.
* Values are inserted as is, with no encoding. Encode untrusted text before you pass it.
* A value that looks like a token is not expanded again, and a token with no entry stays in the text. Pass an empty string, not null, for a slot you want empty.
* Key matching follows the dictionary's comparer.
* The `status` template uses `TITLE`, `HEADING`, `MESSAGE`, `SPINNER`, `BUTTON`, and `CONTENT`.
* The `page` template, which `HostedPage` fills, uses `LANGUAGE`, `ROOT`, `TITLE`, `FAVICON`, `ICONS`, `STYLESHEET`, `COLUMN`, `ACCESS`, `SERVER`, `MARK`, `CONTENT`, `SCRIPT`, and `OPTIONS`.
* The `webclient` template, which `HostedPage` fills for the shell, uses `LANGUAGE`, `ROOT`, `SERVER_ID`, `TITLE`, `FAVICON`, `MANIFEST`, `WEB_CLIENT`, `FONTS`, `STYLESHEET`, `ACCESS`, `ACCESS_CHECK`, `MARK`, `MARK_ICON`, `LOGO`, `SERVER`, `CONTENT`, `DETAILS`, `SCRIPT`, and `OPTIONS`. The `webclient-details` template is Stolon's copy of the details page.

## StatusPage

Renders the standalone Jellyfin-themed status card, a centered card with a logo, a heading, a message, an optional spinner, and an optional button. The markup is self contained and needs none of the dashboard assets.

```csharp
PublicPage.ApplyHardeningHeaders(Response);
var html = StatusPage.Render(
    "Loading",
    string.Empty,
    title: "Download",
    buttonText: null,
    showSpinner: true,
    content: GetContentFragment());
return Content(html, "text/html");
```

**Gotchas**

* `Render` returns a complete HTML document. The heading, message, title, button text, and button address are HTML-encoded.
* `content` is raw HTML placed below the message and is not encoded, so pass only markup the plugin owns.
* The template styles three classes for `content`: `stolon-status-error` for a red error line, which hides while empty, `stolon-btn stolon-btn-secondary` for a quieter link button, and `stolon-btn-stack` to stack link buttons full width.
* The button shows only when both its text and its address are non-empty. The defaults are "Back to Jellyfin" and `../web/`. The default text and the spinner's label are Stolon's own strings, in the language of `StolonTranslations.UseLanguage`, else US English.
* The page links `favicon.ico` relatively and loads the logo from `../web/favicons/touchicon.png`. Expose a sibling `favicon.ico` route backed by `PublicPage.Favicon` to give the tab the server's icon.

### In the Web Client Shell

`ServeWebClient` serves a status screen in the [Web Client Shell](../web/web-client-shell.md) instead, with the hardening headers, in the request's language. `StatusPageScreen` picks loading, sign in required, not authorized, or not found, `title` sets the document title, and the other overload takes the plugin's own heading, message, button, spinner, content, and status code.

```csharp
[HttpGet("/pages/{slug}")]
[AllowAnonymous]
public IActionResult Page(string slug) => Exists(slug)
    ? StatusPage.ServeWebClient(this, "myplugin", StatusPageScreen.Loading, content: LoaderScript(slug))
    : StatusPage.ServeWebClient(this, "myplugin", StatusPageScreen.NotFound);
```

**Gotchas**

* The page starts signed out, as the web client's login page, and the page script moves it into the signed in shell when this browser has a sign-in the server still knows. It never asks anyone to sign in itself.
* The screens answer 200 for loading, 401 for sign in, 403 for not authorized, and 404 for not found.
* The prefix is the one the plugin passes to `GetSharedPages`, since the page loads the plugin's shared Stolon CSS and JS.
* See [Status Page](../web/status-page.md#in-the-web-client-shell) for how each screen looks.

## StatusPageScreen

The screens `StatusPage.ServeWebClient` serves: `Loading`, `SignIn`, `Unauthorized`, and `NotFound`. See [StatusPage](#in-the-web-client-shell).

## WebClientContentStyle

The web client's look for author content a plugin shows in a frame, such as a page an administrator wrote: the installed web client's Noto Sans and Material Icons faces, its root size and line height, light text on its dark background, its link color, headings, tables, fields, and buttons, from the `webclient-content` template. See [Author Content in a Frame](../web/web-client-shell.md#author-content-in-a-frame).

```csharp
var document = WebClientContentStyle.Inject(this, authorHtml);
var frame = "<iframe sandbox srcdoc=\"" + WebUtility.HtmlEncode(document) + "\"></iframe>";
```

**Gotchas**

* `Inject` puts the style block first in the head, so the author's own styles win. A document with no head gets it after its `html` tag, or before everything.
* The font addresses are relative to the page the request opened, since a `srcdoc` frame resolves addresses against the page that holds it. Content fetched from another path than the page that shows it, such as `/pages/{slug}/user` for the page at `/pages/{slug}`, passes the holding page's path to `Style` or `Inject`, so the fonts resolve under any base path. Jellyfin answers the web client's fonts to any origin, so a sandboxed frame loads them too.
* Without a web client folder the block has no font faces, and the text falls back to the font stack.

## PublicPage

Response helpers for standalone pages. `ApplyHardeningHeaders` keeps a page and any token in its URL out of referrers, caches, and search indexes without a reverse proxy. `Favicon` returns the server's icon.

```csharp
[HttpGet("favicon.ico")]
[AllowAnonymous]
public IActionResult Favicon() => PublicPage.Favicon(_paths, Response);
```

**Gotchas**

* `ApplyHardeningHeaders` sets `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`, replacing earlier values.
* Do not call it on the favicon response, since its `no-store` would replace the one day cache that `Favicon` sets.
* `Favicon` returns a not found result when no icon exists.

## StolonPageScript

A small script for a standalone page that loads neither the bundle nor its CSS, such as one that mirrors the web client under its own content security policy. It sets the global `StolonPage` with the bundle's web push and casing helpers, built from the same sources, so they behave the same. It holds no text of its own, so the page supplies every word.

```csharp
[HttpGet("stolon-page.js")]
[AllowAnonymous]
public ContentResult PageScript() => StolonPageScript.Serve(Response);
```

```html
<script src="stolon-page.js"></script>
<script>
StolonPage.webPushState(registration).then(function (state) {
    status.textContent = strings['Push.' + state];
});
heading.textContent = StolonPage.titleCase(strings.MyRequests, translations.casing, translations.language);
</script>
```

| Member | What it does |
| :--- | :--- |
| `webPushState(registration)` | Resolves to a state code, `unsupported`, `insecure`, `install`, `denied`, `off`, or `on` |
| `subscribeWebPush({ registration, publicKey, save })` | Asks, subscribes, calls `save`, and resolves to a state code |
| `unsubscribeWebPush({ registration, remove })` | Calls `remove`, unsubscribes, and resolves to a state code |
| `webPushLabel(userAgent)` | A short name for the device, such as "Safari · iPhone" |
| `titleCase(text, casing, language)`, `sentenceCase(text, casing, language)` | Stolon's casing rules with the plugin's casing list added to Stolon's |

**Gotchas**

* The casing list is the `casing` of the plugin's `StolonTranslations.Serve` answer. See [Casing on a Standalone Page](../../Translations.md#casing-on-a-standalone-page).
* Serve it from the plugin's own origin, so a policy of `script-src 'self'` allows it.
* `scripts/build-page-script.mjs` writes the script into `StolonPageScript.cs`, and a test fails when the two differ.

## FaviconResolver

Finds the web client's favicon on disk. The file name is content hashed and changes per build, so it is found by reading the web client's `index.html`. Use `PublicPage.Favicon` unless you need the bytes yourself.

```csharp
var icon = FaviconResolver.Resolve(paths);
if (icon is { } favicon)
{
    return File(favicon.Bytes, favicon.ContentType);
}
```

**Gotchas**

* Every call resolves from disk. There is no cache.
* It reads the `href` of a `<link rel="icon">` or `rel="shortcut icon"` and needs `rel` before `href`, with double quotes. The file must stay inside the web folder and exist.
* Otherwise it uses the first `favicon*.ico` in the web folder.
* The content type is `image/png` for a `.png` file and `image/x-icon` for anything else, including an SVG icon.
* It returns null when the folder or file is missing, or when it cannot read the file.
