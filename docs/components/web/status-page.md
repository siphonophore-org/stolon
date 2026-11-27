# Status Page

A standalone, themed card page that the C# `StatusPage.Render` renders. It has a logo, a heading, a message, an optional spinner, an optional button, and an optional raw content slot. It needs none of the dashboard assets and is not part of the CSS and JS bundle. `StatusPage.ServeWebClient` draws the same screens in the web client's own look instead.

## Decision

| When | Use |
| :--- | :--- |
| Served pages such as a sign in prompt or a loading page | Status Page. |
| The same screens in the web client's look, beside other web client pages | `StatusPage.ServeWebClient`, below |
| Anything inside a config page | Not the Status Page. It is a whole HTML page. |

## Usage

```csharp
var html = StatusPage.Render(
    heading: "Sign In Required",
    message: "Sign in to Jellyfin first.",
    buttonText: "Back to Jellyfin",
    buttonHref: "../web/");
```

The template is `src/templates/status.html`, embedded as `<RootNamespace>.Templates.status.html`. Each part sits under a comment that names it: `favicon`, `styles`, `card`, `logo`, `heading`, `message`, `spinner`, `button`, and `content`. See [Pages and Templates](../csharp/pages-and-templates.md) for the C# side.

* `{{TITLE}}`: the document title, HTML encoded. It defaults to the heading.
* `{{HEADING}}`: the `h1`, encoded.
* `{{MESSAGE}}`: the paragraph, encoded.
* `{{SPINNER}}`: `<div class="stolon-spinner" role="status" aria-label="Loading">`, or empty when `showSpinner` is off.
* `{{BUTTON}}`: an `a.stolon-btn`, or empty when `buttonText` or `buttonHref` is null or empty. The defaults are "Back to Jellyfin" and `../web/`.
* `{{CONTENT}}`: raw HTML that is not encoded. Pass only markup the plugin owns.

Classes, all defined in the template's own `<style>` block: `stolon-status-page-card`, `stolon-logo`, `stolon-spinner`, `stolon-btn`, `stolon-fields`, `stolon-hint`, `stolon-field-pair`, `stolon-submit`, `stolon-note`, and `stolon-hidden`.

## In the Web Client Shell

`StatusPage.ServeWebClient` serves loading, sign in required, not authorized, or not found in the [Web Client Shell](web-client-shell.md). The page starts signed out, as the web client's login page. When this browser has a sign-in the server still knows, the page script moves it into the signed in shell, with the viewer's libraries and user menu.

```csharp
[HttpGet("/pages/{slug}")]
[AllowAnonymous]
public IActionResult Page(string slug) => Exists(slug)
    ? StatusPage.ServeWebClient(this, "myplugin", StatusPageScreen.Loading, content: LoaderScript(slug))
    : StatusPage.ServeWebClient(this, "myplugin", StatusPageScreen.NotFound);
```

| Screen | Look | Button | Status code |
| :--- | :--- | :--- | :--- |
| `Loading` | The web client's spinner alone in the middle, or over the message when there is one | None | 200 |
| `SignIn` | "Please sign in" and a sentence | Sign in, to the web client | 401 |
| `Unauthorized` | "You cannot open this page" and Jellyfin's unauthorized sentence | Home | 403 |
| `NotFound` | "Page not found" and Jellyfin's not found sentence | Home | 404 |

* Each screen is the markup of the [Page Screens](page-screens.md) in the web client frame: `stolon-screen stolon-screen-web`, a `sectionTitle` heading, a `secondaryText` sentence, and a `raised block emby-button button-submit` button. The texts follow the request's language.
* The screen sits in the shell's gate. A script in `content` that imports the bundle can replace it with `showScreen`, such as `showScreen(createUnauthorized())` once it knows.
* `title` sets the document title, such as the name of the page that is loading, in place of the screen's heading.
* The other overload takes the plugin's own heading, message, button, spinner, content, and status code.

<iframe class="stolon-preview" src="../../../assets/previews/status-page-web-client.html" title="Status Page in the web client shell example" loading="lazy"></iframe>

```html
--8<-- "status-page-web-client.html"
```

## States and Modifiers

* The page is always dark, a `#101010` page with a `#1c1c1f` card and the Jellyfin blue accent. It is centered with a 420px maximum width and 24px page padding, so it fits 375px.
* `stolon-fields`, `stolon-hint`, `stolon-field-pair`, `stolon-submit`, and `stolon-note` are for a form a plugin supplies through `content`. `StatusPage.Render` does not produce them.
* The template carries its own copy of `stolon-hidden` and a `stolon-spin` animation.

## Gotchas

* It links a relative `favicon.ico` (serve one with `PublicPage.Favicon`) and the logo `../web/favicons/touchicon.png`.
* `CssCollisionTests` fails if any template class is also defined in the kit CSS, other than `stolon-hidden`, so the card is never restyled when both load on one page.

## Example

<iframe class="stolon-preview" src="../../../assets/previews/status-page.html" title="Status Page example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-page.html"
```
