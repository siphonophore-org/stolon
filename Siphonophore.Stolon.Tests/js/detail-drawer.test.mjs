// Tests for the detail drawer, a dialog that docks to the right edge and swaps its content in place, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDetailDrawer, detailDrawerOpener } = await import('../../src/js/detail-drawer.js');
var { openDialog } = await import('../../src/js/dialog.js');

beforeEach(function () {
    dom = installFakeDom();
});

// Closes what a test left open, so the shared scroll lock count starts at zero for the next one.
afterEach(function () {
    for (var i = 0; i < 5 && dom.document.querySelectorAll('.stolon-dialog').length; i++) dom.document.key('Escape');
});

function drawers() {
    return dom.document.querySelectorAll('.stolon-drawer').length;
}

test('a drawer is a modal dialog on the shared shell, docked by its classes, sized from the dialog scale, and named by its title', function () {
    var handle = openDetailDrawer({ title: 'Movies', size: 'small' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(handle.element.className, 'stolon-dialog small stolon-drawer');
    assert.equal(panel.className, 'stolon-dialog-content stolon-drawer-content small');
    assert.equal(panel.getAttribute('role'), 'dialog');
    assert.equal(panel.getAttribute('aria-modal'), 'true');
    var title = panel.querySelector('.stolon-drawer-title');
    assert.equal(title.textContent, 'Movies');
    assert.equal(panel.getAttribute('aria-labelledby'), title.id);
    assert.ok(panel.querySelector('.stolon-dialog-close'));
    handle.close();
});

test('the header shows the subtitle and the badge, and the footer is a dialog button row', function () {
    var clicked = [];
    var handle = openDetailDrawer({
        title: 'Shows',
        subtitle: 'Library on Den',
        badge: { label: 'Errored', color: 'Errored' },
        body: '<p>Body</p>',
        buttons: [{ text: 'Retry', action: function () { clicked.push('retry'); } }, { text: 'Done', value: 'done' }]
    });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    var subtitle = panel.querySelector('.stolon-drawer-subtitle');
    assert.equal(subtitle.textContent, 'Library on Den');
    assert.equal(panel.getAttribute('aria-describedby'), subtitle.id);
    var badge = panel.querySelector('.stolon-drawer-badge');
    assert.equal(badge.textContent, 'Errored');
    assert.ok(badge.classList.contains('red'));
    assert.equal(handle.content.innerHTML, '<p>Body</p>');
    var buttons = panel.querySelectorAll('.stolon-drawer-footer .stolon-modal-button');
    assert.equal(buttons.length, 2);
    buttons[0].click();
    assert.deepEqual(clicked, ['retry']);
    assert.equal(drawers(), 1);
});

test('Escape closes the drawer, unlocks the page scroll, and returns focus to the control that opened it', function () {
    var opener = dom.el('button', { type: 'button' });
    dom.document.body.appendChild(opener);
    opener.focus();
    var closedWith = [];
    openDetailDrawer({ title: 'Movies', buttons: [{ text: 'Done' }], onClose: function (v) { closedWith.push(v); } });
    assert.equal(dom.document.body.style.overflow, 'hidden');
    assert.notEqual(dom.document.activeElement, opener);
    dom.document.key('Escape');
    assert.equal(drawers(), 0);
    assert.equal(dom.document.body.style.overflow, '');
    assert.equal(dom.document.activeElement, opener);
    assert.deepEqual(closedWith, [undefined]);
});

test('setContent swaps the title, subtitle, badge, body, and buttons without closing', function () {
    var handle = openDetailDrawer({ title: 'One', subtitle: 'First', badge: { label: 'Synced', color: 'green' }, body: '<p>1</p>', buttons: [{ text: 'Next' }] });
    handle.setContent({ title: 'Two', body: '<p>2</p>' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(handle.isOpen(), true);
    assert.equal(drawers(), 1);
    assert.equal(panel.querySelector('.stolon-drawer-title').textContent, 'Two');
    assert.equal(panel.querySelector('.stolon-drawer-subtitle').hidden, true);
    assert.equal(panel.hasAttribute('aria-describedby'), false);
    assert.equal(panel.querySelector('.stolon-drawer-badge'), null);
    assert.equal(handle.content.innerHTML, '<p>2</p>');
    assert.equal(panel.querySelector('.stolon-drawer-footer'), null);
});

test('a footer button that swaps the content keeps focus on the same button of the new footer', function () {
    var handle;
    handle = openDetailDrawer({ title: 'One', buttons: [{ text: 'Previous' }, { text: 'Next', action: function () { handle.setContent({ title: 'Two', buttons: [{ text: 'Previous' }, { text: 'Next' }] }); } }] });
    var next = handle.element.querySelectorAll('.stolon-modal-button')[1];
    next.focus();
    next.click();
    var now = handle.element.querySelectorAll('.stolon-modal-button');
    assert.equal(dom.document.activeElement, now[1]);
    assert.notEqual(now[1], next);
});

test('a drawer with no title is named by ariaLabel, else Details', function () {
    var handle = openDetailDrawer({ body: 'x' });
    var panel = handle.element.querySelector('.stolon-dialog-content');
    assert.equal(panel.getAttribute('aria-label'), 'Details');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.close();
    var named = openDetailDrawer({ ariaLabel: 'Row details' });
    assert.equal(named.element.querySelector('.stolon-dialog-content').getAttribute('aria-label'), 'Row details');
});

test('detailDrawerOpener opens a drawer for the first item and swaps the next one in while it is open', function () {
    var show = detailDrawerOpener(function (row) { return { title: row.name }; }, { size: 'large' });
    var first = show({ name: 'Movies' });
    assert.equal(first.element.classList.contains('large'), true);
    var second = show({ name: 'Shows' });
    assert.equal(second, first);
    assert.equal(drawers(), 1);
    assert.equal(first.element.querySelector('.stolon-drawer-title').textContent, 'Shows');
    first.close();
    var third = show({ name: 'Music' });
    assert.notEqual(third, first);
    assert.equal(drawers(), 1);
});

test('the drawer and openDialog share one shell, so a drawer over a dialog takes Escape first', function () {
    var dialog = openDialog({ title: 'Below' });
    openDetailDrawer({ title: 'Above' });
    dom.document.key('Escape');
    assert.equal(drawers(), 0);
    assert.equal(dom.document.querySelectorAll('.stolon-dialog').length, 1);
    dialog.close();
});

test('every dialog in the family builds its corner close button on the panel through the one shell', async function () {
    var kit = await import('../../src/js/index.js');
    var opened = [
        function () { kit.openDialog({ title: 'A' }); },
        function () { kit.confirmDialog('Sure?'); },
        function () { kit.confirmDialog('Sure?', { typeToConfirm: 'Yes' }); },
        function () { kit.promptDialog([{ name: 'n' }]); },
        function () { kit.openEditorDialog({ title: 'Edit' }); },
        function () { openDetailDrawer({ title: 'Details' }); }
    ];
    opened.forEach(function (open) {
        open();
        var panel = dom.document.querySelector('.stolon-dialog-content');
        var close = panel.querySelector('.stolon-dialog-close');
        assert.equal(close.parentNode, panel);
        assert.equal(panel.children[0], close);
        assert.equal(close.className, 'stolon-row-btn stolon-dialog-close');
        close.click();
        assert.equal(dom.document.querySelectorAll('.stolon-dialog').length, 0);
    });
});

test('the close button is inset by the panel padding, which a drawer and a phone panel share', async function () {
    var { readFileSync } = await import('node:fs');
    var css = readFileSync(new URL('../../src/css/dialog.css', import.meta.url), 'utf8');
    var rule = css.match(/^\.stolon-dialog-close \{[^}]*\}/m)[0];
    assert.match(rule, /top: var\(--stolon-dialog-pad/);
    assert.match(rule, /right: var\(--stolon-dialog-pad/);
    assert.match(css, /\.stolon-dialog-content \{\s*--stolon-dialog-pad: calc\(var\(--stolon-pad-large\) \* 1\.5\);/);
    assert.match(css, /padding: var\(--stolon-dialog-pad\);/);
});
