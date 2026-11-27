import { make, listen, runAll } from './lib/dom.js';
import { setStatus } from './status-text.js';
import { validateAll } from './lib/validate.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** The states a save bar shows above its button. '' shows nothing. */
export type SaveBarState = '' | 'pending' | 'saving' | 'saved' | 'failed';

/** What createSaveBar takes. onSave runs on Save, and a promise it returns decides saved or failed, where an Error it rejects with gives the failed line its message. form is checked first, and an invalid field stops the save. */
export interface SaveBarOptions {
    form?: ParentNode | null;
    invalidText?: string;
    saveText?: string;
    pendingText?: string;
    savingText?: string;
    savedText?: string;
    failedText?: string;
    savedMs?: number;
    fill?: boolean;
    state?: SaveBarState;
    onSave?(): unknown;
}

/** What createSaveBar returns. setDirty shows or clears the pending line, and setState shows any state. */
export interface SaveBarHandle extends ComponentHandle {
    button: HTMLButtonElement;
    status: HTMLElement;
    getState(): SaveBarState;
    setState(state: SaveBarState, text?: string): void;
    setDirty(dirty: boolean): void;
    save(): Promise<boolean>;
    destroy(): void;
}

// The message a failed save carries: an Error's message, or text. Anything else falls back to the failed line.
function reasonText(reason: unknown): string | undefined {
    var text = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
    text = String(text || '').trim();
    return text || undefined;
}

/**
 * A Save button with a status line above it, built on the status line every message uses. The line says the page has
 * unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and
 * color. Save runs onSave, shows Saving while a promise it returns is pending, then Changes Saved or Could Not Save.
 * When onSave throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason.
 * The saved line fades after savedMs, and a failure stays until the next change or save. With form, Save first checks
 * every field in it through the validation core, and refuses to save while one is invalid.
 *
 * @param options {
 *   form        : the form, section, or page whose fields Save checks first [optional]
 *   invalidText : the failed line while a field is invalid (default 'Fix the fields marked in red.')
 *   saveText    : the button's label (default 'Save')
 *   pendingText : the line while changes are unsaved (default 'Unsaved changes.')
 *   savingText  : the line while saving (default 'Saving…')
 *   savedText   : the line after a save (default 'Changes saved.')
 *   failedText  : the line after a failed save, when onSave gives no message of its own (default 'Could not save.')
 *   savedMs     : how long the saved line stays (default 4000)
 *   fill        : true makes the button span the width (default false)
 *   state       : the state to start in [optional]
 *   onSave      : function() run on Save, which may return a promise [optional]
 * }
 * @returns { element, button, status, getState, setState, setDirty, save, destroy }
 */
export function createSaveBar(options?: SaveBarOptions): SaveBarHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var state: SaveBarState = '';
    var timer: ReturnType<typeof setTimeout> | null = null;

    var root = make('div', 'stolon-save-bar');
    var status = make('div', 'stolon-status-text stolon-save-status');
    var button = make('button', 'raised stolon-button stolon-primary stolon-save-button' + (opts.fill ? ' stolon-fill' : ''), { type: 'button' }, opts.saveText || stolonText('Save'));
    root.appendChild(status);
    root.appendChild(button);

    var TEXT: Record<string, string> = {
        pending: opts.pendingText || stolonText('Stolon.UnsavedChangesMessage'),
        saving: opts.savingText || stolonText('Stolon.Saving'),
        saved: opts.savedText || stolonText('Stolon.ChangesSaved'),
        failed: opts.failedText || stolonText('Stolon.CouldNotSave')
    };
    var LOOK: Record<string, 'warn' | 'info' | 'success' | 'error'> = { pending: 'warn', saving: 'info', saved: 'success', failed: 'error' };

    function setState(next: SaveBarState, text?: string): void {
        if (timer) { clearTimeout(timer); timer = null; }
        state = next;
        root.setAttribute('data-state', next);
        button.disabled = next === 'saving';
        if (!next) { setStatus(root, status, '', false); return; }
        setStatus(root, status, text || TEXT[next], next === 'failed', { timeout: 0, state: LOOK[next] });
        // The saved line fades on its own, and every other state stays until something changes.
        if (next === 'saved') {
            timer = setTimeout(function () { if (state === 'saved') setState(''); }, opts.savedMs === undefined ? 4000 : opts.savedMs);
        }
    }

    function save(): Promise<boolean> {
        if (opts.form && !validateAll(opts.form)) {
            setState('failed', opts.invalidText || stolonText('Stolon.FixFields'));
            return Promise.resolve(false);
        }
        setState('saving');
        return Promise.resolve().then(function () { return opts.onSave ? opts.onSave() : undefined; }).then(function () {
            setState('saved');
            return true;
        }, function (reason: unknown) {
            setState('failed', reasonText(reason));
            return false;
        });
    }

    cleanups.push(listen(button, 'click', function () { save(); }));
    if (opts.state) setState(opts.state);

    return {
        element: root,
        button: button,
        status: status,
        getState: function () { return state; },
        setState: setState,
        setDirty: function (dirty) {
            if (dirty) setState('pending');
            else if (state === 'pending' || state === 'failed') setState('');
        },
        save: save,
        destroy: function () { if (timer) clearTimeout(timer); runAll(cleanups); }
    };
}

