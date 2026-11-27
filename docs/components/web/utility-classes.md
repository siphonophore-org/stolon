# Utility Classes

Small classes for visibility, fonts, text color, spacing, and the stack that spaces a column of blocks evenly.

## Decision

| When | Use |
| :--- | :--- |
| Showing and hiding a block | `hidden` or the `[hidden]` attribute. `shared.setVisible` toggles `hidden` for you. |
| Paths, ids, and addresses | `stolon-mono`. |
| The label of an icon only control | `stolon-sr-only`. |
| A state shown with `stolon-ok` or `stolon-bad` | The color paired with a word. Never the color as the only signal. |
| A column of fields, checkboxes, tables, and meters that should sit evenly apart | `stolon-stack`, or `stolon-flow` on an open section's content. |
| Placeholder text such as None | `stolon-muted`. |
| A row shown with dashes until a check answers | `stolon-pending`. |
| One extra gap above or below a block, or the gap of a flex row | A `stolon-gap-` class, such as `stolon-gap-below-wide` or `stolon-gap-narrow`. |
| Side by side fields | [Field](field.md), not a stack. |

## Usage

```html
<div class="stolon-hidden">Hidden</div>
<span class="stolon-mono">10.0.0.1</span>
<span class="stolon-ok">OK</span> <span class="stolon-bad">Failed</span>
<div class="stolon-url">URL: <a href="#">/pages/home</a></div>
<button type="button"><span class="material-icons" aria-hidden="true">delete</span><span class="stolon-sr-only">Remove the record</span></button>
<span class="stolon-muted">None</span>
<div class="stolon-stack">
    <div class="inputContainer"><label for="host">Host</label><input is="emby-input" type="text" id="host"></div>
    <div class="fieldDescription">The server to connect to.</div>
    <div class="checkboxContainer"><label class="emby-checkbox-label"><input type="checkbox" is="emby-checkbox"><span>Use HTTPS</span></label></div>
</div>
```

A section's content takes the same column with `stolon-flow`, in its markup or through the handle.

```js
var section = base.createCollapsibleSection({ title: 'Connection', content: fields });
section.content.classList.add('stolon-flow');
```

Classes: `stolon-hidden`, `stolon-mono`, `stolon-ok`, `stolon-bad`, `stolon-url`, `stolon-sr-only`, `stolon-icon-text`, `stolon-thumb`, `stolon-stack`, `stolon-flow`, `stolon-muted`, `stolon-pending`, `stolon-gap-narrow`, `stolon-gap-wide`, `stolon-gap-above-narrow`, `stolon-gap-above-wide`, `stolon-gap-below-narrow`, `stolon-gap-below-wide`, `stolon-float`.

## States and Modifiers

* `stolon-hidden` is `display: none`, forced.
* The `[hidden]` attribute hides too, even on a component with its own `display` rule such as a flex row or a grid.
* `stolon-url` is mono at 85 percent opacity, with links in the accent color.
* `stolon-icon-text` sets an icon beside text that may wrap, with the icon centered on the first line. It is medium by default and takes `small` or `large`.
* `stolon-thumb` is an artwork frame that holds a `stolon-thumb-placeholder` icon under a `stolon-thumb-image`. The frame sets no size, so the component that uses it does. The image takes `hidden` when it fails to load, and `stolon-pending` while it loads.
* `stolon-stack` lays its children out as one column `--stolon-gap-wide` apart, and zeroes their own top and bottom margins, including the field spacing on a config page and in a dialog. `stolon-narrow` sets the gap to `--stolon-gap-narrow`, for the parts of one group.
* `stolon-flow` does the same for an open section's `stolon-collapsible-content`. A closed section stays hidden.
* In a stack or a flowing section, a `fieldDescription` right after a block sits a narrow gap under it, a subsection title after other blocks takes a second gap above it, an empty `stolon-status-text` takes no room, and a hidden block takes no gap. A button or a badge keeps its own width.
* `stolon-divided` on a stack or a flowing section draws a line between its blocks, a wide gap on each side, for groups of settings.
* `stolon-muted` is text in `--stolon-text-muted`.
* `stolon-pending` dims an element to 0.7 while it waits for an answer, such as a row of dashes.
* `stolon-gap-narrow` and `stolon-gap-wide` set the gap of a flex or grid box. `stolon-gap-above-narrow`, `stolon-gap-above-wide`, `stolon-gap-below-narrow`, and `stolon-gap-below-wide` set one margin, and win over the field spacing and a stack's gap.
* `stolon-float` is the surface every floating box shares, such as a menu, a tooltip, a dropdown, or a toast. The popover helper adds it to the box it places.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-hidden` | Hides an element outright |
| `stolon-mono` | Applies the mono font stack |
| `stolon-ok` | Success colored text |
| `stolon-bad` | Error colored text |
| `stolon-url` | Monospace, dimmed line for showing a URL or path with an accent link |
| `stolon-sr-only` | Visually hidden text that screen readers still read, such as a label for an icon only control |
| `stolon-thumb` | An artwork frame that holds a placeholder icon under its image, shared by media cards, media picker rows, checkbox list rows, and the image picker, which each set the size |
| `stolon-thumb-placeholder` | The icon that fills the frame while there is no image, or until it loads |
| `stolon-thumb-image` | The image that covers the frame, hidden when it fails to load |
| `stolon-icon-text` | An icon beside text that may wrap, with the icon centered on the first line of text, medium unless small or large |
| `stolon-stack` | A column of blocks a wide gap apart, such as fields, checkboxes, tables, and meters, whose own margins give way to the gap. stolon-flow on a section's content lays the open section out the same way |
| `stolon-stack.stolon-narrow` | A stack a narrow gap apart, for the parts of one group |
| `stolon-stack.stolon-divided` | A stack or a flowing section whose blocks are split by a line, with the same gap on each side of it, such as groups of settings |
| `stolon-muted` | Text in the muted color, for a placeholder such as None or a secondary note |
| `stolon-pending` | An element waiting for an answer, dimmed, such as a row that shows dashes until a check answers |
| `stolon-gap-narrow` | The gap between the children of a flex or grid box, narrow or wide |
| `stolon-gap-above-narrow` | A narrow or wide gap above or below one block, which wins over the field spacing and a stack's own gap |
| `stolon-float` | The surface every floating box shares, a menu, a filter panel, a help bubble, a tooltip, a dropdown, or a toast, over the page. anchorPopover adds it to the box it places |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/utility-classes.html" title="Utility Classes example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "utility-classes.html"
```
