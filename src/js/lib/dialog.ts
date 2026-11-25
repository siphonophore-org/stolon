// dialog.ts
// The modal shell, focus, stacking, scroll lock, and button row helpers that every dialog and sidecar shares. None of them is exported from the bundle.

import type { DialogButton } from '../dialog.js';
import { listen, runAll, iconButton, icon } from './dom.js';
import { stolonText } from './stolon-text.js';

var FOCUSABLE: string = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Whether el is visible, since FOCUSABLE also matches hidden controls that cannot take focus.
function isVisible(el: HTMLElement): boolean {
    if ((el as HTMLInputElement).type === 'hidden') return false;
    if (el.closest && el.closest('[hidden], .stolon-hidden')) return false;
    return !!(el.getClientRects && el.getClientRects().length);
}

// The focusable controls in root that the user can see, in document order.
function focusables(root: ParentNode | null): HTMLElement[] {
    if (!root) return [];
    return Array.prototype.filter.call(root.querySelectorAll<HTMLElement>(FOCUSABLE), isVisible);
}

/** Keeps Tab and Shift+Tab cycling inside container. Focus that has escaped it (or never got in) is brought back. */
export function trapFocus(container: HTMLElement, e: KeyboardEvent): void {
    var focusable: HTMLElement[] = focusables(container);
    if (!focusable.length) {
        e.preventDefault();
        focusContainer(container);
        return;
    }
    var first: HTMLElement = focusable[0];
    var last: HTMLElement = focusable[focusable.length - 1];
    var active: Element | null = document.activeElement;
    if (!container.contains(active) || active === container) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
    }
}

// Whether el is a text field, which raises the on-screen keyboard when it takes focus.
function isTextEntry(el: HTMLElement): boolean {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return el.isContentEditable === true;
    return !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test((el as HTMLInputElement).type || 'text');
}

