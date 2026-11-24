/**
 * Turns an element compact by its own width, never the window's, so a component fits wherever it is placed. It adds
 * stolon-compact while compact says the width is too narrow, checks again whenever the element resizes, and checks once
 * at the start. An engine with no ResizeObserver checks when the window resizes.
 *
 * @param root the component's root element
 * @param compact says from the width in pixels whether the component is too narrow for its full layout. A width of 0,
 *   before the element is laid out, is never compact.
 * @returns { check, stop }: check measures again, such as after the content changes, and stop stops watching
 */
export function fitWidth(root: HTMLElement, compact: (width: number) => boolean): { check: () => void; stop: () => void } {
    var check = function (): void {
        var width = root.clientWidth || 0;
        root.classList.toggle('stolon-compact', !!width && compact(width));
    };
    var stop: () => void;
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(check);
        watch.observe(root);
        stop = function () { watch.disconnect(); };
    } else if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('resize', check);
        stop = function () { window.removeEventListener('resize', check); };
    } else {
        stop = function () { /* nothing to stop */ };
    }
    check();
    return { check: check, stop: stop };
}
