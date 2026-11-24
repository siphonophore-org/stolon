import { make, icon, iconButton, nextId, listen, runAll, clear } from './lib/dom.js';
import { anchorPopover } from './lib/popover.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** A short badge after an item's label. color is a status color name, a hex code, or a badge state name. */
export interface OverflowMenuBadge {
    label: string;
    color?: string;
}

/** One action in an overflow menu. An item with no value reports its label, and an item with an href is a link. */
export interface OverflowMenuItem {
    label: string;
    value?: unknown;
    disabled?: boolean;
    destructive?: boolean;
    icon?: string;
    href?: string;
    current?: boolean;
    badge?: string | number | OverflowMenuBadge;
}

/** What createOverflowMenu takes. onSelect runs with the chosen item's value, the item, and the click. */
export interface OverflowMenuOptions {
    items?: OverflowMenuItem[];
    label?: string;
    icon?: string;
    text?: string;
    align?: 'start' | 'end';
    onSelect?(value: unknown, item: OverflowMenuItem, event: MouseEvent): void;
}

/** What createOverflowMenu returns. */
export interface OverflowMenuHandle extends ComponentHandle {
    setItems(next: OverflowMenuItem[]): void;
    getItems(): OverflowMenuItem[];
    setText(text: string): void;
    open(): void;
    close(): void;
    isOpen(): boolean;
    destroy(): void;
}

/**
 * Builds the badge after a menu item's label, gray unless it names a color. The Tool Shell's sidebar draws its badges with it too.
 * Internal to the web components.
 *
 * @param badge text, a number, or { label, color }
 * @returns the badge, or null for no badge
 */
export function menuBadge(badge: OverflowMenuItem['badge']): HTMLElement | null {
    if (badge === undefined || badge === null || badge === '') return null;
    var data: OverflowMenuBadge = typeof badge === 'object' ? badge : { label: String(badge) };
    return makeBadge(data.label, badgeColor(data.color, 'gray'), null, 'stolon-menu-badge');
}

/**
 * A button, by default with the three dot icon, that opens a small menu of actions. Arrow keys move between the items, Enter and Space choose one, Escape closes the menu and returns focus to the button, and a click outside closes it.
 *
 * @param options {
 *   items    : array of { label, value, disabled, destructive, icon, href, current, badge }. An item with href is a link, current marks the page it stands for, and badge is text or { label, color } after the label [optional]
 *   label    : aria-label of the menu, and the title and aria-label of an icon button (default 'More actions')
 *   icon     : Material icon name on the button (default 'more_vert')
 *   text     : text on the button, with a dropdown chevron, in place of the icon [optional]
 *   align    : 'end' opens toward the left from the button's right edge, 'start' toward the right (default 'end')
 *   onSelect : function(value, item, event) called when an item is chosen. A link item follows its href unless onSelect calls event.preventDefault() [optional]
 * }
 * @returns { element, setItems, getItems, setText, open, close, isOpen, destroy }. setText replaces the text of a text button.
 * An item with no value reports its label. A disabled item is skipped by the arrow keys. The menu opens on the current item.
 */
