# Form Fields

The kit restyles Jellyfin's own field containers, so every field on a config page or in a kit dialog has the same surface, border, focus ring, chevron, spacing, and left edge. You write Jellyfin markup and no kit class, or build the same markup from code with the field builders.

## Decision

| When | Use |
| :--- | :--- |
| Every text input, number input, text area, select, and checkbox | Form Fields |
| A field a page builds from code | `createInputField`, `createSelectField`, `createTextareaField`, `createCheckboxField`, or `createSecretField` |
| A yes or no value in Stolon's own look, beside other kit controls | [Checkbox](checkbox.md) |
| Dense lines with several fields side by side | [Field and Field Row](field.md) |

## Usage

```html
<div class="inputContainer">
    <label for="txtServerName">Name</label>
    <input is="emby-input" type="text" id="txtServerName" placeholder="Default" />
    <div class="fieldDescription">Names the server in tables and logs.</div>
</div>

<div class="selectContainer">
    <label for="selMode">Mode</label>
    <select is="emby-select" id="selMode">
        <option value="Allow">Allowlist</option>
        <option value="Block">Blocklist</option>
    </select>
</div>

<div class="checkboxContainer checkboxContainer-withDescription">
    <label class="emby-checkbox-label">
        <input type="checkbox" is="emby-checkbox" id="chkEnabled" />
        <span class="checkboxLabel">Enabled</span>
    </label>
    <div class="fieldDescription checkboxFieldDescription">Keeps the settings and skips this server while off.</div>
</div>
```

The field builders write the same markup from code, and each returns `{ element, input, help, getValue, setValue, destroy }`.

```js
import { createInputField, createSelectField, createCheckboxField, createTextareaField, createSecretField, readNumber, readLines } from './configurationpage?name=myplugin_stolon.js';

var port = createInputField({ label: 'Port', type: 'number', min: 1, max: 65535, value: 8096, help: 'The port it listens on.' });
var mode = createSelectField({ label: 'Mode', options: [{ value: 'Allow', text: 'Allowlist' }, { value: 'Block', text: 'Blocklist' }], value: 'Block' });
var on = createCheckboxField({ label: 'Enabled', help: 'Keeps the settings and skips this server while off.', checked: true });
var hosts = createTextareaField({ label: 'Hosts', value: ['a.example', 'b.example'] });
var token = createSecretField({ label: 'API token', stored: config.HasToken });
[port, mode, on, hosts, token].forEach(function (f) { form.appendChild(f.element); });

config.Port = readNumber(port.input);
config.Hosts = readLines(hosts.input);
config.Token = token.getValue();
```

Read and write hand written fields with the bag: `getValue(id, fallback)`, `setValue(id, value)`, `getIntValue(id, fallback)`, `getChecked(id)`, `setChecked(id, checked)`, `getEl(id)`, `setVisible(idOrEl, visible)`, `bindEvent(id, event, handler)`, `bindClick(id, handler)`. See [Shared Bag](shared-bag.md).

## States and Modifiers

* The rules apply only inside `.pluginConfigurationPage` and `.stolon-dialog`. A field outside both looks like stock Jellyfin.
* The three containers and the kit blocks that sit in a form, such as a [Record Selector](record-selector.md), a callout, a [Panel](panel.md), a [Copy Field](copy-field.md), a [String List](string-list.md), or a [Stepper](stepper.md), take one wide gap below them. The last block in a record card or a panel body takes none.
* Inside a field container the label, input, select, button, and any `stolon-` child lose their margins. A child with no kit class keeps its spacing.
* Text, number, password, search, url, email, date, and time inputs, textareas, and selects share one surface, border, radius, and accent focus border. They are full width. A checkbox or radio inside a field container keeps its own size.
* Every select hides its native arrow and paints one chevron. The arrow container that emby injects is hidden, so a select never shows two.
* `fieldDescription` sits on its own line under a checkbox.
* A checkbox or radio that Jellyfin does not upgrade, and every `stolon-check-row-input`, takes one Stolon look, an accent fill with a drawn check while on, a bar while partly checked, and a dot for a radio. An upgraded `emby-checkbox` keeps Jellyfin's own box.
* A number, date, or time field gets Stolon's own arrows or picker icon, and a field with a rule in its attributes is checked when it is left. A page built with `createConfigPage` gets both. See [Field Adornments](field-adornments.md) and [Validation](field-message.md#validation).

## Field Builders

