import { createModalShell, dialogButtonRow, focusFirst } from './lib/dialog.js';
import type { ModalShell, AutofocusTarget, ReturnFocusTarget } from './lib/dialog.js';
import { make, nextId, clear } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import type { DialogButton } from './dialog.js';
import type { ComponentHandle } from './types.js';
import { stolonText } from './lib/stolon-text.js';

/** What a sidecar shows: a title, an optional subtitle and badge, the body, and the shelf's buttons. */
export interface SidecarContent {
    title?: string;
    subtitle?: string;
    badge?: { label: string; color?: string } | null;
    body?: string | Node;
    buttons?: DialogButton[];
}

/** What openSidecar takes, the content plus how it behaves. */
export interface SidecarOptions extends SidecarContent {
    size?: 'medium' | 'large';
    ariaLabel?: string;
    className?: string;
    dismissable?: boolean;
    beforeClose?(): boolean | PromiseLike<boolean | void>;
    onClose?(value: unknown): void;
    autofocus?: AutofocusTarget;
    returnFocus?: ReturnFocusTarget;
    page?: { addCleanup(fn: () => void): unknown } | null;
}

/** What openSidecar returns, where content is the scrolling body and setContent swaps what it shows without closing it. */
export interface SidecarHandle extends ComponentHandle {
    element: HTMLDivElement;
    content: HTMLDivElement;
    close(value?: unknown): void;
    dismiss(): void;
    isOpen(): boolean;
    setTitle(text: string): void;
    setContent(next: SidecarContent): void;
    destroy(): void;
}

/**
 * Opens a sidecar, a panel that slides in from the trailing edge, for inputs and for the details of a selected item. Its header,
 * the title with an optional subtitle and badge and the close button, and its shelf of buttons stay pinned while the body scrolls
 * between them. The shelf is hidden when there are no buttons. On a phone it fills the screen. It closes on Escape, a backdrop
 * click, and the close button, each asking beforeClose first, traps focus, locks the page scroll, and returns focus.
 *
 * @param opts {
 *   title       : the heading [optional]
 *   subtitle    : a line under the heading [optional]
 *   badge       : { label, color } shown beside the heading, where color is a status color name, a hex code, or a badge state name [optional]
 *   body        : HTML or a node for the body [optional]
 *   buttons     : the shelf's buttons, as openDialog takes them, such as Delete, Cancel, and Save [optional]
 *   size        : 'medium' (560px wide) or 'large' (800px) (default 'medium')
 *   ariaLabel, className, dismissable, beforeClose, autofocus, returnFocus, onClose, page : as openDialog [optional]
 * }
 * @returns { element, content, close, dismiss, isOpen, setTitle, setContent, destroy }. setContent swaps the title, subtitle, badge, body, and buttons in place.
 */
