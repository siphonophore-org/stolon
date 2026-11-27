// Tests for createResetRow and createResetGroup, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createResetRow, createResetGroup } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('createResetRow builds the reset group markup with a leading tile, its text, and an emby-button', function () {
    var row = createResetRow({ icon: 'history', label: 'History sync', help: 'Forgets history tracking.', button: 'Reset', action: 'reset-history', destructive: true });
    var el = row.element;
    assert.equal(el.className, 'stolon-reset-row');
    assert.deepEqual(el.children.map(function (c) { return c.className; }), ['stolon-collapsible-tile stolon-red', 'stolon-reset-info', 'raised stolon-button stolon-small stolon-destructive']);
    assert.equal(el.children[0].getAttribute('aria-hidden'), 'true');
    assert.equal(el.children[0].querySelector('.material-icons').textContent, 'history');
    assert.equal(el.querySelector('.stolon-reset-info').children[0].textContent, 'History sync');
    assert.equal(el.querySelector('.fieldDescription').textContent, 'Forgets history tracking.');
    assert.equal(row.button.getAttribute('is'), 'emby-button');
    assert.equal(row.button.getAttribute('type'), 'button');
    assert.equal(row.button.getAttribute('data-action'), 'reset-history');
    assert.equal(row.button.querySelector('span').textContent, 'Reset');
});

test('a reset row tile takes the accent normally, gray while empty, and red when destructive and not empty', function () {
    var row = createResetRow({ icon: 'info', label: 'Metadata' });
    var tile = row.element.querySelector('.stolon-collapsible-tile');
    assert.equal(tile.className, 'stolon-collapsible-tile');
    assert.equal(row.button.classList.contains('stolon-secondary'), true);
    row.setEmpty(true);
    assert.equal(tile.className, 'stolon-collapsible-tile stolon-gray');
    assert.equal(row.getValue(), true);
    row.setEmpty(false);
    assert.equal(tile.className, 'stolon-collapsible-tile');
    var red = createResetRow({ icon: 'delete', label: 'All', destructive: true, empty: true });
    var redTile = red.element.querySelector('.stolon-collapsible-tile');
    assert.equal(redTile.className, 'stolon-collapsible-tile stolon-gray');
    red.setEmpty(false);
    assert.equal(redTile.className, 'stolon-collapsible-tile stolon-red');
});

test('a reset row labels its button Reset by default, takes a built button, and calls onClick until destroyed', function () {
    var pressed = [];
    var row = createResetRow({ icon: 'info', label: 'Metadata', onClick: function (b) { pressed.push(b); } });
    assert.equal(row.button.textContent, 'Reset');
    row.button.click();
    assert.deepEqual(pressed, [row.button]);
    row.destroy();
    row.button.click();
    assert.equal(pressed.length, 1);
    var own = dom.el('button', { id: 'mine' });
    var built = createResetRow({ icon: 'info', label: 'Mine', button: own, action: 'mine' });
    assert.equal(built.button, own);
    assert.equal(own.getAttribute('data-action'), 'mine');
    assert.equal(built.element.children[2], own);
    assert.equal(createResetRow({ icon: 'info', label: 'No help' }).element.querySelector('.fieldDescription'), null);
});

test('createResetGroup holds the rows in order, from options or handles, and destroys each', function () {
    var pressed = 0;
    var first = createResetRow({ icon: 'history', label: 'First', onClick: function () { pressed++; } });
    var group = createResetGroup([first, { icon: 'info', label: 'Second' }, null]);
    assert.equal(group.element.className, 'stolon-reset-group');
    assert.equal(group.rows.length, 2);
    assert.equal(group.rows[0], first);
    assert.deepEqual(all(group.element, '.stolon-reset-info').map(function (i) { return i.children[0].textContent; }), ['First', 'Second']);
    group.destroy();
    first.button.click();
    assert.equal(pressed, 0);
});
