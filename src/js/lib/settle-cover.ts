import { make } from './dom.js';
import { whenSettled } from './settle.js';
import { stolonText } from './stolon-text.js';

/**
 * Holds an element behind a spinner until a promise and every request it started have come back, so what it shows
 * draws all at once.
 *
 * @param element the page or panel to hold
 * @param pending the promise of its first load
 */
export function coverUntilSettled(element: HTMLElement, pending: PromiseLike<unknown>): void {
    element.classList.add('stolon-settling');
    var cover = make('div', 'stolon-settle-cover', { role: 'status' });
    cover.appendChild(make('span', 'stolon-loading-ring', { 'aria-hidden': 'true' }));
    cover.appendChild(make('span', 'stolon-sr-only', null, stolonText('Stolon.Loading')));
    element.appendChild(cover);
    var done = function () {
        element.classList.remove('stolon-settling');
        if (cover.parentNode) cover.parentNode.removeChild(cover);
    };
    Promise.resolve(pending).then(function () { return whenSettled(); }, function () { return whenSettled(); }).then(done, done);
}