export function openSidecar(opts?: SidecarOptions): SidecarHandle {
    opts = opts || {};
    var shell: ModalShell = createModalShell({
        size: opts.size === 'large' ? 'large' : 'medium',
        className: opts.className,
        dismissable: opts.dismissable,
        closeButton: true,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onClose: opts.onClose,
        overlayClass: 'stolon-sidecar',
        contentClass: 'stolon-sidecar-panel'
    });
    var panel: HTMLDivElement = shell.content;
    var head = make('div', 'stolon-sidecar-head');
    var heading = make('div', 'stolon-sidecar-heading');
    var titleRow = make('div', 'stolon-sidecar-title-row');
    var title = make('h2', 'stolon-sidecar-title');
    title.id = nextId('sidecar-title');
    var subtitle = make('p', 'stolon-sidecar-subtitle');
    subtitle.id = nextId('sidecar-subtitle');
    titleRow.appendChild(title);
    heading.appendChild(titleRow);
    heading.appendChild(subtitle);
    head.appendChild(heading);
    if (shell.closeButton) head.appendChild(shell.closeButton);
    var body = make('div', 'stolon-sidecar-body');
    var shelf: HTMLDivElement | null = null;
    panel.appendChild(head);
    panel.appendChild(body);

    function setTitle(text: string): void {
        title.textContent = text || '';
        title.hidden = !text;
        if (text) {
            panel.setAttribute('aria-labelledby', title.id);
            panel.removeAttribute('aria-label');
        } else {
            panel.removeAttribute('aria-labelledby');
            panel.setAttribute('aria-label', (opts!.ariaLabel || stolonText('Stolon.Details')).slice(0, 80));
        }
    }

    function setContent(next: SidecarContent): void {
        next = next || {};
        var hadFocus: boolean = panel.contains(document.activeElement) && document.activeElement !== panel;
        var shelfAt: number = shelf ? Array.prototype.indexOf.call(shelf.querySelectorAll('.stolon-modal-button'), document.activeElement) : -1;
        setTitle(next.title || '');
        subtitle.textContent = next.subtitle || '';
        subtitle.hidden = !next.subtitle;
        if (next.subtitle) panel.setAttribute('aria-describedby', subtitle.id);
        else panel.removeAttribute('aria-describedby');
        var oldBadge = titleRow.querySelector('.stolon-badge');
        if (oldBadge) titleRow.removeChild(oldBadge);
        if (next.badge && next.badge.label) titleRow.appendChild(makeBadge(next.badge.label, badgeColor(next.badge.color, 'gray'), null, 'stolon-sidecar-badge'));
        clear(body);
        body.scrollTop = 0;
        if (next.body instanceof Node) body.appendChild(next.body);
        else if (typeof next.body === 'string') body.innerHTML = next.body;
        if (shelf && shelf.parentNode) shelf.parentNode.removeChild(shelf);
        shelf = dialogButtonRow(next.buttons, shell.close, shell.dismiss, 'stolon-sidecar-shelf');
        if (shelf) panel.appendChild(shelf);
        // Focus that sat on content now gone stays on the same shelf button, such as Next, else moves to the sidecar, so Tab and Escape keep working.
        if (hadFocus && shell.isOpen() && !panel.contains(document.activeElement)) {
            var same: HTMLElement | undefined = shelf && shelfAt !== -1 ? shelf.querySelectorAll<HTMLElement>('.stolon-modal-button')[shelfAt] : undefined;
            if (same) same.focus();
            else focusFirst(panel, { autofocus: false });
        }
    }

    setContent(opts);
    shell.show();
    // Leaving the page closes the sidecar, without asking beforeClose, since the page is gone.
    if (opts.page && typeof opts.page.addCleanup === 'function') opts.page.addCleanup(function () { shell.close(); });

    return {
        element: shell.overlay,
        content: body,
        close: shell.close,
        dismiss: shell.dismiss,
        isOpen: shell.isOpen,
        setTitle: setTitle,
        setContent: setContent,
        destroy: function (): void { shell.close(); }
    };
}

/**
 * Returns a function that shows an item in a sidecar, for a Filtered List's or Data Table's onOpen. It opens the sidecar for the
 * first item, and while that sidecar is open it swaps in the next item's content without closing it.
 *
 * @param render function(item) returning the content for an item: { title, subtitle, badge, body, buttons }
 * @param opts the sidecar's other options, as openSidecar takes them [optional]
 * @returns function(item) that opens or updates the sidecar and returns its handle
 */
export function sidecarOpener<T>(render: (item: T) => SidecarContent, opts?: SidecarOptions): (item: T) => SidecarHandle {
    var current: SidecarHandle | null = null;
    return function (item: T): SidecarHandle {
        var content: SidecarContent = render(item) || {};
        if (current && current.isOpen()) {
            current.setContent(content);
            return current;
        }
        var merged: SidecarOptions = Object.assign({}, opts || {}, content);
        current = openSidecar(merged);
        return current;
    };
}
