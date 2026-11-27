# Browser Helpers

Small functions exported from the bundle for what a plugin otherwise rewrites. Each one is also on the [Shared Bag](shared-bag.md), and `copyWithFeedback` and `fetchObjectUrl` live only there. The element builders `make` and `h` are exported on their own.

## Decision

| When | Use |
| :--- | :--- |
| Every value placed into HTML a component builds from a string | `escapeHtml` |
| Any count in a label | `plural` |
| A plural built by hand, such as `n + ' items'` | `plural` instead |
| A count in a translated sentence | `t.plural` on the [Translations](translations.md) handle |
| Markup drawn in script, with Jellyfin fields and listeners | `h` |
| One element with a class and some text | `make` |
| A string of markup a component renders as text | `escapeHtml` and the markup helpers, such as `badgeHtml` and `statusDotHtml` |

## Usage

```js
import { downloadJson, pickJsonFile, errorText, plural, escapeHtml, debounce, generateGuid } from './configurationpage?name=myplugin_stolon.js';

downloadJson('channels.json', config.Channels);
pickJsonFile().then(function (data) { if (data) { applyImport(data); } },
    function (err) { shared.setStatus('importStatus', err.message, true); });
shared.saveConfig(config).catch(function (err) {
    errorText(err, 'Save failed.').then(function (text) { shared.setStatus('saveStatus', text, true); });
});
```

```js
import { h } from './configurationpage?name=myplugin_stolon.js';

var name = h('input', { type: 'text', is: 'emby-input', id: 'txtName', label: 'Name', required: true });
var field = h('div', { class: 'inputContainer' }, [name, h('div', { class: 'fieldDescription', text: 'Shown on the card.' })]);
var button = h('button', { is: 'emby-button', type: 'button', class: ['raised', 'stolon-button', dirty && 'stolon-primary'], on: { click: save } }, [h('span', { text: 'Save' })]);
view.querySelector('#form').appendChild(field);
```

## Element Builders

`h(tag, attrs, children)` builds an element with its attributes, listeners, and children. `make(tag, className, attrs, text)` builds one element with a class and some text.

* `class` takes a string or a list, whose empty entries are skipped. `text` sets the text before the children.
* `on` takes listeners by event type, such as `{ click: fn }`.
* `is` names a Jellyfin element: `emby-input`, `emby-checkbox`, `emby-select`, `emby-button`, or `emby-textarea`.
* Any other name sets that attribute as text. `true` sets it empty, and `null`, `undefined`, and `false` leave it out.
* Children are nodes or text, in order. `null`, `undefined`, and `false` are skipped, so `cond && node` works.

The web client upgrades a Jellyfin element when it joins the page, not when it is made. Build to these rules.

* Set `is` as an attribute, as `h` does. `document.createElement(tag, { is })` upgrades at once, and an `emby-input` with no parent yet throws.
* Build the whole field detached, then append it once. An `emby-checkbox` reads its parent `label` and the `span` in it, and an `emby-input`, `emby-select`, or `emby-textarea` puts its label before itself, so each needs its parent in place when it joins.
* Give an `emby-input`, `emby-select`, or `emby-textarea` its text in a `label` attribute. Give an `emby-checkbox` a `label` parent with a `span` after it.
* Never add the `emby-input`, `emby-select`, or `emby-textarea` class yourself. An element that already has it is taken as upgraded, and gets no label.
* Set `is` before the element joins the page, since the upgrade runs as it joins.

## States and Modifiers

* `plural(count, one, many)` gives the count, a space, and the word. Only a count of exactly 1 takes `one`. `many` defaults to `one` with an "s".
* `escapeHtml(value)` escapes `&`, `<`, `>`, and both quotes. Null and undefined become an empty string.
* `debounce(fn, ms)` runs `fn` once calls pause for `ms` (default 300) with the latest arguments. It has `cancel()`.
* `downloadJson(filename, value)` saves a pretty printed JSON file, named "export.json" when `filename` is empty.
* `pickJsonFile()` opens a file picker. It resolves to the parsed JSON, resolves to `null` when cancelled, and rejects with "The file is not valid JSON." or "The file could not be read.".
* `generateGuid({ compact })` gives a random version 4 GUID, without dashes when `compact` is true.
* `errorText(err, fallback)` always returns a promise of the reason a failed request gave, read from the `Error`, `error`, `detail`, `title`, or `message` of a JSON body, else `fallback` (default "Could not save.").
* `shared.copyToClipboard(text)` copies with `navigator.clipboard` and falls back to a hidden textarea on HTTP dashboards. It resolves to whether it worked.
* `shared.copyWithFeedback(btn, text, opts)` copies and briefly swaps the button label to "Copied" or "Copy failed.". `opts` takes `copiedText`, `failedText`, and `duration` (default 1500 ms).
* `shared.fetchObjectUrl(endpoint, params)` fetches an authenticated endpoint under `apiPrefix` as a blob and returns an object URL. Revoke the URL when done.

## Gotchas

* `copyToClipboard` is also exported on its own for the [Copy Field](copy-field.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `generateGuid`

<code>function generateGuid(opts?: { compact?: boolean; }): string</code>

Returns a random RFC 4122 version 4 GUID for keying new config entities on the client.

### `errorText`

<code>function errorText(err: any, fallback?: string): Promise&lt;string&gt;</code>

Resolves to the reason a failed request gave, such as the Error of a 400 response's JSON body, or to fallback.

### `debounce`

<code>function debounce&lt;A extends unknown[]&gt;(fn: (...args: A) =&gt; void, ms?: number): ((...args: A) =&gt; void) &amp; { cancel(): void; }</code>

Returns a function that runs fn once calls have paused for ms milliseconds, with the latest arguments. The returned function has cancel() to drop a pending call.

### `downloadJson`

<code>function downloadJson(filename: string, value: unknown): void</code>

Saves a value as a pretty-printed JSON file through the browser's download, for exporting configuration.

### `pickJsonFile`

<code>function pickJsonFile(): Promise&lt;any&gt;</code>

Opens a file picker for a JSON file and resolves to its parsed value, or to null when the picker is cancelled. It rejects when the file is not valid JSON or cannot be read.

### `plural`

<code>function plural(count: number, one: string, many?: string &#124; null): string</code>

Returns the count, a space, and the matching word, such as "1 item" and "3 items". Only a count of exactly 1 takes the singular.

### `escapeHtml`

<code>function escapeHtml(str: unknown): string</code>

Escapes a value for HTML text or a quoted attribute. null and undefined become ''.

### `copyToClipboard`

<code>function copyToClipboard(text: string): Promise&lt;boolean&gt;</code>

Copies text to the clipboard, with a textarea fallback for HTTP dashboards. The promise resolves to true when the copy worked and never rejects. The shared bag's copyToClipboard calls it.

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/browser-helpers.html" title="Browser Helpers example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "browser-helpers.html"
```
