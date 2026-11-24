# Asset List

Rows for uploaded files, with a thumbnail, a name and reference, and action buttons.

## Decision

| When | Use |
| :--- | :--- |
| Listing files a plugin stores, with a way to copy or remove each | Asset List |
| Choosing files to upload | [File Picker](file-picker.md) |

## Usage

```html
<div class="stolon-asset-list">
    <div class="stolon-asset-item">
        <img class="stolon-asset-thumb" src="logo.png" alt="">
        <div class="stolon-asset-info">
            <div class="stolon-asset-name">logo.png</div>
            <div class="stolon-asset-ref">asset://logo</div>
        </div>
        <div class="stolon-asset-actions">
            <button type="button" class="stolon-row-btn" title="Copy" aria-label="Copy"><span class="material-icons" aria-hidden="true">content_copy</span></button>
            <button type="button" class="stolon-row-btn destructive" title="Delete" aria-label="Delete"><span class="material-icons" aria-hidden="true">delete</span></button>
        </div>
    </div>
</div>
```

Classes: `stolon-asset-list`, `stolon-asset-item`, `stolon-asset-thumb`, `stolon-asset-info`, `stolon-asset-name`, `stolon-asset-ref`, `stolon-asset-actions`. Its buttons are [Row Buttons](row-button.md), `stolon-row-btn`.

## States and Modifiers

* `destructive` on a `stolon-row-btn` turns its hover red, for a button that deletes the file.
* The thumbnail is contained on a checkerboard of the surface and a wash of the text color, so it follows the theme.

## Gotchas

* There is no JavaScript. Give each row button a `title` and an `aria-label`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-asset-list` | Vertical list of uploaded asset rows |
| `stolon-asset-item` | One asset row with thumbnail, info, and actions |
| `stolon-asset-thumb` | Square checkerboard thumbnail so transparent images stay visible |
| `stolon-asset-info` | Column holding the asset name and its reference |
| `stolon-asset-name` | Bold asset name that clips with an ellipsis |
| `stolon-asset-ref` | Small dimmed mono reference that breaks anywhere |
| `stolon-asset-actions` | Row of action buttons at the end of an asset row |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/asset-list.html" title="Asset List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "asset-list.html"
```
