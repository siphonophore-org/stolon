import { stolonText } from './lib/stolon-text.js';
import { pushState, pushSubscribe, pushUnsubscribe, pushLabel } from './lib/push.js';
import { make, listen, runAll, nextId } from './lib/dom.js';
import { setStatus } from './status-text.js';
import type { ComponentHandle } from './types.js';

/**
 * Where a page stands with web push. unsupported has no push in the browser, insecure is a page not on HTTPS, install is an iPhone or
 * iPad page not yet added to the home screen, denied is a person who blocked notifications, off has none yet, and on is subscribed.
 */
export type WebPushState = 'unsupported' | 'insecure' | 'install' | 'denied' | 'off' | 'on';

/** The subscription a page sends its plugin, as PushSubscription.toJSON gives it, with a short name for the device. */
export interface WebPushSubscriptionJson {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    label: string;
}

/** What subscribeWebPush and unsubscribeWebPush take. registration is the plugin's own service worker, and save and remove reach its endpoints. */
export interface WebPushOptions {
    registration: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration>;
    publicKey?: string;
    save?(subscription: WebPushSubscriptionJson): PromiseLike<unknown>;
    remove?(subscription: WebPushSubscriptionJson): PromiseLike<unknown>;
}

/** What subscribeWebPush, unsubscribeWebPush, and webPushState resolve to: the state, and its sentence for the person. */
export interface WebPushResult {
    state: WebPushState;
    message: string;
}

/**
 * Says where a page stands with web push, without asking the person anything. Push works only on a secure origin, HTTPS or localhost,
 * and an iPhone or iPad page only once it is added to the home screen.
 *
 * @param registration the plugin's service worker registration, to read the current subscription [optional]
 * @returns a promise of { state, message }
 */
export function webPushState(registration?: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration> | null): Promise<WebPushResult> {
    return pushState(registration).then(result);
}

/**
 * Asks the person to allow notifications, subscribes the plugin's service worker with the server's VAPID public key, and sends the
 * subscription to the plugin through save. A subscription made with another key is replaced. Call it from a click, since browsers
 * ask only after a gesture.
 *
 * @param options {
 *   registration : the plugin's service worker registration, or a promise of it, such as navigator.serviceWorker.register('sw.js')
 *   publicKey    : the server's VAPID public key, base64url, from StolonNotifier.GetPublicKey
 *   save         : function(subscription) that sends { endpoint, keys, label } to the plugin and returns a promise [optional]
 *   remove       : not used to subscribe [optional]
 * }
 * @returns a promise of { state, message }, on once subscribed
 */
export function subscribeWebPush(options: WebPushOptions): Promise<WebPushResult> {
    return pushSubscribe(options).then(result);
}

/**
 * Removes the plugin's subscription from the plugin through remove, then from the browser.
 *
 * @param options {
 *   registration : the plugin's service worker registration, or a promise of it
 *   publicKey    : not used to unsubscribe [optional]
 *   save         : not used to unsubscribe [optional]
 *   remove       : function(subscription) that tells the plugin to forget it and returns a promise [optional]
 * }
 * @returns a promise of { state, message }, off once removed
 */
export function unsubscribeWebPush(options: WebPushOptions): Promise<WebPushResult> {
    return pushUnsubscribe(options).then(result);
}

/**
 * The sentence a page shows for a web push state, in the page's language.
 *
 * @param state the state
 */
export function webPushText(state: WebPushState): string {
    switch (state) {
        case 'unsupported': return stolonText('Stolon.PushUnsupported');
        case 'insecure': return stolonText('Stolon.PushNeedsHttps');
        case 'install': return stolonText('Stolon.PushAddToHomeScreen');
        case 'denied': return stolonText('Stolon.PushBlocked');
        case 'on': return stolonText('Stolon.PushOn');
        default: return stolonText('Stolon.PushOff');
    }
}

/**
 * A short name for the device a page runs on, such as "Safari · iPhone", for the plugin's list of subscriptions.
 *
 * @param userAgent the user agent to read (default navigator.userAgent)
 */
export function webPushLabel(userAgent?: string): string {
    return pushLabel(userAgent);
}

/** What createWebPushToggle takes. Each address is the plugin's own route, read relative to the page's base, and request sends to it. */
export interface WebPushToggleOptions {
    keyUrl: string;
    subscribeUrl: string;
    unsubscribeUrl: string;
    workerUrl?: string;
    scope?: string;
    registration?: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration>;
    request?(path: string, init?: RequestInit): PromiseLike<unknown>;
    onText?: string;
    offText?: string;
    failedText?: string;
    onChange?(result: WebPushResult): void;
    look?: 'button' | 'settings';
    label?: string;
    id?: string;
    showInsecure?: boolean;
}

