# Section Title

The page heading with a full width underline. Jellyfin supplies the markup classes, so they are not prefixed.

## Decision

| When | Use |
| :--- | :--- |
| Each tab or major area of a config page | One Section Title |
| A title inside a dialog | `stolon-modal-title`, as on [Dialog](dialog.md) |

## Usage

```html
<div class="sectionTitleContainer flex align-items-center">
    <h1 class="sectionTitle">Servers</h1>
</div>
```

Classes: `sectionTitleContainer`, `sectionTitle`.

## States and Modifiers

* The container takes the wide gap above it, also when it is the first child. The heading fills the row and takes a rule under it, with the wide gap below.
* The heading is a normal heading element. Use `h1` for the page title and `h2` for later ones.

## Gotchas

* The look applies only outside the [Web Client Shell](web-client-shell.md), `body:not(.stolon-shell)`, so the web client's own `sectionTitleContainer` headings on a shell page keep the web client's look.
* The underline needs the container to be a flex row (`flex align-items-center` from Jellyfin), or the heading does not fill it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-shell` | Page section heading with a full width underline rule, spaced from the heading before it. A page in the web client shell keeps the web client's own headings |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/section-title.html" title="Section Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section-title.html"
```
