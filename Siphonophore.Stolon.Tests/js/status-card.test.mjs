// Behavior tests for createStatusCard and createStatusCardGrid, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createStatusCard, createStatusCardGrid } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function part(card, name) { return card.element.querySelector('.stolon-status-card-' + name); }

test('a status card draws its icon, pill, title, and detail in order, and is a plain block with no href or onClick', function () {
    var card = createStatusCard({ icon: 'vpn_lock', title: 'VPN', status: 'Check', statusColor: 'orange', detail: '3 of 7 peers online' });
    assert.equal(card.element.tagName, 'DIV');
    assert.equal(card.element.className, 'stolon-status-card');
    assert.deepEqual(card.element.children.map(function (c) { return c.className; }), ['stolon-status-card-head', 'stolon-status-card-title', 'stolon-status-card-value', 'stolon-status-card-detail']);
    assert.equal(part(card, 'icon').textContent, 'vpn_lock');
    assert.equal(part(card, 'icon').getAttribute('aria-hidden'), 'true');
    var pill = part(card, 'pill');
    assert.equal(pill.textContent, 'Check');
    assert.ok(pill.classList.contains('stolon-badge'));
    assert.ok(pill.classList.contains('stolon-orange'));
    assert.equal(part(card, 'title').textContent, 'VPN');
    assert.equal(part(card, 'detail').textContent, '3 of 7 peers online');
});

test('the title and detail carry their full text as a tooltip, and an empty part hides', function () {
    var card = createStatusCard({ title: 'Storage', detail: 'Media at 82%' });
    assert.equal(part(card, 'title').title, 'Storage');
    assert.equal(part(card, 'detail').title, 'Media at 82%');
    assert.equal(part(card, 'icon').hidden, true);
    assert.equal(part(card, 'pill'), null);
    assert.equal(part(card, 'value').hidden, true);
    card.setDetail('');
    assert.equal(part(card, 'detail').hidden, true);
    assert.equal(part(card, 'detail').hasAttribute('title'), false);
});

test('the pill takes a badge state color with no statusColor, gray for any other status, and a hex code through the color core', function () {
    assert.ok(part(createStatusCard({ status: 'Failed' }), 'pill').classList.contains('stolon-red'));
    assert.ok(part(createStatusCard({ status: 'Ok' }), 'pill').classList.contains('stolon-gray'));
    var hex = part(createStatusCard({ status: 'Ok', statusColor: '#e91e63' }), 'pill');
    assert.ok(hex.classList.contains('stolon-custom'));
    assert.equal(hex.style.getPropertyValue('--stolon-custom'), '#e91e63');
});

test('setStatus replaces the pill and setDetail replaces the detail line', function () {
    var card = createStatusCard({ title: 'VPN', status: 'Check', statusColor: 'orange', detail: '3 of 7 peers online' });
    card.setStatus('Ok', 'green');
    assert.equal(card.element.querySelectorAll('.stolon-status-card-pill').length, 1);
    assert.equal(part(card, 'pill').textContent, 'Ok');
    assert.ok(part(card, 'pill').classList.contains('stolon-green'));
    card.setDetail('7 of 7 peers online');
    assert.equal(part(card, 'detail').textContent, '7 of 7 peers online');
    assert.equal(part(card, 'detail').title, '7 of 7 peers online');
    card.setStatus('');
    assert.equal(part(card, 'pill'), null);
});

test('a value shows large with its label, and setValue replaces it and keeps the label unless given', function () {
    var card = createStatusCard({ title: 'Items', value: 1204, valueLabel: 'items' });
    assert.equal(part(card, 'value').hidden, false);
    assert.equal(part(card, 'number').textContent, '1204');
    assert.equal(part(card, 'unit').textContent, 'items');
    assert.equal(card.getValue(), 1204);
    card.setValue(1300);
    assert.equal(part(card, 'number').textContent, '1300');
    assert.equal(part(card, 'unit').textContent, 'items');
    card.setValue(0, '');
    assert.equal(part(card, 'number').textContent, '0');
    assert.equal(part(card, 'unit').hidden, true);
    card.setValue(null);
    assert.equal(part(card, 'value').hidden, true);
});

test('an href makes the card a clickable link, and onClick makes it a button that reports the click', function () {
    var link = createStatusCard({ title: 'VPN', href: '#vpn' });
    assert.equal(link.element.tagName, 'A');
    assert.equal(link.element.getAttribute('href'), '#vpn');
    assert.ok(link.element.classList.contains('stolon-clickable'));
    var heard = [];
    var button = createStatusCard({ title: 'Errors', onClick: function (e) { heard.push(e.type); } });
    assert.equal(button.element.tagName, 'BUTTON');
    assert.equal(button.element.getAttribute('type'), 'button');
    assert.ok(button.element.classList.contains('stolon-clickable'));
    button.element.click();
    assert.deepEqual(heard, ['click']);
    button.destroy();
    button.element.click();
    assert.deepEqual(heard, ['click']);
});

test('the grid balances its cards and builds one card per entry', function () {
    var grid = createStatusCardGrid({ cards: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] });
    dom.document.body.appendChild(grid.element);
    assert.ok(grid.element.classList.contains('stolon-status-cards'));
    assert.ok(grid.element.classList.contains('stolon-balanced'));
    assert.equal(grid.getCards().length, 3);
    assert.deepEqual(grid.element.children.map(function (c) { return c.querySelector('.stolon-status-card-title').textContent; }), ['A', 'B', 'C']);
});

