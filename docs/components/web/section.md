# Section

An always open titled block, matched to the collapsible section but with no toggle.

## Decision

| When | Use |
| :--- | :--- |
| Content that must stay visible, such as a list beside collapsible forms | Section |
| Content the reader may fold away | [Collapsible Section](collapsible-section.md) |

## Usage

```html
<div class="stolon-section">
    <div class="stolon-section-title">Servers</div>
    <div class="stolon-section-content">
        <div id="serverList" class="stolon-card-list"></div>
    </div>
</div>
```

Classes: `stolon-section`, `stolon-section-title`, `stolon-section-content`.

## States and Modifiers

* The title is optional. A section may hold only `stolon-section-content`, with no title element.
* Inside a page or dialog the section takes the field gap as bottom margin.
* The title shows exactly as written, so a name such as `yt-dlp` keeps its case. Write a title in Title Case.

## Gotchas

* There is no JavaScript and no ARIA. The title is a plain block, not a button.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-section` | Section that is always open, with the collapsible section's frame, header, and body from collapsible-section.css, and no toggle or chevron |
| `stolon-section-title` | Static header row styled like a collapsible header, with no button, pointer, or chevron |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/section.html" title="Section example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section.html"
```
