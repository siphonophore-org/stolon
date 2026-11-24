// web-client-shell.ts
// The page script of the web client shell, the HostedPage frame that looks like Jellyfin's own web client. It checks the
// viewer through the user page script, then follows the viewer's web client settings, theme and custom CSS, and fills the
// app bar, user menu, and drawer as jellyfin-web 12.4 draws them (GPL-2.0-or-later).
import { startUserPage } from './user-page.js';
import type { UserPageOptions, UserPageSession, UserPageUser } from './user-page.js';
import { stolonText } from './lib/stolon-text.js';
import {
    createWebToaster, webIcon, webLibraryIcon, webLibraryRoute, webUserViewsShown, webNavButton, webNavMoreButton,
    webMenuItem, webMenuDivider, webDrawerItem, webDrawerList
} from './web-client-markup.js';
import type { WebToasterHandle, WebUserView } from './web-client-markup.js';

/** An entry a plugin adds to the user menu, after Settings: a link with href, or select for one the page answers itself. */
export interface WebClientMenuItem {
    text: string;
    icon: string;
    href?: string;
    select?: () => void;
}

/** What startWebClientShell takes: the user page's options, and the plugin's own user menu entries. */
export interface WebClientShellOptions extends UserPageOptions {
    menuItems?: WebClientMenuItem[];
}

/** What startWebClientShell resolves to: the viewer's session, a toast in the web client's look, and destroy. */
export interface WebClientShellSession extends UserPageSession {
    toast: WebToasterHandle;
    destroy(): void;
}

/** A theme of the web client's config.json. */
export interface WebClientTheme {
    id: string;
    default?: boolean;
}

/** What applyWebClientLook takes. */
export interface WebClientLookOptions {
    userId?: string | null;
    themes?: WebClientTheme[] | null;
    storage?: Storage | null;
}

/** What applyWebClientLook applied: the theme, and whether the server's and the viewer's custom CSS are on the page. */
export interface WebClientLook {
    theme: string;
    serverCss: boolean;
    userCss: boolean;
}

// The palette the web client's Material UI theme writes as variables at runtime, by theme, from jellyfin-web 12.4. The theme
// stylesheets read them, and the shell sets them as the web client would. The overlays are Material UI's dark paper overlays.
var DARK_OVERLAYS = {
    '--stolon-shell-overlay-1': 'linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))',
    '--stolon-shell-overlay-8': 'linear-gradient(rgba(255, 255, 255, 0.119), rgba(255, 255, 255, 0.119))',
    '--stolon-shell-overlay-16': 'linear-gradient(rgba(255, 255, 255, 0.147), rgba(255, 255, 255, 0.147))'
};
var NO_OVERLAYS = { '--stolon-shell-overlay-1': 'none', '--stolon-shell-overlay-8': 'none', '--stolon-shell-overlay-16': 'none' };

function palette(values: string, overlays: Record<string, string>): Record<string, string> {
    var out: Record<string, string> = {};
    values.split(';').forEach(function (pair) {
        var at = pair.indexOf(':');
        if (at > 0) out['--jf-palette-' + pair.slice(0, at).trim()] = pair.slice(at + 1).trim();
    });
    Object.keys(overlays).forEach(function (k) { out[k] = overlays[k]; });
    return out;
}

