import { h, icon, listen, runAll } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { stolonText } from './lib/stolon-text.js';
import type { ComponentHandle } from './types.js';

/** What createResetRow takes. destructive marks a row that loses data, and empty one with nothing to reset. */
export interface ResetRowOptions {
    icon: string;
    label: string;
    help?: string;
    button?: string | HTMLButtonElement;
    action?: string;
    destructive?: boolean;
    empty?: boolean;
    onClick?(button: HTMLButtonElement): void;
}

/** What createResetRow returns. setEmpty grays the tile while there is nothing to reset, and getValue reads whether it is gray. */
export interface ResetRowHandle extends ComponentHandle {
    element: HTMLDivElement;
    button: HTMLButtonElement;
    getValue(): boolean;
    setEmpty(empty: boolean): void;
    destroy(): void;
}

/** What createResetGroup returns. destroy stops every row's listener. */
export interface ResetGroupHandle extends ComponentHandle {
    element: HTMLDivElement;
    rows: ResetRowHandle[];
    destroy(): void;
}

/**
 * Builds one stolon-reset-row: an icon tile, what the row does, one sentence on what follows, and its button. The tile
 * takes the accent, red for a destructive row, and gray while the row is empty.
 *
 * @param options {
 *   icon        : the Material icon in the tile, which names the action
 *   label       : what the row does
 *   help        : one sentence on what follows [optional]
 *   button      : the button's label, or a button already built (default 'Reset') [optional]
 *   action      : the button's data-action, for a page that handles every row's click in one place [optional]
 *   destructive : true for a row that loses data, with a destructive button and a red tile (default false)
 *   empty       : true while there is nothing to reset, which grays the tile (default false)
 *   onClick     : function(button) called when the button is pressed [optional]
 * }
 * @returns { element, button, getValue, setEmpty, destroy }. getValue is whether the row is empty.
 */
export function createResetRow(options: ResetRowOptions): ResetRowHandle {
    var o = options || ({} as ResetRowOptions);
    var cleanups: Array<() => void> = [];
    var empty = !!o.empty;
    var button = o.button && typeof o.button === 'object'
        ? o.button
        : h('button', {
            is: 'emby-button',
            type: 'button',
            class: 'raised stolon-button stolon-small ' + (o.destructive ? 'stolon-destructive' : 'stolon-secondary'),
            'data-action': o.action
        }, [h('span', { text: typeof o.button === 'string' && o.button ? o.button : stolonText('Reset') })]);
    if (o.action && !button.getAttribute('data-action')) button.setAttribute('data-action', o.action);
    var tile = h('span', { class: 'stolon-collapsible-tile', 'aria-hidden': 'true' }, [icon(o.icon || '')]);
    var info = h('div', { class: 'stolon-reset-info' }, [
        h('div', { text: o.label || '' }),
        o.help ? h('div', { class: 'fieldDescription', text: o.help }) : null
    ]);
    var root = h('div', { class: 'stolon-reset-row' }, [tile, info, button]);

    function paint(): void {
        applyColor(tile, empty ? 'gray' : o.destructive ? 'red' : null);
    }

    if (o.onClick) {
        var run = o.onClick;
        cleanups.push(listen(button, 'click', function () { run(button); }));
    }
    paint();

    return {
        element: root,
        button: button,
        getValue: function (): boolean { return empty; },
        setEmpty: function (next: boolean): void { empty = !!next; paint(); },
        destroy: function (): void { runAll(cleanups); }
    };
}

/**
 * Builds a stolon-reset-group holding reset rows, in order.
 *
 * @param rows the rows, as createResetRow options or handles
 * @returns { element, rows, destroy }. rows are the row handles, in order.
 */
export function createResetGroup(rows: Array<ResetRowOptions | ResetRowHandle>): ResetGroupHandle {
    var handles = (rows || []).filter(Boolean).map(function (row) {
        return (row as ResetRowHandle).element ? row as ResetRowHandle : createResetRow(row as ResetRowOptions);
    });
    var root = h('div', { class: 'stolon-reset-group' }, handles.map(function (row) { return row.element; }));
    return {
        element: root,
        rows: handles,
        destroy: function (): void { handles.forEach(function (row) { row.destroy(); }); }
    };
}
