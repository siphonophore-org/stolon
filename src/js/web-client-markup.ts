// web-client-markup.ts
// The web client's own markup, as builders that return HTML. Each copies a file of jellyfin-web 12.4, named above it, and
// jellyfin-web is GPL-2.0-or-later. The web client's stylesheets draw what they build, so a class copied from Jellyfin keeps
// Jellyfin's name exactly, and a class Stolon adds starts with stolon-. Every builder escapes the text it is given.
import { escapeHtml } from './browser-helpers.js';
import { formatText } from './translations.js';
import { stolonText } from './lib/stolon-text.js';
import { make, listen, runAll, nextId } from './lib/dom.js';
import { bindModalBehavior } from './lib/dialog.js';

/** Attributes a builder writes on an element, each name a plain attribute name and each value escaped. */
export type WebAttributes = Record<string, string | number | boolean | null | undefined>;

/** A library view as Jellyfin's UserViews answers. */
export interface WebUserView {
    Id: string;
    Name?: string;
    CollectionType?: string | null;
    Type?: string;
    ServerId?: string;
}

var esc = escapeHtml;

// An address that runs script, such as javascript:, ignoring the spaces and control characters a browser ignores before the scheme.
var SCRIPT_ADDRESS = /^(?:javascript|vbscript|data):/i;

// The attributes as markup, each name checked and each value escaped. A true value writes the bare name, and false or null leaves it out.
// A link to an address that runs script, such as a javascript: entry in config.json, goes nowhere.
function attrs(list?: WebAttributes | null): string {
    var out = '';
    if (!list) return out;
    Object.keys(list).forEach(function (name) {
        var value = list[name];
        if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(name) || value === false || value === null || value === undefined) return;
        if ((name === 'href' || name === 'src' || name === 'action') && SCRIPT_ADDRESS.test(String(value).replace(/[\u0000-\u0020]/g, ''))) value = '#';
        out += value === true ? ' ' + name : ' ' + name + '="' + esc(value) + '"';
    });
    return out;
}

function isDesktop(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('layout-desktop');
}

/**
 * Percent encodes what could end a CSS url() early, quotes, brackets, backslashes, and control characters, and wraps it.
 *
 * @param url the address
 * @returns url("...")
 */
export function webCssUrl(url: string): string {
    return 'url("' + String(url).replace(/[\x00-\x1f\x7f"'\\()]/g, function (c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16).toUpperCase()).slice(-2);
    }) + '")';
}

// src/components/loading/loading.ts (12.4): the inside of the loading spinner, four layers of two arcs.
/** The inside of the web client's loading spinner, for an element with mdl-spinner and mdlSpinnerActive. */
export var WEB_SPINNER = [1, 2, 3, 4].map(function (n) {
    return '<div class="mdl-spinner__layer mdl-spinner__layer-' + n + '"><div class="mdl-spinner__circle-clipper mdl-spinner__left"><div class="mdl-spinner__circle mdl-spinner__circleLeft"></div></div>'
        + '<div class="mdl-spinner__circle-clipper mdl-spinner__right"><div class="mdl-spinner__circle mdl-spinner__circleRight"></div></div></div>';
}).join('');

// ---------- messages ----------

/**
 * An empty state in the web client's type and colors under one of its icons. The web client has no such message, so its
 * layout is Stolon's.
 *
 * @param title the heading
 * @param text the sentence under it
 * @param buttonHtml markup of a button under it, from another builder [optional]
 */
export function webEmptyState(title: string, text: string, buttonHtml?: string): string {
    return '<div class="stolon-web-empty"><span class="material-icons list" aria-hidden="true"></span><h2>' + esc(title) + '</h2><div class="secondaryText">' + esc(text) + '</div>' + (buttonHtml || '') + '</div>';
}

/**
 * A line in the web client's secondary text color.
 *
 * @param text the line
 * @param className classes of the page's own before secondaryText [optional]
 */
export function webSecondaryText(text: string, className?: string): string {
    return '<div class="' + (className ? esc(className) + ' ' : '') + 'secondaryText">' + esc(text) + '</div>';
}

// src/apps/legacy/features/search/components/SearchResults.tsx (12.4): the words of the no results message.
/**
 * The web client's no results sentence for a search, in the page's language.
 *
 * @param query what was searched for
 */
export function webNoResultsText(query: string): string {
    return formatText(stolonText('SearchResultsEmpty'), query);
}

// src/elements/emby-button (12.4): a raised button, as the web client's Retry buttons.
/**
 * A raised button.
 *
 * @param id the button's id
 * @param text its label
 */
export function webRaisedButton(id: string, text: string): string {
    return '<button type="button" class="emby-button raised"' + attrs({ id: id }) + '>' + esc(text) + '</button>';
}

/**
 * A full width raised button, as the web client's forms end with, in one of its button colors.
 *
 * @param id the button's id
 * @param text its label
 * @param type the web client's button color, such as submit or delete
 */
export function webBlockButton(id: string, text: string, type: string): string {
    return '<button type="button" class="raised button-' + esc(type) + ' block emby-button"' + attrs({ id: id }) + '>' + esc(text) + '</button>';
}

/** What createWebToaster returns: show writes a toast, with an optional action such as Undo. */
export interface WebToasterHandle {
    show(text: string, actionLabel?: string, action?: () => void): void;
    destroy(): void;
}

// src/components/toast/toast.ts (12.4): the toast container, made once as the live region that announces each toast, and a
// toast in it, slid in with toastVisible and faded out with toastHide before it is removed.
/**
 * Makes the web client's toast container in a parent, and returns the handle that shows a toast in it. A toast still
 * showing is reused for the next message.
 *
 * @param parent where the container goes, usually the body
 */
export function createWebToaster(parent: HTMLElement): WebToasterHandle {
    var box = document.createElement('div');
    var timer: ReturnType<typeof setTimeout> | undefined;
    var removeTimer: ReturnType<typeof setTimeout> | undefined;
    box.className = 'toastContainer';
    box.setAttribute('role', 'status');
    parent.appendChild(box);
    return {
        show: function (text: string, actionLabel?: string, action?: () => void) {
            var toast = box.querySelector('.toast') as HTMLElement | null;
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'toast stolon-web-toast';
                box.appendChild(toast);
                var shown = toast;
                requestAnimationFrame(function () { shown.classList.add('toastVisible'); });
            }
            clearTimeout(timer);
            clearTimeout(removeTimer);
            toast.classList.remove('toastHide');
            toast.innerHTML = '<span>' + esc(text) + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
            var current = toast;
            var button = toast.querySelector('button');
            if (button && action) {
                button.addEventListener('click', function () { clearTimeout(timer); clearTimeout(removeTimer); current.remove(); action(); });
            }
            timer = setTimeout(function () {
                current.classList.add('toastHide');
                removeTimer = setTimeout(function () { current.remove(); }, 300);
            }, actionLabel ? 7000 : 3600);
        },
        destroy: function () {
            clearTimeout(timer);
            clearTimeout(removeTimer);
            box.remove();
        }
    };
}

// ---------- the app bar ----------

/** The Material icons the web client draws in its bar, menus, and drawer, as SVG paths (@mui/icons-material). */
export var WEB_ICONS: Record<string, string> = {
    Favorite: 'm12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z',
    Movie: 'm18 4 2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z',
    MusicNote: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z',
    Photo: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2M8.5 13.5l2.5 3.01L14.5 12l4.5 6H5z',
    LiveTv: 'M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2m0 14H3V8h18zM9 10v8l7-4z',
    Tv: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2m0 14H3V5h18z',
    Theaters: 'M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3zM8 17H6v-2h2zm0-4H6v-2h2zm0-4H6V7h2zm10 8h-2v-2h2zm0-4h-2v-2h2zm0-4h-2V7h2z',
    MusicVideo: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 16H3V5h18zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03c-.02 1.64-1.35 2.97-3 2.97-1.66 0-3-1.34-3-3',
    Book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 4h5v8l-2.5-1.5L6 12z',
    VideoLibrary: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8 12.5v-9l6 4.5z',
    Queue: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-1 9h-4v4h-2v-4H9V9h4V5h2v4h4z',
    OndemandVideo: 'M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.11-.9-2-2-2m0 14H3V5h18zm-5-6-7 4V7z',
    Folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z',
    ArrowDropDown: 'm7 10 5 5 5-5z',
    Search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14',
    Home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    Person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4',
    Profile: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20',
    Settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6',
    Dashboard: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
    Edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
    PhonelinkLock: 'M19 1H9c-1.1 0-2 .9-2 2v3h2V4h10v16H9v-2H7v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2m-8.2 10V9.5C10.8 8.1 9.4 7 8 7S5.2 8.1 5.2 9.5V11c-.6 0-1.2.6-1.2 1.2v3.5c0 .7.6 1.3 1.2 1.3h5.5c.7 0 1.3-.6 1.3-1.2v-3.5c0-.7-.6-1.3-1.2-1.3m-1.3 0h-3V9.5c0-.8.7-1.3 1.5-1.3s1.5.5 1.5 1.3z',
    Logout: 'm17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z',
    Notifications: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2m6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1z'
};

/**
 * One of the web client's Material icons as an SVG, or a Material Icons font glyph for a name WEB_ICONS lacks.
 *
 * @param name a WEB_ICONS name, such as Favorite, or a Material Icons name, such as search
 */
export function webIcon(name: string): string {
    return Object.prototype.hasOwnProperty.call(WEB_ICONS, name)
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + WEB_ICONS[name] + '"></path></svg>'
        : '<span class="material-icons" aria-hidden="true">' + esc(name || 'link') + '</span>';
}

