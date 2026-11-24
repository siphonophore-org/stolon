// Behavior tests for createStatusCard and createStatusCardGrid, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createStatusCard, createStatusCardGrid } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function part(card, name) { return card.element.querySelector('.stolon-status-tile-' + name); }

test('a status card draws its icon, pill, title, and detail in order, and is a plain block with no href or onClick', function () {
    var card = createStatusCard({ icon: 'vpn_lock', title: 'VPN', status: 'Check', statusColor: 'orange', detail: '3 of 7 peers online' });
    assert.equal(card.element.tagName, 'DIV');
    assert.equal(card.element.className, 'stolon-status-tile');
    assert.deepEqual(card.element.children.map(function (c) { return c.className; }), ['stolon-status-tile-head', 'stolon-status-tile-title', 'stolon-status-tile-value', 'stolon-status-tile-detail']);
    assert.equal(part(card, 'icon').textContent, 'vpn_lock');
    assert.equal(part(card, 'icon').getAttribute('aria-hidden'), 'true');
    var pill = part(card, 'pill');
    assert.equal(pill.textContent, 'Check');
    assert.ok(pill.classList.contains('stolon-badge'));
    assert.ok(pill.classList.contains('orange'));
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
    assert.ok(part(createStatusCard({ status: 'Failed' }), 'pill').classList.contains('red'));
    assert.ok(part(createStatusCard({ status: 'Ok' }), 'pill').classList.contains('gray'));
    var hex = part(createStatusCard({ status: 'Ok', statusColor: '#e91e63' }), 'pill');
    assert.ok(hex.classList.contains('custom'));
    assert.equal(hex.style.getPropertyValue('--stolon-custom'), '#e91e63');
});

test('setStatus replaces the pill and setDetail replaces the detail line', function () {
    var card = createStatusCard({ title: 'VPN', status: 'Check', statusColor: 'orange', detail: '3 of 7 peers online' });
    card.setStatus('Ok', 'green');
    assert.equal(card.element.querySelectorAll('.stolon-status-tile-pill').length, 1);
    assert.equal(part(card, 'pill').textContent, 'Ok');
    assert.ok(part(card, 'pill').classList.contains('green'));
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
    assert.ok(grid.element.classList.contains('stolon-status-tiles'));
    assert.ok(grid.element.classList.contains('stolon-balanced'));
    assert.equal(grid.getCards().length, 3);
    assert.deepEqual(grid.element.children.map(function (c) { return c.querySelector('.stolon-status-tile-title').textContent; }), ['A', 'B', 'C']);
});

test('the grid add appends a card, setCards replaces them, and destroy removes the balance', function () {
    var grid = createStatusCardGrid({ cards: [{ title: 'A' }] });
    var added = grid.add({ title: 'B', status: 'Ok' });
    assert.equal(grid.getCards().length, 2);
    assert.equal(grid.getCards()[1], added);
    var next = grid.setCards([{ title: 'C' }]);
    assert.equal(next.length, 1);
    assert.equal(grid.element.children.length, 1);
    assert.equal(grid.element.children[0].querySelector('.stolon-status-tile-title').textContent, 'C');
    grid.destroy();
    assert.equal(grid.element.classList.contains('stolon-balanced'), false);
    assert.equal(grid.element.children.length, 0);
});
