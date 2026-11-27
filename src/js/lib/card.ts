// card.ts
// The count card that count cards and the filtered list's filter cards share: a large count over a label, tinted by a color. None of it is exported from the bundle.

import { make, toText } from './dom.js';
import { applyColor } from './color.js';

/** What buildCard takes. tag is button for a card that acts, color is a status color name or a hex code, and className and attrs go on the card. */
export interface CardOptions {
    tag?: 'div' | 'button';
    count?: unknown;
    label?: unknown;
    color?: unknown;
    className?: string;
    attrs?: Record<string, unknown> | null;
}

/** What buildCard returns: the card and its count and label, so a variation can add to it or change the count. */
export interface CardParts {
    element: HTMLElement;
    count: HTMLElement;
    label: HTMLElement;
}

/**
 * Builds a stolon-card: a large count over a label, in the color of its status. A count card and a filter card are each
 * this card, with a behavior added.
 * Internal to the web components.
 *
 * @param opts { tag (default 'div'), count, label, color, className, attrs }
 * @returns { element, count, label }
 */
export function buildCard(opts: CardOptions): CardParts {
    var card = make(opts.tag || 'div', 'stolon-card' + (opts.className ? ' ' + opts.className : ''), opts.attrs || null);
    applyColor(card, opts.color);
    var count = make('span', 'stolon-card-count', null, toText(opts.count));
    var label = make('span', 'stolon-card-label', null, toText(opts.label));
    card.appendChild(count);
    card.appendChild(label);
    return { element: card, count: count, label: label };
}

// Whether any of the parts is wider than its box.
function overflows(parts: NodeListOf<HTMLElement>): boolean {
    for (var i = 0; i < parts.length; i++) if (parts[i].scrollWidth > parts[i].clientWidth) return true;
    return false;
}

/**
 * Gives a row of count cards the smaller count size when any count is wider than its card, so every count in the row
 * keeps one size and only a count still too wide ends in an ellipsis. A label holding a word wider than its card gives
 * every label the small size the same way.
 * Internal to the web components.
 *
 * @param container the stolon-cards row
 */
export function fitCounts(container: HTMLElement): void {
    container.classList.remove('stolon-fit');
    container.classList.remove('stolon-fit-labels');
    if (overflows(container.querySelectorAll<HTMLElement>('.stolon-card-count'))) container.classList.add('stolon-fit');
    if (overflows(container.querySelectorAll<HTMLElement>('.stolon-card-label'))) container.classList.add('stolon-fit-labels');
}
