import { make, clear } from './lib/dom.js';
import { stolonText } from './lib/stolon-text.js';

// The screens every hosted page shows in place of its content: sign in, unauthorized, and not found. In the web client
// frame they use the classes of the web client's own login page (jellyfin-web 12.4, src/controllers/session/login), so
// Jellyfin's stylesheets, the viewer's theme, and custom CSS draw them. In the user page frame they use the user page kit.

/** What Jellyfin answers to a sign in: the user, their token, and the server they signed in to. */
export interface SignInResult {
    User: { Id: string; Name?: string };
    AccessToken: string;
    ServerId: string;
}

/** What createSignIn takes. Every text replaces a default. */
export interface SignInOptions {
    serverId: string;
    serverName?: string | null;
    title?: string;
    message?: string;
    client?: string;
    version?: string;
    onSignedIn: (result: SignInResult, remember: boolean) => void;
}

/** A screen and how to take it down. */
export interface ScreenHandle {
    element: HTMLElement;
    destroy(): void;
}

/** What createUnauthorized and createNotFound take. */
export interface MessageScreenOptions {
    title?: string;
    message?: string;
    linkText?: string;
    href?: string;
}

// Where the web client keeps its sign-ins and its device id. They are the web client's own storage, not a public API.
var CREDENTIALS = 'jellyfin_credentials';
var DEVICE = '_deviceId2';
var TOKEN = /^[A-Za-z0-9]{16,128}$/;
var QUICK_CONNECT_CODE = /^[A-Za-z0-9]{4,12}$/;
var POLL_MS = 5000;
var QUICK_CONNECT_MS = 10 * 60 * 1000;

/** Whether the page is in the web client frame, where Jellyfin's own classes are styled. Internal to the web components. */
export function inWebClientFrame(): boolean {
    return typeof document !== 'undefined' && !!document.body && document.body.classList.contains('stolon-shell');
}

