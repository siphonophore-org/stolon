// Behavior tests for rowSizes and balanceRows, which keep wrapped tiles in even rows with no tile alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { rowSizes, evenColumns, balanceRows } = await import('../../src/js/lib/balance.js');

test('rows split evenly in the fewest rows the columns allow', function () {
    assert.deepEqual(rowSizes(3, 3), [3]);
    assert.deepEqual(rowSizes(4, 3), [2, 2]);
    assert.deepEqual(rowSizes(5, 3), [3, 2]);
    assert.deepEqual(rowSizes(6, 4), [3, 3]);
    assert.deepEqual(rowSizes(7, 3), [3, 2, 2]);
    assert.deepEqual(rowSizes(9, 4), [3, 3, 3]);
});

test('no row holds a single tile while two fit side by side', function () {
    for (var count = 2; count <= 20; count++) {
        for (var columns = 2; columns <= 6; columns++) {
            var sizes = rowSizes(count, columns);
            assert.equal(sizes.reduce(function (a, b) { return a + b; }, 0), count, count + ' tiles in ' + columns);
            assert.equal(sizes.every(function (n) { return n >= 2; }), true, count + ' tiles in ' + columns + ' gave ' + sizes);
            assert.ok(Math.max.apply(null, sizes) - Math.min.apply(null, sizes) <= 1, count + ' tiles in ' + columns + ' gave ' + sizes);
        }
    }
});

test('three tiles in two columns share one row rather than leave one alone', function () {
    assert.deepEqual(rowSizes(3, 2), [3]);
});

test('one column stacks every tile, and no tiles give no rows', function () {
    assert.deepEqual(rowSizes(3, 1), [1, 1, 1]);
    assert.deepEqual(rowSizes(0, 3), []);
    assert.deepEqual(rowSizes(1, 3), [1]);
});

test('balanceRows gives each tile its share of a grid sized by the row sizes', function () {
    var box = dom.document.createElement('div');
    for (var i = 0; i < 5; i++) box.appendChild(dom.document.createElement('div'));
    Object.defineProperty(box, 'clientWidth', { value: 520 });
    var handle = balanceRows(box, { minWidth: 160, gap: 12 });
    assert.equal(box.classList.contains('stolon-balanced'), true);
    assert.equal(box.style['--stolon-balance-columns'], '6');
    assert.deepEqual(box.children.map(function (c) { return c.style['--stolon-balance-span']; }), ['2', '2', '2', '3', '3']);
    handle.destroy();
    assert.equal(box.classList.contains('stolon-balanced'), false);
});

test('balanceRows leaves out hidden children and the ones skip names', function () {
    var box = dom.document.createElement('div');
    for (var i = 0; i < 4; i++) box.appendChild(dom.document.createElement('div'));
    var empty = dom.document.createElement('div');
    empty.className = 'empty-note';
    box.appendChild(empty);
    box.children[3].hidden = true;
    Object.defineProperty(box, 'clientWidth', { value: 1000 });
    balanceRows(box, { minWidth: 160, gap: 12, skip: '.empty-note' });
    assert.equal(box.style['--stolon-balance-columns'], '3');
    assert.equal(empty.style['--stolon-balance-span'], undefined);
});

test('even columns take the most that fill every row, down to half of what fits, else as many as fit without a lone last tile', function () {
    assert.equal(evenColumns(10, 6), 5);
    assert.equal(evenColumns(6, 4), 3);
    assert.equal(evenColumns(6, 5), 3);
    assert.equal(evenColumns(6, 6), 6);
    assert.equal(evenColumns(8, 5), 4);
    assert.equal(evenColumns(7, 6), 5);
    assert.equal(evenColumns(5, 3), 3);
    assert.equal(evenColumns(9, 8), 7);
    assert.equal(evenColumns(4, 6), 4);
    assert.equal(evenColumns(3, 2), 2);
    assert.equal(evenColumns(0, 4), 1);
});

test('stolon-even gives every tile one span when the rows fill, so ten cards that fit six across take two rows of five', function () {
    var box = dom.document.createElement('div');
    box.className = 'stolon-cards stolon-even';
    for (var i = 0; i < 10; i++) box.appendChild(dom.document.createElement('div'));
    Object.defineProperty(box, 'clientWidth', { value: 6 * 110 + 5 * 12 });
    balanceRows(box, { minWidth: 110, gap: 12 });
    assert.equal(box.style['--stolon-balance-columns'], '5');
    assert.deepEqual(box.children.map(function (c) { return c.style['--stolon-balance-span']; }), Array(10).fill('1'));
});

test('the even option does what stolon-even does, and a short last row stretches to fill the row', function () {
    var box = dom.document.createElement('div');
    for (var i = 0; i < 5; i++) box.appendChild(dom.document.createElement('div'));
    Object.defineProperty(box, 'clientWidth', { value: 520 });
    balanceRows(box, { minWidth: 160, gap: 12, even: true });
    assert.equal(box.style['--stolon-balance-columns'], '6');
    assert.deepEqual(box.children.map(function (c) { return c.style['--stolon-balance-span']; }), ['2', '2', '2', '3', '3']);
});
