import { openSidecar } from './sidecar.js';
import type { SidecarOptions, SidecarHandle } from './sidecar.js';
import type { DialogButton } from './dialog.js';
import { confirmDialog } from './confirm-dialog.js';
import type { PageHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** One extra shelf button of an editor, such as Duplicate. icon is a Material icon name, and variant picks its look. */
export interface EditorSidecarAction {
    text: string;
    icon?: string;
    variant?: 'secondary' | 'primary' | 'destructive';
    onClick(handle: EditorSidecarHandle, button: HTMLButtonElement): void;
}

/** What openEditorSidecar takes. onSave returns false, or a promise of false, to keep the editor open, and actions adds buttons to the shelf. */
export interface EditorSidecarOptions extends Pick<SidecarOptions, 'title' | 'subtitle' | 'body' | 'className' | 'size' | 'autofocus' | 'returnFocus'> {
    page?: Pick<PageHandle, 'trackEditor' | 'untrackEditor'> | null;
    isNew?: boolean;
    serialize?(): string;
    ready?: unknown;
    saveText?: string;
    deleteText?: string;
    cancelText?: string;
    actions?: EditorSidecarAction[];
    onSave?(close: (value?: unknown) => void): boolean | void | PromiseLike<boolean | void>;
    onDelete?(close: (value?: unknown) => void): void;
    onClose?(value: unknown): void;
}

/** What openEditorSidecar returns, the openSidecar handle plus its change tracking. */
export interface EditorSidecarHandle extends SidecarHandle {
    isDirty(): boolean;
    markClean(): void;
}

/**
 * Opens an editor for one record in a sidecar, with Delete, Cancel, and Save on its shelf, and asks before it discards edits. Given
 * the createConfigPage handle, it counts toward the page unsaved guard and closes when the page hides.
 *
 * @param opts {
 *   title, subtitle, body, className, size : as openSidecar (size is 'large' unless set)
 *   page       : the createConfigPage handle [optional]
 *   isNew      : true for a record not saved yet, which has no Delete button (default false)
 *   serialize  : function() returning a stable string of the editor's state, for its change tracking
 *   ready      : a promise to wait on before taking the clean snapshot, such as fields still loading [optional]
 *   saveText, deleteText, cancelText : button labels (default Save, Delete, Cancel)
 *   actions    : [{ text, icon, variant, onClick(handle, button) }] extra shelf buttons, such as Duplicate, drawn after Delete and before Cancel. variant is 'secondary', 'primary', or 'destructive' (default 'secondary'), and a destructive one sits beside Delete [optional]
 *   onSave     : function(close) returning false (or a promise of false) to stay open, such as on invalid input
 *   onDelete   : function(close) for Delete, which closes the sidecar itself when done [optional]
 *   onClose    : function(value) called once when the sidecar closes [optional]
 *   autofocus, returnFocus : as openSidecar [optional]
 * }
 * @returns the openSidecar handle plus isDirty() and markClean().
 */
export function openEditorSidecar(opts?: EditorSidecarOptions): EditorSidecarHandle {
    opts = opts || {};
    var serialize: () => string = opts.serialize || function (): string { return ''; };
    var snapshot: string | null = null;
    function isDirty(): boolean {
        try { return snapshot !== null && serialize() !== snapshot; } catch (e) { return false; }
    }
    var buttons: DialogButton[] = [];
    if (!opts.isNew && opts.onDelete) {
        buttons.push({ text: opts.deleteText || stolonText('Delete'), className: 'stolon-button stolon-destructive', action: function (close): void { opts.onDelete!(close); } });
    }
    // The shelf reads destructive first, then the extra actions, then Cancel, then Save.
    var extras = (opts.actions || []).filter(Boolean);
    var ordered = extras.filter(function (a) { return a.variant === 'destructive'; }).concat(extras.filter(function (a) { return a.variant !== 'destructive'; }));
    ordered.forEach(function (a) {
        var variant = a.variant === 'primary' || a.variant === 'destructive' ? a.variant : 'secondary';
        buttons.push({ text: a.text, icon: a.icon, className: 'stolon-button stolon-' + variant, action: function (close, dismiss, btn): void { a.onClick(handle, btn); } });
    });
    buttons.push({ text: opts.cancelText || stolonText('ButtonCancel'), className: 'stolon-button stolon-secondary', action: function (close, dismiss): void { dismiss(); } });
    // Save stays disabled while onSave is pending, and a rejection re-enables it since onSave reports its own error.
    var busy: boolean = false;
    buttons.push({
        text: opts.saveText || stolonText('Save'),
        className: 'stolon-button stolon-primary',
        action: function (close, dismiss, btn): void {
            if (busy) return;
            var verdict: boolean | void | PromiseLike<boolean | void> = opts.onSave ? opts.onSave(close) : true;
            if (verdict && typeof (verdict as PromiseLike<boolean | void>).then === 'function') {
                busy = true;
                if (btn) btn.disabled = true;
                (verdict as Promise<boolean | void>).then(function (ok: boolean | void): void {
                    busy = false;
                    if (btn) btn.disabled = false;
                    if (ok !== false) close('saved');
                }).catch(function (): void {
                    busy = false;
                    if (btn) btn.disabled = false;
                });
            } else if (verdict !== false) {
                close('saved');
            }
        }
    });
    var handle: EditorSidecarHandle = openSidecar({
        title: opts.title,
        subtitle: opts.subtitle,
        body: opts.body,
        size: opts.size || 'large',
        className: opts.className,
        buttons: buttons,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        beforeClose: function (): boolean | Promise<boolean> {
            return !isDirty() || confirmDialog(stolonText('Stolon.DiscardChanges'), {
                title: stolonText('Stolon.UnsavedChanges'), confirmText: stolonText('Stolon.Discard'), cancelText: stolonText('Stolon.KeepEditing'), destructive: true
            });
        },
        onClose: function (value: unknown): void {
            if (opts.page && opts.page.untrackEditor) opts.page.untrackEditor(handle);
            if (opts.onClose) opts.onClose(value);
        }
    }) as EditorSidecarHandle;
    handle.isDirty = isDirty;
    handle.markClean = function (): void { snapshot = serialize(); };
    Promise.resolve(opts.ready).then(function (): void { snapshot = serialize(); }, function (): void { snapshot = serialize(); });
    if (opts.page && opts.page.trackEditor) opts.page.trackEditor(handle);
    return handle;
}