* Each builder writes the web client's own container: a label above the control and the description under it. `help` is the description, `field` is written as `data-field`, and `id` is made when none is given.
* An input and a checkbox carry `is="emby-input"` and `is="emby-checkbox"` as an attribute, so the web client upgrades each once it is in the page. The upgrade adds an empty label before the input, which the kit hides.
* A select and a text area are written as the web client leaves them once upgraded, so the upgrade adds no second label or arrow. The select carries the arrow container, which the kit hides inside a config page and a dialog. The text area keeps its `rows`, 4 by default.
* A field with a rule, such as `required`, `min`, or `pattern`, or with `validate`, is bound to the [validation core](field-message.md#validation), so a Save Bar with `form` refuses it.
* `createSelectField` adds `setOptions(options, value)`, which keeps the value when it is still offered.
* `createSecretField` is an input field bound with [`bindSecretField`](secret-field.md). Its clear button, "Clear" by default, shows while a secret is stored. `setStored(stored)` binds it again after a load, and `getValue()` gives what to post, `SECRET_KEPT` for a secret left as it was.
* `readNumber(input)` gives a number, or null for blank or anything else. `readLines(input)` gives a text area's lines, each trimmed, with the blank ones left out.

## Sizes

* Every single line field, a text box, number box, select, date, or picker input, is the same height, 32px, the medium size. A field with `small` or `large` takes 24 or 40px, and so does every field inside an element with `data-stolon-size="small"` or `"large"`. Components that build fields take a `size` option that sets it.
* A text area keeps its own height and takes the field's text size.

## Gotchas

* Input types other than the eight listed, such as tel, do not get the field look.
* The rules are forced, so a plugin override needs its own forced rule or a more specific selector.
* Never build an upgraded control with `document.createElement(tag, { is })`. Jellyfin's polyfill upgrades it at once, before emby-input has the parent it writes its label into. The builders set `is` as an attribute.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createInputField`

<code>function createInputField(options: InputFieldOptions): FormFieldHandle&lt;string, HTMLInputElement&gt;</code>

A text, number, or other input in the web client's own inputContainer, with its label above and its description under it. The input carries is="emby-input", so the web client upgrades it once it is in the page, and Stolon's form fields style it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `type` | <code>string</code> | the input type (default 'text') |
| `value` | <code>string &#124; number &#124; null</code> | the value to start with [optional] |
| `placeholder` | <code>string</code> | a valid example value [optional] |
| `min` | <code>number &#124; string</code> | the least number [optional] |
| `max` | <code>number &#124; string</code> | the greatest number [optional] |
| `step` | <code>number &#124; string</code> | the number step [optional] |
| `maxLength` | <code>number</code> | the most characters [optional] |
| `pattern` | <code>string</code> | a pattern the value must match [optional] |
| `autocomplete` | <code>string</code> | the autocomplete hint (default 'new-password' for a password) [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>I</code> |
| `help` | <code>HTMLElement &#124; null</code> |
| `getValue` | <code>(): V</code> |
| `setValue` | <code>(value: V): void</code> |
| `destroy` | <code>(): void</code> |

### `createSecretField`

<code>function createSecretField(options: SecretFieldBuildOptions): SecretFieldHandle</code>

A password input for a stored secret, built as an input field with a button after it that clears the stored value. It is bound with bindSecretField, so the secret never reaches the page, and getValue gives what to post through readSecretField.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `stored` | <code>boolean</code> | true when a secret is saved (default false) |
| `clearText` | <code>string</code> | the clear button's label (default 'Clear') |
| `keptText` | <code>string</code> | the input's title while a secret is saved (default 'Saved, leave blank to keep') |
| `allowExpose` | <code>boolean</code> | true adds an eye inside the box that shows what was typed (default false) |

| Handle member | Type |
| :--- | :--- |
| `clear` | <code>HTMLButtonElement</code> |
| `setStored` | <code>(stored: boolean): void</code> |

### `createTextareaField`

<code>function createTextareaField(options: TextareaFieldOptions): FormFieldHandle&lt;string, HTMLTextAreaElement&gt;</code>

A text area in the web client's own inputContainer, with its label above and its description under it. It is written as the web client leaves an upgraded emby-textarea, so it keeps its rows and no second label is added. readLines reads it back as lines.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string &#124; string[] &#124; null</code> | the text, or an array written one item per line [optional] |
| `rows` | <code>number</code> | its height in lines (default 4) |
| `placeholder` | <code>string</code> | a valid example value [optional] |
| `maxLength` | <code>number</code> | the most characters [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>I</code> |
| `help` | <code>HTMLElement &#124; null</code> |
| `getValue` | <code>(): V</code> |
| `setValue` | <code>(value: V): void</code> |
| `destroy` | <code>(): void</code> |

### `createSelectField`

<code>function createSelectField(options: SelectFieldOptions): SelectFieldHandle</code>

A select in the web client's own selectContainer, with its label above, the arrow container, and its description under it. It is written as the web client leaves an upgraded emby-select, so the upgrade adds no second label or arrow.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `options` | <code>WebSelectOption[]</code> | array of { value, text } [optional] |
| `value` | <code>string &#124; number &#124; null</code> | the value chosen at first [optional] |

| Handle member | Type |
| :--- | :--- |
| `setOptions` | <code>(options: WebSelectOption[], value?: string &#124; number &#124; null): void</code> |

### `createCheckboxField`

<code>function createCheckboxField(options: CheckboxFieldOptions): FormFieldHandle&lt;boolean, HTMLInputElement&gt;</code>

A checkbox in the web client's own checkboxContainer, with its label beside it and its description under it. The input carries is="emby-checkbox", so the web client upgrades it and draws its box once it is in the page.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `label` (required) | <code>string</code> | the text beside the box |
| `help` | <code>string</code> | the description under it [optional] |
| `id` | <code>string</code> | the input's id (default a new one) |
| `field` | <code>string</code> | written as data-field [optional] |
| `checked` | <code>boolean</code> | true when it starts on (default false) |
| `disabled` | <code>boolean</code> | true when it cannot change (default false) |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>I</code> |
| `help` | <code>HTMLElement &#124; null</code> |
| `getValue` | <code>(): V</code> |
| `setValue` | <code>(value: V): void</code> |
| `destroy` | <code>(): void</code> |

### `readNumber`

<code>function readNumber(input: { value: string; } &#124; null &#124; undefined): number &#124; null</code>

Reads a number from a field, or null when it is blank or not a number.

### `readLines`

<code>function readLines(input: { value: string; } &#124; null &#124; undefined): string[]</code>

Reads a text area as its lines, each trimmed, with the blank ones left out.

| Type | What it is |
| :--- | :--- |
| `FormFieldOptions` | What every form field builder takes. field is written as data-field, and validate adds a rule of the caller's own to the validation core. |

| Class | What it looks like |
| :--- | :--- |
| `stolon-record-card` | The last block in a record card or a panel body sits on the padding, with no gap below it |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/form-fields.html" title="Form Fields example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "form-fields.html"
```
