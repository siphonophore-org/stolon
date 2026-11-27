import { make, has } from './lib/dom.js';
import { applyColor, isHexColor, colorClass, colorStyle } from './lib/color.js';
import { escapeHtml } from './browser-helpers.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';
import type { BASE_TEXT } from './lib/stolon-text.js';

/** What createStatusDot takes. The label defaults to the color's meaning. */
export interface StatusDotOptions {
    color?: 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray' | 'yellow' | 'pink' | 'teal' | string;
    label?: string;
}

/** What createStatusDot returns. getValue returns the color and label as drawn. */
export interface StatusDotHandle extends ComponentHandle {
    getValue(): { color: string; label: string };
    setValue(next: StatusDotOptions): void;
    destroy(): void;
}

var LABELS: Record<string, keyof typeof BASE_TEXT> = { green: 'Stolon.Active', red: 'HeaderError', orange: 'Stolon.Waiting', purple: 'Stolon.Working', blue: 'ButtonInfo', gray: 'Off', yellow: 'Stolon.Note', pink: 'Stolon.Note', teal: 'Stolon.Note' };

// Keeps a known color or hex code, else gray, and names it by the label or the color's meaning.
function dotState(color: unknown, label: unknown): { color: string; label: string } {
    var c = has(LABELS, color as string) || isHexColor(color) ? color as string : 'gray';
    return { color: c, label: label ? String(label) : stolonText(LABELS[c] || 'Stolon.Note') };
}

/**
 * Builds the markup of the dot createStatusDot draws, for a page or component that renders text. The label is escaped.
 *
 * @param color a status color name or a hex code (default gray)
 * @param label the name of the state (default the color's meaning) [optional]
 * @returns the span markup
 */
export function statusDotHtml(color: unknown, label?: unknown): string {
    var state = dotState(color, label);
    var name = escapeHtml(state.label);
    return '<span class="stolon-dot ' + colorClass(state.color, 'gray') + '" role="img" title="' + name + '" aria-label="' + name + '"' + colorStyle(state.color) + '></span>';
}

/**
 * Recolors a dot already on the page, such as one statusDotHtml drew, in place. A dot a screen reader reads takes the
 * label, or the color's meaning, as its title and accessible name. A dot marked aria-hidden keeps its own.
 *
 * @param el the stolon-dot element
 * @param color a status color name or a hex code (default gray)
 * @param label the name of the state (default the color's meaning) [optional]
 */
export function setDotColor(el: HTMLElement, color: unknown, label?: unknown): void {
    if (!el) return;
    var state = dotState(color, label);
    el.classList.add('stolon-dot');
    applyColor(el, state.color, 'gray');
    if (el.getAttribute('aria-hidden') === 'true' && !label) return;
    el.title = state.label;
    el.setAttribute('aria-label', state.label);
}

/**
 * A small round dot in a status color with a text name for it, as a title and as the accessible name.
 *
 * @param options {
 *   color : 'green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal', or a hex code such as '#e91e63' (default 'gray')
 *   label : the name of the state (default the color's meaning, such as 'Active' for green)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns { color, label }, and setValue takes the same shape.
 */
export function createStatusDot(options?: StatusDotOptions): StatusDotHandle {
    options = options || {};
    var root = make('span', 'stolon-dot', { role: 'img' });
    var state: { color: string; label: string } = { color: 'gray', label: '' };

    function setValue(next: StatusDotOptions): void {
        next = next || {};
        state = dotState(next.color, next.label);
        root.className = 'stolon-dot';
        applyColor(root, state.color, 'gray');
        root.title = state.label;
        root.setAttribute('aria-label', state.label);
    }

    setValue(options);
    return {
        element: root,
        getValue: function () { return { color: state.color, label: state.label }; },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