/**
 * What createWebPushToggle returns. getState is null until the first check lands, and while the server offers no web push. refresh
 * checks again. In the settings look checkbox is the control and button is not on the page, and without it checkbox is null.
 */
export interface WebPushToggleHandle extends ComponentHandle {
    button: HTMLButtonElement;
    checkbox: HTMLInputElement | null;
    status: HTMLElement;
    getState(): WebPushState | null;
    refresh(): Promise<WebPushState | null>;
    destroy(): void;
}

/**
 * The scope a worker at the server's root is registered at: the path of the page's base, under any base path, ending in a slash.
 *
 * @param baseHref the page's base address, such as document.baseURI
 */
export function webPushScope(baseHref: string): string {
    try {
        var path = new URL(baseHref).pathname;
        return /\/$/.test(path) ? path : path + '/';
    } catch (e) {
        return '/';
    }
}

// A fetch answer gives its JSON, and anything else is the answer already read, as the shared bag's apiRequest gives it.
function body(answer: unknown): unknown {
    var r = answer as { ok?: boolean; json?(): Promise<unknown> } | null;
    if (r && typeof r.json === 'function' && typeof r.ok === 'boolean') {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
    }
    return answer;
}

function keyOf(answer: unknown): string {
    if (typeof answer === 'string') return answer;
    var a = answer as { PublicKey?: string; publicKey?: string } | null;
    return (a && (a.PublicKey || a.publicKey)) || '';
}

var TOGGLE_LOOK: Record<WebPushState, 'success' | 'info' | 'warn'> = { on: 'success', off: 'info', denied: 'warn', unsupported: 'warn', insecure: 'warn', install: 'info' };

/**
 * A status line of where this browser stands with web push, and a button that turns notifications on or off for it. It asks the
 * plugin for the server's VAPID public key, registers the plugin's service worker, and sends the subscription to the plugin's
 * routes. A browser with no push, an iPhone page not on the home screen, and a person who blocked notifications each show their
 * sentence with no button. A page not on HTTPS, where no browser offers push, and a server that offers no key hide the whole toggle. The settings
 * look draws it as a checkbox row of the web client's settings pages, for a page in the web client shell, with the sentence as
 * the row's description, and the checkbox turns on only while notifications can be turned on or off.
 *
 * @param options {
 *   keyUrl         : the route that answers the VAPID public key, as { PublicKey } or the key as text
 *   subscribeUrl   : the route that takes a subscription, posted as JSON
 *   unsubscribeUrl : the route that forgets a subscription, posted as JSON
 *   workerUrl      : the plugin's service worker script, registered at scope [optional]
 *   scope          : the worker's scope (default the path of the page's base)
 *   registration   : the plugin's service worker registration, or a promise of it, in place of workerUrl [optional]
 *   request        : function(path, init) that sends to a route and gives a fetch Response or the answer's JSON (default fetch against the page's base)
 *   onText         : the button's label while notifications are off (default 'Turn on notifications')
 *   offText        : the button's label while notifications are on (default 'Turn off notifications')
 *   failedText     : the line when turning them on or off fails (default 'Could not change notifications in this browser.')
 *   onChange       : function({ state, message }) run after each check and each change [optional]
 *   look           : 'button', the status line and a button, or 'settings', a web client settings checkbox with its state line (default 'button')
 *   label          : the settings checkbox's label (default 'Notifications in this browser')
 *   id             : the settings checkbox's id [optional]
 *   showInsecure   : true shows a page not on HTTPS the sentence that says why, in place of hiding the toggle (default false)
 * }
 * @returns { element, button, checkbox, status, getState, refresh, destroy }
 */