/** The variables the web client's Material UI theme sets for each of its themes, by theme id. */
export var WEB_CLIENT_PALETTES: Record<string, Record<string, string>> = {
    dark: palette('info-main:#29b6f6;Alert-infoFilledBg:#0288d1;Alert-infoFilledColor:#fff;AppBar-defaultBg:#202020;Button-inheritContainedBg:#424242;Button-inheritContainedHoverBg:#616161;FilledInput-bg:rgba(255,255,255,0.09);SnackbarContent-bg:#303030;SnackbarContent-color:rgba(255,255,255,0.87);action-focus:rgba(255,255,255,0.12);action-hover:rgba(255,255,255,0.08);action-selectedOpacity:0.2;action-hoverOpacity:0.08;background-default:#101010;background-paper:#202020;common-white:#fff;divider:rgba(255,255,255,0.12);error-contrastText:#fff;error-light:rgb(209,83,83);error-main:#c62828;primary-contrastText:rgba(0,0,0,0.87);primary-dark:rgb(0,114,154);primary-main:#00a4dc;primary-mainChannel:0 164 220;secondary-contrastText:rgba(0,0,0,0.87);secondary-main:#00a4dc;text-primary:#fff;text-secondary:rgba(255,255,255,0.7);action-active:#fff;text-primaryChannel:255 255 255', DARK_OVERLAYS),
    light: palette('info-main:#0288d1;Alert-infoFilledBg:#fff3a5;Alert-infoFilledColor:#000;AppBar-defaultBg:#e8e8e8;Button-inheritContainedBg:#d8d8d8;Button-inheritContainedHoverBg:#ccc;FilledInput-bg:rgba(0,0,0,0.06);SnackbarContent-bg:rgb(48,48,48);SnackbarContent-color:#fff;action-focus:#bbb;action-hover:#ddd;action-selectedOpacity:0.2;action-hoverOpacity:0.04;background-default:#f2f2f2;background-paper:#e8e8e8;common-white:#fff;divider:rgba(0,0,0,0.12);error-contrastText:#fff;error-light:rgb(209,83,83);error-main:#c62828;primary-contrastText:rgba(0,0,0,0.87);primary-dark:rgb(0,114,154);primary-main:#00a4dc;primary-mainChannel:0 164 220;secondary-contrastText:rgba(0,0,0,0.87);secondary-main:#00a4dc;text-primary:#000;text-secondary:rgba(0,0,0,0.87);action-active:rgba(0,0,0,0.54);text-primaryChannel:0 0 0', NO_OVERLAYS),
    appletv: palette('info-main:#0288d1;Alert-infoFilledBg:#fff3a5;Alert-infoFilledColor:#000;AppBar-defaultBg:#bcbcbc;Button-inheritContainedBg:rgba(0,0,0,0.14);Button-inheritContainedHoverBg:rgba(0,0,0,0.24);FilledInput-bg:rgba(255,255,255,0.9);SnackbarContent-bg:#303030;SnackbarContent-color:rgba(255,255,255,0.87);action-focus:rgba(0,0,0,0.2);action-hover:rgba(0,0,0,0.1);action-selectedOpacity:0.2;action-hoverOpacity:0.04;background-default:#d5e9f2;background-paper:#eaeaea;common-white:#fff;divider:rgba(0,0,0,0.158);error-contrastText:#fff;error-light:#ef5350;error-main:#c62828;primary-contrastText:#fff;primary-dark:#1565c0;primary-main:#00a4dc;primary-mainChannel:25 118 210;secondary-contrastText:#fff;secondary-main:#00a4dc;text-primary:rgba(0,0,0,0.87);text-secondary:rgba(0,0,0,0.87);action-active:rgba(0,0,0,0.54);text-primaryChannel:0 0 0', NO_OVERLAYS),
    blueradiance: palette('Alert-infoFilledBg:#111;Alert-infoFilledColor:#ddd;AppBar-defaultBg:#011432;Button-inheritContainedBg:rgba(0,0,0,0.5);Button-inheritContainedHoverBg:rgba(0,0,0,0.7);FilledInput-bg:rgba(255,255,255,0.09);SnackbarContent-bg:rgb(250,250,250);SnackbarContent-color:rgba(0,0,0,0.87);action-focus:#00a4dc;action-hover:rgba(0,164,220,0.2);action-selectedOpacity:0.2;action-hoverOpacity:0.08;background-default:#033361;background-paper:#011432;common-white:#fff;divider:rgba(255,255,255,0.12);error-contrastText:#fff;error-light:#e57373;error-main:#c62828;primary-contrastText:rgba(0,0,0,0.87);primary-dark:#42a5f5;primary-main:#00a4dc;primary-mainChannel:144 202 249;secondary-contrastText:rgba(0,0,0,0.87);secondary-main:#00a4dc;text-primary:#eee;text-secondary:rgba(255,255,255,0.9);action-active:#fff;text-primaryChannel:255 255 255', DARK_OVERLAYS),
    purplehaze: palette('Alert-infoFilledBg:#dbe6ff;Alert-infoFilledColor:#0e0f2d;AppBar-defaultBg:#230c33;Button-inheritContainedBg:rgba(0,0,0,0.5);Button-inheritContainedHoverBg:rgb(12,232,214);FilledInput-bg:rgba(0,0,0,0.5);SnackbarContent-bg:#303030;SnackbarContent-color:rgba(255,255,255,0.87);action-focus:rgba(0,0,0,0.3);action-hover:#12122f;action-selectedOpacity:0.2;action-hoverOpacity:0.08;background-default:#230c33;background-paper:#230c33;common-white:#fff;divider:rgba(255,255,255,0.14);error-contrastText:#fff;error-light:#e57373;error-main:#c62828;primary-contrastText:rgba(0,0,0,0.87);primary-dark:#42a5f5;primary-main:#48c3c8;primary-mainChannel:144 202 249;secondary-contrastText:rgba(0,0,0,0.87);secondary-main:#ff77f1;text-primary:#f8f8fe;text-secondary:rgba(248,248,254,0.973);action-active:#fff;text-primaryChannel:255 255 255', DARK_OVERLAYS),
    wmc: palette('Alert-infoFilledBg:#fff3a5;Alert-infoFilledColor:#000;AppBar-defaultBg:#0c2450;Button-inheritContainedBg:#082845;Button-inheritContainedHoverBg:#143451;FilledInput-bg:rgba(255,255,255,0.09);SnackbarContent-bg:rgb(250,250,250);SnackbarContent-color:rgba(0,0,0,0.87);action-focus:#00a4dc;action-hover:rgba(0,164,220,0.2);action-selectedOpacity:0.2;action-hoverOpacity:0.08;background-default:#0f3562;background-paper:#0c2450;common-white:#fff;divider:rgba(255,255,255,0.12);error-contrastText:#fff;error-light:#e57373;error-main:#c62828;primary-contrastText:rgba(0,0,0,0.87);primary-dark:#42a5f5;primary-main:#00a4dc;primary-mainChannel:144 202 249;secondary-contrastText:rgba(0,0,0,0.87);secondary-main:#00a4dc;text-primary:#eee;text-secondary:rgba(255,255,255,0.9);action-active:#fff;text-primaryChannel:255 255 255', DARK_OVERLAYS)
};

