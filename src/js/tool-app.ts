import { createToolShell } from './tool-shell.js';
import type { ToolShellHandle, ToolShellTool } from './tool-shell.js';
import type { ComponentHandle } from './types.js';

/** One tool in a tool app. page is the registered config page whose markup and controller the tool shows. */
export interface ToolAppTool {
    key: string;
    name: string;
    icon?: string;
    page: string;
    badge?: ToolShellTool['badge'];
}

/** What createToolApp takes. tools is a list, or a function that gives the list each time it is read. */
export interface ToolAppOptions {
    tools: ToolAppTool[] | (() => ToolAppTool[]);
    storageKey: string;
    name?: string;
    label?: string;
}

/** What createToolApp returns. show opens a tool and resolves with its view once it shows. */
export interface ToolAppHandle extends ComponentHandle {
    shell: ToolShellHandle;
    show(key: string, param?: string): Promise<HTMLElement | null>;
    getCurrent(): string | null;
    refreshTools(): void;
    destroy(): void;
}

/** The event a tool's view sends to set the heading over it. detail is the heading, or empty for the tool's name. */
export var TOOL_TITLE_EVENT = 'stolontooltitle';

/** The event a tool's view sends when the list of tools may have changed, so the app reads the list again. */
export var TOOLS_CHANGE_EVENT = 'stolontoolschange';

/** The event a tool's view sends to open another tool. detail is { key, param }. */
export var TOOL_OPEN_EVENT = 'stolontoolopen';

/** The attribute that carries the param show was given, set on the tool's view before it shows. */
export var TOOL_PARAM_ATTRIBUTE = 'data-stolon-tool-param';

/**
 * Sets the heading over the tool whose view holds element, inside a tool app. An empty text puts back the tool's name.
 *
 * @param element any element inside the tool's view, or the view
 * @param text    the heading [optional]
 */
export function setToolTitle(element: HTMLElement, text?: string): void {
    element.dispatchEvent(new CustomEvent(TOOL_TITLE_EVENT, { bubbles: true, detail: text || '' }));
}

/**
 * Tells the tool app around element to read its list of tools again, such as after a setting hides a tool.
 *
 * @param element any element inside a tool's view
 */
export function refreshTools(element: HTMLElement): void {
    element.dispatchEvent(new CustomEvent(TOOLS_CHANGE_EVENT, { bubbles: true }));
}

/**
 * Opens another tool of the tool app around element, such as from a dashboard card.
 *
 * @param element any element inside a tool's view
 * @param key     the tool to open
 * @param param   text set on the tool's view as data-stolon-tool-param before it shows [optional]
 */
export function openTool(element: HTMLElement, key: string, param?: string): void {
    element.dispatchEvent(new CustomEvent(TOOL_OPEN_EVENT, { bubbles: true, detail: { key: key, param: param } }));
}

interface LoadedTool {
    key: string;
    view: HTMLElement;
}

// Reads the tool named in the address, such as #/configurationpage?name=myplugin&tool=vpn.
function toolInAddress(): string | null {
    var hash = window.location.hash || '';
    var query = hash.indexOf('?');
    if (query < 0) return null;
    var value = new URLSearchParams(hash.slice(query + 1)).get('tool');
    return value || null;
}

// Writes the open tool into the address, in place, so a reload opens it again and the router is not woken.
function writeToolToAddress(key: string): void {
    var hash = window.location.hash || '';
    var query = hash.indexOf('?');
    if (query < 0) return;
    var params = new URLSearchParams(hash.slice(query + 1));
    if (params.get('tool') === key) return;
    params.set('tool', key);
    var next = hash.slice(0, query + 1) + params.toString();
    try {
        window.history.replaceState(window.history.state, '', next);
    } catch (e) {
        /* an address that cannot be written leaves the tool open all the same */
    }
}

function readFolded(storageKey: string): boolean {
    try {
        return window.localStorage.getItem('stolon.toolApp.' + storageKey + '.folded') === '1';
    } catch (e) {
        return false;
    }
}

function saveFolded(storageKey: string, folded: boolean): void {
    try {
        window.localStorage.setItem('stolon.toolApp.' + storageKey + '.folded', folded ? '1' : '0');
    } catch (e) {
        /* blocked storage keeps the choice for this visit only */
    }
}

// The address a registered config page or its script is served from, next to the dashboard.
function pageUrl(name: string): string {
    return new URL('configurationpage?name=' + encodeURIComponent(name), document.baseURI).href;
}

