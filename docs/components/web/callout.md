# Callout

A soft inline notice. Pick the class by meaning.

## Decision

| When | Use |
| :--- | :--- |
| A hint, a result, or a problem that belongs beside the content it explains | Callout |
| A notice the user can dismiss | [Banner](banner.md) |
| A message that appears after an action | [Toast](toast.md) |

## Usage

```html
<div class="stolon-callout-info">Password is your API key.</div>
<div class="stolon-callout-success">Connected.</div>
<div class="stolon-callout-warn">The last run failed.</div>
<div class="stolon-callout-error">The server could not be reached.</div>
<div class="stolon-callout-neutral">Sync is off, so nothing here applies.</div>
<div class="stolon-error-message">Request failed with status 502</div>
```

Classes: `stolon-callout-info`, `stolon-callout-success`, `stolon-callout-warn`, `stolon-callout-error`, `stolon-callout-neutral`, `stolon-error-message`.

## States and Modifiers

* The five callouts share one shape. Each is a 12 percent tint with a 40 percent border, mixed from the blue, green, orange, red, or gray swatch color, with a fixed color first for an engine without `color-mix()`.
* `stolon-error-message` is a mono block for raw failure text, in the red swatch colors.
* Toggle a callout with the `stolon-hidden` class.

## Gotchas

* There is no icon and no JavaScript. Use a [Banner](banner.md) for the same tint with an icon.
* The kit adds no ARIA. Put `role="status"` or `role="alert"` on a message that appears after an action.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-callout-info` | Soft inline callout with one shared shape and one color per meaning, in five variants |
| `stolon-callout-success` | Green callout for a successful or healthy state |
| `stolon-callout-warn` | Orange callout for a caution to heed |
| `stolon-callout-error` | Red callout for a failure or blocking problem |
| `stolon-callout-neutral` | Gray callout for a muted or inactive note |
| `stolon-error-message` | Red, mono block for surfacing raw failure text such as an error body or a stack line |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/callout.html" title="Callout example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "callout.html"
```
