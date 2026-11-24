import { make, icon, nextId, listen, runAll, clear } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import { applyColor } from './lib/color.js';
import { createStatusDot } from './status-dot.js';
import type { ComponentHandle } from './types.js';

/** A badge or status dot in a collapsible header. color is a status color name, a hex code, or a badge state name, and dot draws a dot named by label. */
export interface CollapsibleBadge {
    label?: string;
    color?: string;
    dot?: boolean;
}

/**
 * Opens or closes one collapsible, the toggle every collapsible in Stolon shares. The header gets the stolon-collapsed class and
 * aria-expanded, and the content gets the stolon-collapsed class, or the hidden attribute with byHidden.
 * Internal to the web components.
 *
 * @param header the control that toggles the content
 * @param content the element it shows and hides [optional]
 * @param collapsed true to close it
 * @param byHidden hide the content with the hidden attribute rather than the stolon-collapsed class [optional]
 */
export function setCollapsed(header: Element, content: HTMLElement | null, collapsed: boolean, byHidden?: boolean): void {
    header.classList.toggle('stolon-collapsed', collapsed);
    header.setAttribute('aria-expanded', String(!collapsed));
    var bar = header.parentNode as HTMLElement | null;
    // A header with an aside sits in a bar that holds the chevron, so the bar turns it.
    if (bar && bar.classList && bar.classList.contains('stolon-collapsible-bar')) bar.classList.toggle('stolon-collapsed', collapsed);
    if (!content) return;
    if (byHidden) content.hidden = collapsed;
    else content.classList.toggle('stolon-collapsed', collapsed);
}

// The first child of an element that carries a class.
function childOf(parent: Element, className: string): HTMLElement | null {
    for (var i = 0; i < parent.children.length; i++) if (parent.children[i].classList.contains(className)) return parent.children[i] as HTMLElement;
    return null;
}

/**
 * Makes a click on a header bar, outside its header button and its aside, press the header, so the chevron and the
 * padding of the bar toggle the section too.
 *
 * @param bar the stolon-collapsible-bar
 * @param header the stolon-collapsible-header button inside it
 * @returns a function that removes the listener
 */
function bindBar(bar: HTMLElement, header: HTMLElement): () => void {
    return listen(bar, 'click', function (e: MouseEvent): void {
        var target = e.target as Node | null;
        var aside = bar.querySelector('.stolon-collapsible-aside');
        if (!target || header.contains(target) || (aside && aside.contains(target))) return;
        header.click();
    });
}

/**
 * Binds every collapsible header in the view so a click toggles its target, once per header. The arrow becomes the web client expand_more icon, and the header gets aria-controls and aria-expanded.
 *
 * @param view page element to search within
 */
export function initCollapsibles(view: ParentNode): void {
    view.querySelectorAll<HTMLElement>('.stolon-collapsible-header').forEach(function (header) {
        if (header.dataset.stolonBound) return;
        // A fixed panel's header is a plain heading with nothing to toggle.
        var owner = header.parentNode as HTMLElement | null;
        if (owner && owner.classList && owner.classList.contains('stolon-fixed')) return;
        header.dataset.stolonBound = '1';
        var bar = owner && owner.classList && owner.classList.contains('stolon-collapsible-bar') ? owner : null;
        if (bar) bindBar(bar, header);
        var icon = header.querySelector<HTMLElement>('.stolon-collapsible-icon') || (bar ? childOf(bar, 'stolon-collapsible-icon') : null);
        if (icon) {
            icon.className = 'material-icons stolon-collapsible-icon';
            icon.textContent = 'expand_more';
            icon.setAttribute('aria-hidden', 'true');
        }
        if (header.dataset.target) header.setAttribute('aria-controls', header.dataset.target);
        header.setAttribute('aria-expanded', String(!header.classList.contains('stolon-collapsed')));
        header.addEventListener('click', function () {
            var content = view.querySelector<HTMLElement>('#' + header.dataset.target);
            if (!content) return;
            setCollapsed(header, content, !header.classList.contains('stolon-collapsed'));
        });
    });
}

/**
 * Shows a badge, or a status dot, in a collapsible header between its title and its chevron, replacing any it already shows. Null removes it.
 *
 * @param header the stolon-collapsible-header
 * @param badge { label, color, dot } where color is a status color name, a hex code, or a badge state name, and dot draws a status dot named by label, or null for none
 */
