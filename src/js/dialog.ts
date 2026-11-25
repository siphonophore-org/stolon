import { createModalShell, dialogButtonRow } from './lib/dialog.js';
import type { ModalShell, AutofocusTarget, ReturnFocusTarget } from './lib/dialog.js';
import { make, nextId } from './lib/dom.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** One button. icon is a Material icon name drawn before the text, action gets close, dismiss, and the clicked button, and without it a click closes with value. */
export interface DialogButton {
    text?: string;
    icon?: string;
    className?: string;
    value?: unknown;
    action?(close: (value?: unknown) => void, dismiss: () => void, button: HTMLButtonElement): void;
}

/** What openDialog takes. A compact dialog shows the title, the description, and the buttons. A full one shows the title, the subtitle, the context, and the buttons. */
export interface DialogOptions {
    size?: 'compact' | 'full';
    title?: string;
    description?: string;
    subtitle?: string;
    context?: string | Node;
    ariaLabel?: string;
    className?: string;
    dismissable?: boolean;
    beforeClose?(): boolean | PromiseLike<boolean | void>;
    buttons?: DialogButton[];
    onClose?(value: unknown): void;
    autofocus?: AutofocusTarget;
    returnFocus?: ReturnFocusTarget;
    page?: { addCleanup(fn: () => void): unknown } | null;
}

/** What openDialog returns, where content is the context of a full dialog, else the description. */
export interface DialogHandle extends ComponentHandle {
    element: HTMLDivElement;
    content: HTMLElement;
    close(value?: unknown): void;
    dismiss(): void;
    setTitle(text: string): void;
}

/**
 * Opens a modal for an alert or a confirmation, at one of two fixed sizes, that never scrolls. Compact shows the title, the
 * description, and the buttons. Full shows the title, the subtitle, the context, such as a poster and the name of what is deleted,
 * and the buttons. It has no close button. Escape and a backdrop click dismiss it, each asking opts.beforeClose first, focus is
 * trapped in the panel, and it is restored on close. Inputs and anything that needs to scroll go in a sidecar.
 *
 * @param opts {
 *   size        : 'compact' or 'full' (default 'full' with a context, else 'compact')
 *   title       : the heading, which names the action and what it acts on [optional]
 *   description : the sentence under a compact dialog's title, as text [optional]
 *   subtitle    : the sentence under a full dialog's title, as text [optional]
 *   context     : a full dialog's context, HTML or a node [optional]
 *   ariaLabel   : accessible name when there is no title (default the description or subtitle, else 'Dialog') [optional]
 *   className   : classes added to the panel [optional]
 *   dismissable : allow Escape and backdrop dismissal (default true)
 *   beforeClose : function() returning false, or a promise of false, to keep the dialog open when it is dismissed [optional]
 *   buttons     : [{ text, icon, className, value, action(close, dismiss, button) }] in the button row, where dismiss closes
 *                 as Escape does, asking beforeClose first, icon is a Material icon name before the text, and button is the clicked element [optional]
 *   onClose     : function(value) called once when the dialog closes [optional]
 *   autofocus   : the element or a selector within the dialog to focus on open, or false to focus the panel itself (default the first field in the context, else a button that is not destructive) [optional]
 *   returnFocus : an element, a selector, or a function returning one, to focus on close when the control that opened the dialog is gone [optional]
 *   page        : the page handle from createConfigPage, so the dialog closes when the page hides [optional]
 * }
 * @returns { element, content, close, dismiss, setTitle }, where content is the context of a full dialog, else the description.
 */
export function openDialog(opts?: DialogOptions): DialogHandle {
    opts = opts || {};
    var size: 'compact' | 'full' = opts.size === 'full' || opts.size === 'compact' ? opts.size : (opts.context != null ? 'full' : 'compact');
    var shell: ModalShell = createModalShell({
        size: size,
        className: opts.className,
        dismissable: opts.dismissable,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onClose: opts.onClose
    });
    var panel: HTMLDivElement = shell.content;

    var title = make('h2', 'stolon-modal-title');
    title.id = nextId('dialog-title');
    title.textContent = opts.title || '';
    // The label points at the title only while the title is in the panel.
    if (opts.title) {
        panel.appendChild(title);
        panel.setAttribute('aria-labelledby', title.id);
    }

    var lead: HTMLElement;
    var content: HTMLElement;
    if (size === 'full') {
        lead = make('p', 'stolon-modal-subtitle', null, opts.subtitle || '');
        var context = make('div', 'stolon-modal-context');
        if (opts.context instanceof Node) context.appendChild(opts.context);
        else if (typeof opts.context === 'string') context.innerHTML = opts.context;
        if (opts.subtitle) panel.appendChild(lead);
        panel.appendChild(context);
        content = context;
    } else {
        lead = make('p', 'stolon-modal-description', null, opts.description || '');
        if (opts.description) panel.appendChild(lead);
        content = lead;
    }
    lead.id = nextId('dialog-text');
    if (lead.parentNode) panel.setAttribute('aria-describedby', lead.id);
    if (!opts.title) {
        var name: string = opts.ariaLabel || String(lead.textContent || '').replace(/\s+/g, ' ').trim();
        panel.setAttribute('aria-label', (name.slice(0, 80) || stolonText('Stolon.Dialog')));
    }

    var row: HTMLDivElement | null = dialogButtonRow(opts.buttons, shell.close, shell.dismiss);
    if (row) panel.appendChild(row);

    shell.show();
    // Leaving the page closes the dialog, without asking beforeClose, since the page is gone.
    if (opts.page && typeof opts.page.addCleanup === 'function') opts.page.addCleanup(function () { shell.close(); });

    return {
        element: shell.overlay,
        content: content,
        close: shell.close,
        dismiss: shell.dismiss,
        setTitle: function (text: string): void {
            title.textContent = text || '';
            if (text) {
                if (!title.parentNode) panel.insertBefore(title, panel.firstChild);
                panel.setAttribute('aria-labelledby', title.id);
                panel.removeAttribute('aria-label');
            } else {
                if (title.parentNode) title.parentNode.removeChild(title);
                panel.removeAttribute('aria-labelledby');
            }
        }
    };
}