// The web client's own themes, for a config.json that lists none.
var THEMES = ['dark', 'light', 'appletv', 'blueradiance', 'purplehaze', 'wmc'];
var THEME_NAME = /^[A-Za-z0-9_-]{1,64}$/;
var CREDENTIALS = 'jellyfin_credentials';

function read(storage: Storage | null | undefined, key: string): string | null {
    try { return storage ? storage.getItem(key) : null; } catch (e) { return null; }
}

function defaultStorage(): Storage | null {
    try { return window.localStorage; } catch (e) { return null; }
}

/**
 * The user the web client's stored sign-in for a server names, the one whose settings the shell follows before the viewer is
 * checked. Internal to the web components.
 *
 * @param serverId the server's id
 * @param storage where the web client keeps its sign-ins (default localStorage)
 */
export function storedUserId(serverId: string | null, storage?: Storage | null): string | null {
    if (!serverId) return null;
    try {
        var raw = read(storage === undefined ? defaultStorage() : storage, CREDENTIALS);
        var servers = raw ? (JSON.parse(raw) || {}).Servers : null;
        if (!Array.isArray(servers)) return null;
        var found = servers.filter(function (s: { Id?: unknown; AccessToken?: unknown }) { return s && s.Id === serverId && s.AccessToken; })[0];
        return found && typeof found.UserId === 'string' ? found.UserId : null;
    } catch (e) {
        return null;
    }
}

function element(selector: string): HTMLElement | null {
    return document.querySelector(selector) as HTMLElement | null;
}

/**
 * Follows the viewer's web client look in the order the web client applies it: their theme, then the server's custom CSS
 * from Branding/Css unless they turned it off, then their own custom CSS from Display settings. Both custom stylesheets go
 * last in the page, after Stolon's and the plugin's styles, so they win as in the web client. The viewer's CSS is set as the
 * text of a style element. Call it again once the viewer is known.
 *
 * @param options {
 *   userId  : the viewer, whose settings it reads, or null for no signed in viewer [optional]
 *   themes  : the themes the web client's config.json lists (default the web client's six)
 *   storage : where the web client keeps its settings (default localStorage)
 * }
 */