export function setCollapsibleBadge(header: Element, badge: CollapsibleBadge | null | undefined): void {
    var old = header.querySelector('.stolon-collapsible-badge');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!badge || (!badge.label && !badge.dot)) return;
    var el: HTMLElement = badge.dot
        ? createStatusDot({ color: badgeColor(badge.color, 'gray'), label: badge.label }).element
        : makeBadge(badge.label, badgeColor(badge.color, 'gray'));
    el.classList.add('stolon-collapsible-badge');
    header.insertBefore(el, header.querySelector('.stolon-collapsible-icon') || childOf(header, 'stolon-collapsible-aside'));
}

/** What createCollapsibleSection takes. content is HTML or a node, badge shows in the header, and icon, subtitle, and aside fill the header's slots. */
export interface CollapsibleSectionOptions {
    title?: string;
    badge?: CollapsibleBadge | null;
    content?: string | Node;
    collapsed?: boolean;
    numbered?: boolean;
    className?: string;
    icon?: string;
    iconColor?: string;
    subtitle?: string | Node | null;
    aside?: Node | null;
    collapsible?: boolean;
    onToggle?(open: boolean): void;
}

/** What createCollapsibleSection returns. getValue is whether it is open, and setValue opens or closes it. header is a div, not a button, when collapsible is false. */
export interface CollapsibleSectionHandle extends ComponentHandle {
    element: HTMLDivElement;
    header: HTMLButtonElement;
    content: HTMLDivElement;
    getValue(): boolean;
    setValue(open: boolean): void;
    setTitle(text: string): void;
    setBadge(badge: CollapsibleBadge | null): void;
    setSubtitle(subtitle: string | Node | null): void;
    setAside(aside: Node | null): void;
    destroy(): void;
}

// A section narrower than this puts its aside on a line of its own under the title.
var COMPACT_WIDTH = 480;

/**
 * Builds a collapsible section, the same markup initCollapsibles binds, with an optional badge in its header. The header
 * also takes a Material icon in a rounded tile, a dimmed subtitle under the title, and an aside on the right, such as a
 * badge, a button, or a toggle. With collapsible false it is a fixed panel, always open, whose header is a plain heading.
 *
 * @param options {
 *   title       : the header title [optional]
 *   badge       : { label, color, dot } shown in the header, as setCollapsibleBadge takes it [optional]
 *   content     : HTML or a node for the body [optional]
 *   collapsed   : true starts it closed (default false)
 *   numbered    : true numbers it within a run of numbered sections (default false)
 *   className   : classes added to the section [optional]
 *   icon        : a Material icon shown in a rounded tile before the title [optional]
 *   iconColor   : the tile's status color name or hex code (default the accent) [optional]
 *   subtitle    : a dimmed line under the title, as text or a node such as a route [optional]
 *   aside       : a node at the right of the header, such as a badge, a button, or a toggle, that goes under the title when the section is narrow [optional]
 *   collapsible : false draws a fixed panel, framed, always open, with no chevron and a header that is not a button (default true)
 *   onToggle    : function(open) called when the header opens or closes it [optional]
 * }
 * @returns { element, header, content, getValue, setValue, setTitle, setBadge, setSubtitle, setAside, destroy }. getValue is whether it is open.
 */
