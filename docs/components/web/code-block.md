# Code Block

A monospace code editor textarea, or a read only block for a preview.

## Decision

| When | Use |
| :--- | :--- |
| JSON, templates, and scripts the user edits | The Code Block textarea |
| A short value | [Copy Field](copy-field.md) or the mono class from [Utility Classes](utility-classes.md) |

## Usage

```html
<textarea class="stolon-code" id="txtTemplate"></textarea>
<pre class="stolon-code stolon-code-block">{ "event": "Approved" }</pre>
<pre class="stolon-code stolon-code-block stolon-code-invalid">{ not json }</pre>
```

Classes: `stolon-code`, `stolon-code-block`, `stolon-code-invalid`.

## States and Modifiers

* `stolon-code` is a full width mono textarea on the field surface in the theme text color, at least 240px tall, that keeps its lines unwrapped and resizes vertically.
* `stolon-code-block` goes with `stolon-code`. It is as tall as its text and wraps, breaking a long path or token anywhere, so it never runs past its frame or makes the page scroll sideways on a phone.
* `stolon-code-invalid` goes with `stolon-code` and turns the border to `--stolon-error`. Toggle it from your own validation.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-code` | Full width monospace textarea for editing code |
| `stolon-code.stolon-code-block` | Read only block of code or JSON that wraps and is only as tall as its text |
| `stolon-code-block` | A code block breaks a long path or token anywhere, so it never runs past its frame or makes the page scroll sideways |
| `stolon-code.stolon-code-invalid` | Code field or block with a red border for content that is not valid |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/code-block.html" title="Code Block example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "code-block.html"
```
