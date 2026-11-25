# Prompt Sidecar

A small form in a [Sidecar](sidecar.md) that resolves to a map of the values.

## Decision

| When | Use |
| :--- | :--- |
| Asking for one to three values, such as a name | Prompt Sidecar |
| A record | [Editor Sidecar](editor-sidecar.md) |
| Anything larger | The [Form Fields](form-fields.md) on a page |

## Usage

```js
import { promptSidecar } from './configurationpage?name=myplugin_stolon.js';

promptSidecar(
    [{ name: 'label', label: 'Label', value: 'My record' },
     { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }],
    { title: 'New record', submitText: 'Create' }
).then(function (values) { if (values) { create(values.label, values.mode); } });
```

## States and Modifiers

* Each field is `{ name, label, description, type, value, placeholder, required, min, max, options, validate }`. `validate(value)` returns an error sentence, or an empty value when the text is valid. `type` is `text` (default), `number`, `password`, `textarea`, or `select`, which takes `options: [{ value, label }]`. `description` is a sentence under the field.
* Every field checks through the [validation core](field-message.md#validation). Save and Enter stay in the sidecar while a field is invalid, show every message, and focus the first invalid field.
* `opts` is `{ title, subtitle, submitText, cancelText }`, with the buttons "Save" and "Cancel" by default.
* It resolves to `{ name: value }` with every value a string, or to `null` when cancelled.
* The controls are `stolon-edit-input` inside `stolon-modal-field` blocks. Enter in a single line input submits. A prefilled first field is selected on open, except on a touch screen.

## Gotchas

* `required`, `min`, `max`, and `validate` are the only checks. A rule that needs more than one field belongs in the code that reads the values.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `promptSidecar`

<code>function promptSidecar(fields: PromptSidecarField[], opts?: PromptSidecarOptions): Promise&lt;Record&lt;string, string&gt; &#124; null&gt;</code>

Opens a form in a sidecar that resolves to a { name: value } map, or to null when cancelled. Save checks every field through the validation core and stays open while one is invalid, with focus on the first.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> |  |
| `subtitle` | <code>string</code> |  |
| `submitText` | <code>string</code> |  |
| `cancelText` | <code>string</code> |  |

| Type | What it is |
| :--- | :--- |
| `PromptSidecarField` | One field in a prompt sidecar. A select reads options as value and label pairs, and required and validate check it through the validation core. |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/prompt-sidecar.html" title="Prompt Sidecar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "prompt-sidecar.html"
```
