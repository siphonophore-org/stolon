# Pages and Templates

Standalone pages that a plugin serves outside the dashboard, such as invite links, public download pages, and "page not found".

A page that regular users open from a link, such as an invite or a device setup page, is a `HostedPage` in the [User Page](../web/user-page.md) frame. A short message, such as "page not found", renders through `StatusPage`, which fills the embedded `status` template. `PublicPage` adds the response headers and the favicon that those pages need.

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
