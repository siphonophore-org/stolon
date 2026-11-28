// Tests for the sidecar, a panel that docks to the trailing edge and swaps its content in place, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openSidecar, sidecarOpener } = await import('../../src/js/sidecar.js');
var { openDialog } = await import('../../src/js/dialog.js');

beforeEach(function () {
    dom = installFakeDom();
});

// Closes what a test left open, so the shared scroll lock count starts at zero for the next one.
afterEach(function () {
    for (var i = 0; i < 5 && dom.document.querySelectorAll('.stolon-dialog').length; i++) dom.document.key('Escape');
});

function sidecars() {
    return dom.document.querySelectorAll('.stolon-sidecar').length;
}

test('a sidecar is modal on the shared shell, docked by its classes, medium unless large, and named by its title', function () {
    var handle = openSidecar({ title: 'Movies', size: 'large' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(handle.element.className, 'stolon-dialog stolon-large stolon-sidecar');
    assert.equal(panel.className, 'stolon-dialog-content stolon-sidecar-panel stolon-large');
    assert.equal(panel.getAttribute('role'), 'dialog');
    assert.equal(panel.getAttribute('aria-modal'), 'true');
    var title = panel.querySelector('.stolon-sidecar-title');
    assert.equal(title.textContent, 'Movies');
    assert.equal(panel.getAttribute('aria-labelledby'), title.id);
    var head = panel.querySelector('.stolon-sidecar-head');
    assert.equal(head.children[head.children.length - 1].className, 'stolon-row-btn stolon-dialog-close');
    handle.close();
    var medium = openSidecar({ title: 'Movies' });
    assert.equal(medium.element.className, 'stolon-dialog stolon-medium stolon-sidecar');
    medium.close();
});

test('the header shows the subtitle and the badge, and the shelf holds the buttons', function () {
    var clicked = [];
    var handle = openSidecar({
        title: 'Shows',
        subtitle: 'Library on Den',
        badge: { label: 'Errored', color: 'Errored' },
        body: '<p>Body</p>',
        buttons: [{ text: 'Retry', action: function () { clicked.push('retry'); } }, { text: 'Done', value: 'done' }]
    });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    var subtitle = panel.querySelector('.stolon-sidecar-subtitle');
    assert.equal(subtitle.textContent, 'Library on Den');
    assert.equal(panel.getAttribute('aria-describedby'), subtitle.id);
    var badge = panel.querySelector('.stolon-sidecar-badge');
    assert.equal(badge.textContent, 'Errored');
    assert.ok(badge.classList.contains('stolon-red'));
    assert.equal(handle.content.innerHTML, '<p>Body</p>');
    var buttons = panel.querySelectorAll('.stolon-sidecar-shelf .stolon-modal-button');
    assert.equal(buttons.length, 2);
    buttons[0].click();
    assert.deepEqual(clicked, ['retry']);
    assert.equal(sidecars(), 1);
});

test('Escape closes the sidecar, unlocks the page scroll, and returns focus to the control that opened it', function () {
    var opener = dom.el('button', { type: 'button' });
    dom.document.body.appendChild(opener);
    opener.focus();
    var closedWith = [];
    openSidecar({ title: 'Movies', buttons: [{ text: 'Done' }], onClose: function (v) { closedWith.push(v); } });
    assert.equal(dom.document.body.style.overflow, 'hidden');
    assert.notEqual(dom.document.activeElement, opener);
    dom.document.key('Escape');
    assert.equal(sidecars(), 0);
    assert.equal(dom.document.body.style.overflow, '');
    assert.equal(dom.document.activeElement, opener);
    assert.deepEqual(closedWith, [undefined]);
});

test('setContent swaps the title, subtitle, badge, body, and buttons without closing', function () {
    var handle = openSidecar({ title: 'One', subtitle: 'First', badge: { label: 'Synced', color: 'green' }, body: '<p>1</p>', buttons: [{ text: 'Next' }] });
    handle.setContent({ title: 'Two', body: '<p>2</p>' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(handle.isOpen(), true);
    assert.equal(sidecars(), 1);
    assert.equal(panel.querySelector('.stolon-sidecar-title').textContent, 'Two');
    assert.equal(panel.querySelector('.stolon-sidecar-subtitle').hidden, true);
    assert.equal(panel.hasAttribute('aria-describedby'), false);
    assert.equal(panel.querySelector('.stolon-sidecar-badge'), null);
    assert.equal(handle.content.innerHTML, '<p>2</p>');
    assert.equal(panel.querySelector('.stolon-sidecar-shelf'), null);
});

test('a shelf button that swaps the content keeps focus on the same button of the new shelf', function () {
    var handle;
    handle = openSidecar({ title: 'One', buttons: [{ text: 'Previous' }, { text: 'Next', action: function () { handle.setContent({ title: 'Two', buttons: [{ text: 'Previous' }, { text: 'Next' }] }); } }] });
    var next = handle.element.querySelectorAll('.stolon-modal-button')[1];
    next.focus();
    next.click();
    var now = handle.element.querySelectorAll('.stolon-modal-button');
    assert.equal(dom.document.activeElement, now[1]);
    assert.notEqual(now[1], next);
});

test('a sidecar with no title is named by ariaLabel, else Details', function () {
    var handle = openSidecar({ body: 'x' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(panel.getAttribute('aria-label'), 'Details');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.close();
    var named = openSidecar({ ariaLabel: 'Row details' });
    assert.equal(named.element.querySelector('.stolon-dialog-content').getAttribute('aria-label'), 'Row details');
});

test('sidecarOpener opens a sidecar for the first item and swaps the next one in while it is open', function () {
    var show = sidecarOpener(function (row) { return { title: row.name }; }, { size: 'large' });
    var first = show({ name: 'Movies' });
    assert.equal(first.element.classList.contains('stolon-large'), true);
    var second = show({ name: 'Shows' });
    assert.equal(second, first);
    assert.equal(sidecars(), 1);
    assert.equal(first.element.querySelector('.stolon-sidecar-title').textContent, 'Shows');
    first.close();
    var third = show({ name: 'Music' });
    assert.notEqual(third, first);
    assert.equal(sidecars(), 1);
});

test('the sidecar and openDialog share one shell, so a dialog over a sidecar takes Escape first', function () {
    var sidecar = openSidecar({ title: 'Below' });
    openDialog({ title: 'Above' });
    dom.document.key('Escape');
    assert.equal(sidecars(), 1);
    assert.equal(dom.document.querySelectorAll('.stolon-dialog').length, 1);
    sidecar.close();
});

test('every sidecar puts its close button at the end of its header, and no dialog has one', async function () {
    var kit = await import('../../src/js/index.js');
    [
        function () { kit.promptSidecar([{ name: 'n' }]); },
        function () { kit.openEditorSidecar({ title: 'Edit' }); },
        function () { openSidecar({ title: 'Details' }); }
    ].forEach(function (open) {
        open();
        var head = dom.document.querySelector('.stolon-sidecar-head');
        var close = head.querySelector('.stolon-dialog-close');
        assert.equal(head.children[head.children.length - 1], close);
        assert.equal(close.className, 'stolon-row-btn stolon-dialog-close');
        close.click();
        assert.equal(dom.document.querySelectorAll('.stolon-dialog').length, 0);
    });
    [
        function () { kit.openDialog({ title: 'A', description: 'B' }); },
        function () { kit.confirmDialog('Sure?'); },
        function () { kit.confirmDialog('Sure?', { typeToConfirm: 'Yes' }); }
    ].forEach(function (open) {
        open();
        assert.equal(dom.document.querySelector('.stolon-dialog-close'), null);
        dom.document.key('Escape');
        assert.equal(dom.document.querySelectorAll('.stolon-dialog').length, 0);
    });
});

test('the shelf is hidden with no buttons, and only the body scrolls', async function () {
    var handle = openSidecar({ title: 'Movies', body: 'x' });
    assert.equal(handle.element.querySelector('.stolon-sidecar-shelf'), null);
    handle.close();
    var { readFileSync } = await import('node:fs');
    var css = readFileSync(new URL('../../src/css/sidecar.css', import.meta.url), 'utf8');
    assert.match(css, /\.stolon-sidecar-body \{[^}]*overflow-y: auto/);
    assert.match(css, /\.stolon-sidecar-shelf:empty,\s*\.stolon-sidecar-shelf\[hidden\] \{ display: none; \}/);
    assert.match(css, /\.stolon-dialog-content\.stolon-sidecar-panel \{[^}]*overflow: hidden/);
});

test('an editor sidecar shows its badge beside the title', async function () {
    var { openEditorSidecar } = await import('../../src/js/editor-sidecar.js');
    var handle = openEditorSidecar({ title: 'media.example.com', badge: { label: 'HTTPS', color: 'green' }, onSave: function () {} });
    var badge = handle.element.querySelector('.stolon-sidecar-badge');
    assert.equal(badge.textContent, 'HTTPS');
    assert.ok(badge.classList.contains('stolon-green'));
    handle.close();
});
