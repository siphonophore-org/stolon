# Tool Shell

The outer layout of a page that holds several tools. A wide shell lists the tools in a sidebar beside the current tool's heading and content. A narrow shell drops the sidebar and turns the heading into a title menu that lists every tool.

## Decision

| When | Use |
| :--- | :--- |
| A plugin page that gathers several tools, each with its own address | Tool Shell |
| Switching tools in place, without leaving the page | `onSelect` with `event.preventDefault()` |
| Sections inside one tool | [Sub Tabs](sub-tabs.md) or [Tabs](tabs.md), inside the shell's `content` |
| An overview of every tool | A [Status Card](status-card.md) grid in the shell's `content` |

## Usage

```js
import { createToolShell } from './configurationpage?name=myplugin_stolon.js';

var shell = createToolShell({
    tools: [
        { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', href: '#/configurationpage?name=myplugin' },
        { key: 'vpn', name: 'VPN', icon: 'vpn_lock', href: '#/configurationpage?name=myplugin_vpn', badge: { label: '2', color: 'orange' } },
        { key: 'storage', name: 'Storage', icon: 'storage', href: '#/configurationpage?name=myplugin_storage' }
    ],
    current: 'vpn'
});
view.querySelector('#page').appendChild(shell.element);
shell.content.appendChild(vpnPage);
```

Classes: `stolon-tool-shell`, with the parts `stolon-tool-shell-nav`, `stolon-tool-shell-list`, `stolon-tool-shell-entry`, `stolon-tool-shell-item`, `stolon-tool-shell-main`, `stolon-tool-shell-head`, `stolon-tool-shell-title`, `stolon-tool-shell-switcher`, and `stolon-tool-shell-content`, and the modifier `stolon-compact`. The handle is `{ element, content, getCurrent, setCurrent, setTools, destroy }`.

## States and Modifiers

* A tool is `{ key, name, icon, href, badge }`. A tool with an `href` is a link, so each tool keeps its own address and the back button works. A tool with no `href` is a button.
* `onSelect(key, tool, event)` runs when a tool is chosen in the sidebar or the menu, after the shell marks it current. A link follows its `href` unless `onSelect` calls `event.preventDefault()`. A click with Ctrl, Cmd, or Shift, or a middle click, opens the link as the browser does.
* `badge` is text or `{ label, color }` after the name, gray unless it names a color, in the sidebar and the menu.
* `title` sets the heading, which is the current tool's name by default. `setCurrent(key, title)` marks another tool and sets the heading to the title or the tool's name. `setTools(tools, current)` replaces the tools.
* The shell turns compact by its own width, when the sidebar and 480 pixels of content no longer fit side by side. It carries `stolon-compact`, the sidebar hides, and the heading becomes the title menu, a button such as "VPN" with a dropdown chevron. The heading stays for a screen reader.
* The sidebar is a `nav` landmark named by `label`, "Tools" by default. The current entry carries `aria-current="page"` and the shared selection look.
* The title menu is an [Overflow Menu](overflow-menu.md) with `text`. It opens on the current tool, the arrow keys move through the list, Home and End jump, and Escape closes it and returns focus to the button.

## Gotchas

* The shell draws no back link. The browser's own back button returns to the tool before.
* The sidebar sticks to the top of the page while the content scrolls.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createToolShell`

<code>function createToolShell(options?: ToolShellOptions): ToolShellHandle</code>

The outer layout of a page that holds several tools. A wide shell lists the tools in a sidebar beside the content. A narrow shell, by its own width, drops the sidebar and turns the heading into a title menu that lists every tool.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `tools` | <code>ToolShellTool[]</code> | array of { key, name, icon, href, badge }, where href is the tool's own address and badge is text or { label, color } [optional] |
| `current` | <code>string</code> | key of the tool shown, highlighted in the sidebar and the menu [optional] |
| `title` | <code>string</code> | heading over the content (default the current tool's name) |
| `label` | <code>string</code> | aria-label of the sidebar and the menu (default 'Tools') |
| `onSelect` | <code>(key: string, tool: ToolShellTool, event: MouseEvent): void</code> | function(key, tool, event) called when a tool is chosen. A tool with an href follows it unless onSelect calls event.preventDefault() [optional] |

| Handle member | Type |
| :--- | :--- |
| `content` | <code>HTMLElement</code> |
| `getCurrent` | <code>(): string &#124; null</code> |
| `setCurrent` | <code>(key: string, title?: string): void</code> |
| `setTools` | <code>(next: ToolShellTool[], current?: string): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ToolShellTool` | One tool in a tool shell. href is the tool's own address, and badge is text or { label, color } after its name. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-tool-shell` | Page of several tools, a sidebar of tools beside the current tool's heading and content, built by createToolShell |
| `stolon-tool-shell-nav` | Sidebar that lists every tool, five large controls wide, held in view while the page scrolls |
| `stolon-tool-shell-item.stolon-menu-item` | One tool in the sidebar, a menu item one large control tall with its icon, name, and badge, the current one in the shared selection look |
| `stolon-tool-shell-main` | The current tool's heading and content, which take the width beside the sidebar |
| `stolon-tool-shell-title` | Heading over a tool's content in the page heading size, cut with an ellipsis |
| `stolon-tool-shell-switcher` | Title menu button that lists every tool, shown in place of the sidebar on a narrow shell, its text in line with the content's edge |
| `stolon-tool-shell.stolon-compact` | A shell too narrow for its sidebar, by its own width, with the title menu button in place of the sidebar and the heading |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/tool-shell.html" title="Tool Shell example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tool-shell.html"
```
