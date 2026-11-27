import { balanceRows } from './lib/balance.js';
import { clear } from './lib/dom.js';
import { buildCard, fitCounts } from './lib/card.js';
import type { Shared, CardData } from './types.js';

/**
 * Draws a row of count cards into a container, each one the shared stolon-card. The bag calls it as shared.renderCards, with the bag as this.
 *
 * @param containerId id of the container, or the container itself
 * @param cards array of { count, label, color }
 */
export function renderCards(this: Shared, containerId: string | Element, cards: CardData[]): void {
    var el = typeof containerId === 'string' ? this.getEl(containerId) : containerId;
    if (!el) return;
    el.classList.add('stolon-cards');
    // A row of cards never leaves one card alone when it wraps.
    if (!el.classList.contains('stolon-balanced')) balanceRows(el as HTMLElement, { minWidth: 110, onLayout: fitCounts });
    clear(el);
    (cards || []).forEach(function (c) { el!.appendChild(buildCard({ count: c.count, label: c.label, color: c.color }).element); });
}