// Whether the primary pointer is a touch screen.
function coarsePointer(): boolean {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

// Focuses the container itself, so Escape and the focus trap work without moving to any control.
function focusContainer(container: HTMLElement): void {
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    container.focus();
}

/** Where focus goes on open: an element or a selector within the panel, or false for the panel itself. */
export type AutofocusTarget = HTMLElement | string | false | null;

/** Where focus goes on close when the control that opened the panel is gone. */
export type ReturnFocusTarget = HTMLElement | string | (() => HTMLElement | string | null) | null;

/** Focuses opts.autofocus, else the first visible body field, else a button that is not destructive, else the close button, else the container. */
export function focusFirst(container: HTMLElement, opts?: { autofocus?: AutofocusTarget }): void {
    opts = opts || {};
    var touch: boolean = coarsePointer();
    function safe(el: HTMLElement): boolean { return !(el.classList && el.classList.contains('stolon-button') && el.classList.contains('stolon-destructive')); }
    function usable(el: HTMLElement): boolean { return safe(el) && !(touch && isTextEntry(el)); }
    if (opts.autofocus === false) { focusContainer(container); return; }
    if (opts.autofocus) {
        var wanted: HTMLElement | null = typeof opts.autofocus === 'string' ? container.querySelector<HTMLElement>(opts.autofocus) : opts.autofocus;
        if (wanted && wanted.focus) {
            if (touch && isTextEntry(wanted)) focusContainer(container);
            else wanted.focus();
            return;
        }
    }
    var body: HTMLElement | null = container.querySelector<HTMLElement>('.stolon-modal-context, .stolon-sidecar-body');
    var field: HTMLElement | undefined = focusables(body).filter(safe)[0];
    if (field) {
        // On a touch screen the first field waits for a tap instead of falling through to a button.
        if (usable(field)) field.focus();
        else focusContainer(container);
        return;
    }
    var choice: HTMLElement | undefined = focusables(container.querySelector('.stolon-modal-button-row, .stolon-sidecar-shelf')).filter(usable)[0]
        || focusables(container).filter(function (el: HTMLElement): boolean { return el.classList.contains('stolon-dialog-close'); })[0]
        || focusables(container).filter(usable)[0];
    if (choice) choice.focus();
    else focusContainer(container);
}

/** Whether the event came from a component that is about to use Escape itself, which marks itself with data-stolon-escape. */
export function escapeClaimed(e: Event): boolean {
    return !!(e.target && (e.target as Element).closest && (e.target as Element).closest('[data-stolon-escape]'));
}

/** Returns focus to the control that opened the dialog, else opts.returnFocus, else the first visible heading of the config page or the page itself. */
export function restoreFocus(previouslyFocused: HTMLElement | null, opts?: { returnFocus?: ReturnFocusTarget }): void {
    function tryFocus(el: HTMLElement | null): boolean {
        if (!el || !el.focus || !el.isConnected || !isVisible(el)) return false;
        try { el.focus(); } catch (e) { return false; }
        return document.activeElement === el;
    }
    if (tryFocus(previouslyFocused)) return;
    var target: ReturnFocusTarget | undefined = opts && opts.returnFocus;
    if (typeof target === 'function') { try { target = target(); } catch (e) { target = null; } }
    if (typeof target === 'string') target = document.querySelector<HTMLElement>(target);
    if (tryFocus(target as HTMLElement)) return;
    var page: HTMLElement | undefined = Array.prototype.filter.call(document.querySelectorAll<HTMLElement>('.pluginConfigurationPage'), isVisible)[0];
    var heading: HTMLElement | undefined = page && Array.prototype.filter.call(page.querySelectorAll<HTMLElement>('h1, h2, h3'), isVisible)[0];
    var fallback: HTMLElement | undefined = heading || page;
    if (fallback) {
        if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1');
        tryFocus(fallback);
    }
}

/** Returns the rendered dialog on top, skipping in-page dialogs that stay in the markup while closed. */
export function topDialog(): HTMLElement | null {
    var all: HTMLElement[] = Array.prototype.filter.call(document.querySelectorAll<HTMLElement>('.stolon-dialog'), function (d: HTMLElement): boolean {
        return !d.classList.contains('stolon-hidden') && !d.hidden && d.getClientRects().length > 0;
    });
    return all.length ? all[all.length - 1] : null;
}

var scrollLocks: number = 0;
var savedOverflow: string = '';

// Stops the page behind the open dialogs from scrolling, counting nested dialogs so only the last one to close lets it scroll again.
function lockScroll(on: boolean): void {
    var body = document.body;
    if (!body || !body.style) return;
    if (on) {
        if (scrollLocks++ === 0) { savedOverflow = body.style.overflow || ''; body.style.overflow = 'hidden'; }
    } else if (scrollLocks > 0 && --scrollLocks === 0) {
        body.style.overflow = savedOverflow;
    }
}

/** What bindModalBehavior takes. onDismiss closes the panel once beforeClose agrees, and autofocus and returnFocus work as in openDialog. */
export interface ModalBehaviorOptions {
    autofocus?: AutofocusTarget;
    returnFocus?: ReturnFocusTarget;
    dismissable?: boolean;
    beforeClose?(): boolean | PromiseLike<boolean | void>;
    onDismiss(): void;
}

/** What bindModalBehavior returns. activate runs as the dialog shows and release after it is hidden or removed. */
export interface ModalBehavior {
    activate(): void;
    release(): void;
    dismiss(): void;
    destroy(): void;
}

/**
 * Gives an overlay the modal behavior every dialog shares. Escape, a backdrop mousedown, and a .stolon-dialog-close click dismiss it through beforeClose, Tab stays inside the panel, the page behind does not scroll, and only the dialog on top answers.
 * On release, focus goes to a dialog still open underneath, else back to the control that opened this one.
 *
 * @param overlay the .stolon-dialog element
 * @param content the panel that holds the focus trap
 * @param opts { dismissable (default true), beforeClose, autofocus, returnFocus, onDismiss }
 * @returns { activate, release, dismiss, destroy }.
 */
export function bindModalBehavior(overlay: HTMLElement, content: HTMLElement, opts: ModalBehaviorOptions): ModalBehavior {
    var dismissable: boolean = opts.dismissable !== false;
    var active: boolean = false;
    var asking: boolean = false;
    var previouslyFocused: HTMLElement | null = null;
    var stopKeys: Array<() => void> = [];
    var cleanups: Array<() => void> = [];

    function dismiss(): void {
        if (!active || asking) return;
        var verdict: boolean | PromiseLike<boolean | void> = opts.beforeClose ? opts.beforeClose() : true;
        if (verdict && typeof (verdict as PromiseLike<boolean | void>).then === 'function') {
            asking = true;
            (verdict as PromiseLike<boolean | void>).then(function (ok: boolean | void): void { asking = false; if (ok !== false && active) opts.onDismiss(); }, function (): void { asking = false; });
        } else if (verdict !== false) {
            opts.onDismiss();
        }
    }

    function onKeyDown(e: KeyboardEvent): void {
        if (overlay !== topDialog()) return;
        if (e.key === 'Escape' && dismissable) {
            if (escapeClaimed(e)) return;
            e.preventDefault();
            e.stopPropagation();
            dismiss();
        } else if (e.key === 'Tab') {
            trapFocus(content, e);
        }
    }

    cleanups.push(listen(overlay, 'mousedown', function (e: MouseEvent): void {
        if (e.target === overlay && dismissable) dismiss();
    }));
    cleanups.push(listen(overlay, 'click', function (e: MouseEvent): void {
        var target = e.target as Element | null;
        if (dismissable && target && target.closest && target.closest('.stolon-dialog-close')) dismiss();
    }));

    function release(): void {
        if (!active) return;
        active = false;
        asking = false;
        runAll(stopKeys);
        lockScroll(false);
        var below: HTMLElement | null = topDialog();
        // A dialog still open underneath keeps focus, unless the control that opened this one sits inside it.
        if (below && below !== overlay && !below.contains(previouslyFocused)) focusFirst(below.querySelector<HTMLElement>('.stolon-dialog-content') || below);
        else restoreFocus(previouslyFocused, opts);
    }

    return {
        activate: function (): void {
            if (active) return;
            active = true;
            previouslyFocused = document.activeElement as HTMLElement | null;
            stopKeys.push(listen(document, 'keydown', onKeyDown, true));
            lockScroll(true);
            focusFirst(content, opts);
        },
        release: release,
        dismiss: dismiss,
        destroy: function (): void { if (active) lockScroll(false); runAll(stopKeys); runAll(cleanups); active = false; }
    };
}

/** What createModalShell takes. size is the size modifier on both elements, closeButton adds the close button, and overlayClass and contentClass add a variation's own classes beside stolon-dialog and stolon-dialog-content. */
export interface ModalShellOptions extends Omit<ModalBehaviorOptions, 'onDismiss'> {
    size: string;
    className?: string;
    closeButton?: boolean;
    onClose?(value: unknown): void;
    overlayClass?: string;
    contentClass?: string;
}

/** What createModalShell returns. show adds the overlay to the page and moves focus in, and close removes it and calls onClose once. */
export interface ModalShell {
    overlay: HTMLDivElement;
    content: HTMLDivElement;
    closeButton: HTMLButtonElement | null;
    show(): void;
    close(value?: unknown): void;
    dismiss(): void;
    isOpen(): boolean;
}

/**
 * Builds the overlay and the panel, with the modal behavior bound, for every dialog and sidecar Stolon opens. The close button is
 * built only when closeButton is true, and the caller places it. The caller fills the panel, then calls show.
 *
 * @param opts { size, className, dismissable, closeButton, beforeClose, autofocus, returnFocus, onClose, overlayClass, contentClass }
 * @returns { overlay, content, closeButton, show, close, dismiss, isOpen }.
 */
export function createModalShell(opts: ModalShellOptions): ModalShell {
    var size: string = opts.size;
    var overlay = document.createElement('div');
    // The size on the overlay lets the phone layout match without :has(), which older engines lack.
    overlay.className = 'stolon-dialog stolon-' + size + (opts.overlayClass ? ' ' + opts.overlayClass : '');
    var content = document.createElement('div');
    content.className = 'stolon-dialog-content ' + (opts.contentClass ? opts.contentClass + ' ' : '') + 'stolon-' + size + (opts.className ? ' ' + opts.className : '');
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
    overlay.appendChild(content);

    var shown: boolean = false;
    var closed: boolean = false;
    var modal: ModalBehavior = bindModalBehavior(overlay, content, {
        dismissable: opts.dismissable,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onDismiss: function (): void { close(); }
    });

    // Removes the overlay, hands focus back, and calls onClose once with the value.
    function close(value?: unknown): void {
        if (closed) return;
        closed = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        modal.release();
        modal.destroy();
        if (opts.onClose) opts.onClose(value);
    }

    var closeButton: HTMLButtonElement | null = null;
    if (opts.closeButton === true && opts.dismissable !== false) {
        closeButton = iconButton('stolon-row-btn stolon-dialog-close', 'close', stolonText('ButtonClose'));
    }

    return {
        overlay: overlay,
        content: content,
        closeButton: closeButton,
        show: function (): void {
            if (shown || closed) return;
            shown = true;
            document.body.appendChild(overlay);
            modal.activate();
        },
        close: close,
        dismiss: modal.dismiss,
        isOpen: function (): boolean { return shown && !closed; }
    };
}

/**
 * Builds a row of buttons, a dialog's button row or a sidecar's shelf. A button with an action gets close, dismiss, and itself, and one without closes with its value.
 *
 * @param buttons the button specs, as openDialog takes them
 * @param close closes the panel with a value
 * @param dismiss closes it as Escape does, asking beforeClose first
 * @param rowClass the row's class (default stolon-modal-button-row)
 * @returns the row, or null when there are no buttons
 */
export function dialogButtonRow(buttons: DialogButton[] | null | undefined, close: (value?: unknown) => void, dismiss: () => void, rowClass?: string): HTMLDivElement | null {
    if (!buttons || !buttons.length) return null;
    var row = document.createElement('div');
    row.className = rowClass || 'stolon-modal-button-row';
    buttons.forEach(function (spec: DialogButton): void {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'raised stolon-modal-button ' + (spec.className || 'stolon-button stolon-secondary');
        if (spec.icon) {
            btn.appendChild(icon(spec.icon));
            btn.appendChild(document.createElement('span')).textContent = spec.text || '';
        } else {
            btn.textContent = spec.text || '';
        }
        btn.addEventListener('click', function (): void {
            if (spec.action) spec.action(close, dismiss, btn);
            else close(spec.value);
        });
        row.appendChild(btn);
    });
    return row;
}