export function createCollapsibleSection(options?: CollapsibleSectionOptions): CollapsibleSectionHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];
    var fixed = options.collapsible === false;
    var root = make('div', 'stolon-collapsible-section' + (options.numbered ? ' stolon-numbered' : '') + (fixed ? ' stolon-fixed stolon-panel' : '') + (options.className ? ' ' + options.className : ''));
    var body = make('div', 'stolon-collapsible-content');
    body.id = nextId('collapsible');
    var header = (fixed ? make('div', 'stolon-collapsible-header') : make('button', 'stolon-collapsible-header', { type: 'button', 'aria-controls': body.id })) as HTMLButtonElement;
    var title = make('span', 'stolon-collapsible-title', null, options.title || '');
    var chevron: HTMLSpanElement | null = null;
    header.appendChild(title);
    if (!fixed) {
        chevron = icon('expand_more');
        chevron.classList.add('stolon-collapsible-icon');
        header.appendChild(chevron);
    }
    root.appendChild(header);
    root.appendChild(body);
    if (options.content instanceof Node) body.appendChild(options.content);
    else if (typeof options.content === 'string') body.innerHTML = options.content;

    var heading: HTMLElement | null = null;
    var subtitle: HTMLElement | null = null;
    var aside: HTMLElement | null = null;
    var bar: HTMLElement | null = null;
    var watching = false;

    // The slots need the title in a heading column that ellipsizes it, so a section with none keeps its plain markup.
    function ensureHeading(): HTMLElement {
        if (heading) return heading;
        heading = make('span', 'stolon-collapsible-heading');
        header.insertBefore(heading, title);
        heading.appendChild(title);
        title.title = title.textContent || '';
        return heading;
    }

    function setSubtitle(next: string | Node | null | undefined): void {
        if (next === null || next === undefined || next === '') {
            if (subtitle && subtitle.parentNode) subtitle.parentNode.removeChild(subtitle);
            subtitle = null;
            return;
        }
        ensureHeading().appendChild(subtitle = subtitle || make('span', 'stolon-collapsible-subtitle'));
        clear(subtitle);
        if (next instanceof Node) {
            subtitle.removeAttribute('title');
            subtitle.appendChild(next);
        } else {
            subtitle.textContent = String(next);
            subtitle.title = String(next);
        }
    }

    // A narrow section moves its aside under the title, chosen by its own width since older engines have no container queries.
    function measure(): void {
        var width = root.clientWidth || 0;
        root.classList.toggle('stolon-compact', !!width && width < COMPACT_WIDTH);
    }

    function watch(): void {
        if (watching) return;
        watching = true;
        if (typeof ResizeObserver !== 'undefined') {
            var observer = new ResizeObserver(measure);
            observer.observe(root);
            cleanups.push(function () { observer.disconnect(); });
        } else {
            cleanups.push(listen(window, 'resize', measure));
        }
        measure();
    }

    function setAside(next: Node | null | undefined): void {
        if (!next) {
            if (aside) clear(aside);
            if (aside) aside.hidden = true;
            return;
        }
        ensureHeading();
        if (!aside) {
            aside = make('span', 'stolon-collapsible-aside');
            if (fixed) {
                header.insertBefore(aside, heading!.nextSibling);
            } else {
                // A button cannot hold a control, so a collapsible header with an aside sits in a bar beside it, which holds the chevron.
                bar = make('div', 'stolon-collapsible-bar' + (header.classList.contains('stolon-collapsed') ? ' stolon-collapsed' : ''));
                root.insertBefore(bar, header);
                bar.appendChild(header);
                bar.appendChild(aside);
                bar.appendChild(chevron!);
                cleanups.push(bindBar(bar, header));
            }
            watch();
        }
        clear(aside);
        aside.hidden = false;
        aside.appendChild(next);
    }

    if (options.icon) {
        ensureHeading();
        var tile = make('span', 'stolon-collapsible-tile', { 'aria-hidden': 'true' });
        tile.appendChild(icon(options.icon));
        if (options.iconColor) applyColor(tile, options.iconColor);
        header.insertBefore(tile, heading);
        root.classList.add('stolon-has-tile');
    }
    if (fixed) ensureHeading();
    setSubtitle(options.subtitle);
    setAside(options.aside);
    setCollapsibleBadge(header, options.badge);
    if (!fixed) {
        setCollapsed(header, body, !!options.collapsed);
        cleanups.push(listen(header, 'click', function (): void {
            var open: boolean = header.classList.contains('stolon-collapsed');
            setCollapsed(header, body, !open);
            if (options!.onToggle) options!.onToggle(open);
        }));
    }

    return {
        element: root,
        header: header,
        content: body,
        getValue: function (): boolean { return !header.classList.contains('stolon-collapsed'); },
        setValue: function (open: boolean): void { if (!fixed) setCollapsed(header, body, !open); },
        setTitle: function (text: string): void {
            title.textContent = text || '';
            if (heading) title.title = text || '';
        },
        setBadge: function (badge: CollapsibleBadge | null): void { setCollapsibleBadge(header, badge); },
        setSubtitle: setSubtitle,
        setAside: setAside,
        destroy: function (): void { runAll(cleanups); }
    };
}