// src/apps/experimental/components/LibraryIcon.tsx (12.4): a library's icon by its collection type.
/**
 * A library's icon, by its collection type.
 *
 * @param view the library
 */
export function webLibraryIcon(view: WebUserView): string {
    var byType: Record<string, string> = {
        movies: 'Movie', music: 'MusicNote', homevideos: 'Photo', photos: 'Photo', livetv: 'LiveTv', tvshows: 'Tv', trailers: 'Theaters',
        musicvideos: 'MusicVideo', books: 'Book', boxsets: 'VideoLibrary', playlists: 'Queue'
    };
    var type = view.CollectionType;
    return webIcon(type && byType[type] ? byType[type] : type == null ? 'OndemandVideo' : 'Folder');
}

// src/components/router/appRouter.js getRouteUrl (12.4): a library's page in the experimental layout, as a hash of the web client's address.
/**
 * A library's page in the web client, as the hash after web/.
 *
 * @param view the library
 */
export function webLibraryRoute(view: WebUserView): string {
    var id = encodeURIComponent(view.Id);
    var type = view.CollectionType;
    if (type === 'livetv') return '#/livetv?collectionType=livetv';
    var pages: Record<string, string> = { books: 'books', movies: 'movies', tvshows: 'tv', music: 'music', musicvideos: 'musicvideos', boxsets: 'boxsets', playlists: 'playlists' };
    if (type && pages[type]) return '#/' + pages[type] + '?topParentId=' + id + '&collectionType=' + encodeURIComponent(type);
    if (type === 'homevideos') return '#/homevideos?topParentId=' + id;
    if (type == null && view.Type === 'CollectionFolder') return '#/mixed?topParentId=' + id + '&collectionType=mixed';
    return '#/list?parentId=' + id + '&serverId=' + encodeURIComponent(view.ServerId || '');
}

// src/apps/experimental/components/AppToolbar/userViews/UserViewNav.tsx (12.4): as many entries as fit the width, 8 from 1536px,
// 5 from 1200px, else 3, the rest under More. All stay in the bar when only one would be left over.
/**
 * How many of the bar's entries show before More, at a window width.
 *
 * @param count how many entries there are
 * @param width the window width (default the window's)
 */
export function webUserViewsShown(count: number, width?: number): number {
    var w = width === undefined ? window.innerWidth : width;
    var max = w >= 1536 ? 8 : w >= 1200 ? 5 : 3;
    return count > max + 1 ? max : count;
}

/**
 * One of the bar's entries, a library or a link, as Material UI's text button with a start icon.
 *
 * @param href where it goes
 * @param iconHtml its icon, from webIcon or webLibraryIcon
 * @param text its name
 * @param current true for the page the bar is on [optional]
 * @param external true to open it in a new tab [optional]
 */
export function webNavButton(href: string, iconHtml: string, text: string, current?: boolean, external?: boolean): string {
    return '<a class="MuiButton-root MuiButton-text stolon-shell-nav-button"' + attrs({ 'aria-current': current ? 'page' : null, href: href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null })
        + '><span class="MuiButton-startIcon stolon-shell-nav-icon">' + iconHtml + '</span>' + esc(text) + '</a>';
}

/** The bar's More button, with Material UI's drop down arrow, which opens the menu of entries that do not fit. */
export function webNavMoreButton(): string {
    return '<button type="button" class="MuiButton-root MuiButton-text stolon-shell-nav-button stolon-shell-nav-more" aria-controls="stolon-shell-nav-menu" aria-haspopup="true" aria-expanded="false">'
        + esc(stolonText('ButtonMore')) + '<span class="MuiButton-endIcon stolon-shell-nav-end-icon">' + webIcon('ArrowDropDown') + '</span></button>';
}

// src/components/toolbar/AppUserMenu.tsx (12.4): a MenuItem with its ListItemIcon and text.
/**
 * An entry of a menu, the user menu or More, as Material UI's menu item. A link with href, or a button the page answers itself,
 * marked with data-stolon-menu.
 *
 * @param iconHtml its icon, from webIcon
 * @param text its name
 * @param href where it goes, or null for a button [optional]
 * @param key the button's data-stolon-menu value, or the link's id [optional]
 * @param external true to open the link in a new tab [optional]
 */
export function webMenuItem(iconHtml: string, text: string, href?: string | null, key?: string, external?: boolean): string {
    var inner = '<span class="MuiListItemIcon-root stolon-shell-menu-icon">' + iconHtml + '</span><span>' + esc(text) + '</span>';
    return href
        ? '<li role="none"><a class="MuiMenuItem-root stolon-shell-menu-item" role="menuitem" tabindex="-1"' + attrs({ href: href, 'data-stolon-menu': key || null, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null }) + '>' + inner + '</a></li>'
        : '<li role="none"><button type="button" class="MuiMenuItem-root stolon-shell-menu-item" role="menuitem" tabindex="-1"' + attrs({ 'data-stolon-menu': key || null }) + '>' + inner + '</button></li>';
}

/** The divider between a menu's groups, as Material UI's. */
export function webMenuDivider(): string {
    return '<li role="separator" class="stolon-shell-menu-divider"><hr class="MuiDivider-root" /></li>';
}

// src/apps/experimental/components/drawers/MainDrawerContent.tsx (12.4): a drawer entry, icon then name.
/**
 * An entry of the drawer.
 *
 * @param href where it goes
 * @param iconHtml its icon, from webIcon or webLibraryIcon
 * @param text its name
 * @param current true for the page the drawer is opened on [optional]
 * @param external true to open it in a new tab [optional]
 */
export function webDrawerItem(href: string, iconHtml: string, text: string, current?: boolean, external?: boolean): string {
    return '<li><a class="MuiListItemButton-root stolon-shell-drawer-item"' + attrs({ 'aria-current': current ? 'page' : null, href: href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null })
        + '><span class="MuiListItemIcon-root stolon-shell-drawer-icon">' + iconHtml + '</span><span class="MuiListItemText-root stolon-shell-drawer-text">' + esc(text) + '</span></a></li>';
}

/**
 * A group of drawer entries, after a divider unless it is the first, under a heading when given one.
 *
 * @param itemsHtml the entries, from webDrawerItem
 * @param divider true to draw a divider above it [optional]
 * @param subheader the group's heading [optional]
 */
export function webDrawerList(itemsHtml: string, divider?: boolean, subheader?: string): string {
    if (!itemsHtml) return '';
    return (divider ? '<hr class="MuiDivider-root stolon-shell-divider" />' : '') + '<ul class="MuiList-root stolon-shell-drawer-list">'
        + (subheader ? '<li class="MuiListSubheader-root stolon-shell-drawer-subheader">' + esc(subheader) + '</li>' : '') + itemsHtml + '</ul>';
}

// ---------- dialogs ----------

/** The classes of a dialog's box, header, content, and footer. */
export interface WebDialogClasses {
    box: string;
    header: string;
    content: string;
    footer: string;
}

// src/components/dialogHelper/dialogHelper.js createDialog and src/components/formdialog.scss (12.4): a form dialog once opened.
/** The classes a form dialog ends up with once the web client opens it, such as its prompt. */
export var WEB_FORM_DIALOG: WebDialogClasses = {
    box: 'focuscontainer dialog dialog-fixedSize dialog-small formDialog',
    header: 'formDialogHeader',
    content: 'formDialogContent smoothScrollY',
    footer: 'formDialogFooter'
};

// src/components/dialog/dialog.js showDialog and dialog.template.html (12.4): a centered message dialog with no scrolling.
/** The classes of the web client's centered message dialog, such as a confirmation. */
export var WEB_CONFIRM_DIALOG: WebDialogClasses = {
    box: 'focuscontainer dialog formDialog align-items-center justify-content-center dialog-fullscreen-lowres',
    header: 'formDialogHeader formDialogHeader-clear justify-content-center',
    content: 'formDialogContent smoothScrollY no-grow',
    footer: 'formDialogFooter formDialogFooter-clear formDialogFooter-flex'
};

/**
 * The widest the message dialog's content grows, from two buttons and their spacing within the window, as dialog.js sets it.
 *
 * @param windowWidth the window width
 * @returns a CSS length
 */
export function webConfirmDialogWidth(windowWidth: number): string {
    return Math.min(2 * 150 + 200, windowWidth - 50) + 'px';
}

/**
 * A form dialog's footer, one wide raised button as its submit, as components/prompt/prompt.template.html lays it out.
 *
 * @param text the button's label
 * @param type the web client's button color (default submit)
 */
export function webFormDialogFooter(text: string, type?: string): string {
    return '<button type="button" class="raised button-' + esc(type || 'submit') + ' block formDialogFooterItem emby-button" id="dialogSubmit"><span>' + esc(text) + '</span></button>';
}

// src/components/dialog/dialog.js (12.4): Cancel then the action, as autosized option buttons.
/**
 * The message dialog's footer, Cancel then the action.
 *
 * @param text the action's label
 * @param type the web client's button color (default submit)
 */
export function webConfirmDialogFooter(text: string, type?: string): string {
    return '<button type="button" class="btnOption raised formDialogFooterItem formDialogFooterItem-autosize emby-button" id="dialogCancel">' + esc(stolonText('ButtonCancel')) + '</button>'
        + '<button type="button" class="btnOption raised formDialogFooterItem formDialogFooterItem-autosize button-' + esc(type || 'submit') + ' emby-button" id="dialogSubmit">' + esc(text) + '</button>';
}

