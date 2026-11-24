# Tool App

One config page that holds every tool of a plugin in a [Tool Shell](tool-shell.md) and swaps them in place. The sidebar is built once, so it never moves or flashes, and a tool opened once stays loaded, so switching back is instant. Every plugin's first tool is its dashboard.

## Decision

| When | Use |
| :--- | :--- |
| A plugin with more than one page | Tool App, with a dashboard first |
| A plugin with one page | [Config Page](config-page.md) alone |
| Sections inside one tool | [Sub Tabs](sub-tabs.md) or [Collapsible Section](collapsible-section.md) inside the tool's page |

## Usage

Register one host page in the dashboard menu, and each tool as its own page with its own controller, as before.

```js
import { createToolApp } from './configurationpage?name=myplugin_stolon.js';

export default function (view) {
    createToolApp(view, {
        storageKey: 'myplugin',
        name: 'My Plugin',
        tools: [
            { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', page: 'myplugin_dashboard' },
            { key: 'vpn', name: 'VPN', icon: 'vpn_lock', page: 'myplugin_vpn' },
            { key: 'settings', name: 'Settings', icon: 'settings', page: 'myplugin_settings' }
        ]
    });
}
```

A tool's page keeps its own `createConfigPage` controller. It sets no tabs.

```js
import { setToolTitle, openTool, refreshTools } from './configurationpage?name=myplugin_stolon.js';

setToolTitle(view, 'Content sync');   // heading over this tool, empty for its name
openTool(view, 'vpn', 'peers');       // open another tool, such as from a dashboard card
refreshTools(view);                   // read the tool list again, such as after a setting hides a tool
```

## States and Modifiers

* The first tool opens unless the address names one as `tool=key`, such as `#/configurationpage?name=myplugin&tool=vpn`. The open tool is written into the address in place, so a reload opens it again.
* `show(key, param)` on the handle, or `openTool(view, key, param)` from inside a tool, opens a tool from code, such as from a dashboard card. `param` is set on the tool's view as `data-stolon-tool-param` before it shows, for the tool to read and clear.
* A tool gets `viewshow` each time it opens, `viewbeforehide` before it is left, and `viewhide` once it is. A `viewbeforehide` the tool cancels, such as for unsaved changes, keeps it open. The host page's own events reach the open tool.
* The sidebar's top row is the fold button with the plugin's `name` beside it. It folds the sidebar to its icons, and the name hides while folded. The choice is kept per browser under `storageKey`.
* A tool still loading is shown only once it is ready, and the last tool chosen wins.

## Gotchas

* List every `data-require` the tools use on the host page, since a tool's own list is not read.
* A tool's page loses its `page` and `content-primary` classes, so the host page's padding is the only inset.

## Reference

<!-- reference:start -->

### `TOOL_TITLE_EVENT`

<code>var TOOL_TITLE_EVENT: string</code>

The event a tool's view sends to set the heading over it. detail is the heading, or empty for the tool's name.

### `TOOLS_CHANGE_EVENT`

<code>var TOOLS_CHANGE_EVENT: string</code>

The event a tool's view sends when the list of tools may have changed, so the app reads the list again.

### `TOOL_OPEN_EVENT`

<code>var TOOL_OPEN_EVENT: string</code>

The event a tool's view sends to open another tool. detail is { key, param }.

### `TOOL_PARAM_ATTRIBUTE`

<code>var TOOL_PARAM_ATTRIBUTE: string</code>

The attribute that carries the param show was given, set on the tool's view before it shows.

### `setToolTitle`

<code>function setToolTitle(element: HTMLElement, text?: string): void</code>

Sets the heading over the tool whose view holds element, inside a tool app. An empty text puts back the tool's name.

### `refreshTools`

<code>function refreshTools(element: HTMLElement): void</code>

Tells the tool app around element to read its list of tools again, such as after a setting hides a tool.

### `openTool`

<code>function openTool(element: HTMLElement, key: string, param?: string): void</code>

Opens another tool of the tool app around element, such as from a dashboard card.

### `createToolApp`

<code>function createToolApp(view: HTMLElement, options: ToolAppOptions): ToolAppHandle</code>

One config page that holds a plugin's tools in a tool shell and swaps them in place. Each tool is its own registered page, loaded the first time it opens and kept after, and its controller gets the same viewshow, viewbeforehide, and viewhide events the dashboard sends a page, so a page built for its own address works here unchanged.

| Option | Type | What it does |
| :--- | :--- | :--- |

| Handle member | Type |
| :--- | :--- |
| `shell` | <code>ToolShellHandle</code> |
| `show` | <code>(key: string, param?: string): Promise&lt;HTMLElement &#124; null&gt;</code> |
| `getCurrent` | <code>(): string &#124; null</code> |
| `refreshTools` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ToolAppTool` | One tool in a tool app. page is the registered config page whose markup and controller the tool shows. |

<!-- reference:end -->