function storage(): Storage | null {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

function readCredentials(): { Servers: Array<Record<string, unknown>> } {
    var raw = storage() ? storage()!.getItem(CREDENTIALS) : null;
    var creds = raw ? JSON.parse(raw) : {};
    if (!creds || typeof creds !== 'object' || Array.isArray(creds)) throw new Error('Unreadable credentials');
    if (creds.Servers === undefined) creds.Servers = [];
    if (!Array.isArray(creds.Servers)) throw new Error('Unreadable credentials');
    return creds;
}

/**
 * Keeps a sign in where the web client keeps its own, so the viewer is signed in to the web client too. Internal to the
 * web components.
 *
 * @param serverId the server's id
 * @param serverName the server's name, or null
 * @param result what Jellyfin answered to the sign in
 * @returns true when the sign in was kept
 */
export function saveSignIn(serverId: string, serverName: string | null, result: SignInResult): boolean {
    try {
        var creds = readCredentials();
        var server = creds.Servers.filter(function (s) { return s && s.Id === serverId; })[0];
        if (!server) {
            server = { Id: serverId, LastConnectionMode: 2 };
            var root = serverRoot();
            if (root) server.ManualAddress = root;
            creds.Servers.push(server);
        }
        if (serverName) server.Name = serverName;
        server.DateLastAccessed = Date.now();
        server.UserId = result.User.Id;
        server.AccessToken = result.AccessToken;
        storage()!.setItem(CREDENTIALS, JSON.stringify(creds));
        return true;
    } catch (e) {
        return false;
    }
}

// The server's address, from the page's base address, which HostedPage points at the server root under any base path.
function serverRoot(): string | null {
    try {
        if (typeof document === 'undefined' || !document.baseURI || typeof URL === 'undefined') return null;
        var href = new URL('.', document.baseURI).href;
        return href.charAt(href.length - 1) === '/' ? href.slice(0, -1) : href;
    } catch (e) {
        return null;
    }
}

function deviceId(): string {
    var id: string | null = null;
    try { id = storage() ? storage()!.getItem(DEVICE) : null; } catch (e) { id = null; }
    if (!id || !/^[A-Za-z0-9+/=._-]{8,512}$/.test(id)) {
        var bytes = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
        else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        id = Array.prototype.map.call(bytes, function (b: number) { return ('0' + b.toString(16)).slice(-2); }).join('');
        try { if (storage()) storage()!.setItem(DEVICE, id as string); } catch (e) { /* the id lasts for this page only */ }
    }
    return id as string;
}

function deviceName(client: string): string {
    var agent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    var known = [['iPhone', 'iPhone'], ['iPad', 'iPad'], ['Android', 'Android'], ['CrOS', 'ChromeOS'], ['Macintosh', 'Mac'], ['Windows', 'Windows'], ['Linux', 'Linux']];
    for (var i = 0; i < known.length; i++) {
        if (agent.indexOf(known[i][0]) >= 0) return client + ' on ' + known[i][1];
    }
    return client;
}

function clientHeader(client: string, version: string): string {
    return 'MediaBrowser Client="' + encodeURIComponent(client) + '", Device="' + encodeURIComponent(deviceName(client))
        + '", DeviceId="' + encodeURIComponent(deviceId()) + '", Version="' + encodeURIComponent(version) + '"';
}

// The server's logo, as the web client's login page draws it. In the web client frame it is the web client's own logo element,
// so the viewer's theme picks the logo and the server's custom CSS replaces it as it does on /web/. In the user page frame,
// which has no Jellyfin stylesheets, it is the logo file HostedPage read from the web client's theme, or nothing.
function serverLogo(web: boolean): HTMLElement {
    if (web) return make('div', 'pageTitle pageTitleWithLogo pageTitleWithDefaultLogo stolon-screen-logo', { 'aria-hidden': 'true' });
    var src = document.body ? document.body.getAttribute('data-stolon-logo') || '' : '';
    var logo = make('img', 'stolon-screen-logo', { src: src, alt: '', decoding: 'async' }) as HTMLImageElement;
    if (!src) logo.hidden = true;
    logo.onerror = function () { logo.hidden = true; };
    return logo;
}

// The screen's frame: the server's logo, a heading, a sentence, then the body. Text is always set as text.
function frame(title: string, message: string | null, web: boolean): { element: HTMLElement; body: HTMLElement; text: HTMLElement | null } {
    var section = make('section', 'stolon-screen' + (web ? ' stolon-screen-web' : ' stolon-user-page-card'), { role: 'region', 'aria-label': title });
    section.appendChild(serverLogo(web));
    section.appendChild(make('h1', 'stolon-screen-title' + (web ? ' sectionTitle' : ' stolon-user-page-title'), null, title));
    var text = message ? make('p', 'stolon-screen-text' + (web ? ' secondaryText' : ' stolon-user-page-lead'), null, message) : null;
    if (text) section.appendChild(text);
    var body = make('div', 'stolon-screen-body');
    section.appendChild(body);
    return { element: section, body: body, text: text };
}

function button(text: string, primary: boolean, web: boolean, type?: string): HTMLButtonElement {
    var cls = web ? 'raised block emby-button' + (primary ? ' button-submit' : '') : 'raised stolon-button stolon-large stolon-fill ' + (primary ? 'stolon-primary' : 'stolon-secondary');
    return make('button', cls + ' stolon-screen-button', { type: type || 'button' }, text) as HTMLButtonElement;
}

function link(text: string, href: string, primary: boolean, web: boolean): HTMLAnchorElement {
    var cls = web ? 'raised block emby-button' + (primary ? ' button-submit' : '') : 'raised stolon-button stolon-large stolon-fill ' + (primary ? 'stolon-primary' : 'stolon-secondary');
    return make('a', cls + ' stolon-screen-button', { href: href }, text) as HTMLAnchorElement;
}

function field(id: string, label: string, type: string, autocomplete: string, web: boolean): { row: HTMLElement; input: HTMLInputElement } {
    var row = make('div', web ? 'inputContainer stolon-screen-field' : 'stolon-user-page-field stolon-screen-field');
    row.appendChild(make('label', web ? 'inputLabel inputLabelUnfocused' : null, { for: id }, label));
    var input = make('input', web ? 'emby-input' : null, { id: id, name: id, type: type, autocomplete: autocomplete, maxlength: type === 'password' ? '1024' : '256' }) as HTMLInputElement;
    if (type === 'text') {
        input.setAttribute('autocapitalize', 'none');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('spellcheck', 'false');
    }
    row.appendChild(input);
    return { row: row, input: input };
}

/**
 * The sign in screen, copied from the web client's own login page: user and password, Remember me, Sign in, Quick Connect
 * when the server has it on, Forgot password, and the server's login disclaimer. It signs in through Jellyfin's own API,
 * never keeps the password past the request, and hands the result to onSignedIn with whether to remember it.
 *
 * @param options {
 *   serverId   : the server's id, which the answer must match (required)
 *   serverName : the server's name, kept with the sign in [optional]
 *   title      : the heading (default 'Please sign in')
 *   message    : the sentence under it (default none)
 *   client     : the client name Jellyfin shows in its devices list (default 'Jellyfin Web')
 *   version    : the client version (default '1.0')
 *   onSignedIn : called with Jellyfin's answer and whether Remember me was on (required)
 * }
 * @returns { element, destroy }
 */
export function createSignIn(options: SignInOptions): ScreenHandle {
    var opts = options;
    var web = inWebClientFrame();
    var client = opts.client || 'Jellyfin Web';
    var version = opts.version || '1.0';
    var parts = frame(opts.title || stolonText('HeaderPleaseSignIn'), opts.message || null, web);
    var root = parts.element;
    root.classList.add('stolon-sign-in');

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
        parts.body.appendChild(make('p', 'stolon-screen-warning' + (web ? ' fieldDescription' : ''), { role: 'note' }, stolonText('Stolon.InsecureSignIn')));
    }

    var form = make('form', (web ? 'manualLoginForm' : 'stolon-user-page-form') + ' stolon-sign-in-form', { method: 'post', autocomplete: 'on', novalidate: true }) as HTMLFormElement;
    var user = field('stolonSignInUser', stolonText('LabelUser'), 'text', 'username', web);
    var password = field('stolonSignInPassword', stolonText('LabelPassword'), 'password', 'current-password', web);
    form.appendChild(user.row);
    form.appendChild(password.row);

    var rememberRow = make('div', web ? 'checkboxContainer stolon-sign-in-remember' : 'stolon-sign-in-remember');
    var rememberLabel = make('label', web ? 'emby-checkbox-label' : 'stolon-check-row');
    var remember = make('input', web ? 'emby-checkbox' : null, { type: 'checkbox', id: 'stolonSignInRemember' }) as HTMLInputElement;
    remember.checked = true;
    rememberLabel.appendChild(remember);
    rememberLabel.appendChild(make('span', web ? 'checkboxLabel' : null, null, stolonText('RememberMe')));
    rememberRow.appendChild(rememberLabel);
    form.appendChild(rememberRow);

    var submit = button(stolonText('ButtonSignIn'), true, web, 'submit');
    var quick = button(stolonText('ButtonUseQuickConnect'), false, web);
    quick.hidden = true;
    var error = make('div', 'stolon-screen-error' + (web ? ' formError' : ''), { role: 'alert', 'aria-live': 'assertive' });
    form.appendChild(submit);
    form.appendChild(quick);
    form.appendChild(error);
    parts.body.appendChild(form);

    var quickPanel = make('div', 'stolon-sign-in-quick-connect', { role: 'status', 'aria-live': 'polite' });
    quickPanel.hidden = true;
    var quickPrompt = make('p', 'stolon-screen-text' + (web ? ' secondaryText' : ''), null, stolonText('Stolon.QuickConnectPrompt'));
    var quickCode = make('p', 'stolon-sign-in-code');
    var quickCancel = button(stolonText('ButtonCancel'), false, web);
    quickPanel.appendChild(quickPrompt);
    quickPanel.appendChild(quickCode);
    quickPanel.appendChild(quickCancel);
    parts.body.appendChild(quickPanel);

    var after = make('div', 'stolon-sign-in-after');
    after.appendChild(link(stolonText('ButtonForgotPassword'), 'web/#/forgotpassword', false, web));
    var disclaimer = make('p', 'stolon-sign-in-disclaimer' + (web ? ' fieldDescription' : ''));
    disclaimer.hidden = true;
    after.appendChild(disclaimer);
    parts.body.appendChild(after);

    var busy = false;
    var destroyed = false;
    var quickSession: { secret: string; timer: ReturnType<typeof setTimeout> | null; expires: number } | null = null;

    function setBusy(on: boolean): void {
        busy = on;
        [user.input, password.input, remember, submit, quick].forEach(function (c) { c.disabled = on; });
    }

    function authenticate(path: string, body: Record<string, unknown>, rejected: string): Promise<SignInResult> {
        return fetch(path, {
            method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
            headers: { Authorization: clientHeader(client, version), 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body)
        }).catch(function () {
            throw new Error(stolonText('Stolon.ServerUnreachable'));
        }).then(function (r) {
            if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error(rejected);
            if (!r.ok) throw new Error(stolonText('UnknownError'));
            return r.json().catch(function () { return null; });
        }).then(function (result: SignInResult | null) {
            if (!result || !result.User || typeof result.User.Id !== 'string' || !TOKEN.test(String(result.AccessToken)) || result.ServerId !== opts.serverId) {
                throw new Error(stolonText('UnknownError'));
            }
            return result;
        });
    }

    function signedIn(result: SignInResult): void {
        stopQuickConnect();
        password.input.value = '';
        if (destroyed) return;
        opts.onSignedIn(result, remember.checked);
    }

    function stopQuickConnect(): void {
        if (quickSession && quickSession.timer) clearTimeout(quickSession.timer);
        quickSession = null;
        quickCode.textContent = '';
        quickPanel.hidden = true;
        form.hidden = false;
    }

    function failed(message: string): void {
        stopQuickConnect();
        setBusy(false);
        error.textContent = message;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;
        var name = user.input.value.trim();
        if (!name) { user.input.focus(); return; }
        error.textContent = '';
        setBusy(true);
        authenticate('Users/AuthenticateByName', { Username: name, Pw: password.input.value }, stolonText('MessageInvalidUser'))
            .then(signedIn, function (err: Error) {
                setBusy(false);
                password.input.value = '';
                error.textContent = err.message;
                password.input.focus();
            });
    });

    quick.addEventListener('click', function () {
        if (busy) return;
        error.textContent = '';
        setBusy(true);
        fetch('QuickConnect/Initiate', { method: 'POST', credentials: 'omit', cache: 'no-store', headers: { Authorization: clientHeader(client, version), Accept: 'application/json' } })
            .catch(function () { throw new Error(stolonText('Stolon.ServerUnreachable')); })
            .then(function (r) {
                if (!r.ok) throw new Error(stolonText('QuickConnectNotActive'));
                return r.json();
            })
            .then(function (data: { Secret?: unknown; Code?: unknown }) {
                if (!data || typeof data.Secret !== 'string' || !data.Secret || !QUICK_CONNECT_CODE.test(String(data.Code))) throw new Error(stolonText('UnknownError'));
                setBusy(false);
                var session = { secret: data.Secret, timer: null as ReturnType<typeof setTimeout> | null, expires: Date.now() + QUICK_CONNECT_MS };
                quickSession = session;
                quickCode.textContent = String(data.Code);
                form.hidden = true;
                quickPanel.hidden = false;
                quickCancel.focus();
                function poll(): void {
                    if (quickSession !== session) return;
                    if (Date.now() > session.expires) { failed(stolonText('Stolon.QuickConnectExpired')); return; }
                    fetch('QuickConnect/Connect?secret=' + encodeURIComponent(session.secret), { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } })
                        .then(function (r) {
                            if (r.status === 400 || r.status === 401 || r.status === 403 || r.status === 404) return { expired: true };
                            return r.ok ? r.json() : null;
                        })
                        .then(function (state: { expired?: boolean; Authenticated?: boolean } | null): Promise<void> | void {
                            if (quickSession !== session) return;
                            if (state && state.expired) { failed(stolonText('Stolon.QuickConnectExpired')); return; }
                            if (!state || state.Authenticated !== true) { session.timer = setTimeout(poll, POLL_MS); return; }
                            return authenticate('Users/AuthenticateWithQuickConnect', { Secret: session.secret }, stolonText('Stolon.QuickConnectExpired'))
                                .then(function (result) { if (quickSession === session) signedIn(result); });
                        })
                        .catch(function (err: Error) {
                            if (quickSession !== session) return;
                            // A dropped connection is tried again, since the code is still good.
                            if (err instanceof TypeError || (err && err.message === stolonText('Stolon.ServerUnreachable'))) { session.timer = setTimeout(poll, POLL_MS); return; }
                            failed(err && err.message ? err.message : stolonText('UnknownError'));
                        });
                }
                session.timer = setTimeout(poll, POLL_MS);
            })
            .catch(function (err: Error) { failed(err.message); });
    });

    quickCancel.addEventListener('click', function () {
        stopQuickConnect();
        user.input.focus();
    });

    // Quick Connect shows only when the server has it on, and the disclaimer only when the server has one. Both are text.
    fetch('QuickConnect/Enabled', { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : false; })
        .then(function (on) { if (on === true && !destroyed) quick.hidden = false; }, function () { /* left hidden */ });
    fetch('Branding/Configuration', { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (branding: { LoginDisclaimer?: unknown } | null) {
            if (destroyed || !branding || typeof branding.LoginDisclaimer !== 'string' || !branding.LoginDisclaimer.trim()) return;
            disclaimer.textContent = branding.LoginDisclaimer;
            disclaimer.hidden = false;
        }, function () { /* no disclaimer */ });

    return {
        element: root,
        destroy: function () {
            destroyed = true;
            stopQuickConnect();
            password.input.value = '';
            if (root.parentNode) root.parentNode.removeChild(root);
        }
    };
}