/**
 * A form dialog's footer with Cancel beside the action, both the same width.
 *
 * @param text the action's label
 * @param type the web client's button color (default submit)
 */
export function webCancelDialogFooter(text: string, type?: string): string {
    return '<button type="button" class="btnOption raised formDialogFooterItem emby-button" id="dialogCancel">' + esc(stolonText('ButtonCancel')) + '</button>'
        + '<button type="button" class="btnOption raised formDialogFooterItem button-' + esc(type || 'submit') + ' emby-button" id="dialogSubmit">' + esc(text) + '</button>';
}

/** One button of webActionsDialogFooter. type is the web client's button color, or none for a plain raised button. */
export interface WebDialogAction {
    id: string;
    text: string;
    type?: string;
}

/**
 * A form dialog's footer of several actions side by side, each as wide as Cancel and its action are.
 *
 * @param buttons the actions
 */
export function webActionsDialogFooter(buttons: WebDialogAction[]): string {
    return buttons.map(function (b) {
        return '<button type="button" class="btnOption raised formDialogFooterItem' + (b.type ? ' button-' + esc(b.type) : '') + ' emby-button"' + attrs({ id: b.id }) + '>' + esc(b.text) + '</button>';
    }).join('');
}

// src/components/dialog/dialog.template.html (12.4): the message's text, then Stolon's place for an error.
/**
 * The message dialog's text, with a place for an error under it.
 *
 * @param text the message
 */
export function webConfirmDialogBody(text: string): string {
    return '<div class="text">' + esc(text) + '</div><div class="stolon-web-error" id="dialogError" role="alert"></div>';
}

/** What openWebDialog takes. Every text is set as text, and html is placed as given, so pass only what a builder returned. */
export interface WebDialogOptions {
    look?: 'form' | 'message';
    title?: string;
    label?: string;
    html?: string;
    content?: Node | null;
    text?: string;
    buttons?: WebDialogAction[];
    footerHtml?: string;
    dismissable?: boolean;
    onAction?(id: string, dialog: WebDialogHandle): boolean | void;
    onClose?(id: string | null): void;
}

/** What openWebDialog returns. closed resolves with the id of the button that closed the dialog, or null for Back, Escape, or a click outside. */
export interface WebDialogHandle {
    element: HTMLElement;
    container: HTMLElement;
    content: HTMLElement;
    footer: HTMLElement;
    closed: Promise<string | null>;
    close(id?: string | null): void;
}

// The exit animation's length and the backdrop's fade, as dialogHelper.js waits for them before it removes either.
var DIALOG_EXIT_MS = 120;
var BACKDROP_FADE_MS = 300;

function reducedMotion(): boolean {
    try { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

function dialogButton(b: WebDialogAction, message: boolean): HTMLButtonElement {
    var cls = 'btnOption raised formDialogFooterItem' + (message ? ' formDialogFooterItem-autosize' : '') + (b.type ? ' button-' + b.type : '') + ' emby-button';
    return make('button', cls, { type: 'button', id: b.id }, b.text) as HTMLButtonElement;
}

// src/components/dialogHelper/dialogHelper.js open, src/components/dialog/dialog.js, and components/prompt/prompt.template.html (12.4):
// the backdrop, the dialog container, and the dialog, with its header, content, and footer.
/**
 * Opens a dialog as the web client builds one, for a page in the web client shell: the dimmed backdrop, the dialog container, and
 * the focuscontainer dialog with its formDialogHeader, formDialogContent, and formDialogFooter, so the web client's stylesheets, the
 * viewer's theme, and custom CSS draw it. The form look is the web client's form dialog, with Back and its title in the header, for
 * side content or a form. The message look is its centered message dialog, such as a confirmation. It scales in and out as the web
 * client's does, at once under prefers-reduced-motion. Focus moves into it and stays there, Escape and a click outside close it
 * when dismissable, and focus goes back to the control that opened it.
 *
 * @param options {
 *   look        : 'form', the form dialog with Back and its title, or 'message', the centered message dialog (default 'form')
 *   title       : the title in the header [optional]
 *   label       : the dialog's accessible name when it has no title [optional]
 *   html        : the content's markup, from the builders, placed as given [optional]
 *   content     : a node placed in the content after html [optional]
 *   text        : a message set as text, the message look's sentence [optional]
 *   buttons     : the footer's buttons, each { id, text, type } with type the web client's button color, such as submit or delete [optional]
 *   footerHtml  : the footer's markup in place of buttons, such as webCancelDialogFooter [optional]
 *   dismissable : false keeps it open on Escape and a click outside, and hides Back (default true)
 *   onAction    : function(id, dialog) run on a click of a footer button with an id. It closes the dialog with that id unless it returns false [optional]
 *   onClose     : function(id) run once it closes, with the id of the button that closed it or null [optional]
 * }
 * @returns { element, container, content, footer, closed, close }
 */
export function openWebDialog(options: WebDialogOptions): WebDialogHandle {
    var opts = options || ({} as WebDialogOptions);
    var message = opts.look === 'message';
    var classes = message ? WEB_CONFIRM_DIALOG : WEB_FORM_DIALOG;
    var dismissable = opts.dismissable !== false;
    var cleanups: Array<() => void> = [];

    var backdrop = make('div', 'dialogBackdrop');
    var container = make('div', 'dialogContainer stolon-web-dialog');
    var box = make('div', classes.box + (message ? ' centeredDialog' : '') + ' opened stolon-web-dialog-box', { role: message ? 'alertdialog' : 'dialog', 'aria-modal': 'true', tabindex: '-1' });
    var header = make('div', classes.header);
    var titleId = nextId('web-dialog-title');
    if (message) {
        var heading = make('h1', 'formDialogHeaderTitle stolon-web-dialog-title' + (opts.title ? '' : ' hide'), { id: titleId }, opts.title || '');
        header.appendChild(heading);
    } else {
        var back = make('button', 'paper-icon-button-light btnCancel autoSize stolon-web-dialog-back', { type: 'button', title: stolonText('ButtonBack'), 'aria-label': stolonText('ButtonBack') }) as HTMLButtonElement;
        back.appendChild(make('span', 'material-icons arrow_back', { 'aria-hidden': 'true' }));
        back.hidden = !dismissable;
        header.appendChild(back);
        header.appendChild(make('h3', 'formDialogHeaderTitle', { id: titleId }, opts.title || ''));
        cleanups.push(listen(back, 'click', function () { close(null); }));
    }
    if (opts.title) box.setAttribute('aria-labelledby', titleId);
    else if (opts.label) box.setAttribute('aria-label', opts.label);

    var content = make('div', classes.content);
    var inner = make('div', 'dialogContentInner dialog-content-centered' + (message ? ' stolon-web-dialog-message' : ''));
    if (opts.html) inner.innerHTML = opts.html;
    if (opts.text) inner.appendChild(make('div', 'text', null, opts.text));
    if (opts.content) inner.appendChild(opts.content);
    if (message && !opts.html && !opts.text && !opts.content) inner.classList.add('hide');
    content.appendChild(inner);
    // The message dialog's content grows only as wide as its buttons need, as dialog.js sets it.
    var count = opts.buttons ? opts.buttons.length : 2;
    if (message) content.style.setProperty('--stolon-web-dialog-width', Math.max(0, Math.min(150 * count + 200, (window.innerWidth || 0) - 50)) + 'px');

    var footer = make('div', classes.footer + (message ? ' stolon-web-dialog-footer' : ''));
    if (opts.footerHtml) footer.innerHTML = opts.footerHtml;
    else (opts.buttons || []).forEach(function (b) { footer.appendChild(dialogButton(b, message)); });
    if (opts.footerHtml || (opts.buttons && opts.buttons.length)) {
        cleanups.push(listen(footer, 'click', function (e: Event) {
            var target = e.target as Element | null;
            var button = target && target.closest ? target.closest('button') as HTMLButtonElement | null : null;
            if (!button || !button.id || button.disabled) return;
            if (opts.onAction && opts.onAction(button.id, handle) === false) return;
            close(button.id);
        }));
    } else {
        footer.hidden = true;
    }

    box.appendChild(header);
    box.appendChild(content);
    box.appendChild(footer);
    container.appendChild(box);

    var settled = false;
    var resolveClosed: (id: string | null) => void = function () { return undefined; };
    var closed = new Promise<string | null>(function (resolve) { resolveClosed = resolve; });
    var modal = bindModalBehavior(container, box, {
        dismissable: dismissable,
        autofocus: (box.querySelector('[autofocus]') as HTMLElement | null) || (footer.querySelector('button') as HTMLElement | null) || null,
        onDismiss: function () { close(null); }
    });

    function remove(el: HTMLElement): void { if (el.parentNode) el.parentNode.removeChild(el); }

    function close(id?: string | null): void {
        if (settled) return;
        settled = true;
        var value = id === undefined ? null : id;
        runAll(cleanups);
        backdrop.classList.remove('dialogBackdropOpened');
        box.classList.remove('opened', 'stolon-web-dialog-opening');
        modal.release();
        modal.destroy();
        if (reducedMotion()) {
            remove(container);
            remove(backdrop);
        } else {
            box.classList.add('stolon-web-dialog-closing');
            setTimeout(function () { remove(container); }, DIALOG_EXIT_MS);
            setTimeout(function () { remove(backdrop); }, BACKDROP_FADE_MS);
        }
        if (opts.onClose) opts.onClose(value);
        resolveClosed(value);
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(container);
    void backdrop.offsetWidth;
    backdrop.classList.add('dialogBackdropOpened');
    if (!reducedMotion()) box.classList.add('stolon-web-dialog-opening');
    modal.activate();

    var handle: WebDialogHandle = { element: box, container: container, content: inner, footer: footer, closed: closed, close: close };
    return handle;
}

/** What webConfirm takes. */
export interface WebConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
}

// src/components/confirm/confirm.js (12.4): the message dialog with Cancel and the action, as autosized buttons.
/**
 * Asks a yes or no question in the web client's own confirmation dialog, the centered message dialog with Cancel and the action,
 * for a page in the web client shell. The title names the action and what it acts on, and the message says what follows from it.
 *
 * @param text the message, set as text
 * @param options {
 *   title       : the title, which names the action and what it acts on [optional]
 *   confirmText : the action's label (default 'Confirm')
 *   cancelText  : the cancel button's label (default 'Cancel')
 *   destructive : true draws the action in the web client's delete color (default false)
 * } [optional]
 * @returns a promise of true once confirmed, and false otherwise
 */
export function webConfirm(text: string, options?: WebConfirmOptions): Promise<boolean> {
    var opts = options || {};
    return openWebDialog({
        look: 'message',
        title: opts.title,
        label: opts.title ? undefined : text,
        text: text,
        buttons: [
            { id: 'dialogCancel', text: opts.cancelText || stolonText('ButtonCancel') },
            { id: 'dialogSubmit', text: opts.confirmText || stolonText('Stolon.Confirm'), type: opts.destructive ? 'delete' : 'submit' }
        ]
    }).closed.then(function (id) { return id === 'dialogSubmit'; });
}

// ---------- filters ----------

// apps/experimental/components/library/filter/FilterButton.tsx (12.4): Material UI accordions, each a column of checkboxes.
var ARROW_FORWARD = '<path d="M6.23 20.23 8 22l10-10L8 2 6.23 3.77 14.46 12z"></path>';
var CHECKBOX_BLANK = '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>';
var CHECKBOX_CHECKED = '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"></path>';

/**
 * A Material UI icon, its SVG path in Material UI's icon box, as the web client's Material UI parts draw them.
 *
 * @param path the icon's SVG markup inside the box, such as a path element, which the caller writes
 * @param classes the SVG's whole class list, such as MuiSvgIcon-root
 */
export function webMuiIcon(path: string, classes: string): string {
    return '<svg class="' + esc(classes) + '" focusable="false" aria-hidden="true" viewBox="0 0 24 24">' + path + '</svg>';
}

/**
 * Reset filters, the library toolbar's primary text button with the FilterAltOff icon.
 *
 * @param id the button's id
 * @param label its label
 * @param disabled true while no filter is on [optional]
 */
export function webResetFiltersButton(id: string, label: string, disabled?: boolean): string {
    return '<button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium stolon-web-reset-filters"' + attrs({ id: id, disabled: !!disabled })
        + '><span class="MuiButton-startIcon">' + webMuiIcon('<path d="M19.79 5.61C20.3 4.95 19.83 4 19 4H6.83l7.97 7.97zM2.81 2.81 1.39 4.22 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.17l5.78 5.78 1.41-1.41z"></path>', 'MuiSvgIcon-root')
        + '</span><span>' + esc(label) + '</span></button>';
}

/**
 * The library toolbar's filter popover, Material UI's popover paper, which the page places under its Filter button.
 *
 * @param id the popover's id
 * @param label its accessible name
 * @param sectionsHtml its sections, from webFilterAccordion, and a reset button
 */
export function webFilterPopover(id: string, label: string, sectionsHtml: string): string {
    return '<div class="MuiPaper-root MuiPopover-paper stolon-web-filters" role="dialog" aria-modal="true" tabindex="-1"' + attrs({ id: id, 'aria-label': label }) + '>' + sectionsHtml + '</div>';
}

/**
 * A filter section, its heading a button that opens it over its checkboxes. The page toggles aria-expanded and the
 * region's hidden attribute.
 *
 * @param id the section's id, which its parts' ids start with
 * @param title its heading
 * @param checkboxesHtml its checkboxes, from webFilterCheckbox
 */
export function webFilterAccordion(id: string, title: string, checkboxesHtml: string): string {
    var safe = esc(id);
    return '<div class="MuiAccordion-root stolon-web-filter"><h3 class="MuiAccordion-heading stolon-web-filter-heading"><button type="button" class="MuiAccordionSummary-root stolon-web-filter-summary" aria-expanded="false" aria-controls="' + safe + '-content" id="' + safe + '-header">'
        + '<span class="MuiAccordionSummary-content stolon-web-filter-title"><p class="MuiTypography-body1 stolon-web-filter-text">' + esc(title) + '</p></span>'
        + '<span class="MuiAccordionSummary-expandIconWrapper stolon-web-filter-expand">' + webMuiIcon(ARROW_FORWARD, 'MuiSvgIcon-root') + '</span></button></h3>'
        + '<div class="MuiCollapse-root" id="' + safe + '-content" role="region" aria-labelledby="' + safe + '-header" hidden><div class="MuiAccordionDetails-root stolon-web-filter-details"><div class="MuiFormGroup-root stolon-web-filter-group">'
        + checkboxesHtml + '</div></div></div></div>';
}

/**
 * A filter checkbox with its label.
 *
 * @param inputAttrs the input's own attributes, such as data-value
 * @param label its label
 * @param checked true when it is on [optional]
 */
export function webFilterCheckbox(inputAttrs: WebAttributes, label: string, checked?: boolean): string {
    return '<label class="MuiFormControlLabel-root stolon-web-filter-option"><span class="MuiCheckbox-root stolon-web-filter-box"><input type="checkbox" class="PrivateSwitchBase-input stolon-web-filter-input"' + attrs(inputAttrs) + (checked ? ' checked' : '') + ' />'
        + webMuiIcon(CHECKBOX_BLANK, 'MuiSvgIcon-root stolon-web-unchecked') + webMuiIcon(CHECKBOX_CHECKED, 'MuiSvgIcon-root stolon-web-checked') + '</span>'
        + '<span class="MuiTypography-body1 MuiFormControlLabel-label stolon-web-filter-text">' + esc(label) + '</span></label>';
}

// ---------- form fields ----------

/** One option of a select. */
export interface WebSelectOption {
    value: string;
    text: string;
}

/**
 * A select's options, for filling it again.
 *
 * @param options the options
 */
export function webSelectOptions(options: WebSelectOption[]): string {
    return options.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.text) + '</option>'; }).join('');
}

