import { make, icon, listen, runAll, clear } from './lib/dom.js';
import { createOverflowMenu, menuBadge } from './overflow-menu.js';
import type { OverflowMenuItem, OverflowMenuBadge } from './overflow-menu.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** One tool in a tool shell. href is the tool's own address, and badge is text or { label, color } after its name. */
export interface ToolShellTool {
    key: string;
    name: string;
    icon?: string;
    href?: string;
    badge?: string | number | OverflowMenuBadge;
}

/** What createToolShell takes. onSelect runs when a tool is chosen, with the tool and the click. */
export interface ToolShellOptions {
    tools?: ToolShellTool[];
    current?: string;
    title?: string;
    label?: string;
    foldable?: boolean;
    folded?: boolean;
    name?: string;
    onSelect?(key: string, tool: ToolShellTool, event: MouseEvent): void;
    onFold?(folded: boolean): void;
}

/** What createToolShell returns. content is the element the current tool's page goes in. */
export interface ToolShellHandle extends ComponentHandle {
    content: HTMLElement;
    getCurrent(): string | null;
    setCurrent(key: string, title?: string): void;
    setTools(next: ToolShellTool[], current?: string): void;
    isFolded(): boolean;
    setFolded(folded: boolean): void;
    destroy(): void;
}

// The least width the content keeps beside the sidebar before the shell turns compact.
var CONTENT_MIN = 480;

/**
 * The outer layout of a page that holds several tools. A wide shell lists the tools in a sidebar beside the content. A narrow shell, by its own width, drops the sidebar and turns the heading into a title menu that lists every tool.
 *
 * @param options {
 *   tools    : array of { key, name, icon, href, badge }, where href is the tool's own address and badge is text or { label, color } [optional]
 *   current  : key of the tool shown, highlighted in the sidebar and the menu [optional]
 *   title    : heading over the content (default the current tool's name)
 *   label    : aria-label of the sidebar and the menu (default 'Tools')
 *   foldable : true to put a button atop the sidebar that folds it to its icons and back [optional]
 *   folded   : true to start folded [optional]
 *   name     : name shown beside the fold button, such as the plugin's, hidden while folded [optional]
 *   onSelect : function(key, tool, event) called when a tool is chosen. A tool with an href follows it unless onSelect calls event.preventDefault() [optional]
 *   onFold   : function(folded) called when the sidebar is folded or unfolded by its button [optional]
 * }
 * @returns { element, content, getCurrent, setCurrent, setTools, isFolded, setFolded, destroy }. setCurrent(key, title) highlights a tool and sets the heading to the title or the tool's name.
 * The sidebar is a nav landmark whose current entry carries aria-current. The title menu opens a list the arrow keys move through, and Escape closes it.
 */
