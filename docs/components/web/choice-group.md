# Choice Group

Radio cards. One `stolon-choice` label per option, with a name and a sentence of explanation.

## Decision

| When | Use |
| :--- | :--- |
| A mode or strategy where each option needs a line of help | Choice Group |
| Options whose names explain themselves | [Pill Group](pill-group.md) |
| A long list of options | A select |

## Usage

```html
<div class="stolon-choice-group" id="modeChoices" role="radiogroup" aria-label="Direction">
    <label class="stolon-choice">
        <input type="radio" name="serverMode" value="Pull" />
        <span class="stolon-choice-name">Pull</span>
        <span class="stolon-choice-text">Read from this server on a schedule.</span>
    </label>
    <label class="stolon-choice">
        <input type="radio" name="serverMode" value="Push" />
        <span class="stolon-choice-name">Push</span>
        <span class="stolon-choice-text">Send changes made here as they happen.</span>
    </label>
</div>
```

```js
import { createChoiceGroup } from './configurationpage?name=myplugin_stolon.js';

var mode = createChoiceGroup(view.querySelector('#modeChoices'), { onChange: function (value) { reflectMode(value); } });
mode.set('Pull');
```

Classes: `stolon-choice-group`, `stolon-choice`, `stolon-choice-name`, `stolon-choice-text`. The handle is `{ get, set, destroy }`.

## States and Modifiers

* `get()` returns the checked value or `null`. `set(value)` checks the matching input.
* The `stolon-selected` class follows the checked input, and runs once on creation. A checked input gets the same look through `:has(input:checked)`, in its own rule so an engine without `:has()` keeps `.stolon-selected`.
* The radio input is visually hidden but stays in the tab order and keeps the native arrow keys within its group.
* `createChoiceGroup` lays the cards out as [Balanced Rows](balanced-rows.md), up to three columns of at least 200px each, so no card sits alone on a row. Without the script, the cards are three equal columns, and one column at 768px and below.

## Gotchas

* `set` does not call `onChange`.
* Use one `name` for all radios of a group, and give the group `role="radiogroup"` and a label.
* `createChoiceGroup` throws without an element.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createChoiceGroup`

<code>function createChoiceGroup(groupEl: HTMLElement, options?: ChoiceGroupOptions): ChoiceGroupHandle</code>

Wires a group of stolon-choice radio cards, keeping the stolon-selected class in step with the checked input for browsers without :has(). It reports each change to onChange.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `onChange` | <code>(value: string &#124; null): void</code> |  |

| Handle member | Type |
| :--- | :--- |
| `get` | <code>(): string &#124; null</code> |
| `set` | <code>(value: string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `stolon-choice-group` | Grid of equal radio cards, three across and one per row on a phone |
| `stolon-choice` | One radio card holding a hidden input, a name, and a sentence, outlined in the accent when selected |
| `stolon-choice-name` | Bold name of a choice |
| `stolon-choice-text` | Small dimmed sentence under the name |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/choice-group.html" title="Choice Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "choice-group.html"
```
