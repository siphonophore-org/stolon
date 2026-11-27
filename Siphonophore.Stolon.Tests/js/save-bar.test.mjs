// Tests the save bar: its status line for unsaved, saving, saved, and failed, and its button.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createSaveBar } = await import('../../src/js/index.js');

function line(bar) {
    var text = bar.status.querySelector('.stolon-status-message');
    var glyph = bar.status.querySelector('.material-icons');
    return { text: text ? text.textContent : '', icon: glyph ? glyph.textContent : '' };
}

test('setDirty shows the pending line with the warning icon, and clearing it removes the line', function () {
    var bar = createSaveBar();
    assert.deepEqual(line(bar), { text: '', icon: '' });
    bar.setDirty(true);
    assert.deepEqual(line(bar), { text: 'Unsaved changes.', icon: 'warning' });
    assert.equal(bar.status.classList.contains('stolon-warn'), true);
    bar.setDirty(false);
    assert.equal(bar.getState(), '');
    assert.deepEqual(line(bar), { text: '', icon: '' });
});

test('Save shows Saving, then Changes saved when onSave resolves', async function () {
    var release;
    var bar = createSaveBar({ onSave: function () { return new Promise(function (r) { release = r; }); } });
    bar.setDirty(true);
    bar.button.click();
    await Promise.resolve();
    assert.equal(bar.getState(), 'saving');
    assert.equal(bar.button.disabled, true);
    assert.equal(line(bar).icon, 'info');
    release();
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.equal(bar.getState(), 'saved');
    assert.deepEqual(line(bar), { text: 'Changes saved.', icon: 'check_circle' });
    assert.equal(bar.button.disabled, false);
});

test('a failed save shows Could not save as an alert and stays until the next change', async function () {
    var bar = createSaveBar({ onSave: function () { return Promise.reject(); } });
    var ok = await bar.save();
    assert.equal(ok, false);
    assert.deepEqual(line(bar), { text: 'Could not save.', icon: 'error' });
    assert.equal(bar.status.getAttribute('role'), 'alert');
    bar.setDirty(true);
    assert.equal(bar.getState(), 'pending');
});

test('every line can be replaced, and a state can be set directly', function () {
    var bar = createSaveBar({ pendingText: 'Changes waiting.', state: 'pending', saveText: 'Apply Changes' });
    assert.equal(bar.button.textContent, 'Apply Changes');
    assert.equal(line(bar).text, 'Changes waiting.');
    bar.setState('failed', 'The server said no.');
    assert.equal(line(bar).text, 'The server said no.');
});

test('a save that rejects with an Error or text shows that message as the failed line', async function () {
    var bar = createSaveBar({ onSave: function () { return Promise.reject(new Error('The name is taken.')); } });
    assert.equal(await bar.save(), false);
    assert.equal(line(bar).text, 'The name is taken.');
    var text = createSaveBar({ onSave: function () { throw 'Disk full.'; } });
    await text.save();
    assert.equal(line(text).text, 'Disk full.');
});

var kit = await import('../../src/js/index.js');

function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }

function edit(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }

function sections() {
    var dom = installFakeDom();
    var guard = null;
    var page = { guardUnsaved: function (fn) { guard = fn; } };
    var a = dom.el('div', {}, [dom.el('input', { type: 'text' })]);
    var controls = dom.el('div', { class: 'stolon-table-controls' }, [dom.el('input', { type: 'search' })]);
    var b = dom.el('div', {}, [controls, dom.el('input', { type: 'text' })]);
    dom.document.body.appendChild(a);
    dom.document.body.appendChild(b);
    return { dom: dom, page: page, guard: function () { return guard; }, a: a, b: b, controls: controls };
}

test('each section gets its own bar at its end, and an edit marks only that section unsaved', function () {
    var ui = sections();
    var bars = kit.createSaveBars(ui.page);
    var barA = bars.add(ui.a, {});
    var barB = bars.add(ui.b, {});
    assert.equal(ui.a.children[ui.a.children.length - 1], barA.element);
    assert.ok(barA.button.classList.contains('stolon-fill'));
    edit(ui.a.querySelector('input'));
    assert.equal(barA.getState(), 'pending');
    assert.equal(barB.getState(), '');
    assert.equal(ui.guard()(), true);
    bars.clean();
    assert.equal(barA.getState(), '');
    assert.equal(bars.isDirty(), false);
    assert.equal(bars.add(null, {}), null);
});

test('a table search and the bar itself leave a section saved, and markDirty marks one from code', function () {
    var ui = sections();
    var bars = kit.createSaveBars(ui.page);
    var bar = bars.add(ui.b, {});
    edit(ui.controls.querySelector('input'));
    edit(bar.button);
    assert.equal(bar.getState(), '');
    bars.markDirty(bar);
    assert.equal(bar.getState(), 'pending');
});

test('a save that lands clears its section, and text it resolves with is the saved line', async function () {
    var ui = sections();
    var bars = kit.createSaveBars(ui.page);
    var bar = bars.add(ui.a, { onSave: function () { return Promise.resolve('Saved, restart to apply.'); } });
    edit(ui.a.querySelector('input'));
    assert.equal(await bar.save(), true);
    await settle();
    assert.equal(bars.isDirty(), false);
    assert.equal(line(bar).text, 'Saved, restart to apply.');
});

test('a failed save keeps its section unsaved, and an invalid field in it stops the save', async function () {
    var ui = sections();
    var bars = kit.createSaveBars(ui.page);
    var bar = bars.add(ui.a, { onSave: function () { return Promise.reject(new Error('No.')); } });
    edit(ui.a.querySelector('input'));
    assert.equal(await bar.save(), false);
    assert.equal(bars.isDirty(), true);
    var ran = 0;
    var field = ui.dom.el('input', { type: 'number', min: '1' });
    field.value = '0';
    ui.b.appendChild(field);
    var guarded = bars.add(ui.b, { onSave: function () { ran++; } });
    assert.equal(await guarded.save(), false);
    assert.equal(ran, 0);
    assert.equal(line(guarded).text, 'Fix the fields marked in red.');
});

test('a tracker decides whether its section is unsaved, so an edit put back leaves it saved', async function () {
    var ui = sections();
    var input = ui.a.querySelector('input');
    var saved = '';
    var tracker = { isDirty: function () { return input.value !== saved; }, markClean: function () { saved = input.value; } };
    var bars = kit.createSaveBars(ui.page);
    var bar = bars.add(ui.a, { tracker: tracker });
    input.value = 'x';
    edit(input);
    assert.equal(bar.getState(), 'pending');
    input.value = '';
    edit(input);
    assert.equal(bar.getState(), '');
    input.value = 'y';
    edit(input);
    await bar.save();
    assert.equal(saved, 'y');
    bars.destroy();
    input.value = 'z';
    edit(input);
    assert.equal(bars.isDirty(), false);
});