function send(view: HTMLElement, type: string, cancelable?: boolean): boolean {
    var event = new CustomEvent(type, { cancelable: !!cancelable, detail: {} });
    view.dispatchEvent(event);
    return !event.defaultPrevented;
}

/**
 * One config page that holds a plugin's tools in a tool shell and swaps them in place. Each tool is its own registered page,
 * loaded the first time it opens and kept after, and its controller gets the same viewshow, viewbeforehide, and viewhide events
 * the dashboard sends a page, so a page built for its own address works here unchanged.
 *
 * @param view    the host page's view, whose content-primary takes the shell
 * @param options {
 *   tools      : array of { key, name, icon, page, badge }, or a function that gives one. page is the registered page the tool shows. The first tool opens when the address names none
 *   storageKey : name the folded sidebar is remembered under, such as the plugin's name
 *   name       : the plugin's name, shown atop the sidebar beside the fold button [optional]
 *   label      : aria-label of the sidebar and the menu (default 'Tools')
 * }
 * @returns { element, shell, show, getCurrent, refreshTools, destroy }. show(key, param) opens a tool, sets param on its view as data-stolon-tool-param, and resolves with the view once it shows, or null when the tool on screen refused to leave.
 * The open tool is kept in the address as tool=key, written in place, so a reload opens it again. A tool sets its heading with setToolTitle, opens another tool with openTool, and asks for the tools to be read again with refreshTools.
 */