export function applyWebClientLook(options?: WebClientLookOptions): WebClientLook {
    var opts = options || {};
    var storage = opts.storage === undefined ? defaultStorage() : opts.storage;
    var userId = opts.userId && THEME_NAME.test(opts.userId) ? opts.userId : null;
    var themes: WebClientTheme[] = (opts.themes && opts.themes.length ? opts.themes : THEMES.map(function (id): WebClientTheme { return { id: id }; }))
        .filter(function (t) { return t && THEME_NAME.test(t.id); });
    var picked = (userId && read(storage, userId + '-appTheme')) || read(storage, 'appTheme');
    var ids = themes.map(function (t) { return t.id; });
    var theme = picked && ids.indexOf(picked) !== -1 ? picked : (themes.filter(function (t) { return t.default; })[0] || themes[0] || { id: 'dark' }).id;

    var root = document.documentElement;
    var head = (document as Document & { head?: HTMLElement }).head || root;
    var link = element('#stolon-shell-theme') as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement('link');
        link.id = 'stolon-shell-theme';
        link.setAttribute('rel', 'stylesheet');
        head.appendChild(link);
    }
    var href = 'web/themes/' + theme + '/theme.css';
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    root.setAttribute('data-theme', theme);
    var vars = WEB_CLIENT_PALETTES[theme] || WEB_CLIENT_PALETTES.dark;
    Object.keys(vars).forEach(function (name) { root.style.setProperty(name, vars[name]); });

    var parent = document.body;
    var branding = element('#stolon-shell-branding');
    var serverCss = !(userId && read(storage, userId + '-disableCustomCss') === 'true');
    if (serverCss) {
        if (!branding) {
            branding = document.createElement('link');
            branding.id = 'stolon-shell-branding';
            branding.setAttribute('rel', 'stylesheet');
            branding.setAttribute('href', 'Branding/Css');
        }
        parent.appendChild(branding);
    } else if (branding) {
        branding.remove();
    }

    var own = element('#stolon-shell-user-css');
    var css = userId ? read(storage, userId + '-customCss') || '' : '';
    if (css) {
        if (!own) {
            own = document.createElement('style');
            own.id = 'stolon-shell-user-css';
        }
        own.textContent = css;
        parent.appendChild(own);
    } else if (own) {
        own.remove();
    }
    return { theme: theme, serverCss: serverCss, userCss: !!css };
}

/**
 * The web client's layout for this browser, as its layoutManager picks it: the one chosen in its display settings, else
 * mobile on a phone or tablet by the browser's name, and desktop elsewhere. Internal to the web components.
 *
 * @param userAgent the browser's name (default navigator.userAgent)
 * @param storage where the web client keeps its settings (default localStorage)
 */
export function webClientLayout(userAgent?: string, storage?: Storage | null): 'mobile' | 'desktop' {
    var saved = read(storage === undefined ? defaultStorage() : storage, 'layout') || '';
    var agent = String(userAgent === undefined ? (typeof navigator !== 'undefined' ? navigator.userAgent : '') : userAgent).toLowerCase();
    var phone = ['mobi', 'ipad', 'iphone', 'ipod', 'silk', 'gt-p1000', 'nexus 7', 'kindle fire', 'opera mini'].some(function (t) { return agent.indexOf(t) !== -1; });
    return saved === 'mobile' || (saved !== 'desktop' && saved !== 'tv' && phone) ? 'mobile' : 'desktop';
}

interface NavEntry {
    href: string;
    icon: string;
    name: string;
    current?: boolean;
    external?: boolean;
}

/** A link of the web client's config.json menuLinks. */
interface MenuLink {
    name?: unknown;
    url?: unknown;
    icon?: unknown;
}

