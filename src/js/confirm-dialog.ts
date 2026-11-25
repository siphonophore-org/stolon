import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import { setFieldState } from './field-message.js';
import { make, nextId, fill } from './lib/dom.js';
import { stolonText } from './lib/stolon-text.js';

/** What confirmDialog takes. context makes it a full dialog, and typeToConfirm asks for that exact text before the confirm button turns on. */
export interface ConfirmDialogOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    context?: string | Node;
    typeToConfirm?: string;
    typeLabel?: string;
    mismatchText?: string;
}

/**
 * Whether typed text matches the text a typed confirm asks for, exactly, case and spaces included.
 * Internal to the web components.
 *
 * @param typed what the reader typed
 * @param wanted the text to match
 */
export function typedMatches(typed: unknown, wanted: unknown): boolean {
    return typeof wanted === 'string' && wanted !== '' && typed === wanted;
}

/**
 * Opens a yes or no dialog that resolves to true when confirmed and false otherwise. It is compact, the title and the message
 * under it, unless it has a context or a typed confirm, which make it full, with the message as the subtitle over the context.
 * The title names the action and what it acts on, such as 'Remove Server B', and the message says what follows from it, never
 * the title again as a question. With typeToConfirm the confirm button stays off until the field holds that exact text, and
 * Enter confirms only then.
 *
 * @param message the description, or the subtitle of a full dialog, as text
 * @param opts {
 *   title         : the dialog title, which names the action and what it acts on [optional]
 *   confirmText   : the confirm button label (default 'Confirm')
 *   cancelText    : the cancel button label (default 'Cancel')
 *   destructive   : true makes the confirm button destructive (default false)
 *   context       : HTML or a node shown under the message, such as a poster and the name of what is deleted, which makes the dialog full [optional]
 *   typeToConfirm : text the reader must type exactly before confirming, such as the name of what is deleted [optional]
 *   typeLabel     : the field's label, where {value} is the text to type (default 'Type {value} to confirm.')
 *   mismatchText  : the error under the field when Enter is pressed before it matches (default 'The text does not match.')
 * } [optional]
 */
export function confirmDialog(message: string, opts?: ConfirmDialogOptions): Promise<boolean> {
    opts = opts || {};
    var wanted: string = typeof opts.typeToConfirm === 'string' ? opts.typeToConfirm : '';
    return new Promise<boolean>(function (resolve): void {
        var settled: boolean = false;
        function done(value: boolean): void { if (!settled) { settled = true; resolve(value); } }

        var full: boolean = opts!.context != null || !!wanted;
        var context: HTMLElement | null = null;
        var input: HTMLInputElement | null = null;
        if (full) {
            context = make('div');
            if (opts!.context instanceof Node) context.appendChild(opts!.context);
            else if (typeof opts!.context === 'string') context.innerHTML = opts!.context;
        }
        if (wanted && context) {
            var field = make('div', 'stolon-modal-field');
            input = make('input', 'stolon-edit-input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
            input.id = nextId('typed-confirm');
            field.appendChild(make('label', 'stolon-modal-field-label', { for: input.id }, fill(opts!.typeLabel || stolonText('Stolon.TypeToConfirm'), wanted)));
            field.appendChild(input);
            context.appendChild(field);
        }

        var handle: DialogHandle = openDialog({
            size: full ? 'full' : 'compact',
            title: opts!.title,
            description: full ? undefined : String(message || ''),
            subtitle: full ? String(message || '') : undefined,
            context: context || undefined,
            buttons: [
                { text: opts!.cancelText || stolonText('ButtonCancel'), className: 'stolon-button stolon-secondary', action: function (close): void { close(false); } },
                {
                    text: opts!.confirmText || stolonText('Stolon.Confirm'),
                    className: opts!.destructive ? 'stolon-button stolon-destructive' : 'stolon-button stolon-primary',
                    action: function (close): void { if (!input || typedMatches(input.value, wanted)) close(true); }
                }
            ],
            onClose: function (value: unknown): void { done(value === true); }
        });

        if (!input) return;
        var typed: HTMLInputElement = input;
        var buttons: NodeListOf<HTMLButtonElement> = handle.element.querySelectorAll<HTMLButtonElement>('.stolon-modal-button');
        var confirmButton: HTMLButtonElement | null = buttons.length ? buttons[buttons.length - 1] : null;
        // The confirm button follows the match, and a mismatch error clears once the text matches or is emptied.
        function reflect(): void {
            var ok: boolean = typedMatches(typed.value, wanted);
            if (confirmButton) confirmButton.disabled = !ok;
            if (ok || !typed.value) setFieldState(typed, '');
        }
        typed.addEventListener('input', reflect);
        typed.addEventListener('keydown', function (e: KeyboardEvent): void {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (typedMatches(typed.value, wanted)) handle.close(true);
            else setFieldState(typed, 'error', opts!.mismatchText || stolonText('Stolon.TextMismatch'));
        });
        reflect();
    });
}
