import { make, icon, toText, listen, runAll } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import { balanceRows } from './lib/balance.js';
import { createSparkline } from './sparkline.js';
import { createStatusDot } from './status-dot.js';
import { applyColor } from './lib/color.js';
import type { SparklineHandle } from './sparkline.js';
import type { ComponentHandle } from './types.js';

/** What createStatusCard takes. onClick makes the card a button, and href makes it a link. */
export interface StatusCardOptions {
    icon?: string;
    title?: string;
    status?: string;
    statusColor?: string;
    detail?: string;
    value?: unknown;
    valueLabel?: string;
    sparkline?: Array<number | null | undefined> | null;
    sparklineColor?: string;
    dots?: StatusCardDot[] | null;
    segments?: StatusCardSegment[] | null;
    href?: string;
    onClick?(event: MouseEvent): void;
}

/** One dot in a status card's row of dots, such as one server and its health. */
export interface StatusCardDot {
    color?: string;
    label?: string;
}

/** One part of a status card's bar, such as the rows in one state. */
export interface StatusCardSegment {
    label?: string;
    value: number;
    color?: string;
}

/** What createStatusCard returns. getValue returns the value as given. */
export interface StatusCardHandle extends ComponentHandle {
    getValue(): unknown;
    setValue(value: unknown, label?: string): void;
    setStatus(label: string, color?: string): void;
    setDetail(text: string): void;
    setSparkline(values: Array<number | null | undefined> | null): void;
    setDots(dots: StatusCardDot[] | null): void;
    setSegments(segments: StatusCardSegment[] | null): void;
    destroy(): void;
}

/** What createStatusCardGrid takes. minWidth is the least width a card takes before the row wraps. */
export interface StatusCardGridOptions {
    cards?: StatusCardOptions[];
    minWidth?: number;
    maxColumns?: number;
}

/** What createStatusCardGrid returns. */
export interface StatusCardGridHandle extends ComponentHandle {
    getCards(): StatusCardHandle[];
    setCards(next: StatusCardOptions[]): StatusCardHandle[];
    add(card: StatusCardOptions): StatusCardHandle;
    destroy(): void;
}

// Shows one line of text, titled with its full text for when it is cut, and hides it while empty.
function setLine(el: HTMLElement, text: string): void {
    el.textContent = text;
    if (text) el.title = text;
    else el.removeAttribute('title');
    el.hidden = !text;
}

/**
 * A bordered card on the surface color with an icon, a status pill, a bold title, and one quiet line of detail. An optional large value shows a metric, and an href or onClick makes the whole card a link or a button.
 *
 * @param options {
 *   icon        : Material icon name at the top left [optional]
 *   title       : bold name under the icon, cut with an ellipsis [optional]
 *   status      : short pill text at the top right, such as 'Ok' or 'Failed', which never wraps [optional]
 *   statusColor : status color name, hex code, or badge state name of the pill (default the color of a badge state named by status, else gray)
 *   detail      : one dimmed line under the title, such as '3 of 7 peers online', cut with an ellipsis and titled with its full text [optional]
 *   value       : number or short text shown large under the title, such as 1204 [optional]
 *   valueLabel  : small text after the value, such as 'items' [optional]
 *   sparkline   : numbers drawn as a small line under the value, through createSparkline, named by the title [optional]
 *   sparklineColor : status color name or hex code of the line (default the accent)
 *   dots        : array of { color, label }, a row of status dots in the sparkline's place, such as one per server, each named by its label [optional]
 *   segments    : array of { label, value, color }, a bar in the sparkline's place split into parts by value, such as rows by state. A bar whose values add to 0 is an empty track [optional]
 *   href        : address the card links to, which makes the card a link [optional]
 *   onClick     : function(event) called on a click, which makes the card a button when there is no href [optional]
 * }
 * @returns { element, getValue, setValue, setStatus, setDetail, setSparkline, setDots, setSegments, destroy }. setValue(value, label) replaces the value and, when given, its label. setStatus(label, color) replaces the pill.
 * The icon is hidden from assistive tech, so a linked card is named by its title, status, value, and detail.
 */
