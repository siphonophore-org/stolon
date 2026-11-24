# Button

Buttons are Jellyfin's `emby-button` with the `raised` class and the `stolon-button` class, with a variant and a size beside it.

## Decision

| When | Use |
| :--- | :--- |
| The main action | `stolon-button primary` |
| An action that destroys data | `stolon-button destructive` |
| Every other action | `stolon-button secondary` |
| An icon action inside a table or list row | [Row Button](row-button.md) |
| A set of choices | A [Pill Group](pill-group.md) or a [Toggle Group](toggle-group.md) |

## Usage

```html
<button is="emby-button" type="button" class="raised stolon-button stolon-primary"><span>Save</span></button>
<button is="emby-button" type="button" class="raised stolon-button stolon-destructive stolon-small"><span>Delete</span></button>
<button is="emby-button" type="button" class="raised stolon-button stolon-secondary"><span>Cancel</span></button>
<button is="emby-button" type="button" class="raised stolon-button stolon-primary">
    <span class="material-icons" aria-hidden="true">add</span><span>Add Server</span>
</button>
```

Classes: `stolon-button` with `stolon-primary`, `stolon-secondary`, `stolon-destructive`, or `stolon-custom`, and `stolon-small`, `stolon-large`, `stolon-fill`, or `stolon-field-sized`. `stolon-button-row` holds a row of them.

## States and Modifiers

* `stolon-button` is an inline flex, 32px tall with an 18px icon. `small` and `large` take the 24px and 40px steps of the [size scale](design-tokens.md), with their icon sizes.
* A `stolon-button` with no variant is muted, as `secondary` is.
* `custom` fills the button with `--stolon-custom` and writes its text in `--stolon-custom-on`, the on accent color by default.
* `fill` spans the width it has, unless the button is `small`. In a `stolon-button-row` the `fill` buttons share the width evenly.
* `aria-pressed="true"` fills any `stolon-button` with the accent, and `aria-pressed="false"` outlines and dims it, so a button can turn on and off.
* `field` takes the field's height, padding, and text size, so a button on the same line as a field lines up at any size.
* Every size and color rule is forced, so these win over the emby defaults.
* In a dialog footer, `openDialog` builds `raised stolon-modal-button` buttons and adds your class, `stolon-button secondary` by default.
* A `stolon-btn-progress` bar inside a `primary` or `destructive` button takes a translucent `--stolon-on-accent`, so it stays visible on the fill. A `small` button draws no bar. See [Task Progress Button](task-progress-button.md).

## Gotchas

* A `stolon-button destructive` button in a dialog is never focused automatically.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-button` | A button on Jellyfin's raised button, medium unless small or large, muted like secondary unless it names a variant, with any icon beside its label |
| `stolon-button.stolon-primary` | The accent filled button for the main action |
| `stolon-button.stolon-secondary` | The muted button for a lower emphasis action |
| `stolon-button.stolon-destructive` | The red filled button for an action that destroys data |
| `stolon-button.stolon-custom` | A button filled with a custom color from a hex code, with black or white text, whichever reads better |
| `stolon-button.stolon-fill` | A medium or large button that spans the width it has. A small button keeps its own width |
| `stolon-button-row` | A row of buttons a wide space apart, where fill buttons share the width evenly |
| `stolon-button.stolon-field-sized` | A button on the same line as a field, which takes the field's height, padding, and text size, so the two line up at any size |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/button.html" title="Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "button.html"
```