// src/elements/emby-select/emby-select.js (12.4): a select once upgraded, with its label and arrow.
/**
 * A select with its label and arrow.
 *
 * @param id the select's id
 * @param label its label
 * @param options its options
 */
export function webSelectField(id: string, label: string, options: WebSelectOption[]): string {
    return '<div class="selectContainer"><label class="selectLabel"' + attrs({ for: id }) + '>' + esc(label) + '</label>'
        + '<select class="emby-select emby-select-withcolor"' + attrs({ id: id }) + '>' + webSelectOptions(options) + '</select>'
        + '<div class="selectArrowContainer"><span class="selectArrow material-icons keyboard_arrow_down" aria-hidden="true"></span></div></div>';
}

/** A line of webTextareaField's descriptions, with an id for one the page writes into. */
export interface WebDescription {
    text: string;
    id?: string;
}

/** What webTextareaField takes. */
export interface WebTextareaOptions {
    id: string;
    label: string;
    maxLength: number;
    rows?: number;
    placeholder?: string;
    descriptions?: Array<string | WebDescription>;
}

// src/elements/emby-textarea/emby-textarea.js (12.4): a textarea with its label above, then its field descriptions.
/**
 * A text area with its label above and its descriptions under it.
 *
 * @param options {
 *   id           : the text area's id
 *   label        : its label
 *   maxLength    : the most characters it takes
 *   rows         : its height in lines (default 3)
 *   placeholder  : an example value [optional]
 *   descriptions : the lines under it [optional]
 * }
 */
export function webTextareaField(options: WebTextareaOptions): string {
    return '<div class="inputContainer"><label class="textareaLabel textareaLabelUnfocused"' + attrs({ for: options.id }) + '>' + esc(options.label) + '</label>'
        + '<textarea class="emby-textarea"' + attrs({ id: options.id, rows: options.rows || 3, maxlength: options.maxLength, placeholder: options.placeholder || null }) + '></textarea>'
        + (options.descriptions || []).map(function (line) { return typeof line === 'string' ? webFieldDescription(line) : webFieldDescription(line.text, line.id); }).join('') + '</div>';
}

/**
 * A field's description line, under it.
 *
 * @param text the line
 * @param id an id for the page to write into it [optional]
 */
export function webFieldDescription(text: string, id?: string): string {
    return '<div class="fieldDescription"' + attrs({ id: id || null }) + '>' + esc(text) + '</div>';
}

/** The classes of a checkbox list in the web client's paper list. */
export var WEB_CHECKBOX_LIST = 'checkboxList paperList checkboxList-paperList';

/**
 * A checkbox list's heading and the box its checkboxes go in, which holds a line of text until they are known.
 *
 * @param label the heading
 * @param boxId the box's id
 * @param text the line it holds
 */
export function webCheckboxListContainer(label: string, boxId: string, text: string): string {
    return '<div class="checkboxListContainer"><h3 class="checkboxListLabel">' + esc(label) + '</h3><div class="secondaryText"' + attrs({ id: boxId }) + '>' + esc(text) + '</div></div>';
}

// src/elements/emby-checkbox/emby-checkbox.js (12.4): a checkbox once upgraded.
/**
 * A checkbox as the web client upgrades it.
 *
 * @param inputAttrs the input's own attributes, such as id or data-value
 * @param label its label
 * @param note secondary text after the label [optional]
 * @param checked true when it is on [optional]
 * @param disabled true when it cannot change [optional]
 */
