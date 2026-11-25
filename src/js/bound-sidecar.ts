import { bindModalBehavior } from './lib/dialog.js';
import type { AutofocusTarget, ReturnFocusTarget } from './lib/dialog.js';
import { nextId } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** What bindSidecar takes. root is where an overlay id is looked up, and autofocus, returnFocus, and beforeClose work as in openSidecar. */
export interface BindSidecarOptions {
    root?: ParentNode | null;
    dismissable?: boolean;
    beforeClose?(): boolean | PromiseLike<boolean | void>;
    autofocus?: AutofocusTarget;
    returnFocus?: ReturnFocusTarget;
    onOpen?(): void;
    onClose?(value: unknown): void;
}

/** What bindSidecar returns for a sidecar already in the page markup. */
export interface BoundSidecarHandle extends ComponentHandle {
    open(): void;
    close(value?: unknown): void;
    isOpen(): boolean;
    destroy(): void;
}

/**
 * Gives a sidecar already in the page markup the behavior openSidecar builds, so it shows and hides by the stolon-hidden class,
 * closes on a backdrop click, Escape, and its .stolon-dialog-close button, each asking opts.beforeClose first, and traps and restores
 * focus. The panel gets dialog semantics when the markup does not set them. A shelf with no visible button is hidden.
 *
 * @param overlay the .stolon-sidecar element, or its id within root
 * @param opts {
 *   root        : element to resolve an id within (default document)
 *   dismissable : allow backdrop, Escape, and close button dismissal (default true)
 *   beforeClose : function() returning false, or a promise of false, to keep the sidecar open when it is dismissed [optional]
 *   onOpen      : function() called after the sidecar shows [optional]
 *   onClose     : function(value) called once per close [optional]
 *   autofocus, returnFocus : as openSidecar [optional]
 * }
 * @returns { element, open, close(value), isOpen, destroy }.
 */
export function bindSidecar(overlay: HTMLElement | string | null, opts?: BindSidecarOptions): BoundSidecarHandle {
    opts = opts || {};
    if (typeof overlay === 'string') {
        overlay = (opts.root || document).querySelector<HTMLElement>('#' + overlay);
    }
    if (!overlay) throw new Error('bindSidecar: sidecar element not found');

    var panel: HTMLElement = overlay.querySelector<HTMLElement>('.stolon-sidecar-panel') || overlay;
    // A role on the overlay already names the sidecar, and a second one on the panel would announce two nested dialogs.
    var described: boolean = overlay !== panel && overlay.hasAttribute('role');
    if (!described) {
        if (!panel.hasAttribute('role')) panel.setAttribute('role', 'dialog');
        if (!panel.hasAttribute('aria-modal')) panel.setAttribute('aria-modal', 'true');
        if (!panel.hasAttribute('aria-labelledby') && !panel.hasAttribute('aria-label')) {
            var heading: HTMLElement | null = panel.querySelector<HTMLElement>('.stolon-sidecar-title, h1, h2, h3');
            if (heading) {
                if (!heading.id) heading.id = nextId('sidecar-title');
                panel.setAttribute('aria-labelledby', heading.id);
            }
        }
    }
    var open: boolean = false;
    var modal = bindModalBehavior(overlay, panel, {
        dismissable: opts.dismissable,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onDismiss: function (): void { close(); }
    });

    // Hides the shelf while none of its buttons shows, since a page fills and hides its buttons per item.
    function fitShelf(): void {
        var shelf: HTMLElement | null = panel.querySelector<HTMLElement>('.stolon-sidecar-shelf');
        if (!shelf) return;
        shelf.hidden = false;
        shelf.hidden = !Array.prototype.some.call(shelf.querySelectorAll<HTMLElement>('button'), function (b: HTMLElement): boolean {
            return !b.closest('[hidden], .stolon-hidden');
        });
    }

    // Shows the sidecar and focuses into the panel.
    function show(): void {
        if (open) return;
        open = true;
        (overlay as HTMLElement).classList.remove('stolon-hidden');
        if (opts!.onOpen) opts!.onOpen();
        fitShelf();
        modal.activate();
    }

    // Hides the sidecar, hands focus back, and calls onClose with the value.
    function close(value?: unknown): void {
        if (!open) return;
        open = false;
        (overlay as HTMLElement).classList.add('stolon-hidden');
        modal.release();
        if (opts!.onClose) opts!.onClose(value);
    }

    return {
        element: overlay,
        open: show,
        close: close,
        isOpen: function (): boolean { return open; },
        destroy: function (): void {
            close();
            modal.destroy();
        }
    };
}
