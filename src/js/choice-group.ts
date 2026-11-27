import { balanceRows } from './lib/balance.js';
import { h, clear } from './lib/dom.js';

/** One radio card a choice group builds: its value, its name, and one sentence on what it does. */
export interface ChoiceGroupChoice {
    value: string;
    name: string;
    text?: string;
}

/** What createChoiceGroup takes. choices builds the cards, named by name and label, with value checked. onChange hears the checked value after each change. */
export interface ChoiceGroupOptions {
    name?: string;
    label?: string;
    choices?: ChoiceGroupChoice[] | null;
    value?: string | null;
    onChange?(value: string | null): void;
}

/** What createChoiceGroup returns. element is the group, get reads the checked value, and set checks the matching input. */
export interface ChoiceGroupHandle {
    element: HTMLElement;
    get(): string | null;
    set(value: string): void;
    destroy(): void;
}

var groupCount = 0;

// Fills a group with one stolon-choice card per choice, as the markup in the docs draws it.
function buildChoices(groupEl: HTMLElement, options: ChoiceGroupOptions): void {
    var name = options.name || 'stolon-choice-' + (++groupCount);
    clear(groupEl);
    groupEl.classList.add('stolon-choice-group');
    groupEl.setAttribute('role', 'radiogroup');
    if (options.label) groupEl.setAttribute('aria-label', options.label);
    (options.choices || []).forEach(function (choice) {
        if (!choice) return;
        var input = h('input', { type: 'radio', name: name, value: choice.value });
        input.checked = options.value !== undefined && options.value !== null && choice.value === options.value;
        groupEl.appendChild(h('label', { class: 'stolon-choice' }, [
            input,
            h('span', { class: 'stolon-choice-name', text: choice.name }),
            choice.text ? h('span', { class: 'stolon-choice-text', text: choice.text }) : null
        ]));
    });
}

/**
 * Wires a group of stolon-choice radio cards, keeping the stolon-selected class in step with the checked input for browsers without :has(). It reports each change to onChange.
 * With choices it builds the cards, into the group element or into a new one when the group element is null.
 *
 * @param groupEl element with the stolon-choice-group class, or null to build one from choices
 * @param options {
 *   name     : the radios' name attribute, when built from choices (default a page unique name) [optional]
 *   label    : the group's accessible name, when built from choices [optional]
 *   choices  : array of { value, name, text } that builds one card each, replacing the group's markup [optional]
 *   value    : the value checked at first, when built from choices [optional]
 *   onChange : function(value) called after each change [optional]
 * }
 * @returns { element, get, set, destroy }.
 */
export function createChoiceGroup(groupEl: HTMLElement | null, options?: ChoiceGroupOptions): ChoiceGroupHandle {
    options = options || {};
    if (!groupEl && options.choices) groupEl = h('div', { class: 'stolon-choice-group' });
    if (!groupEl) throw new Error('createChoiceGroup needs a group element');
    var group: HTMLElement = groupEl;
    if (options.choices) buildChoices(group, options);

    function reflect(): void {
        group.querySelectorAll('.stolon-choice').forEach(function (choice) {
            var input = choice.querySelector<HTMLInputElement>('input');
            choice.classList.toggle('stolon-selected', !!(input && input.checked));
        });
    }

    function onChange(): void {
        reflect();
        if (options!.onChange) options!.onChange(get());
    }

    function get(): string | null {
        var checked = group.querySelector<HTMLInputElement>('input:checked');
        return checked ? checked.value : null;
    }

    group.addEventListener('change', onChange);
    reflect();
    var balance = balanceRows(group, { minWidth: 200, maxColumns: 3 });

    return {
        element: group,
        get: get,
        set: function (value: string): void {
            group.querySelectorAll<HTMLInputElement>('input').forEach(function (input) { input.checked = input.value === value; });
            reflect();
        },
        destroy: function (): void { group.removeEventListener('change', onChange); balance.destroy(); }
    };
}