export function webCheckbox(inputAttrs: WebAttributes, label: string, note?: string | null, checked?: boolean, disabled?: boolean): string {
    return '<label class="emby-checkbox-label"><input type="checkbox" class="emby-checkbox"' + attrs(inputAttrs) + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' />'
        + '<span class="checkboxLabel">' + esc(label) + (note ? ' <span class="secondaryText">· ' + esc(note) + '</span>' : '') + '</span>'
        + '<span class="checkboxOutline"><span class="material-icons checkboxIcon checkboxIcon-checked check" aria-hidden="true"></span><span class="material-icons checkboxIcon checkboxIcon-unchecked" aria-hidden="true"></span></span></label>';
}

// src/controllers/user/display/index.html (12.4): a settings checkbox with its description under it.
/**
 * A settings checkbox with its description under it, as the web client's settings pages set them out. It starts off and
 * disabled, and the description is filled in later.
 *
 * @param id the input's id
 * @param label its label
 * @param descriptionId the description's id
 */
export function webSettingsCheckbox(id: string, label: string, descriptionId: string): string {
    return '<div class="checkboxContainer checkboxContainer-withDescription">' + webCheckbox({ id: id }, label, null, false, true)
        + '<div class="fieldDescription checkboxFieldDescription"' + attrs({ id: descriptionId }) + '></div></div>';
}

/**
 * A text link button, as the web client's Select all and Show more.
 *
 * @param buttonAttrs the button's own attributes
 * @param text its label
 */
export function webLinkButton(buttonAttrs: WebAttributes, text: string): string {
    return '<button type="button" class="button-link emby-button"' + attrs(buttonAttrs) + '>' + esc(text) + '</button>';
}

/**
 * Rows in the web client's paper list.
 *
 * @param rowsHtml the rows
 * @param className classes of the page's own [optional]
 */
export function webPaperList(rowsHtml: string, className?: string): string {
    return '<div class="paperList' + (className ? ' ' + esc(className) : '') + '">' + rowsHtml + '</div>';
}

// ---------- cards ----------
// src/components/cardbuilder/cardBuilder.js (buildCard, getCardFooterText, getCardTextLines, getHoverMenuHtml, getDefaultText),
// cardbuilder/utils/builder.ts and src/components/indicators/indicators.js (12.4), cut down to a card fed the page's own items.

/** The card shape of a row that scrolls sideways. */
export var WEB_CARD_ROW = 'overflowPortrait';
/** The card shape of a grid that wraps, as the web client's list pages lay out. */
export var WEB_CARD_GRID = 'portrait';

// cardbuilder/utils/builder.ts getDefaultColorIndex: a color for a card with no image, from the middle character of its name.
/**
 * The web client's placeholder color for a card with no image, 1 to 5, picked by its name.
 *
 * @param name the card's name
 */
export function webDefaultColorIndex(name: string): number {
    if (!name) return 1;
    var character = String(name.slice(Math.floor(name.length / 2)).charCodeAt(0));
    var sum = 0;
    for (var i = 0; i < character.length; i++) sum += parseInt(character.charAt(i), 10);
    return parseInt(String(sum).slice(-1), 10) % 5 + 1;
}

// cardBuilder.js getDefaultText: the item type's icon.
/**
 * The icon a card with no image shows, by its item type.
 *
 * @param type the item type, such as Movie, Series, or Person
 */
export function webDefaultCardIcon(type?: string): string {
    return '<span class="cardImageIcon material-icons ' + (type === 'Person' ? 'person' : type === 'Series' ? 'tv' : 'movie') + '" aria-hidden="true"></span>';
}

/** The card's link, for webCardImage: its attributes, its accessible name, and markup laid over the picture. */
export interface WebCardLink {
    attrs: WebAttributes;
    label: string;
    inner?: string;
}

/**
 * A card's picture, the image as its background once it nears the screen, or the web client's colored placeholder with the
 * type's icon. Given a link, the picture is the card's link.
 *
 * @param url the image's address, or empty for the placeholder
 * @param title the card's name, which picks the placeholder's color
 * @param type the item type [optional]
 * @param link the card's link [optional]
 * @param className a class of the page's own, such as a color shown while the image loads [optional]
 */
export function webCardImage(url: string | null | undefined, title: string, type?: string, link?: WebCardLink | null, className?: string): string {
    var tag = link ? 'a' : 'div';
    var background = !url ? ' defaultCardBackground defaultCardBackground' + webDefaultColorIndex(title) : className ? ' ' + esc(className) : '';
    return '<' + tag + (link ? attrs(link.attrs) : '') + ' class="cardImageContainer coveredImage' + background + ' cardContent' + (link ? ' itemAction' : '') + (url ? ' lazy' : '') + '"'
        + (link ? '' : ' role="img"') + ' aria-label="' + esc(link ? link.label : title) + '"' + (url ? ' data-src="' + esc(url) + '"' : '') + '>'
        + (link && link.inner ? link.inner : '') + (url ? '' : webDefaultCardIcon(type)) + '</' + tag + '>';
}

/** A card's round badge: a Material icon, its words as the tooltip, and a class of the page's own for its color. */
export interface WebIndicator {
    icon: string;
    title: string;
    className?: string;
}

// indicators.js getPlayedIndicatorHtml: the played check, here in any icon and color.
/**
 * The played indicator's round badge, with the page's own icon and color class.
 *
 * @param indicator the badge, or null for none
 */
export function webIndicator(indicator: WebIndicator | null | undefined): string {
    if (!indicator) return '';
    return '<div class="playedIndicator indicator' + (indicator.className ? ' ' + esc(indicator.className) : '') + '" title="' + esc(indicator.title) + '"><span class="material-icons indicatorIcon ' + esc(indicator.icon) + '" aria-hidden="true"></span></div>';
}

// indicators.js getProgressHtml.
/**
 * A card's progress bar.
 *
 * @param share how far, from 0 to 1
 */
export function webProgressBar(share: number): string {
    var percent = Math.max(0, Math.min(100, Math.round(share * 100)));
    return '<div class="itemProgressBar"><div class="itemProgressBarForeground" style="width:' + percent + '%;"></div></div>';
}

/** A button of a card's hover menu, answered by the page through data-stolon-action. title is its tooltip, and label its accessible name when that says more. */
export interface WebOverlayButton {
    action: string;
    icon: string;
    title: string;
    label?: string;
    key?: string;
}

/** Where a card's hover menu button sits: in the corner on a phone, in the hover menu's corner, or as its middle button. */
export type WebOverlayPlacement = 'corner' | 'hover' | 'fab';

// cardBuilder.js getHoverMenuHtml: the hover menu's buttons.
/**
 * A button of a card's hover menu, answered by the page through data-stolon-action.
 *
 * @param button the button's action, icon, tooltip as title, a longer accessible name as label (default the title), and key
 * @param placement where it sits (default 'corner', always shown)
 */
export function webOverlayButton(button: WebOverlayButton, placement?: WebOverlayPlacement): string {
    var b = button;
    var extra = placement === 'fab' ? ' cardOverlayButton-hover cardOverlayFab-primary' : placement === 'hover' ? ' cardOverlayButton-hover' : '';
    return '<button type="button" class="cardOverlayButton itemAction paper-icon-button-light' + extra + '"' + attrs({ 'data-stolon-action': b.action, 'data-stolon-key': b.key || null, title: b.title, 'aria-label': b.label || b.title })
        + '><span class="material-icons cardOverlayButtonIcon' + (extra ? ' cardOverlayButtonIcon-hover' : '') + ' ' + esc(b.icon) + '" aria-hidden="true"></span></button>';
}

/** What webCard takes. */
export interface WebCardOptions {
    title: string;
    href?: string;
    key?: string;
    shape?: string;
    type?: string;
    image?: string | null;
    imageClass?: string;
    secondary?: string;
    status?: string;
    indicator?: WebIndicator | null;
    progress?: number | null;
    fab?: WebOverlayButton | null;
    buttons?: WebOverlayButton[];
    personCard?: boolean;
    oneLine?: boolean;
}

/**
 * A card, as the web client builds one: the picture, a hover menu on a desktop, and its lines of text under it.
 *
 * @param options {
 *   title      : the card's name, the first line and its link's text
 *   href       : where the card goes (default #)
 *   key        : a data-stolon-card value for the page to open it by [optional]
 *   shape      : the card shape, WEB_CARD_ROW or WEB_CARD_GRID (default WEB_CARD_ROW)
 *   type       : the item type, for the placeholder's icon [optional]
 *   image      : the picture's address [optional]
 *   imageClass : a class of the page's own on the picture while it loads [optional]
 *   secondary  : the second line [optional]
 *   status     : words added to the link's accessible name [optional]
 *   indicator  : a round badge on the picture [optional]
 *   progress   : a progress bar on the picture, from 0 to 1 [optional]
 *   fab        : the hover menu's middle button, on a desktop [optional]
 *   buttons    : the hover menu's corner buttons, always shown on a phone [optional]
 *   personCard : true for a person's card [optional]
 *   oneLine    : true for a card with no second line [optional]
 * }
 */
