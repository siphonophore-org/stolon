import { make, icon, clear } from './lib/dom.js';
import { MESSAGE_ICONS } from './lib/message.js';
import { stolonText } from './lib/stolon-text.js';
import { loadTranslations } from './translations.js';
import { createSpinner } from './spinner.js';

/** Who may open a user page, as HostedPage writes it into data-stolon-access. */
export type UserPageAccess = 'anyone' | 'user' | 'administrator';

/** The signed in viewer, as Jellyfin's Users/Me answers. */
export interface UserPageUser {
    Id: string;
    Name: string;
    Policy?: { IsAdministrator?: boolean };
}

/** What startUserPage takes. Every text replaces a default label. */
export interface UserPageOptions {
    translations?: string;
    signInText?: string;
    signInMessage?: string;
    deniedMessage?: string;
    unreachableMessage?: string;
    backText?: string;
}

/** What startUserPage resolves to once the viewer may see the page. request calls the server's API as the viewer. */
export interface UserPageSession {
    access: UserPageAccess;
    serverId: string | null;
    user: UserPageUser | null;
    token: string | null;
    request(path: string, init?: RequestInit): Promise<Response>;
}

/** The state of a user page message, as the Callout draws it. */
export type UserPageMessageState = 'success' | 'info' | 'warn' | 'error';

// Where the web client keeps its sign-ins. It is the web client's own storage, not a public API.
var CREDENTIALS = 'jellyfin_credentials';
var started: Promise<UserPageSession | null> | null = null;

/**
 * The access tokens the web client stored for a server in this browser, newest first as it lists them.
 * Internal to the web components.
 *
 * @param serverId the server's id from System/Info/Public
 * @param storage where the web client keeps its sign-ins (default localStorage)
 */
export function storedTokens(serverId: string | null, storage?: Storage | null): string[] {
    var tokens: string[] = [];
    if (!serverId) return tokens;
    try {
        var store = storage === undefined ? window.localStorage : storage;
        var raw = store ? store.getItem(CREDENTIALS) : null;
        var servers = raw ? (JSON.parse(raw) || {}).Servers : null;
        if (!Array.isArray(servers)) return tokens;
        servers.forEach(function (s: { Id?: unknown; AccessToken?: unknown }) {
            var t = s && s.Id === serverId ? s.AccessToken : null;
            if (typeof t === 'string' && /^[A-Za-z0-9]{16,128}$/.test(t) && tokens.indexOf(t) === -1) tokens.push(t);
        });
    } catch (e) {
        return [];
    }
    return tokens;
}

/**
 * Reads who may open the page from the user page's body.
 * Internal to the web components.
 */
export function pageAccess(body?: HTMLElement | null): UserPageAccess {
    var value = (body || document.body).getAttribute('data-stolon-access');
    return value === 'user' || value === 'administrator' ? value : 'anyone';
}

/** Forgets the started check, for tests. Internal to the web components. */
export function resetUserPage(): void {
    started = null;
}

function authHeader(token: string): string {
    return 'MediaBrowser Token="' + token + '"';
}

function session(access: UserPageAccess, serverId: string | null, user: UserPageUser | null, token: string | null): UserPageSession {
    return {
        access: access,
        serverId: serverId,
        user: user,
        token: token,
        request: function (path: string, init?: RequestInit): Promise<Response> {
            var options: RequestInit = init ? Object.assign({}, init) : {};
            var headers = new Headers(options.headers || {});
            if (token && !headers.has('Authorization')) headers.set('Authorization', authHeader(token));
            if (!headers.has('Accept')) headers.set('Accept', 'application/json');
            options.headers = headers;
            return fetch(path, options);
        }
    };
}

// Draws the gate in the state's look: an icon, a sentence, and a link back to the web client.
function showGate(state: UserPageMessageState, message: string, linkText: string): void {
    var gate = document.querySelector('.stolon-user-page-gate') as HTMLElement | null;
    if (!gate) return;
    clear(gate);
    var card = make('section', 'stolon-user-page-card stolon-user-page-done', { 'data-stolon-state': state, role: state === 'error' ? 'alert' : 'status' });
    var mark = make('span', 'stolon-user-page-done-icon');
    mark.appendChild(icon(MESSAGE_ICONS[state]));
    card.appendChild(mark);
    card.appendChild(make('p', 'stolon-user-page-lead', null, message));
    var actions = make('div', 'stolon-user-page-actions');
    actions.appendChild(make('a', 'raised stolon-button primary large fill', { href: 'web/' }, linkText));
    card.appendChild(actions);
    gate.appendChild(card);
    gate.hidden = false;
}

