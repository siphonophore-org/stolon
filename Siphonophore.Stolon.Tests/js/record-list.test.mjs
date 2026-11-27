// Behavior tests for createRecordList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';
import { readFileSync } from 'node:fs';

var dom = installFakeDom();
var { createRecordList } = await import('../../src/js/record-list.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ITEMS = [
    { id: 'a', title: 'Discord', secondary: 'Every event', tags: [{ label: 'Movies', icon: 'movie' }, { label: '4K', off: true }] },
    { id: 'b', title: 'Email' }
];

function rows(list) { return all(list.element, '.stolon-record-list-row'); }

test('each row shows its title and secondary line as item row parts, and its tags', function () {
    var list = createRecordList({ items: ITEMS });
    var row = rows(list)[0];
    assert.ok(row.classList.contains('stolon-item-row'));
    assert.equal(row.querySelector('.stolon-item-row-primary').textContent, 'Discord');
    assert.equal(row.querySelector('.stolon-item-row-secondary').textContent, 'Every event');
    var tags = all(row, '.stolon-tag');
    assert.equal(tags.length, 2);
    assert.equal(tags[0].querySelector('.material-icons').textContent, 'movie');
    assert.ok(tags[1].classList.contains('stolon-tag-off'));
    assert.equal(tags[1].querySelector('.stolon-sr-only').textContent, ' off');
    assert.equal(rows(list)[1].querySelector('.stolon-tags'), null);
});

test('with onOpen a row opens by a click, by Enter, and by its chevron', function () {
    var opened = [];
    var list = createRecordList({ items: ITEMS, onOpen: function (item) { opened.push(item.id); } });
    dom.document.body.appendChild(list.element);
    var row = rows(list)[0];
    var chevron = row.querySelector('.stolon-record-list-open');
    assert.equal(chevron.getAttribute('aria-label'), 'Open Discord');
    assert.equal(chevron.querySelector('.material-icons').textContent, 'chevron_right');
    row.click();
    chevron.click();
    row.focus();
    dom.document.key('Enter');
    assert.deepEqual(opened, ['a', 'a', 'a']);
});

test('an aside control takes the chevron place, and a click on it opens nothing', function () {
    var opened = [];
    var btn = dom.document.createElement('button');
    var list = createRecordList({ items: [{ id: 'x', title: 'X', aside: btn }], onOpen: function (item) { opened.push(item.id); } });
    var row = rows(list)[0];
    assert.equal(row.querySelector('.stolon-record-list-open'), null);
    assert.equal(row.querySelector('.stolon-record-list-aside').children[0], btn);
    btn.click();
    assert.deepEqual(opened, []);
});

test('setItems keeps a row whose content did not change and draws the changed one again', function () {
    var list = createRecordList({ items: ITEMS });
    var first = rows(list)[0];
    var second = rows(list)[1];
    list.setItems([ITEMS[0], { id: 'b', title: 'Email', secondary: 'Daily' }]);
    assert.equal(rows(list)[0], first);
    assert.notEqual(rows(list)[1], second);
    assert.equal(rows(list)[1].querySelector('.stolon-item-row-secondary').textContent, 'Daily');
});

test('an empty list shows its empty sentence', function () {
    var list = createRecordList({ emptyText: 'No destinations.' });
    assert.equal(list.element.querySelector('.stolon-list-empty').textContent, 'No destinations.');
});

test('a tag takes a status color or a hex code', function () {
    var list = createRecordList({ items: [{ id: 1, title: 'Ada', tags: [{ label: 'Invited', color: 'green' }, { label: 'Reset', color: '#ff8800' }, { label: 'Plain' }] }] });
    var tags = all(list.element, '.stolon-tag');
    assert.equal(tags[0].classList.contains('stolon-green'), true);
    assert.equal(tags[1].classList.contains('stolon-custom'), true);
    assert.equal(tags[2].className, 'stolon-tag');
});

test('an aside with asideFill is marked to fill, and the row text takes nearly all the room so the aside fills only a line of its own', function () {
    var meter = dom.el('div', { class: 'stolon-usage-meter' });
    var list = createRecordList({ items: [{ id: 'a', title: 'Disk', aside: meter, asideFill: true }, { id: 'b', title: 'Other', aside: dom.el('button') }] });
    var asides = all(list.element, '.stolon-record-list-aside');
    assert.ok(asides[0].classList.contains('stolon-fill'));
    assert.equal(asides[1].classList.contains('stolon-fill'), false);
    var css = readFileSync(new URL('../../src/css/record-list.css', import.meta.url), 'utf8');
    assert.match(/\.stolon-record-list-body \{([^}]*)\}/.exec(css)[1], /flex: 1000 1 /);
    assert.match(/\.stolon-record-list-aside\.stolon-fill \{([^}]*)\}/.exec(css)[1], /flex-grow: 1/);
});