/** What a section of createSaveBars takes, beside a Save Bar's own options. tracker decides whether the section is unsaved, in place of any edit. ignore names the controls whose edits change only what shows. */
export interface SaveBarsSectionOptions extends SaveBarOptions {
    tracker?: { isDirty(): boolean; markClean(): void } | null;
    ignore?: string;
}

/** What createSaveBars returns. add ends a section with its Save Bar, markDirty marks one unsaved from code, clean clears every one, and isDirty says whether any is unsaved. */
export interface SaveBarsHandle {
    add(content: HTMLElement | null, options?: SaveBarsSectionOptions): SaveBarHandle | null;
    markDirty(bar: SaveBarHandle): void;
    clean(): void;
    isDirty(): boolean;
    destroy(): void;
}

interface SaveBarsEntry {
    bar: SaveBarHandle;
    dirty: boolean;
    tracker: { isDirty(): boolean; markClean(): void } | null;
    off: () => void;
}

/**
 * Ends each section of one page with its own Save Bar, each saving on its own, and asks before the page is left while any is
 * unsaved. An edit inside a section marks its bar unsaved, except in the bar itself and in a table's search and filters, which
 * change only what shows. A save that lands clears the bar, and a save that resolves with text shows that text as the saved line.
 *
 * @param page the page handle from createConfigPage, whose guardUnsaved asks while any section is unsaved [optional]
 * @returns { add(content, options), markDirty(bar), clean(), isDirty(), destroy() }. add takes a Save Bar's options, with form
 * (default the section), fill (default true), tracker, a createChangeTracker tracker that decides when the section is unsaved,
 * and ignore, a selector of controls whose edits leave it saved (default '.stolon-table-controls'). clean is for after the page loads its values.
 */
export function createSaveBars(page?: { guardUnsaved(dirty: () => boolean): void } | null): SaveBarsHandle {
    var entries: SaveBarsEntry[] = [];

    function entryOf(bar: SaveBarHandle): SaveBarsEntry | null {
        for (var i = 0; i < entries.length; i++) if (entries[i].bar === bar) return entries[i];
        return null;
    }

    function setDirty(entry: SaveBarsEntry, dirty: boolean): void {
        entry.dirty = dirty;
        entry.bar.setDirty(dirty);
    }

    function isDirty(): boolean {
        return entries.some(function (entry) { return entry.dirty; });
    }

    if (page) page.guardUnsaved(isDirty);

    return {
        add: function (content, options) {
            if (!content) return null;
            var opts = options || {};
            var entry: SaveBarsEntry;
            var bar = createSaveBar(Object.assign({}, opts, {
                form: opts.form === undefined ? content : opts.form,
                fill: opts.fill === undefined ? true : opts.fill,
                onSave: function () {
                    return Promise.resolve().then(function () { return opts.onSave ? opts.onSave() : undefined; }).then(function (line: unknown) {
                        if (entry.tracker) entry.tracker.markClean();
                        entry.dirty = false;
                        // The bar shows its own saved line once this resolves, so the save's own line follows it.
                        if (typeof line === 'string' && line) setTimeout(function () { if (bar.getState() === 'saved') bar.setState('saved', line); }, 0);
                    });
                }
            }));
            var ignore = opts.ignore || '.stolon-table-controls';
            function mark(event: Event): void {
                var target = event.target as Element | null;
                if (!target || bar.element.contains(target) || (target.closest && target.closest(ignore))) return;
                setDirty(entry, entry.tracker ? entry.tracker.isDirty() : true);
            }
            var offInput = listen(content, 'input', mark);
            var offChange = listen(content, 'change', mark);
            entry = { bar: bar, dirty: false, tracker: opts.tracker || null, off: function () { offInput(); offChange(); bar.destroy(); } };
            entries.push(entry);
            content.appendChild(bar.element);
            return bar;
        },
        markDirty: function (bar) {
            var entry = entryOf(bar);
            if (entry) setDirty(entry, true);
        },
        clean: function () {
            entries.forEach(function (entry) {
                if (entry.tracker) entry.tracker.markClean();
                setDirty(entry, false);
            });
        },
        isDirty: isDirty,
        destroy: function () {
            entries.forEach(function (entry) { entry.off(); });
            entries = [];
        }
    };
}
