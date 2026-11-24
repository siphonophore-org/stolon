# User Page

The look and the script of a whole page a plugin hosts for regular users, such as an invite page or a device setup page. It loads none of the web client's CSS, so it is built on Stolon's tokens alone, and `HostedPage` serves it in the `page` template. See [Pages and Templates](../csharp/pages-and-templates.md#hostedpage) for the C# side.

## Decision

| When | Use |
| :--- | :--- |
| A page at a root path of the server that regular users open from a link | User Page, served by `HostedPage` |
| A form, a QR code, or steps on that page | The kit's card, fields, and steps, with [QR Code](qr-code.md), [Stepper](stepper.md), and [Button](button.md) inside |
| A short message on a server page, such as "page not found" | [Status Page](status-page.md) |
| Anything inside the dashboard | A [config page](config-page.md) |

## Usage

`HostedPage` writes the frame, so the plugin writes only the content: one or more cards, and a module script that imports its own bundle by a path relative to the server root.

```html
<section class="stolon-user-page-card" data-stolon-view="form">
    <h1 class="stolon-user-page-title">Create your account</h1>
    <p class="stolon-user-page-lead">Choose a username and a password.</p>
    <form class="stolon-user-page-form" id="form" data-code="{{CODE}}" novalidate>
        <div class="stolon-user-page-field">
            <label for="username">Username</label>
            <input id="username" type="text" autocomplete="username" required />
        </div>
        <div id="message" class="stolon-user-page-message" hidden></div>
        <div class="stolon-user-page-actions">
            <button class="raised stolon-button primary large fill" type="submit">Create account</button>
        </div>
    </form>
</section>
<section class="stolon-user-page-card stolon-user-page-done" data-stolon-view="done" data-stolon-state="success" hidden>
    <span class="stolon-user-page-done-icon"><span class="material-icons" aria-hidden="true">check_circle</span></span>
    <h1 class="stolon-user-page-title">Welcome</h1>
    <div class="stolon-user-page-actions"><a class="raised stolon-button primary large fill" href="web/">Go to sign in</a></div>
</section>
<script type="module">
const base = await import('./web/configurationpage?name=myplugin_stolon.js');
const session = await base.startUserPage();
document.getElementById('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const answer = await session.request('MyPlugin/Invites/' + this.dataset.code + '/Redeem', { method: 'POST' });
    if (answer.ok) base.showUserPageView('done');
    else base.setUserPageMessage(document.getElementById('message'), 'error', 'That username is taken.');
});
</script>
```

The frame, which `HostedPage` writes:

* `stolon-user-page` on the body, the page color, the web client's font, and fields a step up for touch.
* `stolon-user-page-header` with `stolon-user-page-server`, the server's name as a link to the web client, and `stolon-user-page-mark`, the plugin's mark.
* `stolon-user-page-column`, the centered column, and `stolon-user-page-gate` and `stolon-user-page-content` inside it.

The parts a plugin writes:

* `stolon-user-page-card`, the frame every step sits in, with `stolon-user-page-title`, `stolon-user-page-subtitle`, and `stolon-user-page-lead`.
* `stolon-user-page-form` and `stolon-user-page-field`, a label over its input, with `stolon-user-page-hint` under it.
* `stolon-user-page-actions`, a stack of full width buttons. Use `stolon-button primary large fill` for the main action.
* `stolon-user-page-message`, a Callout with the icon of its state, written by `setUserPageMessage`.
* `stolon-user-page-steps`, short numbered steps on an `ol`.
* `stolon-user-page-split`, two cards side by side that stack when the column is narrow.
* `stolon-user-page-done` and `stolon-user-page-done-icon`, the finished state.

Every address in the content is relative to the server root, since the page sets its base there. Write `web/` for the web client and `MyPlugin/Devices` for the plugin's API.

## States and Modifiers

* `stolon-wide` on the body widens the header and the column, for a split. `HostedPage.Wide` sets it.
* `data-stolon-state` on `stolon-user-page-done` colors the icon: `success` green, `info` blue, `warn` orange, and `error` red.
* `data-stolon-access` on the body is `anyone`, `user`, or `administrator`. On the last two the content stays hidden until `startUserPage` sets `data-stolon-ready`.
* `data-stolon-view` names a view for `showUserPageView`. One view shows and the rest hide.
* A QR Code on the page is dark on white, since some scanners cannot read light on dark.

## Gotchas

* The check in the browser only decides what the page shows. The plugin's API enforces access with `[Authorize]` or `[Authorize(Policy = HostedPage.AdministratorPolicy)]`.
* `startUserPage` reads the sign-in the web client stored in this browser. A viewer signed in on another device, or in another browser, gets the sign in card.
* The first call to `startUserPage` starts the check, and the template calls it after the content's scripts. Pass the options from the content's script, or through `HostedPage.Translations`.
* A link to `#part` resolves against the server root, since the page sets its base there. Scroll from a script instead.
* The page is always dark, since it loads no Jellyfin theme.

## Reference

<!-- reference:start -->

### `startUserPage`

<code>function startUserPage(options?: UserPageOptions): Promise&lt;UserPageSession &#124; null&gt;</code>

Starts a user page that HostedPage serves. It loads the plugin's translations, and on a page for signed in viewers or administrators it checks the viewer with the sign-in the web client stored in this browser. A viewer who may not see the page gets a card that sends them to the web client, and the content stays hidden. The first call starts the check and later calls return the same promise, so the page's own script calls it to get the session.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `translations` | <code>string</code> | address of the plugin's translations relative to the server root, such as MyPlugin/Translations [optional] |
| `signInText` | <code>string</code> | the sign in button's label (default 'Sign in') |
| `signInMessage` | <code>string</code> | the sentence for a viewer who is not signed in (default 'Sign in to Jellyfin to open this page.') |
| `deniedMessage` | <code>string</code> | the sentence for a viewer who is not an administrator (default 'Only administrators can open this page.') |
| `unreachableMessage` | <code>string</code> | the sentence when the server does not answer (default 'Could not reach the server.') |
| `backText` | <code>string</code> | the button's label when signing in would not help (default 'Back to Jellyfin') |

### `showUserPageView`

<code>function showUserPageView(name: string, root?: ParentNode): void</code>

Shows one view of a user page and hides the rest, such as the form and then the finished state. A view is any element with a data-stolon-view name.

### `setUserPageMessage`

<code>function setUserPageMessage(element: HTMLElement, state: UserPageMessageState, text: string): void</code>

Writes a message into an element of a user page, as a Callout with the icon of its state, and announces it. An empty text hides the element.

| Type | What it is |
| :--- | :--- |
| `UserPageAccess` | Who may open a user page, as HostedPage writes it into data-stolon-access. |
| `UserPageUser` | The signed in viewer, as Jellyfin's Users/Me answers. |
| `UserPageSession` | What startUserPage resolves to once the viewer may see the page. request calls the server's API as the viewer. |
| `UserPageMessageState` | The state of a user page message, as the Callout draws it. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-user-page` | A whole page a plugin hosts for regular users, on the dark page color with the web client's font and field sizes a step up for touch |
| `stolon-user-page-header` | The header, the server's name as a link to the web client and the plugin's mark, as wide as the column |
| `stolon-user-page-column` | The centered column under the header that holds the cards |
| `stolon-user-page.stolon-wide` | The wide column, for content set side by side such as a QR code beside its steps |
| `stolon-user-page-card` | A card on the surface, the one frame every step of a user page sits in |
| `stolon-user-page-title` | The card's heading, and the short paragraph under it |
| `stolon-user-page-form` | A stack of fields, each a label over its input with an optional hint under it |
| `stolon-user-page-actions` | A stack of full width buttons at the end of a card |
| `stolon-user-page-steps` | Short numbered steps, such as how to add a tunnel on one platform |
| `stolon-user-page-split` | Two parts side by side that stack once the column is too narrow for both, such as a QR code and its steps |
| `stolon-user-page-done` | The finished state, or the page script's sign in ask: a round icon in its state's color over a heading, a sentence, and its buttons |
| `stolon-user-page-message.stolon-icon-text` | A message in a card, a callout with the icon of its state, which setUserPageMessage writes |

<!-- reference:end -->

## Example

The parts of the kit.

<iframe class="stolon-preview" src="../../../assets/previews/user-page.html" title="User Page example" loading="lazy"></iframe>

An invite page, a form with a Stepper that turns into the finished state.

<iframe class="stolon-preview" src="../../../assets/previews/user-page-invite.html" title="User Page invite example" loading="lazy"></iframe>

A WireGuard setup page in the wide column, a QR Code and a download beside steps for each platform.

<iframe class="stolon-preview" src="../../../assets/previews/user-page-wireguard.html" title="User Page WireGuard example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "user-page.html"
```

```html
--8<-- "user-page-invite.html"
```

```html
--8<-- "user-page-wireguard.html"
```