/**
 * The bar's entries before the libraries: the config.json menu links a browser opens as pages, with the one that points
 * here marked current, and this page's own entry first when no link points here. Internal to the web components.
 *
 * @param links the config.json menuLinks
 * @param here this page's address
 * @param mark this page's own entry, its name and Material icon, or null for none
 * @param root the server root, which the page's base address names (default document.baseURI)
 */
export function webClientMenuLinks(links: MenuLink[] | null | undefined, here: URL, mark: { name: string; icon: string } | null, root?: string): NavEntry[] {
    var web = new URL('web/', root || document.baseURI || here.href);
    var path = here.pathname.replace(/\/?$/, '/');
    var out: NavEntry[] = [];
    (links || []).forEach(function (l) {
        if (!l || typeof l.name !== 'string' || typeof l.url !== 'string' || !l.name || !l.url) return;
        var url: URL;
        try { url = new URL(l.url, web.href); } catch (e) { return; }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        var mine = url.origin === here.origin && url.pathname.replace(/\/?$/, '/') === path;
        out.push({ href: mine ? path : url.href, icon: webIcon(typeof l.icon === 'string' && l.icon ? l.icon : 'link'), name: l.name, current: mine, external: !mine });
    });
    if (mark && mark.name && !out.some(function (e) { return e.current; })) out.unshift({ href: path, icon: webIcon(mark.icon || 'extension'), name: mark.name, current: true });
    return out;
}

function svgOf(name: string): string {
    return webIcon(name);
}

// A Material UI menu's keys: Escape closes it back to its button, Tab closes it, and the arrows move through its entries.
function menuKeys(e: KeyboardEvent, menu: HTMLElement, close: (refocus: boolean) => void): void {
    var items = Array.prototype.slice.call(menu.querySelectorAll('.stolon-shell-menu-item')) as HTMLElement[];
    var at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var down = e.key === 'ArrowDown';
        var next = at < 0 ? (down ? 0 : items.length - 1) : (at + (down ? 1 : items.length - 1)) % items.length;
        if (items[next]) items[next].focus();
    }
}

var started: Promise<WebClientShellSession | null> | null = null;

/** Forgets the started shell, for tests. Internal to the web components. */
export function resetWebClientShell(): void {
    started = null;
}

/**
 * Starts a page HostedPage serves in the web client shell. It follows the viewer's layout, theme, and custom CSS, checks the
 * viewer as startUserPage does, and fills the app bar with their libraries, the user menu, and the drawer. A viewer who may
 * not see the page gets the user page's card. Later calls return the same promise, so the page's own script calls it for
 * the session.
 *
 * @param options {
 *   translations       : address of the plugin's translations relative to the server root [optional]
 *   menuItems          : the plugin's own user menu entries, after Settings [optional]
 *   signInText         : the sign in button's label (default 'Sign in')
 *   signInMessage      : the sentence for a viewer who is not signed in (default 'Sign in to Jellyfin to open this page.')
 *   deniedMessage      : the sentence for a viewer who is not an administrator (default 'Only administrators can open this page.')
 *   notSelectedMessage : the sentence for a viewer a selected users page does not list (default 'This page is for selected people. Ask your server's administrator for access.')
 *   unreachableMessage : the sentence when the server does not answer (default 'Could not reach the server.')
 *   backText           : the button's label when signing in would not help (default 'Back to Jellyfin')
 * }
 * @returns a promise of the session with toast and destroy, or of null when the viewer may not see the page
 */