export function createToolApp(view: HTMLElement, options: ToolAppOptions): ToolAppHandle {
    var host: HTMLElement = (view.querySelector('.content-primary') as HTMLElement | null) || view;
    var loaded: { [key: string]: LoadedTool } = {};
    var loading: { [key: string]: Promise<LoadedTool> } = {};
    var titles: { [key: string]: string } = {};
    var current: string | null = null;
    var request = 0;

    function tools(): ToolAppTool[] {
        return (typeof options.tools === 'function' ? options.tools() : options.tools) || [];
    }

    function toolOf(key: string | null): ToolAppTool | null {
        var list = tools();
        for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
        return null;
    }

    function shellTools(): ToolShellTool[] {
        return tools().map(function (tool: ToolAppTool): ToolShellTool {
            return { key: tool.key, name: tool.name, icon: tool.icon, badge: tool.badge };
        });
    }

    var shell = createToolShell({
        tools: shellTools(),
        label: options.label,
        name: options.name,
        foldable: true,
        folded: readFolded(options.storageKey),
        onFold: function (folded: boolean): void { saveFolded(options.storageKey, folded); },
        onSelect: function (key: string, tool: ToolShellTool, event: MouseEvent): void {
            event.preventDefault();
            void show(key);
        }
    });
    host.appendChild(shell.element);

    function mark(key: string | null): void {
        if (key === null) return;
        shell.setCurrent(key, titles[key] || undefined);
    }

    // Fetches the tool's page, takes its view out of the page markup, and runs its controller over it.
    function load(tool: ToolAppTool): Promise<LoadedTool> {
        if (tool.key in loaded) return Promise.resolve(loaded[tool.key]);
        if (tool.key in loading) return loading[tool.key];
        loading[tool.key] = fetch(pageUrl(tool.page), { credentials: 'same-origin' })
            .then(function (response: Response): Promise<string> {
                if (!response.ok) throw new Error('Could not load ' + tool.page);
                return response.text();
            })
            .then(function (html: string): Promise<LoadedTool> {
                var parsed = new DOMParser().parseFromString(html, 'text/html');
                var source = parsed.querySelector('[data-role="page"]') as HTMLElement | null;
                if (!source) throw new Error(tool.page + ' holds no page');
                var controller = (source.getAttribute('data-controller') || '').replace(/^__plugin\//, '');
                var page = document.importNode(source, true) as HTMLElement;
                page.removeAttribute('data-role');
                page.removeAttribute('data-controller');
                page.classList.remove('page', 'type-interior', 'mainAnimatedPage', 'withTabs');
                // The host page already pads its content, so a tool's own content wrappers add no second inset.
                Array.prototype.forEach.call(page.querySelectorAll('.content-primary'), function (el: HTMLElement): void { el.classList.remove('content-primary'); });
                Array.prototype.forEach.call(page.querySelectorAll('[data-role="content"]'), function (el: HTMLElement): void { el.removeAttribute('data-role'); });
                page.hidden = true;
                shell.content.appendChild(page);
                var entry: LoadedTool = { key: tool.key, view: page };
                if (!controller) return Promise.resolve(entry);
                return import(pageUrl(controller)).then(function (module: { default?: (view: HTMLElement) => void }): LoadedTool {
                    if (typeof module.default === 'function') module.default(page);
                    return entry;
                });
            })
            .then(function (entry: LoadedTool): LoadedTool {
                loaded[tool.key] = entry;
                delete loading[tool.key];
                return entry;
            }, function (error: unknown): never {
                delete loading[tool.key];
                throw error;
            });
        return loading[tool.key];
    }

    function show(key: string, param?: string): Promise<HTMLElement | null> {
        var tool = toolOf(key) || tools()[0] || null;
        if (!tool) return Promise.resolve(null);
        var target = tool;
        var leaving = current !== null && current !== target.key && current in loaded ? loaded[current] : null;
        // The tool on screen may keep unsaved changes, so it is asked before anything moves.
        if (leaving && !send(leaving.view, 'viewbeforehide', true)) {
            mark(current);
            return Promise.resolve(null);
        }
        var ticket = ++request;
        mark(target.key);
        return load(target).then(function (entry: LoadedTool): HTMLElement | null {
            // A later choice wins, so a slow tool that lands late never covers the one chosen after it.
            if (ticket !== request) return null;
            var was = current !== null && current in loaded ? loaded[current] : null;
            if (param) entry.view.setAttribute(TOOL_PARAM_ATTRIBUTE, param);
            if (was && was !== entry) {
                was.view.hidden = true;
                send(was.view, 'viewhide');
            }
            var again = was === entry;
            current = target.key;
            mark(current);
            writeToolToAddress(current);
            entry.view.hidden = false;
            if (!again || param) send(entry.view, 'viewshow');
            return entry.view;
        }, function (): null {
            if (ticket === request) mark(current);
            return null;
        });
    }

    function onTitle(event: Event): void {
        var target = event.target as HTMLElement;
        for (var key in loaded) {
            if (loaded[key].view === target || loaded[key].view.contains(target)) {
                titles[key] = String((event as CustomEvent).detail || '');
                if (key === current) mark(key);
                return;
            }
        }
    }

    function onOpen(event: Event): void {
        var detail = (event as CustomEvent).detail || {};
        if (detail.key) void show(String(detail.key), detail.param ? String(detail.param) : undefined);
    }

    // Reads the tools again. A tool on screen that left the list hands over to the first tool.
    function readTools(): void {
        shell.setTools(shellTools(), current === null ? undefined : current);
        mark(current);
        if (current !== null && !toolOf(current) && tools().length) void show(tools()[0].key);
    }

    function onShow(): void {
        if (current === null) {
            void show(toolInAddress() || (tools()[0] ? tools()[0].key : ''));
            return;
        }
        writeToolToAddress(current);
        if (current in loaded) send(loaded[current].view, 'viewshow');
    }

    function onBeforeHide(event: Event): void {
        if (current !== null && current in loaded && !send(loaded[current].view, 'viewbeforehide', true)) event.preventDefault();
    }

    function onHide(): void {
        if (current !== null && current in loaded) send(loaded[current].view, 'viewhide');
    }

    shell.content.addEventListener(TOOL_TITLE_EVENT, onTitle);
    shell.content.addEventListener(TOOLS_CHANGE_EVENT, readTools);
    shell.content.addEventListener(TOOL_OPEN_EVENT, onOpen);
    view.addEventListener('viewshow', onShow);
    view.addEventListener('viewbeforehide', onBeforeHide);
    view.addEventListener('viewhide', onHide);

    return {
        element: shell.element,
        shell: shell,
        show: show,
        getCurrent: function (): string | null { return current; },
        refreshTools: readTools,
        destroy: function (): void {
            shell.content.removeEventListener(TOOL_TITLE_EVENT, onTitle);
            shell.content.removeEventListener(TOOLS_CHANGE_EVENT, readTools);
            shell.content.removeEventListener(TOOL_OPEN_EVENT, onOpen);
            view.removeEventListener('viewshow', onShow);
            view.removeEventListener('viewbeforehide', onBeforeHide);
            view.removeEventListener('viewhide', onHide);
            shell.destroy();
        }
    };
}