test('the grid add appends a card, setCards replaces them, and destroy removes the balance', function () {
    var grid = createStatusCardGrid({ cards: [{ title: 'A' }] });
    var added = grid.add({ title: 'B', status: 'Ok' });
    assert.equal(grid.getCards().length, 2);
    assert.equal(grid.getCards()[1], added);
    var next = grid.setCards([{ title: 'C' }]);
    assert.equal(next.length, 1);
    assert.equal(grid.element.children.length, 1);
    assert.equal(grid.element.children[0].querySelector('.stolon-status-card-title').textContent, 'C');
    grid.destroy();
    assert.equal(grid.element.classList.contains('stolon-balanced'), false);
    assert.equal(grid.element.children.length, 0);
});

test('dots draw a row of named status dots in the sparkline place', function () {
    var card = createStatusCard({ title: 'Servers', dots: [{ color: 'green', label: 'Alpha' }, { color: 'red', label: 'Beta' }] });
    var dots = card.element.querySelectorAll('.stolon-status-card-dots .stolon-dot');
    assert.equal(dots.length, 2);
    assert.ok(dots[1].classList.contains('stolon-red'));
    assert.equal(dots[1].getAttribute('aria-label'), 'Beta');
    assert.equal(card.element.querySelector('.stolon-status-card-sparkline'), null);
    card.setDots(null);
    assert.equal(card.element.querySelector('.stolon-status-card-dots'), null);
});

test('segments split a bar by share and name every part', function () {
    var card = createStatusCard({ title: 'Queue', segments: [{ label: 'Pending', value: 3, color: 'orange' }, { label: 'Sent', value: 0, color: 'blue' }, { label: 'Failed', value: 1, color: 'red' }] });
    var meter = card.element.querySelector('.stolon-status-card-meter');
    assert.equal(meter.getAttribute('aria-label'), 'Pending 3, Sent 0, Failed 1');
    var parts = meter.querySelectorAll('.stolon-status-card-bar-part');
    assert.equal(parts.length, 2);
    assert.equal(parts[0].style.getPropertyValue('--stolon-status-share'), '75.000%');
    assert.ok(parts[1].classList.contains('stolon-red'));
});

test('segments that add to 0 leave an empty track', function () {
    var card = createStatusCard({ title: 'Queue', segments: [{ label: 'Pending', value: 0 }] });
    assert.ok(card.element.querySelector('.stolon-status-card-bar'));
    assert.equal(card.element.querySelectorAll('.stolon-status-card-bar-part').length, 0);
});

test('bars draw a column per entry, sized to the largest, with a faint stub for 0', function () {
    var card = createStatusCard({ title: 'Queue', bars: [{ label: 'Pending', value: 4, color: 'orange' }, { label: 'Sent', value: 1, color: 'blue' }, { label: 'Failed', value: 0, color: 'red' }] });
    var chart = card.element.querySelector('.stolon-status-card-columns');
    assert.equal(chart.getAttribute('aria-label'), 'Pending 4, Sent 1, Failed 0');
    var columns = chart.querySelectorAll('.stolon-status-card-column');
    assert.equal(columns.length, 3);
    assert.equal(columns[0].style.getPropertyValue('--stolon-status-share'), '100.000%');
    assert.equal(columns[1].style.getPropertyValue('--stolon-status-share'), '25.000%');
    assert.ok(columns[2].classList.contains('stolon-zero'));
    assert.ok(columns[2].classList.contains('stolon-red'));
});

test('legend lists every segment under the bar with a dot in its part color, its label, and its value, and a new set replaces it', function () {
    var card = createStatusCard({ title: 'Queue', legend: true, segments: [{ label: 'Pending', value: 3, color: 'orange' }, { label: 'Sent', value: 0 }, { label: 'Late', value: 2, color: 'teal' }] });
    var legend = card.element.querySelector('.stolon-status-card-legend');
    assert.equal(legend.getAttribute('aria-hidden'), 'true');
    var kids = card.element.children;
    assert.equal(kids[kids.indexOf(legend) - 1], card.element.querySelector('.stolon-status-card-meter'));
    var keys = Array.prototype.slice.call(legend.querySelectorAll('.stolon-status-card-key'));
    assert.deepEqual(keys.map(function (k) { return [k.children[1].textContent, k.querySelector('.stolon-status-card-amount').textContent]; }), [['Pending', '3'], ['Sent', '0'], ['Late', '2']]);
    assert.ok(keys[0].querySelector('.stolon-dot').classList.contains('stolon-orange'));
    assert.ok(keys[1].querySelector('.stolon-dot').classList.contains('stolon-blue'));
    assert.ok(keys[2].querySelector('.stolon-dot').classList.contains('stolon-teal'));
    assert.ok(card.element.querySelector('.stolon-status-card-bar-part.stolon-teal'));
    card.setSegments([{ label: 'Done', value: 1, color: 'green' }]);
    assert.equal(card.element.querySelectorAll('.stolon-status-card-legend').length, 1);
    assert.equal(card.element.querySelectorAll('.stolon-status-card-key').length, 1);
    card.setSegments(null);
    assert.equal(card.element.querySelector('.stolon-status-card-legend'), null);
});

test('a bar has no legend unless legend is set', function () {
    var card = createStatusCard({ title: 'Queue', segments: [{ label: 'Pending', value: 3 }] });
    assert.equal(card.element.querySelector('.stolon-status-card-legend'), null);
});

test('an even grid gives every card one width on a fixed column count', function () {
    var grid = createStatusCardGrid({ even: true, cards: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] });
    dom.document.body.appendChild(grid.element);
    assert.ok(grid.element.classList.contains('stolon-even'));
    grid.getCards().forEach(function (card) { assert.equal(card.element.style.getPropertyValue('--stolon-balance-span'), '1'); });
    assert.equal(createStatusCardGrid({ cards: [{ title: 'A' }] }).element.classList.contains('stolon-even'), false);
});