export function startWebClientShell(options?: WebClientShellOptions): Promise<WebClientShellSession | null> {
    if (started) return started;
    var opts = options || {};
    var body = document.body;
    var root = document.documentElement;
    var cleanups: Array<() => void> = [];
    function on(target: EventTarget, type: string, fn: (e: any) => void): void {
        target.addEventListener(type, fn);
        cleanups.push(function () { target.removeEventListener(type, fn); });
    }

    root.classList.add('layout-' + webClientLayout());
    var meta = element('meta[name="stolon-server-id"]');
    var serverId = meta ? meta.getAttribute('content') : null;
    applyWebClientLook({ userId: storedUserId(serverId) });
    var toast = createWebToaster(body);

    var bar = element('.stolon-shell-bar');
    var drawer = element('.stolon-shell-drawer');
    var drawerButton = element('.stolon-shell-drawer-button');
    var scrim = element('.stolon-shell-scrim');
    var avatar = element('.stolon-shell-avatar');
    var nav = element('.stolon-shell-nav');
    var navMenu = element('#stolon-shell-nav-menu');
    var userMenu = element('#stolon-shell-user-menu');
    var home = element('.stolon-shell-drawer-home');
    if (home) home.textContent = stolonText('Home');
    if (drawerButton) { drawerButton.setAttribute('title', stolonText('MenuOpen')); drawerButton.setAttribute('aria-label', stolonText('MenuOpen')); }
    if (avatar) { avatar.setAttribute('title', stolonText('UserMenu')); avatar.setAttribute('aria-label', stolonText('UserMenu')); }

    // Clear at the top of the page and the theme's bar color once it scrolls, as the web client's bar.
    function syncBar(): void { if (bar) bar.classList.toggle('stolon-shell-scrolled', (window.scrollY || 0) > 0); }
    on(window, 'scroll', syncBar);
    syncBar();

    fetch('System/Info/Public', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (info: { Version?: unknown } | null) {
            var version = element('.stolon-shell-drawer-server-version');
            if (version && info && typeof info.Version === 'string') version.textContent = info.Version;
        })
        .catch(function () { return null; });

    // ---------- menus ----------
    function openMenu(menu: HTMLElement, button: HTMLElement, alignRight: boolean): void {
        var r = button.getBoundingClientRect();
        menu.style.top = r.bottom + 'px';
        if (alignRight) { menu.style.right = Math.max(0, root.clientWidth - r.right) + 'px'; menu.style.left = ''; }
        else { menu.style.left = r.left + 'px'; menu.style.right = ''; }
        menu.classList.add('stolon-shell-growing');
        menu.hidden = false;
        void menu.offsetWidth;
        menu.classList.remove('stolon-shell-growing');
        button.setAttribute('aria-expanded', 'true');
        var first = menu.querySelector('.stolon-shell-menu-item') as HTMLElement | null;
        if (first) first.focus();
    }
    function closeMenu(menu: HTMLElement | null, button: HTMLElement | null, refocus: boolean): void {
        if (!menu || menu.hidden) return;
        menu.hidden = true;
        if (button) {
            button.setAttribute('aria-expanded', 'false');
            if (refocus) button.focus();
        }
    }
    function moreButton(): HTMLElement | null { return nav ? nav.querySelector('.stolon-shell-nav-more') as HTMLElement | null : null; }
    function closeUserMenu(refocus: boolean): void { closeMenu(userMenu, avatar, refocus); }
    function closeNavMenu(refocus: boolean): void { closeMenu(navMenu, moreButton(), refocus); }
    on(document, 'click', function (e: Event) {
        var target = e.target as Element | null;
        var inside = function (sel: string) { return !!(target && target.closest && target.closest(sel)); };
        if (!inside('#stolon-shell-user-menu') && !inside('.stolon-shell-avatar')) closeUserMenu(false);
        if (!inside('#stolon-shell-nav-menu') && !inside('.stolon-shell-nav-more')) closeNavMenu(false);
    });
    on(window, 'resize', function () { closeUserMenu(false); closeNavMenu(false); });
    if (userMenu) on(userMenu, 'keydown', function (e: KeyboardEvent) { menuKeys(e, userMenu!, closeUserMenu); });
    if (navMenu) on(navMenu, 'keydown', function (e: KeyboardEvent) { menuKeys(e, navMenu!, closeNavMenu); });
    if (avatar) on(avatar, 'click', function () { if (userMenu && avatar) { if (userMenu.hidden) openMenu(userMenu, avatar, true); else closeUserMenu(false); } });
    if (nav) on(nav, 'click', function (e: Event) {
        var more = moreButton();
        var target = e.target as Element | null;
        if (!more || !navMenu || !target || !target.closest || !target.closest('.stolon-shell-nav-more')) return;
        if (navMenu.hidden) openMenu(navMenu, more, false); else closeNavMenu(false);
    });
    if (navMenu) on(navMenu, 'click', function () { closeNavMenu(false); });

    // ---------- drawer ----------
    function setInert(onOff: boolean): void {
        Array.prototype.forEach.call(body.children, function (n: HTMLElement) {
            if (n === drawer || n === scrim || n.tagName === 'SCRIPT' || n.classList.contains('toastContainer')) return;
            if (onOff) n.setAttribute('inert', ''); else n.removeAttribute('inert');
        });
    }
    function openDrawer(): void {
        if (!drawer || !scrim || !drawerButton) return;
        drawer.classList.add('stolon-shell-open');
        setInert(true);
        scrim.hidden = false;
        drawerButton.setAttribute('aria-expanded', 'true');
        drawer.focus();
    }
    function closeDrawer(refocus: boolean): void {
        if (!drawer || !scrim || !drawerButton || !drawer.classList.contains('stolon-shell-open')) return;
        drawer.classList.remove('stolon-shell-open');
        setInert(false);
        scrim.hidden = true;
        drawerButton.setAttribute('aria-expanded', 'false');
        if (refocus) drawerButton.focus();
    }
    if (drawerButton) on(drawerButton, 'click', openDrawer);
    if (scrim) on(scrim, 'click', function () { closeDrawer(true); });
    on(document, 'keydown', function (e: KeyboardEvent) { if (e.key === 'Escape') closeDrawer(true); });
    var wide = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 900px)') : null;
    if (wide && wide.addEventListener) {
        var onWide = function () { if (wide && wide.matches) closeDrawer(false); };
        wide.addEventListener('change', onWide);
        cleanups.push(function () { if (wide) wide.removeEventListener('change', onWide); });
    }

    // ---------- the viewer ----------
    var entries: NavEntry[] = [];
    function renderNav(): void {
        if (!nav || !navMenu) return;
        closeNavMenu(false);
        var shown = webUserViewsShown(entries.length);
        nav.innerHTML = webNavButton('web/#/home?tab=1', svgOf('Favorite'), stolonText('Favorites'))
            + entries.slice(0, shown).map(function (i) { return webNavButton(i.href, i.icon, i.name, i.current, i.external); }).join('')
            + (entries.length > shown ? webNavMoreButton() : '');
        var list = navMenu.querySelector('ul');
        if (list) list.innerHTML = entries.slice(shown).map(function (i) { return webMenuItem(i.icon, i.name, i.href, undefined, i.external); }).join('');
        nav.hidden = false;
    }
    var lastWidth = window.innerWidth;
    on(window, 'resize', function () {
        var w = window.innerWidth;
        if (entries.length && webUserViewsShown(entries.length, w) !== webUserViewsShown(entries.length, lastWidth)) renderNav();
        lastWidth = w;
    });

    function fillUserMenu(session: UserPageSession, user: UserPageUser): void {
        var list = userMenu ? userMenu.querySelector('ul') : null;
        if (!list) return;
        var id = encodeURIComponent(user.Id);
        var html = webMenuItem(svgOf('Profile'), stolonText('Profile'), 'web/#/userprofile?userId=' + id)
            + webMenuItem(svgOf('Settings'), stolonText('Settings'), 'web/#/mypreferencesmenu');
        (opts.menuItems || []).forEach(function (item, at) {
            html += webMenuItem(webIcon(item.icon), item.text, item.href || null, item.href ? undefined : 'plugin-' + at);
        });
        if (user.Policy && user.Policy.IsAdministrator) {
            html += webMenuDivider() + webMenuItem(svgOf('Dashboard'), stolonText('TabDashboard'), 'web/#/dashboard')
                + webMenuItem(svgOf('Edit'), stolonText('MetadataManager'), 'web/#/metadata');
        }
        html += webMenuDivider() + webMenuItem(svgOf('PhonelinkLock'), stolonText('QuickConnect'), 'web/#/quickconnect', 'quickconnect')
            + webMenuItem(svgOf('Logout'), stolonText('ButtonSignOut'), null, 'signout');
        list.innerHTML = html;
        var quick = list.querySelector('[data-stolon-menu="quickconnect"]') as HTMLElement | null;
        if (quick && quick.parentElement) quick.parentElement.hidden = true;
        session.request('QuickConnect/Enabled').then(function (r) { return r.ok ? r.json() : false; }).then(function (enabled: unknown) {
            if (enabled === true && quick && quick.parentElement) quick.parentElement.hidden = false;
        }).catch(function () { return null; });
        on(list, 'click', function (e: Event) {
            var target = e.target as Element | null;
            var choice = target && target.closest ? target.closest('.stolon-shell-menu-item') as HTMLElement | null : null;
            if (!choice) return;
            closeUserMenu(false);
            var key = choice.getAttribute('data-stolon-menu') || '';
            if (key.indexOf('plugin-') === 0) {
                var item = (opts.menuItems || [])[+key.slice(7)];
                if (item && item.select) { e.preventDefault(); item.select(); }
            } else if (key === 'signout') {
                e.preventDefault();
                signOut(session);
            }
        });
    }

    function fillNav(session: UserPageSession, user: UserPageUser, config: { menuLinks?: MenuLink[] }): void {
        var mark = body.getAttribute('data-stolon-mark') || '';
        var links = webClientMenuLinks(config.menuLinks, new URL(location.href), mark ? { name: mark, icon: body.getAttribute('data-stolon-mark-icon') || '' } : null);
        session.request('UserViews?userId=' + encodeURIComponent(user.Id))
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (views: { Items?: WebUserView[] } | null) {
                var libraries = ((views && views.Items) || []).map(function (v) { return { href: 'web/' + webLibraryRoute(v), icon: webLibraryIcon(v), name: v.Name || '' }; });
                entries = links.concat(libraries);
                renderNav();
                var drawerNav = element('.stolon-shell-drawer-nav');
                if (drawerNav) {
                    drawerNav.innerHTML = webDrawerList(webDrawerItem('web/#/home?tab=1', svgOf('Favorite'), stolonText('Favorites')))
                        + webDrawerList(links.map(function (l) { return webDrawerItem(l.href, l.icon, l.name, l.current, l.external); }).join(''), true)
                        + webDrawerList(libraries.map(function (l) { return webDrawerItem(l.href, l.icon, l.name); }).join(''), true, stolonText('HeaderLibraries'));
                }
            });
    }

    started = startUserPage(opts).then(function (session) {
        if (!session) return null;
        var user = session.user;
        var shell: WebClientShellSession = Object.assign({}, session, {
            toast: toast,
            destroy: function () {
                cleanups.splice(0).forEach(function (fn) { fn(); });
                toast.destroy();
            }
        });
        if (!user) return shell;
        fetch('web/config.json', { headers: { Accept: 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .catch(function () { return {}; })
            .then(function (config: { themes?: WebClientTheme[]; menuLinks?: MenuLink[] }) {
                applyWebClientLook({ userId: user!.Id, themes: config && config.themes });
                fillNav(session, user!, config || {});
            });
        if (avatar) {
            var picture = new Image();
            picture.alt = '';
            picture.onload = function () { if (avatar) { avatar.innerHTML = ''; avatar.appendChild(picture); } };
            picture.src = 'Users/' + encodeURIComponent(user.Id) + '/Images/Primary?height=80&quality=90';
            avatar.setAttribute('title', user.Name);
            avatar.setAttribute('aria-label', user.Name);
            avatar.hidden = false;
        }
        fillUserMenu(session, user);
        if (drawerButton) drawerButton.hidden = false;
        return shell;
    });
    return started;
}

// Ends the session on the server, forgets it in the web client's storage as its own sign out does, and returns to the web client.
function signOut(session: UserPageSession): void {
    session.request('Sessions/Logout', { method: 'POST' }).catch(function () { return null; }).then(function () {
        try {
            var store = window.localStorage;
            var raw = store.getItem(CREDENTIALS);
            var saved = raw ? JSON.parse(raw) : null;
            if (saved && Array.isArray(saved.Servers)) {
                saved.Servers.forEach(function (s: { AccessToken?: string; UserId?: string }) {
                    if (s && s.AccessToken === session.token) { delete s.AccessToken; delete s.UserId; }
                });
                store.setItem(CREDENTIALS, JSON.stringify(saved));
            }
        } catch (e) {
            location.href = 'web/';
            return;
        }
        location.href = 'web/';
    });
}
