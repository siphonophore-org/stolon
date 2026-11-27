import { make, nextId } from './lib/dom.js';
import { bindValidation, hasRules } from './lib/validate.js';
import type { ValidationHandle } from './lib/validate.js';
import { bindSecretField, readSecretField } from './secret-field.js';
import { stolonText } from './lib/stolon-text.js';
import type { ComponentHandle } from './types.js';
import type { WebSelectOption } from './web-client-markup.js';

/** What every form field builder takes. field is written as data-field, and validate adds a rule of the caller's own to the validation core. */
export interface FormFieldOptions {
    label: string;
    help?: string;
    id?: string;
    field?: string;
    required?: boolean;
    disabled?: boolean;
    validate?(value: string, input: Element): string | null | undefined;
}

/** What createInputField takes. */
export interface InputFieldOptions extends FormFieldOptions {
    type?: string;
    value?: string | number | null;
    placeholder?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    maxLength?: number;
    pattern?: string;
    autocomplete?: string;
}

/** What createSecretField takes. stored says a secret is saved, and clearText names the button that clears it. */
export interface SecretFieldBuildOptions extends FormFieldOptions {
    stored?: boolean;
    clearText?: string;
    keptText?: string;
    allowExpose?: boolean;
}

/** What createTextareaField takes. A value given as an array is written one item per line. */
export interface TextareaFieldOptions extends FormFieldOptions {
    value?: string | string[] | null;
    rows?: number;
    placeholder?: string;
    maxLength?: number;
}

/** What createSelectField takes. */
export interface SelectFieldOptions extends FormFieldOptions {
    options?: WebSelectOption[];
    value?: string | number | null;
}

/** What createCheckboxField takes. */
export interface CheckboxFieldOptions {
    label: string;
    help?: string;
    id?: string;
    field?: string;
    checked?: boolean;
    disabled?: boolean;
}

/** What a form field builder returns. element is the field's container, input its control, and help the description under it. */
export interface FormFieldHandle<V, I extends HTMLElement = HTMLElement> extends ComponentHandle {
    input: I;
    help: HTMLElement | null;
    getValue(): V;
    setValue(value: V): void;
    destroy(): void;
}

/** What createSelectField returns. setOptions fills the select again, keeping the value when it is still offered. */
export interface SelectFieldHandle extends FormFieldHandle<string, HTMLSelectElement> {
    setOptions(options: WebSelectOption[], value?: string | number | null): void;
}

/** What createSecretField returns. clear is the button that clears the stored secret, and setStored says again whether one is saved, such as after a load. getValue gives what to post, SECRET_KEPT for a secret left as it was. */
export interface SecretFieldHandle extends FormFieldHandle<string, HTMLInputElement> {
    clear: HTMLButtonElement;
    setStored(stored: boolean): void;
}

function description(text: string | undefined, className: string): HTMLElement | null {
    return text ? make('div', className, null, text) : null;
}

function setAttributes(el: Element, list: Record<string, unknown>): void {
    Object.keys(list).forEach(function (name) {
        var value = list[name];
        if (value === undefined || value === null || value === false || value === '') return;
        el.setAttribute(name, value === true ? '' : String(value));
    });
}

// Binds the validation core when the field has a rule, so an invalid value shows its message and stops a save.
function validation(input: HTMLElement, opts: FormFieldOptions): ValidationHandle | null {
    if (!opts.validate && !hasRules(input)) return null;
    return bindValidation(input, opts.validate ? { validate: opts.validate } : null);
}

// The web client upgrades an element whose is attribute it finds once the element is in the page. It is set as an attribute, since
// document.createElement(tag, { is }) upgrades at once, before emby-input has the parent it writes its label into.
function control<K extends 'input' | 'select' | 'textarea'>(tag: K, is: string, id: string, opts: FormFieldOptions, className?: string): HTMLElementTagNameMap[K] {
    var el = make(tag, className || null);
    setAttributes(el, { is: is, id: id, 'data-field': opts.field, required: !!opts.required, disabled: !!opts.disabled });
    return el;
}

function finish<V, I extends HTMLElement>(element: HTMLElement, input: I, help: HTMLElement | null, check: ValidationHandle | null, getValue: () => V, setValue: (value: V) => void): FormFieldHandle<V, I> {
    return {
        element: element,
        input: input,
        help: help,
        getValue: getValue,
        setValue: setValue,
        destroy: function () { if (check) check.destroy(); }
    };
}

