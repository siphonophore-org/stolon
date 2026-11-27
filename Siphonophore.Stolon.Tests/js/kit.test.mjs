// Behavior tests for the kit JavaScript, run with the node test runner and a stub DOM with no dependencies:
//   node --import ./Siphonophore.Stolon.Tests/js/register.mjs --test 'Siphonophore.Stolon.Tests/js/*.test.mjs'
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog } = await import('../../src/js/dialog.js');
var { openSidecar } = await import('../../src/js/sidecar.js');
var { bindSidecar } = await import('../../src/js/bound-sidecar.js');
var { openEditorSidecar } = await import('../../src/js/editor-sidecar.js');
var { generateGuid } = await import('../../src/js/browser-helpers.js');
var { escapeHtml } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('generateGuid gives a dashed v4 GUID by default and 32 hex digits when compact', function () {
    for (var i = 0; i < 50; i++) {
        assert.match(generateGuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert.match(generateGuid({ compact: true }), /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    }
});

test('escapeHtml is exported from the bundle entry', function () {
    assert.equal(escapeHtml('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
    assert.equal(escapeHtml(null), '');
});

function bodyWith(children) {
    return dom.el('div', {}, children);
}

test('focusFirst skips hidden controls and lands on the first visible field', function () {
    var visible = dom.el('input', { type: 'text' });
    var body = bodyWith([
        dom.el('input', { type: 'hidden' }),
        dom.el('div', { class: 'stolon-hidden' }, [dom.el('input', { type: 'text' })]),
        dom.el('div', { hidden: true }, [dom.el('input', { type: 'text' })]),
        dom.el('input', { type: 'text', style: { display: 'none' } }),
        visible
    ]);
    var handle = openSidecar({ title: 'Edit', body: body });
    assert.equal(dom.document.activeElement, visible);
    handle.close();
});

test('focusFirst never picks a destructive button, preferring Cancel in the button row', function () {
    var handle = openDialog({
        title: 'Remove Server B',
        description: 'Its mappings go with it.',
        buttons: [
            { text: 'Remove', className: 'stolon-button stolon-destructive' },
            { text: 'Cancel', className: 'stolon-button stolon-secondary' }
        ]
    });
    assert.equal(dom.document.activeElement.textContent, 'Cancel');
    handle.close();
});

test('focusFirst skips a destructive button in the body too', function () {
    var keep = dom.el('button', { type: 'button' });
    var handle = openSidecar({ body: bodyWith([dom.el('button', { type: 'button', class: 'stolon-button stolon-destructive' }), keep]) });
    assert.equal(dom.document.activeElement, keep);
    handle.close();
});

test('on a touch screen a text field is not focused; the panel is', function () {
    dom.setCoarse(true);
    var handle = openSidecar({ title: 'Edit', body: bodyWith([dom.el('input', { type: 'text' })]), size: 'large' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(dom.document.activeElement, panel);
    assert.equal(panel.getAttribute('tabindex'), '-1');
    handle.close();
});

test('autofocus picks the element asked for, and false focuses the panel', function () {
    var second = dom.el('input', { type: 'text', class: 'second' });
    var handle = openSidecar({ body: bodyWith([dom.el('input', { type: 'text' }), second]), autofocus: '.second' });
    assert.equal(dom.document.activeElement, second);
    handle.close();

    handle = openSidecar({ body: bodyWith([dom.el('input', { type: 'text' })]), autofocus: false });
    assert.equal(dom.document.activeElement, handle.element.querySelector('.stolon-dialog-content'));
    handle.close();
});

test('the Tab trap ignores hidden controls, so Tab from the last visible one wraps to the first', function () {
    var first = dom.el('input', { type: 'text' });
    var last = dom.el('input', { type: 'text' });
    var handle = openSidecar({ body: bodyWith([first, last, dom.el('input', { type: 'text', class: 'stolon-hidden' })]), dismissable: false });
    last.focus();
    var e = dom.document.key('Tab');
    assert.ok(e.defaultPrevented);
    assert.equal(dom.document.activeElement, first);
    handle.close();
});

test('aria-labelledby is set only while a title is shown', function () {
    var handle = openDialog({ description: 'x' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.setTitle('Named');
    assert.ok(panel.getAttribute('aria-labelledby'));
    handle.setTitle('');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.close();
});

test('focus goes to returnFocus when the opener is gone at close', function () {
    var opener = dom.document.body.appendChild(dom.el('button', { type: 'button' }));
    var fallback = dom.document.body.appendChild(dom.el('button', { type: 'button', id: 'add' }));
    opener.focus();
    var handle = openDialog({ description: 'x', returnFocus: '#add' });
    dom.document.body.removeChild(opener);
    handle.close();
    assert.equal(dom.document.activeElement, fallback);
});

test('bindSidecar adds dialog semantics and Escape on a confirm above it closes only the confirm', function () {
    var content = dom.el('div', { class: 'stolon-dialog-content stolon-sidecar-panel' }, [dom.el('h2', { class: 'stolon-sidecar-title' }), dom.el('input', { type: 'text' })]);
    var overlay = dom.document.body.appendChild(dom.el('div', { class: 'stolon-dialog stolon-sidecar stolon-hidden', id: 'ed' }, [content]));
    var closes = 0;
    var bound = bindSidecar('ed', { onClose: function () { closes++; } });
    assert.equal(content.getAttribute('role'), 'dialog');
    assert.equal(content.getAttribute('aria-modal'), 'true');
    assert.ok(content.getAttribute('aria-labelledby'));

    bound.open();
    var confirmClosed = false;
    openDialog({ description: 'Sure?', onClose: function () { confirmClosed = true; } });
    dom.document.key('Escape');
    assert.equal(confirmClosed, true);
    assert.equal(bound.isOpen(), true);
    assert.equal(closes, 0);

    dom.document.key('Escape');
    assert.equal(bound.isOpen(), false);
    assert.equal(closes, 1);
    assert.ok(overlay.classList.contains('stolon-hidden'));
});

test('openEditorSidecar disables Save while onSave is pending and re-enables it on failure', async function () {
    var reject;
    var calls = 0;
    var unhandled = 0;
    function onUnhandled() { unhandled++; }
    process.on('unhandledRejection', onUnhandled);
    var handle = openEditorSidecar({
        title: 'Edit',
        isNew: true,
        onSave: function () { calls++; return new Promise(function (res, rej) { reject = rej; }); }
    });
    var done = all(handle.element, '.stolon-modal-button').filter(function (b) { return b.textContent === 'Save'; })[0];
    done.click();
    assert.equal(done.disabled, true);
    done.click();
    assert.equal(calls, 1, 'a second click while saving must not call onSave again');
    reject(new Error('save failed'));
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.equal(done.disabled, false);
    assert.equal(unhandled, 0);
    process.off('unhandledRejection', onUnhandled);
    handle.close();
});

test('openEditorSidecar draws extra actions on the shelf between Delete and Save, in button order', function () {
    var seen = [];
    var handle = openEditorSidecar({
        title: 'Edit Invite',
        onDelete: function () {},
        actions: [
            { text: 'Duplicate', icon: 'content_copy', onClick: function (h, btn) { seen.push([h, btn]); } },
            { text: 'Send', variant: 'primary', onClick: function () {} },
            { text: 'Revoke', variant: 'destructive', onClick: function () {} }
        ]
    });
    var row = handle.element.querySelector('.stolon-sidecar-shelf');
    var buttons = all(row, '.stolon-modal-button');
    assert.deepEqual(buttons.map(function (b) { return b.textContent; }), ['Delete', 'Revoke', 'content_copyDuplicate', 'Send', 'Save']);
    var duplicate = buttons[2];
    assert.ok(duplicate.classList.contains('stolon-button'));
    assert.ok(duplicate.classList.contains('stolon-secondary'), 'an action is secondary by default');
    assert.ok(duplicate.classList.contains('raised'));
    assert.equal(duplicate.querySelector('.material-icons').textContent, 'content_copy');
    assert.equal(duplicate.querySelector('.material-icons').getAttribute('aria-hidden'), 'true');
    assert.ok(buttons[1].classList.contains('stolon-destructive'));
    assert.ok(buttons[3].classList.contains('stolon-primary'));
    duplicate.click();
    assert.equal(seen.length, 1);
    assert.equal(seen[0][0], handle, 'onClick gets the editor handle');
    assert.equal(seen[0][1], duplicate);
    assert.equal(handle.element.classList.contains('stolon-hidden'), false, 'an action leaves the editor open');
    handle.close();
});

test('openEditorSidecar with no actions keeps Delete and Save', function () {
    var handle = openEditorSidecar({ title: 'Edit', onDelete: function () {} });
    assert.deepEqual(all(handle.element, '.stolon-modal-button').map(function (b) { return b.textContent; }), ['Delete', 'Save']);
    handle.close();
});

test('bindSidecar leaves semantics alone when the overlay already carries the role', function () {
    var content = dom.el('div', { class: 'stolon-dialog-content stolon-sidecar-panel' });
    dom.document.body.appendChild(dom.el('div', { class: 'stolon-dialog stolon-sidecar stolon-hidden', id: 'm', role: 'dialog', 'aria-modal': 'true' }, [content]));
    bindSidecar('m');
    assert.equal(content.hasAttribute('role'), false);
});

test('an in-page sidecar hidden by style does not count as the top one', function () {
    var content = dom.el('div', { class: 'stolon-dialog-content stolon-sidecar-panel' }, [dom.el('input', { type: 'text' })]);
    dom.document.body.appendChild(dom.el('div', { class: 'stolon-dialog stolon-sidecar stolon-hidden', id: 'a' }, [content]));
    dom.document.body.appendChild(dom.el('div', { class: 'stolon-dialog stolon-sidecar', style: { display: 'none' } }));
    var bound = bindSidecar('a');
    bound.open();
    dom.document.key('Escape');
    assert.equal(bound.isOpen(), false);
});