export function webCard(options: WebCardOptions): string {
    var o = options;
    var desktop = isDesktop();
    var shape = esc(o.shape || WEB_CARD_ROW);
    var href = o.href || '#';
    var linkAttrs: WebAttributes = { href: href, 'data-stolon-card': o.key || null };
    var html = '<div class="card ' + shape + 'Card' + (o.personCard ? ' personCard' : '') + (desktop ? ' card-hoverable' : '') + ' card-withuserdata">'
        + '<div class="cardBox cardBox-bottompadded"><div class="cardScalable">'
        + '<div class="cardPadder cardPadder-' + shape + '">' + (o.image ? webDefaultCardIcon(o.type) : '') + '</div>'
        + webCardImage(o.image, o.title, o.type, {
            attrs: linkAttrs,
            label: o.title + (o.status ? ', ' + o.status : ''),
            inner: (o.indicator ? '<div class="cardIndicators">' + webIndicator(o.indicator) + '</div>' : '')
                + (o.progress !== null && o.progress !== undefined ? '<div class="innerCardFooter fullInnerCardFooter innerCardFooterClear">' + webProgressBar(o.progress) + '</div>' : '')
        }, o.imageClass);
    var buttons = o.buttons || [];
    if (desktop) {
        if (o.fab || buttons.length) {
            html += '<div class="cardOverlayContainer itemAction">'
                + (o.fab ? webOverlayButton(o.fab, 'fab') : '')
                + '<div class="cardOverlayButton-br flex">' + buttons.map(function (b) { return webOverlayButton(b, 'hover'); }).join('') + '</div></div>';
        }
    } else if (buttons.length) {
        html += '<div class="cardOverlayButton-br flex">' + buttons.map(function (b) { return webOverlayButton(b); }).join('') + '</div>';
    }
    html += '</div>';
    html += '<div class="cardText cardTextCentered cardText-first"><bdi><a class="itemAction textActionButton"' + attrs({ href: href, 'data-stolon-card': o.key || null, title: o.title }) + '>' + esc(o.title) + '</a></bdi></div>';
    if (!o.oneLine) {
        html += o.secondary
            ? '<div class="cardText cardTextCentered cardText-secondary"><bdi>' + esc(o.secondary) + '</bdi></div>'
            : '<div class="cardText cardTextCentered">&nbsp;</div>';
    }
    return html + '</div></div>';
}

// itemDetails/index.js renderImage, through cardBuilder: a card's frame around a plain picture, with no text.
/**
 * A card's frame around a picture with no text, such as the details page's poster.
 *
 * @param shape the card shape
 * @param url the picture's address, or empty for the placeholder
 * @param title the card's name
 * @param type the item type [optional]
 * @param className classes of the page's own on the card [optional]
 */
export function webPosterCard(shape: string, url: string | null | undefined, title: string, type?: string, className?: string): string {
    var s = esc(shape);
    return '<div class="card ' + s + 'Card' + (className ? ' ' + esc(className) : '') + '"><div class="cardBox"><div class="cardScalable"><div class="cardPadder cardPadder-' + s + '"></div>'
        + webCardImage(url, title, type) + '</div></div></div>';
}

/**
 * Loading placeholder cards, built from the real card's box and both lines of its text.
 *
 * @param count how many
 * @param shape the card shape (default WEB_CARD_ROW)
 */
export function webPlaceholderCards(count: number, shape?: string): string {
    var s = esc(shape || WEB_CARD_ROW);
    var card = '<div class="card ' + s + 'Card stolon-web-skeleton stolon-web-appear" aria-hidden="true"><div class="cardBox cardBox-bottompadded"><div class="cardScalable"><div class="cardPadder cardPadder-' + s + ' stolon-web-skeleton-padder"></div></div>'
        + '<div class="cardText cardTextCentered cardText-first"><span class="stolon-web-skeleton-bar"></span></div>'
        + '<div class="cardText cardTextCentered cardText-secondary"><span class="stolon-web-skeleton-bar"></span></div></div></div>';
    var out = '';
    for (var i = 0; i < count; i++) out += card;
    return out;
}

/**
 * A grid of loading placeholder cards.
 *
 * @param count how many
 * @param shape the card shape (default WEB_CARD_ROW)
 */
export function webPlaceholderGrid(count: number, shape?: string): string {
    return '<div class="itemsContainer padded-right vertical-wrap">' + webPlaceholderCards(count, shape) + '</div>';
}

/**
 * Loading placeholder lines of text.
 *
 * @param count how many
 */
export function webPlaceholderLines(count: number): string {
    var lines = '';
    for (var i = 0; i < count; i++) lines += '<span class="stolon-web-skeleton-bar stolon-web-skeleton-line"></span>';
    return '<span class="stolon-web-appear" aria-hidden="true">' + lines + '</span>';
}

// ---------- rows of cards ----------

// src/elements/emby-scrollbuttons/emby-scrollbuttons.js (12.4): the arrows at the top right of a row.
/**
 * A row's scroll arrows, hidden and disabled until the page finds the row runs past the screen.
 *
 * @param id the id of the row they scroll
 */
export function webScrollButtons(id: string): string {
    var prev = esc(stolonText('Previous'));
    var next = esc(stolonText('Next'));
    var safe = esc(id);
    return '<div class="emby-scrollbuttons padded-right" data-stolon-buttons="' + safe + '"><button type="button" class="emby-scrollbuttons-button paper-icon-button-light" data-stolon-scroll="' + safe + '" data-stolon-direction="-1" title="' + prev + '" aria-label="' + prev + '" disabled hidden><span class="material-icons chevron_left" aria-hidden="true"></span></button>'
        + '<button type="button" class="emby-scrollbuttons-button paper-icon-button-light" data-stolon-scroll="' + safe + '" data-stolon-direction="1" title="' + next + '" aria-label="' + next + '" disabled hidden><span class="material-icons chevron_right" aria-hidden="true"></span></button></div>';
}

/** What webCardSection takes. */
export interface WebCardSectionOptions {
    id: string;
    title: string;
    inner: string;
    scroll?: boolean;
    listHref?: string | null;
    listKey?: string;
}

/**
 * A row of cards on a page of rows. With a list page, the heading is a link with its chevron, as the home page's rows
 * (src/components/homesections/homesections.js). Otherwise it is the search page's plain heading (SearchResultsRow.tsx).
 *
 * @param options {
 *   id       : the row's id
 *   title    : its heading
 *   inner    : its cards, from webCard
 *   scroll   : true for a row that scrolls sideways, else a grid that wraps [optional]
 *   listHref : where the heading goes, for a row with a list page [optional]
 *   listKey  : a data-stolon-list value for the page to open the list by [optional]
 * }
 */
export function webCardSection(options: WebCardSectionOptions): string {
    var o = options;
    var heading = o.listHref !== null && o.listHref !== undefined
        ? '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left"><a class="more button-flat button-flat-mini sectionTitleTextButton emby-button"' + attrs({ href: o.listHref, 'data-stolon-list': o.listKey || null }) + '>'
            + '<h2 class="sectionTitle sectionTitle-cards">' + esc(o.title) + '</h2><span class="material-icons chevron_right" aria-hidden="true"></span></a></div>'
        : '<h2 class="sectionTitle sectionTitle-cards focuscontainer-x padded-left padded-right">' + esc(o.title) + '</h2>';
    var arrows = o.scroll && isDesktop() ? webScrollButtons(o.id) : '';
    return '<div class="verticalSection' + (o.scroll ? ' emby-scroller-container' : '') + '">' + heading + arrows + (o.scroll
        ? '<div class="padded-top-focusscale padded-bottom-focusscale emby-scroller scrollX hiddenScrollX"' + attrs({ id: o.id }) + '><div class="itemsContainer scrollSlider focuscontainer-x">' + o.inner + '</div></div>'
        : '<div class="itemsContainer vertical-wrap"' + attrs({ id: o.id }) + '>' + o.inner + '</div>') + '</div>';
}

/** One link of webSearchSuggestions. */
export interface WebLink {
    href: string;
    text: string;
}

// src/apps/legacy/features/search/components/SearchSuggestions.tsx (12.4): centered text links under the Suggestions heading.
/**
 * An empty search's suggestions.
 *
 * @param items the links
 */
export function webSearchSuggestions(items: WebLink[]): string {
    return '<div class="verticalSection searchSuggestions" style="text-align: center;"><div><h2 class="sectionTitle padded-left padded-right">' + esc(stolonText('Suggestions')) + '</h2></div>'
        + '<div class="searchSuggestionsList padded-left padded-right">' + items.map(function (i) {
            return '<div><a class="emby-button button-link" href="' + esc(i.href) + '" style="display: inline-block; padding: 0.5em 1em;">' + esc(i.text) + '</a></div>';
        }).join('') + '</div></div>';
}

/**
 * A row's loading placeholder, the search page's row with its heading and cards.
 *
 * @param count how many cards
 */
export function webPlaceholderRow(count: number): string {
    return '<div class="verticalSection emby-scroller-container stolon-web-appear" aria-hidden="true">'
        + '<h2 class="sectionTitle sectionTitle-cards focuscontainer-x padded-left padded-right"><span class="stolon-web-skeleton-bar"></span></h2>'
        + '<div class="padded-top-focusscale padded-bottom-focusscale emby-scroller scrollX hiddenScrollX"><div class="itemsContainer scrollSlider">' + webPlaceholderCards(count) + '</div></div></div>';
}

// src/scripts/itembynamedetailpage.js (12.4) renderSections: a heading and a wrapping grid in the details page's children.
/**
 * A heading over a wrapping grid, as a person's details page lists their titles.
 *
 * @param title the heading
 * @param inner the cards
 */
export function webDetailGrid(title: string, inner: string): string {
    return '<div class="verticalSection"><div class="sectionTitleContainer sectionTitleContainer-cards"><h2 class="sectionTitle sectionTitle-cards">' + esc(title) + '</h2></div>'
        + '<div class="itemsContainer padded-right vertical-wrap">' + inner + '</div></div>';
}

