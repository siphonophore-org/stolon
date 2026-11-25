# Page Screens

The three screens a hosted page shows in place of its content: sign in, unauthorized, and not found. Every Siphonophore page shows the same three, so a viewer meets one sign in and one set of messages everywhere. In the [Web Client Shell](web-client-shell.md) they wear the classes of the web client's own login page, so Jellyfin's stylesheets, the viewer's theme, and custom CSS draw them as Jellyfin does. On a [User Page](user-page.md) they use the user page kit.

## Decision

| When | Use |
| :--- | :--- |
| A page for signed in viewers, and nobody is signed in or the sign in expired | Nothing. `startUserPage` and `startWebClientShell` show `createSignIn` |
| A signed in viewer the page does not admit | Nothing. They show `createUnauthorized` with the page's sentence |
| An address or item that does not exist | `HostedPage.NotFound(this)` in the controller, or `createNotFound` from the page's own script |
| A message inside the page's content, such as a failed save | [Callout](callout.md) or `setUserPageMessage` |

## Usage

The page start functions draw the screens on their own. A plugin's controller answers a missing item with the not found screen and status code 404.

```csharp
[HttpGet("{code}")]
[AllowAnonymous]
public ContentResult Invite(string code) => _invites.Exists(code) ? Page.Serve(this, new Dictionary<string, string> { ["CODE"] = code }) : Page.NotFound(this);
```

A page's script can draw a screen itself, such as when an item it loads is gone.

```js
import { createNotFound } from './configurationpage?name=myplugin_stolon.js';

var screen = createNotFound({ message: 'That device was removed.' });
view.querySelector('#content').replaceChildren(screen.element);
```

Classes: `stolon-screen` for every screen, with `stolon-sign-in`, `stolon-unauthorized`, or `stolon-not-found`, and the parts `stolon-screen-logo`, `stolon-screen-title`, `stolon-screen-text`, `stolon-screen-body`, `stolon-screen-button`, `stolon-screen-warning`, and `stolon-screen-error`. The sign in screen adds `stolon-sign-in-form`, `stolon-sign-in-remember`, `stolon-sign-in-quick-connect`, `stolon-sign-in-code`, `stolon-sign-in-after`, and `stolon-sign-in-disclaimer`. Each handle is `{ element, destroy }`.

## Signing In

* The screen signs in through Jellyfin's own API, `Users/AuthenticateByName`, or Quick Connect through `QuickConnect/Initiate`, `QuickConnect/Connect`, and `Users/AuthenticateWithQuickConnect`. The password goes only in the request body and is cleared from the field after every try.
* With **Remember me** on, the sign in is kept where the web client keeps its own, so the viewer is signed in to the web client too. With it off, the page goes on with the sign in and keeps nothing.
* The page then checks the viewer with `Users/Me` and the page's access rule, and goes on with the session as if the viewer had been signed in already.
* **Use Quick Connect** shows only when the server has Quick Connect on. The code expires after ten minutes.
* The server's login disclaimer from the branding configuration shows under the form, as text.
* On a connection that is not secure, a warning says others on the network could see the password.
* A stored sign in that the server no longer accepts shows the screen with "Your sign in expired. Sign in again."

## Gotchas

* The web client's storage, `jellyfin_credentials` and `_deviceId2` in local storage, is not a public API. If a Jellyfin update changes it, the viewer signs in on the page again.
* Jellyfin lists the page's sign in under its devices as `Jellyfin Web` on the viewer's platform.
* **Forgot password** opens the web client's own reset page.
* The screens show the server logo the web client's login page shows. In the web client shell it is the web client's own logo element, so the viewer's theme picks the logo and the server's custom CSS replaces it as it does on `/web/`. On a user page it is the logo file named in the web client's dark theme, read on every page load, and it hides when there is none.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSignIn`

<code>function createSignIn(options: SignInOptions): ScreenHandle</code>

The sign in screen, copied from the web client's own login page: user and password, Remember me, Sign in, Quick Connect when the server has it on, Forgot password, and the server's login disclaimer. It signs in through Jellyfin's own API, never keeps the password past the request, and hands the result to onSignedIn with whether to remember it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `serverId` (required) | <code>string</code> | the server's id, which the answer must match (required) |
| `serverName` | <code>string &#124; null</code> | the server's name, kept with the sign in [optional] |
| `title` | <code>string</code> | the heading (default 'Sign in to' the server's name, or 'Please sign in' without one) |
| `message` | <code>string</code> | the sentence under it (default none) |
| `client` | <code>string</code> | the client name Jellyfin shows in its devices list (default 'Jellyfin Web') |
| `version` | <code>string</code> | the client version (default '1.0') |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLElement</code> |
| `destroy` | <code>(): void</code> |

### `createUnauthorized`

<code>function createUnauthorized(options?: MessageScreenOptions): ScreenHandle</code>

The screen for a signed in viewer the page does not admit, such as a page for administrators or for selected people.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> |  |
| `message` | <code>string</code> |  |
| `linkText` | <code>string</code> |  |
| `href` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLElement</code> |
| `destroy` | <code>(): void</code> |

### `createNotFound`

<code>function createNotFound(options?: MessageScreenOptions): ScreenHandle</code>

The screen for an address or an item that does not exist.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> |  |
| `message` | <code>string</code> |  |
| `linkText` | <code>string</code> |  |
| `href` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLElement</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SignInResult` | What Jellyfin answers to a sign in: the user, their token, and the server they signed in to. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-screen` | A screen in place of a page's content, sign in, unauthorized, or not found: the server's mark, a heading, a sentence, and its body in a narrow centered column |
| `stolon-screen-logo` | The server's logo at the top of a screen. In the web client frame the web client's own logo element, whose image its theme and custom CSS set, centered over the heading. In the user page frame the logo file from the web client's theme, hidden when there is none |
| `stolon-screen-title` | A screen's heading and its sentence |
| `stolon-screen-body` | A screen's form and buttons, a field gap apart and as wide as the column |
| `stolon-sign-in-remember` | Remember me under the password, its box and text on one line |
| `stolon-screen-warning` | A warning before signing in, such as on a connection that is not secure, and a sign in error, both in their status colors |
| `stolon-sign-in-quick-connect` | Quick Connect: the code to enter on a signed in device, large and spaced so it reads at a glance |
| `stolon-sign-in-after` | Forgot password and the server's login disclaimer, under the form |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/page-screens.html" title="Page Screens example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "page-screens.html"
```