/**
 * A text, number, or other input in the web client's own inputContainer, with its label above and its description under it.
 * The input carries is="emby-input", so the web client upgrades it once it is in the page, and Stolon's form fields style it.
 *
 * @param options {
 *   label        : the label over the input
 *   help         : the description under it [optional]
 *   id           : the input's id (default a new one)
 *   field        : written as data-field, for a page that reads its fields by name [optional]
 *   type         : the input type (default 'text')
 *   value        : the value to start with [optional]
 *   placeholder  : a valid example value [optional]
 *   min          : the least number [optional]
 *   max          : the greatest number [optional]
 *   step         : the number step [optional]
 *   maxLength    : the most characters [optional]
 *   pattern      : a pattern the value must match [optional]
 *   autocomplete : the autocomplete hint (default 'new-password' for a password) [optional]
 *   required     : true when it must have a value (default false)
 *   disabled     : true when it cannot change (default false)
 *   validate     : function(value, input) that gives a message for an invalid value [optional]
 * }
 * @returns { element, input, help, getValue, setValue, destroy }
 */
export function createInputField(options: InputFieldOptions): FormFieldHandle<string, HTMLInputElement> {
    var opts = options || ({} as InputFieldOptions);
    var id = opts.id || nextId('input');
    var type = opts.type || 'text';
    var input = control('input', 'emby-input', id, opts);
    setAttributes(input, {
        type: type,
        placeholder: opts.placeholder,
        min: opts.min, max: opts.max, step: opts.step,
        maxlength: opts.maxLength, pattern: opts.pattern,
        autocomplete: opts.autocomplete || (type === 'password' ? 'new-password' : null)
    });
    if (opts.value !== undefined && opts.value !== null) input.value = String(opts.value);
    var element = make('div', 'inputContainer');
    element.appendChild(make('label', 'inputLabel inputLabelUnfocused', { for: id }, opts.label));
    element.appendChild(input);
    var help = description(opts.help, 'fieldDescription');
    if (help) element.appendChild(help);
    return finish(element, input, help, validation(input, opts),
        function () { return input.value; },
        function (value) { input.value = value === undefined || value === null ? '' : String(value); });
}

/**
 * A password input for a stored secret, built as an input field with a button after it that clears the stored value. It is bound
 * with bindSecretField, so the secret never reaches the page, and getValue gives what to post through readSecretField.
 *
 * @param options {
 *   label       : the label over the input
 *   help        : the description under it [optional]
 *   id          : the input's id (default a new one)
 *   field       : written as data-field [optional]
 *   stored      : true when a secret is saved (default false)
 *   clearText   : the clear button's label (default 'Clear')
 *   keptText    : the input's title while a secret is saved (default 'Saved, leave blank to keep')
 *   allowExpose : true adds an eye inside the box that shows what was typed (default false)
 *   required    : true when it must have a value (default false)
 *   disabled    : true when it cannot change (default false)
 *   validate    : function(value, input) that gives a message for an invalid value [optional]
 * }
 * @returns { element, input, help, clear, getValue, setValue, setStored, destroy }
 */
export function createSecretField(options: SecretFieldBuildOptions): SecretFieldHandle {
    var opts = options || ({} as SecretFieldBuildOptions);
    var made = createInputField({ label: opts.label, help: opts.help, id: opts.id, field: opts.field, type: 'password', required: opts.required, disabled: opts.disabled, validate: opts.validate });
    var clear = make('button', 'raised stolon-button stolon-secondary stolon-small stolon-hidden', { type: 'button', is: 'emby-button' }, opts.clearText || stolonText('Stolon.Clear'));
    made.element.insertBefore(clear, made.help);
    function setStored(stored: boolean): void {
        bindSecretField(made.input, !!stored, { clearButton: clear, allowExpose: !!opts.allowExpose, placeholder: opts.keptText });
    }
    setStored(!!opts.stored);
    return {
        element: made.element,
        input: made.input,
        help: made.help,
        clear: clear,
        getValue: function () { return readSecretField(made.input); },
        setValue: made.setValue,
        setStored: setStored,
        destroy: made.destroy
    };
}

/**
 * A text area in the web client's own inputContainer, with its label above and its description under it. It is written as the
 * web client leaves an upgraded emby-textarea, so it keeps its rows and no second label is added. readLines reads it back as lines.
 *
 * @param options {
 *   label       : the label over the text area
 *   help        : the description under it [optional]
 *   id          : the text area's id (default a new one)
 *   field       : written as data-field [optional]
 *   value       : the text, or an array written one item per line [optional]
 *   rows        : its height in lines (default 4)
 *   placeholder : a valid example value [optional]
 *   maxLength   : the most characters [optional]
 *   required    : true when it must have a value (default false)
 *   disabled    : true when it cannot change (default false)
 *   validate    : function(value, input) that gives a message for an invalid value [optional]
 * }
 * @returns { element, input, help, getValue, setValue, destroy }
 */
