# Panel

A bordered sub card on the surface color, for a group of fields or text inside a section or a dialog.

## Decision

| When | Use |
| :--- | :--- |
| Grouping related fields or a short block of text | Panel |
| Label and value rows | [Record Card](record-card.md) |

## Usage

```html
<div class="stolon-panel">
    <div class="stolon-panel-header">Schedule</div>
    <div class="stolon-panel-body">
        <div class="inputContainer"><label for="txtStart">Starts on</label><input is="emby-input" type="date" id="txtStart" /></div>
    </div>
</div>
```

Classes: `stolon-panel`, `stolon-panel-header`, `stolon-panel-body`.

## States and Modifiers

* The header is optional, and a panel may hold only a body.
* The last block inside the body takes no bottom margin.
* Inside a page or dialog the panel takes the field gap as bottom margin.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-panel` | Bordered sub card on the surface color, for a group inside a section or a dialog, the surface a record card shares |
| `stolon-panel-header` | Header strip of a panel with a divider under it |
| `stolon-panel-body` | Padded body of a panel, padded as a record card is |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/panel.html" title="Panel example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "panel.html"
```