function messageScreen(title: string, message: string, linkText: string, href: string, extra: string): ScreenHandle {
    var web = inWebClientFrame();
    var parts = frame(title, message, web);
    parts.element.classList.add(extra);
    parts.element.setAttribute('role', 'alert');
    parts.body.appendChild(link(linkText, href, true, web));
    return { element: parts.element, destroy: function () { if (parts.element.parentNode) parts.element.parentNode.removeChild(parts.element); } };
}

/**
 * The screen for a signed in viewer the page does not admit, such as a page for administrators or for selected people.
 *
 * @param options { title (default 'You can't open this page'), message (default Jellyfin's unauthorized sentence), linkText (default 'Home'), href (default 'web/') } [optional]
 * @returns { element, destroy }
 */
export function createUnauthorized(options?: MessageScreenOptions): ScreenHandle {
    var opts = options || {};
    return messageScreen(opts.title || stolonText('Stolon.UnauthorizedTitle'), opts.message || stolonText('MessageUnauthorizedUser'),
        opts.linkText || stolonText('Home'), opts.href || 'web/', 'stolon-unauthorized');
}

/**
 * The screen for an address or an item that does not exist.
 *
 * @param options { title (default 'Page not found'), message (default Jellyfin's not found sentence), linkText (default 'Home'), href (default 'web/') } [optional]
 * @returns { element, destroy }
 */
export function createNotFound(options?: MessageScreenOptions): ScreenHandle {
    var opts = options || {};
    return messageScreen(opts.title || stolonText('HeaderPageNotFound'), opts.message || stolonText('PageNotFound'),
        opts.linkText || stolonText('Home'), opts.href || 'web/', 'stolon-not-found');
}

/**
 * Puts a screen in the page's gate, in place of anything there, and shows the gate. Internal to the web components.
 *
 * @param screen the screen
 */
export function showScreen(screen: ScreenHandle): void {
    var gate = document.querySelector('.stolon-user-page-gate') as HTMLElement | null;
    if (!gate) return;
    clear(gate);
    gate.appendChild(screen.element);
    gate.hidden = false;
}