// itemDetails/index.js renderChildren (12.4): a wrapping grid in the children section.
/**
 * A wrapping grid for the details page's children, such as a show's seasons.
 *
 * @param inner the cards
 */
export function webChildrenGrid(inner: string): string {
    return '<div class="itemsContainer padded-right vertical-wrap" style="text-align:left">' + inner + '</div>';
}

// src/controllers/itemDetails/index.html (12.4)'s cast and similar sections, filled as itemDetails/index.js renderCast fills them.
/**
 * Fills one of the details page's sections of cards, such as its cast: the heading, the scroll arrows, then the cards. Empty
 * cards hide it.
 *
 * @param section the section, such as the castCollapsible element
 * @param id the id its row takes, which the arrows scroll
 * @param title its heading
 * @param inner its cards, or empty to hide it
 */
export function webFillDetailSection(section: HTMLElement, id: string, title: string, inner: string): void {
    var heading = section.querySelector('.sectionTitle') as HTMLElement | null;
    var items = section.querySelector('.itemsContainer') as HTMLElement | null;
    if (!heading || !items) return;
    var scroller = items.parentNode as HTMLElement;
    var old = section.querySelector('[data-stolon-buttons]');
    if (old) old.remove();
    items.innerHTML = inner;
    if (!inner) { section.classList.add('hide'); return; }
    heading.textContent = title;
    section.classList.add('emby-scroller-container');
    scroller.classList.add('emby-scroller', 'scrollX', 'hiddenScrollX');
    scroller.id = id;
    if (isDesktop()) heading.insertAdjacentHTML('afterend', webScrollButtons(id));
    section.classList.remove('hide');
}

// ---------- the details page ----------

// The parts adoptDetailsTemplate needs, by the template's own selector, and the id each takes.
var DETAIL_PARTS: Record<string, string> = {
    itemBackdrop: '.itemBackdrop', detailLogo: '.detailLogo', detailImage: '.detailImageContainer.hide-mobile',
    detailImageMobile: '.detailImageContainer.hide-desktop', nameContainer: '.nameContainer', detailMisc: '.itemMiscInfo-primary',
    detailButtons: '.mainDetailButtons', detailRows: '.trackSelections', detailTagline: '.detailSectionContent .tagline',
    detailOverview: '.detailSectionContent .overview', overviewControls: '.overview-controls', overviewExpand: '.overview-controls .overview-expand',
    detailBorn: '#itemBirthday', detailBirthPlace: '#itemBirthLocation', detailDied: '#itemDeathDate', detailLinks: '.itemExternalLinks',
    detailGroup: '.itemDetailsGroup', detailSections: '.detailPageSecondaryContainer', childrenSection: '#listChildrenCollapsible',
    childrenContent: '#listChildrenCollapsible #childrenContent', castSection: '#castCollapsible', similarSection: '#similarCollapsible'
};
var DETAIL_IDS = ['itemBackdrop', 'detailLogo', 'detailImage', 'detailImageMobile', 'detailMisc', 'detailButtons', 'detailRows', 'detailTagline', 'detailOverview',
    'overviewControls', 'overviewExpand', 'detailBorn', 'detailBirthPlace', 'detailDied', 'detailLinks', 'detailGroup', 'detailSections'];
var DETAIL_HIDDEN = ['detailLogo', 'detailMisc', 'detailRows', 'detailTagline', 'overviewControls', 'detailBorn', 'detailBirthPlace', 'detailDied', 'detailLinks'];

/**
 * Puts the web client's details page template into a view, so an item's details are laid out by the web client's own markup.
 * The parts the page fills take ids: itemBackdrop, detailLogo, detailImage, detailImageMobile, detailMisc, detailButtons,
 * detailRows, detailTagline, detailOverview, overviewControls, overviewExpand, detailBorn, detailBirthPlace, detailDied,
 * detailLinks, detailGroup, and detailSections. The name goes in detailName and detailOriginal. The parts with nothing yet
 * start hidden, as the web client's do, and its own buttons are taken out.
 *
 * @param view the element the details go in, which is emptied
 * @param template the template element (default the stolon-shell-details template HostedPage writes)
 * @param missing collects the selectors of the parts the template lacks [optional]
 * @returns false, leaving the view as it was, when there is no template or it lacks a part
 */
export function adoptDetailsTemplate(view: HTMLElement, template?: HTMLTemplateElement | null, missing?: string[]): boolean {
    var source = template === undefined ? document.getElementById('stolon-shell-details') as HTMLTemplateElement | null : template;
    var page = source && source.content ? source.content.querySelector('#itemDetailPage') : null;
    if (!page) return false;
    var root = page.cloneNode(true) as HTMLElement;
    var found: Record<string, HTMLElement> = {};
    var lacking: string[] = [];
    Object.keys(DETAIL_PARTS).forEach(function (k) {
        var el = root.querySelector(DETAIL_PARTS[k]) as HTMLElement | null;
        if (el) found[k] = el; else lacking.push(DETAIL_PARTS[k]);
    });
    if (lacking.length) {
        if (missing) missing.push.apply(missing, lacking);
        return false;
    }
    DETAIL_IDS.forEach(function (k) { found[k].id = k; });
    DETAIL_HIDDEN.forEach(function (k) { found[k].classList.add('hide'); });
    Array.prototype.forEach.call(root.querySelectorAll('.itemMiscInfo-secondary, #seriesAirTime'), function (n: HTMLElement) { n.classList.add('hide'); });
    found.detailLogo.setAttribute('role', 'img');
    found.nameContainer.innerHTML = '<h1 class="itemName infoText parentNameLast" id="detailName" tabindex="-1"></h1><h4 class="itemName infoText originalTitle hide" id="detailOriginal"></h4>';
    found.detailButtons.innerHTML = '';
    found.detailOverview.classList.add('detail-clamp-text');
    found.overviewExpand.classList.remove('hide');
    found.overviewExpand.classList.add('button-link', 'emby-button');
    found.overviewExpand.textContent = stolonText('ShowMore');
    while (view.firstChild) view.removeChild(view.firstChild);
    while (root.firstChild) view.appendChild(root.firstChild);
    return true;
}

/**
 * Text kept in its own direction, as itemDetails/index.js renderName writes a name.
 *
 * @param text the text
 */
export function webBdi(text: string): string {
    return text ? '<bdi>' + esc(text) + '</bdi>' : '';
}

// src/components/mediainfo/mediainfo.js (12.4) getMediaInfoItem.
/**
 * One item of the details page's info row.
 *
 * @param html its content, markup the caller has escaped
 * @param className its own class before mediaInfoItem [optional]
 */
export function webMediaInfoItem(html: string, className?: string): string {
    return '<div class="' + (className ? esc(className) + ' mediaInfoItem' : 'mediaInfoItem') + '">' + html + '</div>';
}

/**
 * The info row's age rating.
 *
 * @param text the rating
 */
export function webOfficialRating(text: string): string {
    return webMediaInfoItem(esc(text), 'mediaInfoText mediaInfoOfficialRating');
}

/**
 * The info row's community rating, a star and the score to one place.
 *
 * @param score the score
 */
export function webStarRating(score: number): string {
    return webMediaInfoItem('<span class="material-icons starIcon star" aria-hidden="true"></span>' + esc(Number(score).toFixed(1)), 'starRatingContainer');
}

/**
 * The info row's critic rating, fresh from 60.
 *
 * @param value the rating, from 0 to 100
 */
export function webCriticRating(value: number): string {
    return webMediaInfoItem(esc(String(value)), 'mediaInfoCriticRating mediaInfoCriticRating' + (value >= 60 ? 'Fresh' : 'Rotten'));
}

/**
 * A tag in the info row's outlined text style, such as where an item stands. It takes the row's text color, and a class of the
 * page's own may set another.
 *
 * @param text the tag's words
 * @param className a class of the page's own [optional]
 */
export function webStatusTag(text: string, className?: string): string {
    return webMediaInfoItem(esc(text), 'mediaInfoText' + (className ? ' ' + className : ''));
}

/**
 * A row of the details page's info, with a class of the page's own.
 *
 * @param html its content, markup the caller has escaped
 * @param className a class of the page's own [optional]
 */
export function webInfoRow(html: string, className?: string): string {
    return '<div class="mediaInfo' + (className ? ' ' + esc(className) : '') + '">' + html + '</div>';
}

// src/controllers/itemDetails/index.html (12.4): the flat detail buttons, an icon each.
function detailIcon(name: string): string {
    return '<div class="detailButton-content"><span class="material-icons detailButton-icon ' + esc(name) + '" aria-hidden="true"></span></div>';
}

/**
 * A flat detail button with an icon, its words as the tooltip and the accessible name.
 *
 * @param id the button's id, or null [optional]
 * @param iconName the Material icon
 * @param title its words
 * @param disabled true for a state with nothing to do [optional]
 */
export function webDetailButton(id: string | null, iconName: string, title: string, disabled?: boolean): string {
    return '<button type="button" class="button-flat detailButton emby-button"' + attrs({ id: id || null, title: title, 'aria-label': title, disabled: !!disabled }) + '>' + detailIcon(iconName) + '</button>';
}

/**
 * Where an item stands when there is nothing to do, such as a request on its way: the detail button's icon, plain, with its
 * words as the tooltip and the accessible name. It is an image, never a disabled button, so it is never greyed out.
 *
 * @param iconName the Material icon
 * @param title its words
 */