export function createToolShell(options?: ToolShellOptions): ToolShellHandle {
    options = options || {};
    var tools: ToolShellTool[] = (options.tools || []).slice();
    var current: string | null = options.current === undefined ? null : String(options.current);
    var fixedTitle: string = options.title || '';
    var label: string = options.label || stolonText('Stolon.Tools');
    var cleanups: Array<() => void> = [];
    var navWidth = 0;

    var root = make('div', 'stolon-tool-shell');
    var nav = make('nav', 'stolon-tool-shell-nav', { 'aria-label': label });
    var list = make('ul', 'stolon-tool-shell-list');
    var main = make('div', 'stolon-tool-shell-main');
    var head = make('div', 'stolon-tool-shell-head');
    var title = make('h2', 'stolon-tool-shell-title');
    var content = make('div', 'stolon-tool-shell-content');
    var menu = createOverflowMenu({
        text: '',
        label: label,
        align: 'start',
        onSelect: function (value: unknown, item: OverflowMenuItem, event: MouseEvent): void { choose(String(value), event); }
    });
    menu.element.classList.add('stolon-tool-shell-switcher');
    var folded = !!options.folded;
    var fold: HTMLButtonElement | null = null;
    if (options.foldable) {
        fold = make('button', 'stolon-menu-item stolon-icon-text stolon-tool-shell-item stolon-tool-shell-fold', { type: 'button' }) as HTMLButtonElement;
        fold.appendChild(icon('menu_open'));
        if (options.name) fold.appendChild(make('span', 'stolon-menu-label stolon-tool-shell-name', null, options.name));
        fold.addEventListener('click', function (): void {
            setFolded(!folded);
            if (options!.onFold) options!.onFold(folded);
        });
        nav.appendChild(fold);
    }
    nav.appendChild(list);
    head.appendChild(title);
    head.appendChild(menu.element);
    main.appendChild(head);
    main.appendChild(content);
    root.appendChild(nav);
    root.appendChild(main);

    function toolOf(key: string | null): ToolShellTool | null {
        for (var i = 0; i < tools.length; i++) if (String(tools[i].key) === key) return tools[i];
        return null;
    }

    function choose(key: string, event: MouseEvent): void {
        var tool = toolOf(key);
        if (!tool) return;
        setCurrent(key);
        if (options!.onSelect) options!.onSelect(key, tool, event);
    }

    function entry(tool: ToolShellTool): HTMLElement {
        var key = String(tool.key);
        var on = key === current;
        var cls = 'stolon-menu-item stolon-icon-text stolon-tool-shell-item' + (on ? ' stolon-selected' : '');
        var el = (tool.href ? make('a', cls, { href: tool.href }) : make('button', cls, { type: 'button' })) as HTMLElement;
        el.setAttribute('data-key', key);
        if (on) el.setAttribute('aria-current', 'page');
        if (tool.icon) el.appendChild(icon(tool.icon));
        // A folded sidebar shows only the icon, so the name shows on hover and names the entry for a screen reader.
        if (folded) el.setAttribute('title', tool.name);
        el.appendChild(make('span', 'stolon-menu-label', { title: tool.name }, tool.name));
        var badge = menuBadge(tool.badge);
        if (badge) el.appendChild(badge);
        el.addEventListener('click', function (e: MouseEvent): void {
            // A link opened in a new tab or window leaves this page as it is.
            if (tool.href && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;
            choose(key, e);
        });
        return el;
    }

    function draw(): void {
        clear(list);
        tools.forEach(function (tool: ToolShellTool): void {
            var item = make('li', 'stolon-tool-shell-entry');
            item.appendChild(entry(tool));
            list.appendChild(item);
        });
        menu.setItems(tools.map(function (tool: ToolShellTool): OverflowMenuItem {
            return { label: tool.name, value: String(tool.key), icon: tool.icon, href: tool.href, badge: tool.badge, current: String(tool.key) === current };
        }));
        var tool = toolOf(current);
        var text = fixedTitle || (tool ? tool.name : '');
        title.textContent = text;
        menu.setText(text);
    }

    // Folds the sidebar to its icons, or unfolds it to icons and names.
    function setFolded(next: boolean): void {
        folded = !!next;
        root.classList.toggle('stolon-folded', folded);
        if (fold) {
            var text = stolonText(folded ? 'Stolon.ExpandSidebar' : 'Stolon.CollapseSidebar');
            fold.setAttribute('aria-label', text);
            fold.setAttribute('title', text);
            fold.setAttribute('aria-expanded', folded ? 'false' : 'true');
        }
        navWidth = 0;
        draw();
        fit();
    }

    function setCurrent(key: string, nextTitle?: string): void {
        current = key === undefined || key === null ? null : String(key);
        fixedTitle = nextTitle || '';
        draw();
    }

    // A shell too narrow for the sidebar beside its content turns compact, and its heading becomes the title menu.
    function fit(): void {
        var compact = root.classList.contains('stolon-compact');
        if (!compact && nav.offsetWidth) navWidth = nav.offsetWidth;
        var width = root.clientWidth || 0;
        var next = !!width && width < (navWidth || 200) + CONTENT_MIN;
        root.classList.toggle('stolon-compact', next);
        title.classList.toggle('stolon-sr-only', next);
        if (!next) menu.close();
    }
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        cleanups.push(function (): void { watch.disconnect(); });
    } else {
        cleanups.push(listen(window, 'resize', fit));
    }
    var tick = setTimeout(fit, 0);
    cleanups.push(function (): void { clearTimeout(tick); });

    setFolded(folded);

    return {
        element: root,
        content: content,
        getCurrent: function (): string | null { return current; },
        setCurrent: setCurrent,
        setTools: function (next: ToolShellTool[], key?: string): void {
            tools = (next || []).slice();
            if (key !== undefined) current = String(key);
            draw();
        },
        isFolded: function (): boolean { return folded; },
        setFolded: setFolded,
        destroy: function (): void {
            runAll(cleanups);
            menu.destroy();
            clear(list);
        }
    };
}