export function createWebPushToggle(options: WebPushToggleOptions): WebPushToggleHandle {
    var opts = options || ({} as WebPushToggleOptions);
    var cleanups: Array<() => void> = [];
    var settings = opts.look === 'settings';
    var root = make('div', settings ? 'checkboxContainer checkboxContainer-withDescription stolon-web-push-settings' : 'stolon-web-push');
    var status = make('div', settings ? 'fieldDescription checkboxFieldDescription' : 'stolon-status-text');
    var button = make('button', 'raised stolon-button stolon-secondary', { type: 'button', is: 'emby-button' });
    var checkbox: HTMLInputElement | null = null;
    if (settings) {
        // A settings page's checkbox once the web client's emby-checkbox upgrades it, with its description under it.
        var row = make('label', 'emby-checkbox-label');
        checkbox = make('input', 'emby-checkbox', { type: 'checkbox', 'data-embycheckbox': 'true', id: opts.id || nextId('web-push') }) as HTMLInputElement;
        checkbox.disabled = true;
        row.appendChild(checkbox);
        row.appendChild(make('span', 'checkboxLabel', null, opts.label || stolonText('Stolon.PushInThisBrowser')));
        var outline = make('span', 'checkboxOutline');
        outline.appendChild(make('span', 'material-icons checkboxIcon checkboxIcon-checked check', { 'aria-hidden': 'true' }));
        outline.appendChild(make('span', 'material-icons checkboxIcon checkboxIcon-unchecked', { 'aria-hidden': 'true' }));
        row.appendChild(outline);
        status.id = checkbox.id + '-state';
        checkbox.setAttribute('aria-describedby', status.id);
        root.appendChild(row);
        root.appendChild(status);
    } else {
        root.appendChild(status);
        root.appendChild(button);
    }
    button.hidden = true;
    // A page not on HTTPS can never turn push on, so the toggle stays out of sight unless the page asks to explain why.
    var hideInsecure = !opts.showInsecure;
    if (hideInsecure && typeof isSecureContext === 'boolean' && !isSecureContext) root.hidden = true;
    var state: WebPushState | null = null;
    var key = '';
    var destroyed = false;

    function base(): string {
        return typeof document !== 'undefined' && document.baseURI ? document.baseURI : '/';
    }

    function send(path: string, init?: RequestInit): Promise<unknown> {
        if (opts.request) return Promise.resolve(opts.request(path, init)).then(body);
        return fetch(new URL(path, base()).href, Object.assign({ credentials: 'same-origin' as RequestCredentials }, init || {})).then(body);
    }

    function post(path: string, subscription: WebPushSubscriptionJson): Promise<unknown> {
        return send(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
    }

    var registration: Promise<ServiceWorkerRegistration | null> | null = null;
    function worker(): Promise<ServiceWorkerRegistration | null> {
        if (registration) return registration;
        var nav = typeof navigator !== 'undefined' ? navigator : null;
        if (opts.registration) registration = Promise.resolve(opts.registration);
        else if (opts.workerUrl && nav && nav.serviceWorker) registration = Promise.resolve(nav.serviceWorker.register(new URL(opts.workerUrl, base()).href, { scope: opts.scope || webPushScope(base()) }));
        else registration = Promise.resolve(null);
        registration = registration.then(null, function () { return null; });
        return registration;
    }

    // The state line: the status text's look by state, or in the settings look the row's plain description.
    function line(text: string, error: boolean, look?: 'success' | 'info' | 'warn'): void {
        if (settings) status.textContent = text;
        else setStatus(root, status, text, error, { timeout: 0, state: look });
    }

    function show(next: WebPushResult): WebPushResult {
        state = next.state;
        root.hidden = hideInsecure && state === 'insecure';
        line(next.message, false, TOGGLE_LOOK[next.state]);
        button.textContent = state === 'on' ? (opts.offText || stolonText('Stolon.PushTurnOff')) : (opts.onText || stolonText('Stolon.PushTurnOn'));
        button.hidden = !(state === 'on' || state === 'off');
        if (checkbox) {
            checkbox.checked = state === 'on';
            checkbox.disabled = !(state === 'on' || state === 'off');
        }
        if (opts.onChange) opts.onChange(next);
        return next;
    }

    function refresh(): Promise<WebPushState | null> {
        return send(opts.keyUrl).then(function (answer) {
            key = keyOf(answer);
            if (destroyed) return null;
            if (!key) {
                state = null;
                root.hidden = true;
                return null;
            }
            root.hidden = false;
            return worker().then(webPushState).then(function (next) { return destroyed ? null : show(next).state; });
        }).then(null, function () {
            state = null;
            root.hidden = true;
            return null;
        });
    }

    function toggle(): Promise<void> {
        var push: WebPushOptions = {
            registration: worker() as PromiseLike<ServiceWorkerRegistration>,
            publicKey: key,
            save: function (sub) { sub.label = sub.label || webPushLabel(); return post(opts.subscribeUrl, sub); },
            remove: function (sub) { return post(opts.unsubscribeUrl, sub); }
        };
        button.disabled = true;
        if (checkbox) checkbox.disabled = true;
        return (state === 'on' ? unsubscribeWebPush(push) : subscribeWebPush(push)).then(function (next) {
            if (!destroyed) show(next);
        }, function () {
            if (destroyed) return;
            line(opts.failedText || stolonText('Stolon.PushFailed'), true);
            if (checkbox) checkbox.checked = state === 'on';
        }).then(function () {
            button.disabled = false;
            if (checkbox) checkbox.disabled = !(state === 'on' || state === 'off');
        });
    }

    cleanups.push(listen(button, 'click', function () { void toggle(); }));
    if (checkbox) cleanups.push(listen(checkbox, 'change', function () { void toggle(); }));
    void refresh();

    return {
        element: root,
        button: button,
        checkbox: checkbox,
        status: status,
        getState: function () { return state; },
        refresh: refresh,
        destroy: function () { destroyed = true; runAll(cleanups); }
    };
}

function result(state: WebPushState): WebPushResult {
    return { state: state, message: webPushText(state) };
}