export function webDetailStatus(iconName: string, title: string): string {
    return '<span class="detailButton stolon-web-detail-status" role="img"' + attrs({ title: title, 'aria-label': title }) + '>' + detailIcon(iconName) + '</span>';
}

/**
 * A detail button that is a link.
 *
 * @param href where it goes
 * @param iconName the Material icon
 * @param title its words
 * @param external true to open it in a new tab [optional]
 */
export function webDetailLinkButton(href: string, iconName: string, title: string, external?: boolean): string {
    return '<a class="button-flat detailButton emby-button"' + attrs({ href: href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, title: title, 'aria-label': title }) + '>' + detailIcon(iconName) + '</a>';
}

// src/elements/emby-ratingbutton/emby-ratingbutton.js (12.4): the favorite button, the heart red once a favorite.
/**
 * The favorite button.
 *
 * @param id the button's id
 * @param isFavorite true when the item is a favorite
 */
export function webFavoriteButton(id: string, isFavorite: boolean): string {
    var title = isFavorite ? stolonText('Favorite') : stolonText('AddToFavorites');
    return '<button type="button" class="button-flat btnUserRating detailButton emby-button' + (isFavorite ? ' ratingbutton-withrating' : '') + '"'
        + attrs({ id: id, title: title, 'aria-label': title, 'aria-pressed': String(isFavorite), 'data-isfavorite': String(isFavorite) }) + '>'
        + '<div class="detailButton-content"><span class="material-icons detailButton-icon favorite' + (isFavorite ? ' ratingbutton-icon-withrating' : '') + '" aria-hidden="true"></span></div></button>';
}

// src/components/itemMediaInfo/itemMediaInfo.js (12.4): the media info dialog's content.
/**
 * The media info dialog's content, centered.
 *
 * @param sectionsHtml its sources, from webMediaInfoSource
 */
export function webMediaInfoContent(sectionsHtml: string): string {
    return '<div class="mediaInfoContent">' + sectionsHtml + '</div>';
}

/**
 * One source of the media info dialog, its name then its streams.
 *
 * @param title its name
 * @param innerHtml its attributes and streams
 */
export function webMediaInfoSource(title: string, innerHtml: string): string {
    return '<div class="mediaInfoSource"><div><h2 class="mediaInfoStreamType">' + esc(title) + '</h2></div>\n' + innerHtml + '</div>';
}

/**
 * One stream of a source, its heading then its attributes.
 *
 * @param title its heading, such as Video
 * @param attributesHtml its attributes, from webMediaInfoAttribute
 */
export function webMediaInfoStream(title: string, attributesHtml: string): string {
    return '<div class="mediaInfoStream">\n<h2 class="mediaInfoStreamType">' + esc(title) + '</h2>\n' + attributesHtml + '</div>';
}

/**
 * One attribute of a stream, a bold label then its value, a line each.
 *
 * @param label the label
 * @param valueHtml the value, markup the caller has escaped
 */
export function webMediaInfoAttribute(label: string, valueHtml: string): string {
    return '<span class="mediaInfoLabel">' + esc(label) + '</span><span class="hide">: </span><span class="mediaInfoAttribute">' + valueHtml + '</span>\n<br/>';
}

// src/components/itemMetadata/ItemDetailsMetadataList (12.4): an item of the details group.
/**
 * An item of the details group, a label then its values.
 *
 * @param label the label
 * @param value the value, text, or markup the caller has escaped when raw is true
 * @param raw true when value is links from webPersonLinks or webExternalLinks [optional]
 */
export function webDetailsGroupItem(label: string, value: string, raw?: boolean): string {
    return '<div class="detailsGroupItem"><div class="label">' + esc(label) + '</div>' + (raw ? '<div class="focuscontainer-x">' + value : '<div class="content">' + esc(value)) + '</div></div>';
}

/** One link of a details group line, with a data-stolon-card value for the page to open it by. */
export interface WebItemLink {
    href: string;
    name: string;
    key?: string;
}

// itemDetails/index.js renderDirector and renderWriter: links separated by commas.
/**
 * A line of links, such as directors or genres, separated by commas.
 *
 * @param links the links
 */
export function webPersonLinks(links: WebItemLink[]): string {
    return links.map(function (p) {
        return '<span><a class="button-link emby-button stolon-web-inherit"' + attrs({ href: p.href, 'data-stolon-card': p.key || null }) + '>' + esc(p.name) + '</a></span>';
    }).join('<span>, </span>');
}

/** One link of a line that opens a list, such as a genre, with a data-stolon-list value for the page to open it by. */
export interface WebListLink {
    href: string;
    name: string;
    key?: string;
}

/**
 * A line of links that each open a list, such as genres or studios, separated by commas as webPersonLinks.
 *
 * @param links the links
 */
export function webListLinks(links: WebListLink[]): string {
    return links.map(function (l) {
        return '<span><a class="button-link emby-button stolon-web-inherit"' + attrs({ href: l.href, 'data-stolon-list': l.key || null }) + '>' + esc(l.name) + '</a></span>';
    }).join('<span>, </span>');
}

// itemDetails/index.js renderLinks: the external links line.
/**
 * The external links line, each opening in a new tab.
 *
 * @param links the links
 */
export function webExternalLinks(links: WebLink[]): string {
    return links.map(function (l) { return '<a class="button-link emby-button" href="' + esc(l.href) + '" target="_blank" rel="noopener noreferrer">' + esc(l.text) + '</a>'; }).join(', ');
}

// ---------- rows, notices, and limits ----------

/** One note under a row, who wrote it and what. */
export interface WebNote {
    by: string;
    text: string;
}

/** What webNoteRow takes. */
export interface WebNoteRowOptions {
    title: string;
    secondary?: string;
    asideHtml?: string;
    by?: string;
    notes?: WebNote[];
}

// The dashboard's lists (listItem-withContentWrapper, 12.4): a row titled as its lists title one, with notes across it.
/**
 * A row in the web client's list look, its title as the dashboard's lists title a row, a second line, an aside at its end,
 * then who it is from and each note under who wrote it, across the row. It reads as text, with no hover.
 *
 * @param options {
 *   title     : the row's title
 *   secondary : the line under it, such as when [optional]
 *   asideHtml : markup at the row's end, such as from webStatusTag, which the caller has escaped [optional]
 *   by        : who the row is from, a line across it [optional]
 *   notes     : notes under it, each who wrote it and its text [optional]
 * }
 */
export function webNoteRow(options: WebNoteRowOptions): string {
    var o = options;
    var notes = (o.notes || []).map(function (n) {
        return '<div class="stolon-web-note"><div class="secondary stolon-web-note-by">' + esc(n.by) + '</div><div class="stolon-web-note-text">' + esc(n.text) + '</div></div>';
    }).join('');
    return '<div class="listItem listItem-border listItem-withContentWrapper stolon-web-note-row">'
        + '<div class="listItem-content"><div class="listItemBody two-line stolon-web-note-body"><h3 class="listItemBodyText stolon-web-note-title">' + esc(o.title) + '</h3>'
        + (o.secondary ? '<div class="listItemBodyText secondary">' + esc(o.secondary) + '</div>' : '') + '</div>'
        + (o.asideHtml ? '<div class="listItemAside stolon-web-note-aside">' + o.asideHtml + '</div>' : '') + '</div>'
        + (o.by || notes ? '<div class="stolon-web-notes">' + (o.by ? '<div class="secondary stolon-web-note-from">' + esc(o.by) + '</div>' : '') + notes + '</div>' : '') + '</div>';
}

// src/controllers/user/display/index.html (12.4): a settings page's group heading and its description.
/**
 * A heading over a form with its description under it, as the web client's settings pages head a group.
 *
 * @param title the heading
 * @param text the description
 */
export function webNoticeBlock(title: string, text: string): string {
    return '<div class="verticalSection stolon-web-notice"><h2 class="sectionTitle">' + esc(title) + '</h2><div class="fieldDescription">' + esc(text) + '</div></div>';
}

/** One limit of webLimitsBox: what it is, what is left, and how much is used. */
export interface WebLimit {
    label: string;
    amount: string;
    percent: number;
}

// The dashboard's storage bars, a Material UI determinate LinearProgress, in a checkbox list's paper box.
/**
 * A box of limits in the web client's paper list, each a line of what it is and what is left over a thin bar of how much is
 * used, green, then orange from 80 percent and red from 90, as the dashboard's storage bars.
 *
 * @param label the box's heading
 * @param rows the limits
 */
export function webLimitsBox(label: string, rows: WebLimit[]): string {
    return '<div class="checkboxListContainer"><h3 class="checkboxListLabel">' + esc(label) + '</h3><div class="' + WEB_CHECKBOX_LIST + ' stolon-web-limits">'
        + rows.map(function (r) {
            var percent = Math.max(0, Math.min(100, Number(r.percent) || 0));
            var color = percent >= 90 ? 'Error' : percent >= 80 ? 'Warning' : 'Success';
            return '<div class="stolon-web-limit"><div class="stolon-web-limit-head"><span>' + esc(r.label) + '</span><span class="secondaryText">' + esc(r.amount) + '</span></div>'
                + '<span class="MuiLinearProgress-root MuiLinearProgress-determinate MuiLinearProgress-color' + color + ' stolon-web-limit-bar stolon-web-limit-' + color.toLowerCase() + '" role="progressbar"'
                + attrs({ 'aria-label': r.label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(percent)) }) + '>'
                + '<span class="MuiLinearProgress-bar stolon-web-limit-fill" style="transform:translateX(' + (percent - 100) + '%)"></span></span></div>';
        }).join('') + '</div></div>';
}