export function createStatusCard(options?: StatusCardOptions): StatusCardHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];
    var tag: 'a' | 'button' | 'div' = options.href ? 'a' : (options.onClick ? 'button' : 'div');
    var attrs = tag === 'a' ? { href: options.href } : (tag === 'button' ? { type: 'button' } : null);
    var root = make(tag, 'stolon-status-card' + (tag === 'div' ? '' : ' stolon-clickable'), attrs) as HTMLElement;
    var head = make('span', 'stolon-status-card-head');
    var iconEl = icon(options.icon || '');
    iconEl.classList.add('stolon-status-card-icon');
    iconEl.hidden = !options.icon;
    var pill: HTMLElement | null = null;
    var titleEl = make('span', 'stolon-status-card-title');
    var valueRow = make('span', 'stolon-status-card-value');
    var numberEl = make('span', 'stolon-status-card-number');
    var unitEl = make('span', 'stolon-status-card-unit');
    var detailEl = make('span', 'stolon-status-card-detail');
    var value: unknown = options.value;
    var spark: SparklineHandle | null = null;
    // The row of dots or the bar, which takes the sparkline's place.
    var extra: HTMLElement | null = null;

    head.appendChild(iconEl);
    valueRow.appendChild(numberEl);
    valueRow.appendChild(unitEl);
    root.appendChild(head);
    root.appendChild(titleEl);
    root.appendChild(valueRow);
    root.appendChild(detailEl);

    function setStatus(label: string, color?: string): void {
        if (pill && pill.parentNode) pill.parentNode.removeChild(pill);
        pill = null;
        var text = toText(label);
        if (!text) return;
        pill = makeBadge(text, badgeColor(color) || badgeColor(text, 'gray'), null, 'stolon-status-card-pill');
        head.appendChild(pill);
    }

    function setValue(next: unknown, label?: string): void {
        value = next;
        var text = toText(next);
        numberEl.textContent = text;
        if (label !== undefined) unitEl.textContent = toText(label);
        unitEl.hidden = !unitEl.textContent;
        valueRow.hidden = !text;
    }

    function setSparkline(values: Array<number | null | undefined> | null): void {
        if (spark) { spark.destroy(); spark = null; }
        if (!values || !values.length) return;
        spark = createSparkline({ values: values, color: options!.sparklineColor, label: toText(options!.title) || undefined });
        spark.element.classList.add('stolon-status-card-sparkline');
        root.insertBefore(spark.element, detailEl);
    }

    function setExtra(next: HTMLElement | null): void {
        if (extra && extra.parentNode) extra.parentNode.removeChild(extra);
        extra = next;
        if (extra) root.insertBefore(extra, detailEl);
    }

    // A row of status dots, each named by its label for a screen reader and on hover.
    function setDots(dots: StatusCardDot[] | null): void {
        if (!dots || !dots.length) { setExtra(null); return; }
        var row = make('span', 'stolon-status-card-dots');
        dots.forEach(function (dot: StatusCardDot): void { row.appendChild(createStatusDot({ color: dot.color, label: dot.label }).element); });
        setExtra(row);
    }

    // A bar split into parts by value, named as a whole by each part's label and value.
    function setSegments(segments: StatusCardSegment[] | null): void {
        if (!segments) { setExtra(null); return; }
        var total = segments.reduce(function (sum: number, part: StatusCardSegment): number { return sum + Math.max(0, Number(part.value) || 0); }, 0);
        var names = segments.map(function (part: StatusCardSegment): string { return toText(part.label) + ' ' + (Number(part.value) || 0); }).join(', ');
        var slot = make('span', 'stolon-status-card-meter', { role: 'img', 'aria-label': names, title: names });
        var bar = make('span', 'stolon-progress stolon-status-card-bar');
        if (total > 0) {
            segments.forEach(function (part: StatusCardSegment): void {
                var value = Math.max(0, Number(part.value) || 0);
                if (!value) return;
                var fill = make('span', 'stolon-progress-bar stolon-status-card-bar-part');
                applyColor(fill, part.color, 'blue');
                fill.style.setProperty('--stolon-status-share', (value / total * 100).toFixed(3) + '%');
                bar.appendChild(fill);
            });
        }
        slot.appendChild(bar);
        setExtra(slot);
    }

    setLine(titleEl, toText(options.title));
    setStatus(options.status || '', options.statusColor);
    setValue(options.value, options.valueLabel || '');
    setLine(detailEl, toText(options.detail));
    setSparkline(options.sparkline || null);
    if (options.dots) setDots(options.dots);
    else if (options.segments) setSegments(options.segments);
    if (options.onClick) cleanups.push(listen(root, 'click', options.onClick));

    return {
        element: root,
        getValue: function (): unknown { return value; },
        setValue: setValue,
        setStatus: setStatus,
        setDetail: function (text: string): void { setLine(detailEl, toText(text)); },
        setSparkline: setSparkline,
        setDots: setDots,
        setSegments: setSegments,
        destroy: function (): void {
            runAll(cleanups);
            if (spark) spark.destroy();
            if (root.parentNode) root.parentNode.removeChild(root);
        }
    };
}

/**
 * A grid of status cards in balanced rows, so a wrapped row never holds a single card. Every card in a row is the same height.
 *
 * @param options {
 *   cards      : array of status card options, one card each [optional]
 *   minWidth   : least width of a card in pixels before the row wraps (default 200)
 *   maxColumns : most cards in a row [optional]
 * }
 * @returns { element, getCards, setCards, add, destroy }. setCards replaces every card and returns their handles, and add appends one card and returns its handle.
 */
export function createStatusCardGrid(options?: StatusCardGridOptions): StatusCardGridHandle {
    options = options || {};
    var root = make('div', 'stolon-status-cards');
    var cards: StatusCardHandle[] = [];
    var balance = balanceRows(root, { minWidth: options.minWidth || 200, maxColumns: options.maxColumns });

    function add(card: StatusCardOptions): StatusCardHandle {
        var handle = createStatusCard(card);
        cards.push(handle);
        root.appendChild(handle.element);
        balance.update();
        return handle;
    }

    function setCards(next: StatusCardOptions[]): StatusCardHandle[] {
        cards.splice(0).forEach(function (card: StatusCardHandle): void { card.destroy(); });
        (next || []).forEach(function (card: StatusCardOptions): void {
            var handle = createStatusCard(card);
            cards.push(handle);
            root.appendChild(handle.element);
        });
        balance.update();
        return cards.slice();
    }

    setCards(options.cards || []);

    return {
        element: root,
        getCards: function (): StatusCardHandle[] { return cards.slice(); },
        setCards: setCards,
        add: add,
        destroy: function (): void {
            balance.destroy();
            cards.splice(0).forEach(function (card: StatusCardHandle): void { card.destroy(); });
        }
    };
}
