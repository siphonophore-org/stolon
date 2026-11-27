import { listen, runAll } from './dom.js';

/** How balanceRows sizes a group. minWidth is the least a tile takes, maxColumns caps a row, even gives the tiles of every full row one width and stretches a shorter last row, and onLayout runs after each layout. */
export interface BalanceOptions {
    onLayout?(container: HTMLElement): void;
    minWidth?: number;
    maxColumns?: number;
    even?: boolean;
    gap?: number;
    skip?: string;
}

/** What balanceRows returns. update lays the group out again, such as after its tiles change. */
export interface BalanceHandle {
    update(): void;
    destroy(): void;
}

/**
 * Splits a number of tiles into rows of even size, so no row is left with a single tile. It takes the fewest rows
 * the columns allow, keeps the rows within one tile of each other, and joins rows when one would hold a lone tile.
 *
 * @param count the number of tiles
 * @param columns the most tiles a row fits
 * @returns the size of each row, the larger rows first
 */
export function rowSizes(count: number, columns: number): number[] {
    if (count <= 0) return [];
    columns = Math.max(1, Math.floor(columns));
    if (columns === 1) return Array.from({ length: count }, function () { return 1; });
    var rows = Math.ceil(count / columns);
    // A row of one would stand alone, so use fewer, fuller rows instead.
    if (count > 1 && Math.floor(count / rows) < 2) rows = Math.max(1, Math.floor(count / 2));
    var small = Math.floor(count / rows);
    var large = count % rows;
    var sizes: number[] = [];
    for (var i = 0; i < rows; i++) sizes.push(i < large ? small + 1 : small);
    return sizes;
}

/**
 * Picks one column count for a group of even tiles. It takes the most columns that fit and fill every row, as long as
 * that is at least half of what fits. Otherwise it takes as many as fit, fewer while the last row would hold a single tile.
 *
 * @param count the number of tiles
 * @param columns the most tiles a row fits
 * @returns the number of columns
 */
export function evenColumns(count: number, columns: number): number {
    var c = Math.max(1, Math.min(Math.floor(columns), count));
    for (var d = c; d >= 2 && d * 2 >= c; d--) {
        if (count % d === 0) return d;
    }
    while (c > 2 && count % c === 1) c -= 1;
    return c;
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }

/**
 * Lays a group's tiles out in balanced rows, on a grid whose columns are the least common multiple of the row sizes,
 * so every tile in a row spans the same share. It lays out again when the group resizes or its tiles change.
 *
 * @param container the element that holds the tiles
 * @param options minWidth (default 160), maxColumns, gap (default the container's column gap, else 12), skip, a selector for children that are not tiles, even, which gives every tile in a full row one width on a fixed column count and stretches a shorter last row to fill, as stolon-even on the container does, and onLayout, a function(container) called after each layout
 * @returns { update, destroy }
 */
export function balanceRows(container: HTMLElement, options?: BalanceOptions): BalanceHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var frame = 0;
    container.classList.add('stolon-balanced');

    function tiles(): HTMLElement[] {
        return Array.prototype.filter.call(container.children, function (el: HTMLElement) {
            if (el.hidden || el.classList.contains('stolon-hidden')) return false;
            if (typeof getComputedStyle === 'function' && getComputedStyle(el).display === 'none') return false;
            return !(opts.skip && el.matches && el.matches(opts.skip));
        }) as HTMLElement[];
    }

    function update(): void {
        frame = 0;
        var list = tiles();
        var width = container.clientWidth || 0;
        var style = typeof getComputedStyle === 'function' ? getComputedStyle(container) : null;
        var gap = opts.gap !== undefined ? opts.gap : parseFloat((style && (style.columnGap || style.gap)) || '') || 12;
        // A group's CSS may set --stolon-balance-min and --stolon-balance-max, which win over the options.
        var cssMin = style ? parseFloat(style.getPropertyValue('--stolon-balance-min')) : NaN;
        var cssMax = style ? parseFloat(style.getPropertyValue('--stolon-balance-max')) : NaN;
        var min = cssMin > 0 ? cssMin : (opts.minWidth || 160);
        var max = cssMax > 0 ? cssMax : opts.maxColumns;
        var columns = width ? Math.floor((width + gap) / (min + gap)) : list.length;
        if (max) columns = Math.min(columns, max);
        if (opts.even || container.classList.contains('stolon-even')) {
            even(list, evenColumns(list.length, Math.max(1, columns)));
        } else {
            spread(list, columns);
        }
        if (opts.onLayout) opts.onLayout(container);
    }

    // Gives every full row one tile width, and stretches a shorter last row's tiles to fill it, on a grid whose columns
    // are the least common multiple of the two row sizes.
    function even(list: HTMLElement[], columns: number): void {
        var last = list.length % columns;
        var total = last ? columns * last / gcd(columns, last) : columns;
        container.style.setProperty('--stolon-balance-columns', String(total));
        var lastStart = last ? list.length - last : list.length;
        list.forEach(function (tile, i) { tile.style.setProperty('--stolon-balance-span', String(i < lastStart ? total / columns : total / last)); });
    }

    // Gives each row its share of a grid whose columns are the least common multiple of the row sizes.
    function spread(list: HTMLElement[], columns: number): void {
        var sizes = rowSizes(list.length, Math.max(1, columns));
        var total = sizes.reduce(function (acc, n) { return acc * n / gcd(acc, n); }, 1);
        container.style.setProperty('--stolon-balance-columns', String(total));
        var index = 0;
        sizes.forEach(function (size) {
            for (var i = 0; i < size; i++) list[index++].style.setProperty('--stolon-balance-span', String(total / size));
        });
    }

    function queue(): void {
        if (frame) return;
        frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(update) : (setTimeout(update, 16) as unknown as number);
    }

    if (typeof ResizeObserver !== 'undefined') {
        var resize = new ResizeObserver(queue);
        resize.observe(container);
        cleanups.push(function () { resize.disconnect(); });
    } else {
        cleanups.push(listen(window, 'resize', queue));
    }
    if (typeof MutationObserver !== 'undefined') {
        var mutation = new MutationObserver(queue);
        mutation.observe(container, { childList: true });
        cleanups.push(function () { mutation.disconnect(); });
    }
    update();

    return {
        update: update,
        destroy: function () {
            runAll(cleanups);
            if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
            container.classList.remove('stolon-balanced');
            container.style.removeProperty('--stolon-balance-columns');
        }
    };
}