export function createTextareaField(options: TextareaFieldOptions): FormFieldHandle<string, HTMLTextAreaElement> {
    var opts = options || ({} as TextareaFieldOptions);
    var id = opts.id || nextId('textarea');
    var input = control('textarea', 'emby-textarea', id, opts, 'emby-textarea');
    setAttributes(input, { rows: opts.rows || 4, placeholder: opts.placeholder, maxlength: opts.maxLength });
    function setValue(value: string | string[] | null | undefined): void {
        input.value = Array.isArray(value) ? value.join('\n') : value === undefined || value === null ? '' : String(value);
    }
    setValue(opts.value);
    var element = make('div', 'inputContainer');
    element.appendChild(make('label', 'textareaLabel textareaLabelUnfocused', { for: id }, opts.label));
    element.appendChild(input);
    var help = description(opts.help, 'fieldDescription');
    if (help) element.appendChild(help);
    return finish(element, input, help, validation(input, opts), function () { return input.value; }, setValue);
}

/**
 * A select in the web client's own selectContainer, with its label above, the arrow container, and its description under it.
 * It is written as the web client leaves an upgraded emby-select, so the upgrade adds no second label or arrow.
 *
 * @param options {
 *   label    : the label over the select
 *   help     : the description under it [optional]
 *   id       : the select's id (default a new one)
 *   field    : written as data-field [optional]
 *   options  : array of { value, text } [optional]
 *   value    : the value chosen at first [optional]
 *   required : true when it must have a value (default false)
 *   disabled : true when it cannot change (default false)
 *   validate : function(value, input) that gives a message for an invalid value [optional]
 * }
 * @returns { element, input, help, getValue, setValue, setOptions, destroy }
 */
export function createSelectField(options: SelectFieldOptions): SelectFieldHandle {
    var opts = options || ({} as SelectFieldOptions);
    var id = opts.id || nextId('select');
    var input = control('select', 'emby-select', id, opts, 'emby-select emby-select-withcolor');
    function setOptions(list: WebSelectOption[], value?: string | number | null): void {
        var keep = value === undefined || value === null ? input.value : String(value);
        input.textContent = '';
        (list || []).forEach(function (o) { input.appendChild(make('option', null, { value: o.value }, o.text)); });
        if (keep && (list || []).some(function (o) { return String(o.value) === keep; })) input.value = keep;
    }
    setOptions(opts.options || [], opts.value);
    var element = make('div', 'selectContainer');
    element.appendChild(make('label', 'selectLabel', { for: id }, opts.label));
    element.appendChild(input);
    var arrow = make('div', 'selectArrowContainer');
    arrow.appendChild(make('span', 'selectArrow material-icons keyboard_arrow_down', { 'aria-hidden': 'true' }));
    element.appendChild(arrow);
    var help = description(opts.help, 'fieldDescription');
    if (help) element.appendChild(help);
    var handle = finish(element, input, help, validation(input, opts),
        function () { return input.value; },
        function (value) { input.value = value === undefined || value === null ? '' : String(value); }) as SelectFieldHandle;
    handle.setOptions = setOptions;
    return handle;
}

/**
 * A checkbox in the web client's own checkboxContainer, with its label beside it and its description under it. The input carries
 * is="emby-checkbox", so the web client upgrades it and draws its box once it is in the page.
 *
 * @param options {
 *   label    : the text beside the box
 *   help     : the description under it [optional]
 *   id       : the input's id (default a new one)
 *   field    : written as data-field [optional]
 *   checked  : true when it starts on (default false)
 *   disabled : true when it cannot change (default false)
 * }
 * @returns { element, input, help, getValue, setValue, destroy }
 */
export function createCheckboxField(options: CheckboxFieldOptions): FormFieldHandle<boolean, HTMLInputElement> {
    var opts = options || ({} as CheckboxFieldOptions);
    var input = make('input', null);
    setAttributes(input, { type: 'checkbox', is: 'emby-checkbox', id: opts.id || nextId('check'), 'data-field': opts.field, disabled: !!opts.disabled });
    input.checked = !!opts.checked;
    var label = make('label', 'emby-checkbox-label');
    label.appendChild(input);
    label.appendChild(make('span', 'checkboxLabel', null, opts.label));
    var element = make('div', 'checkboxContainer' + (opts.help ? ' checkboxContainer-withDescription' : ''));
    element.appendChild(label);
    var help = description(opts.help, 'fieldDescription checkboxFieldDescription');
    if (help) element.appendChild(help);
    return finish(element, input, help, null, function () { return input.checked; }, function (value) { input.checked = !!value; });
}

/**
 * Reads a number from a field, or null when it is blank or not a number.
 *
 * @param input the field, or anything with a value
 */
export function readNumber(input: { value: string } | null | undefined): number | null {
    var raw = String(input && input.value || '').trim();
    if (raw === '') return null;
    var n = Number(raw);
    return isFinite(n) ? n : null;
}

/**
 * Reads a text area as its lines, each trimmed, with the blank ones left out.
 *
 * @param input the text area, or anything with a value
 */
export function readLines(input: { value: string } | null | undefined): string[] {
    return String(input && input.value || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(function (line) { return !!line; });
}