export function createOverflowMenu(options?: OverflowMenuOptions): OverflowMenuHandle {
    options = options || {};
    var items: OverflowMenuItem[] = (options.items || []).slice();
    var cleanups: Array<() => void> = [];
    var label: string = options.label || stolonText('Stolon.MoreActions');

    var root = make('div', 'stolon-menu' + (options.align === 'start' ? ' stolon-menu-start' : ''));
    var textEl = make('span', 'stolon-menu-text', null, options.text || '');
    var button: HTMLButtonElement;
    if (options.text !== undefined) {
        button = make('button', 'stolon-menu-button stolon-menu-text-button', { type: 'button' });
        button.appendChild(textEl);
        button.appendChild(icon('keyboard_arrow_down'));
    } else {
        button = iconButton('stolon-row-btn stolon-menu-button', options.icon || 'more_vert', label);
    }
    var list = make('div', 'stolon-menu-list', { role: 'menu', 'aria-label': label });
    list.id = nextId('menu');
    list.hidden = true;
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', list.id);
    root.appendChild(button);
    root.appendChild(list);

    function enabled(): HTMLButtonElement[] {
        return Array.prototype.filter.call(list.querySelectorAll<HTMLButtonElement>('.stolon-menu-item'), function (el: HTMLButtonElement): boolean { return !el.disabled; });
    }

    // The item the menu opens on: the current one when it can take focus, else the first.
    function startIndex(): number {
        var at = enabled().map(function (el: HTMLButtonElement): boolean { return el.classList.contains('stolon-selected'); }).indexOf(true);
        return at === -1 ? 0 : at;
    }


    function focusAt(index: number): void {
        var all = enabled();
        if (!all.length) return;
        all[(index + all.length) % all.length].focus();
    }

    function render(): void {
        clear(list);
        items.forEach(function (item: OverflowMenuItem): void {
            var link = !!item.href && !item.disabled;
            var cls = 'stolon-menu-item stolon-icon-text' + (item.destructive ? ' stolon-destructive' : '') + (item.current ? ' stolon-selected' : '');
            var el = (link ? make('a', cls, { href: item.href, role: 'menuitem', tabindex: '-1' }) : make('button', cls, { type: 'button', role: 'menuitem', tabindex: '-1' })) as HTMLButtonElement;
            if (item.current) el.setAttribute('aria-current', link ? 'page' : 'true');
            if (item.icon) el.appendChild(icon(item.icon));
            el.appendChild(make('span', 'stolon-menu-label', null, item.label));
            var badge = menuBadge(item.badge);
            if (badge) el.appendChild(badge);
            if (item.disabled) {
                el.disabled = true;
                el.setAttribute('aria-disabled', 'true');
            }
            el.addEventListener('click', function (e: MouseEvent): void {
                if (el.disabled) return;
                // A link opened in a new tab or window leaves this page as it is.
                if (link && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) { close(false); return; }
                close(true);
                if (options!.onSelect) options!.onSelect(item.value === undefined ? item.label : item.value, item, e);
            });
            list.appendChild(el);
        });
    }

    var popover = anchorPopover(button, list, {
        align: options.align === 'start' ? 'start' : 'end',
        onDismiss: function (): void { button.setAttribute('aria-expanded', 'false'); }
    });

    function open(): void {
        if (popover.isOpen()) return;
        popover.open();
        button.setAttribute('aria-expanded', 'true');
    }

    function close(refocus?: boolean): void {
        if (!popover.isOpen()) return;
        popover.close();
        button.setAttribute('aria-expanded', 'false');
        if (refocus) button.focus();
    }

    cleanups.push(listen(button, 'click', function (): void {
        if (popover.isOpen()) close(true);
        else { open(); focusAt(startIndex()); }
    }));

    cleanups.push(listen(button, 'keydown', function (e: KeyboardEvent): void {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            open();
            focusAt(e.key === 'ArrowDown' ? 0 : -1);
        }
    }));

    cleanups.push(listen(list, 'keydown', function (e: KeyboardEvent): void {
        var all: HTMLButtonElement[] = enabled();
        var at: number = all.indexOf(e.target as HTMLButtonElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(at + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(at - 1); }
        else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
        else if (e.key === 'End') { e.preventDefault(); focusAt(-1); }
        else if (e.key === ' ' && (e.target as Element).tagName === 'A') { e.preventDefault(); (e.target as HTMLElement).click(); }
        else if (e.key === 'Tab') close(false);
    }));

    render();

    return {
        element: root,
        setItems: function (next: OverflowMenuItem[]): void { items = (next || []).slice(); render(); },
        getItems: function (): OverflowMenuItem[] { return items.slice(); },
        setText: function (text: string): void { textEl.textContent = text || ''; },
        open: open,
        close: function (): void { close(false); },
        isOpen: popover.isOpen,
        destroy: function (): void { popover.destroy(); runAll(cleanups); clear(list); }
    };
}
