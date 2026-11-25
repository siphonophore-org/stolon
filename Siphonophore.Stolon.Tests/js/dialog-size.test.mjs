// Tests for the dialog sizes, compact and full, and the sidecar sizes, medium and large, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog, confirmDialog, promptSidecar, openEditorSidecar } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function panel() { return dom.document.body.querySelector('.stolon-dialog-content'); }
function overlay() { return dom.document.body.querySelector('.stolon-dialog'); }

test('a dialog is compact, title, description, and buttons, unless it has a context', function () {
    var d = openDialog({ title: 'Remove Server B', description: 'Its mappings go with it.', buttons: [{ text: 'Cancel' }] });
    assert.equal(panel().classList.contains('stolon-compact'), true);
    assert.equal(overlay().classList.contains('stolon-compact'), true);
    assert.deepEqual(panel().children.map(function (c) { return c.className; }), ['stolon-modal-title', 'stolon-modal-description', 'stolon-modal-button-row']);
    assert.equal(d.content.textContent, 'Its mappings go with it.');
    d.close();
});

test('a full dialog is the title, the subtitle, the context, and the buttons, and an unknown size follows the context', function () {
    var poster = dom.el('img', {}, []);
    var full = openDialog({ title: 'Delete Charade', subtitle: 'The file goes from every server.', context: poster, buttons: [{ text: 'Delete' }] });
    assert.equal(panel().classList.contains('stolon-full'), true);
    assert.deepEqual(panel().children.map(function (c) { return c.className; }), ['stolon-modal-title', 'stolon-modal-subtitle', 'stolon-modal-context', 'stolon-modal-button-row']);
    assert.equal(full.content.children[0], poster);
    full.close();
    var odd = openDialog({ title: 'C', size: 'huge' });
    assert.equal(panel().classList.contains('stolon-compact'), true);
    odd.close();
});

test('a dialog never scrolls, and its sizes are fixed widths', function () {
    var css = readFileSync(new URL('../../src/css/dialog.css', import.meta.url), 'utf8');
    var base = css.match(/^\.stolon-dialog-content \{[^}]*\}/m)[0];
    assert.match(base, /overflow: hidden;/);
    assert.doesNotMatch(css, /overflow-y: auto/);
    assert.match(css, /\.stolon-dialog-content\.stolon-compact \{ max-width: 420px; \}/);
    assert.match(css, /\.stolon-dialog-content\.stolon-full \{ max-width: 560px; \}/);
});

test('a confirm is compact, a typed confirm is full, a prompt is a medium sidecar, and an editor a large one unless sized', function () {
    confirmDialog('Its mappings go with it.', { title: 'Remove Server B' });
    assert.equal(panel().classList.contains('stolon-compact'), true);
    dom.document.key('Escape');
    confirmDialog('The file goes from every server.', { title: 'Delete Charade', typeToConfirm: 'Charade' });
    assert.equal(panel().classList.contains('stolon-full'), true);
    dom.document.key('Escape');
    promptSidecar([{ name: 'name', value: '' }]);
    assert.equal(panel().classList.contains('stolon-sidecar-panel'), true);
    assert.equal(panel().classList.contains('stolon-medium'), true);
    dom.document.key('Escape');
    var editor = openEditorSidecar({ title: 'Edit' });
    assert.equal(panel().classList.contains('stolon-large'), true);
    editor.close();
    var medium = openEditorSidecar({ title: 'Edit', size: 'medium' });
    assert.equal(panel().classList.contains('stolon-medium'), true);
    medium.close();
});

test('a dialog given the page closes when the page cleans up', function () {
    var cleanups = [];
    var closed = [];
    openDialog({ title: 'Edit', page: { addCleanup: function (fn) { cleanups.push(fn); return fn; } }, onClose: function (v) { closed.push(v); } });
    assert.equal(cleanups.length, 1);
    cleanups[0]();
    assert.equal(closed.length, 1);
    cleanups[0]();
    assert.equal(closed.length, 1);
});