/**
 * Starts a user page that HostedPage serves. It loads the plugin's translations, and on a page for signed in viewers or
 * administrators it checks the viewer with the sign-in the web client stored in this browser. A viewer who may not see
 * the page gets a card that sends them to the web client, and the content stays hidden. The first call starts the
 * check and later calls return the same promise, so the page's own script calls it to get the session.
 *
 * @param options {
 *   translations       : address of the plugin's translations relative to the server root, such as MyPlugin/Translations [optional]
 *   signInText         : the sign in button's label (default 'Sign in')
 *   signInMessage      : the sentence for a viewer who is not signed in (default 'Sign in to Jellyfin to open this page.')
 *   deniedMessage      : the sentence for a viewer who is not an administrator (default 'Only administrators can open this page.')
 *   unreachableMessage : the sentence when the server does not answer (default 'Could not reach the server.')
 *   backText           : the button's label when signing in would not help (default 'Back to Jellyfin')
 * }
 * @returns a promise of the session { access, serverId, user, token, request }, or of null when the viewer may not see the page
 */
export function startUserPage(options?: UserPageOptions): Promise<UserPageSession | null> {
    if (started) return started;
    var opts = options || {};
    var body = document.body;
    var access = pageAccess(body);
    var ready = opts.translations ? loadTranslations(opts.translations).then(function () { return null; }) : Promise.resolve(null);

    started = ready.then(function () {
        if (access === 'anyone') {
            body.setAttribute('data-stolon-ready', '');
            return session(access, null, null, null);
        }
        var gate = document.querySelector('.stolon-user-page-gate') as HTMLElement | null;
        var spinner = createSpinner({ size: 'large' });
        if (gate) { clear(gate); gate.appendChild(spinner.element); gate.hidden = false; }
        var back = opts.backText || stolonText('Stolon.BackToJellyfin');

        return fetch('System/Info/Public', { headers: { Accept: 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (info: { Id?: unknown }) {
                var serverId = info && typeof info.Id === 'string' ? info.Id : null;
                var tokens = storedTokens(serverId);
                // Each stored sign-in is tried in turn, since the web client may keep one that has expired.
                function tryToken(index: number): Promise<UserPageSession | null> {
                    if (index >= tokens.length) {
                        showGate('info', opts.signInMessage || stolonText('Stolon.SignInToOpen'), opts.signInText || stolonText('ButtonSignIn'));
                        return Promise.resolve(null);
                    }
                    return fetch('Users/Me', { headers: { Authorization: authHeader(tokens[index]), Accept: 'application/json' } })
                        .then(function (r): Promise<UserPageSession | null> | UserPageSession | null {
                            if (r.status === 401 || r.status === 403) return tryToken(index + 1);
                            if (!r.ok) throw new Error('HTTP ' + r.status);
                            return r.json().then(function (user: UserPageUser) {
                                if (access === 'administrator' && !(user && user.Policy && user.Policy.IsAdministrator)) {
                                    showGate('warn', opts.deniedMessage || stolonText('Stolon.AdminOnly'), back);
                                    return null;
                                }
                                if (gate) { clear(gate); gate.hidden = true; }
                                body.setAttribute('data-stolon-ready', '');
                                return session(access, serverId, user, tokens[index]);
                            });
                        });
                }
                return tryToken(0);
            })
            .catch(function () {
                showGate('error', opts.unreachableMessage || stolonText('Stolon.ServerUnreachable'), back);
                return null;
            })
            .then(function (result) { spinner.destroy(); return result; });
    });
    return started;
}

/**
 * Shows one view of a user page and hides the rest, such as the form and then the finished state. A view is any
 * element with a data-stolon-view name.
 *
 * @param name the data-stolon-view of the view to show
 * @param root where the views are (default the document)
 */
export function showUserPageView(name: string, root?: ParentNode): void {
    var views = (root || document).querySelectorAll('[data-stolon-view]');
    Array.prototype.forEach.call(views, function (view: HTMLElement) {
        view.hidden = view.getAttribute('data-stolon-view') !== name;
    });
}

/**
 * Writes a message into an element of a user page, as a Callout with the icon of its state, and announces it. An empty
 * text hides the element.
 *
 * @param element the message element, which takes the stolon-user-page-message class
 * @param state 'success', 'info', 'warn', or 'error'
 * @param text the sentence, or '' to hide the message
 */
export function setUserPageMessage(element: HTMLElement, state: UserPageMessageState, text: string): void {
    var kind = state === 'success' || state === 'warn' || state === 'error' ? state : 'info';
    clear(element);
    element.className = 'stolon-user-page-message stolon-icon-text stolon-' + kind;
    element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    element.hidden = !text;
    if (!text) return;
    element.appendChild(icon(MESSAGE_ICONS[kind]));
    element.appendChild(make('span', null, null, text));
}
