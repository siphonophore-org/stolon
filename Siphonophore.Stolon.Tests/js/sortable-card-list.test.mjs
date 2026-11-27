// Behavior tests for createSortableCardList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSortableCardList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var listEl = host.appendChild(dom.el('div'));
    var moves = [];
    var cards = createSortableCardList(listEl, Object.assign({
        items: ['a', 'b', 'c'],
        render: function (item) { return { title: item }; },
        onMove: function (from, to) { moves.push([from, to]); }
    }, extra));
    return { listEl: listEl, cards: cards, moves: moves };
}

function cardsOf(ui) { return all(ui.listEl, '.stolon-card-item'); }
function titles(ui) { return cardsOf(ui).map(function (c) { return c.innerHTML.match(/<span>(.*?)<\/span>/)[1]; }); }

// The stub DOM does not parse innerHTML, so a test adds the head, and an arrow when it needs one, as elements.
function head(card, move) {
    var h = dom.el('div', { class: 'stolon-card-item-head' });
    if (move) h.appendChild(dom.el('button', { class: 'stolon-row-btn', 'data-move': String(move) }));
    card.appendChild(h);
    return h;
}

test('a list with no items leaves its element alone until the first render', function () {
    var ui = build({ items: [] });
    ui.listEl.appendChild(dom.el('p'));
    assert.equal(ui.listEl.children.length, 1);
    assert.equal(ui.listEl.classList.contains('stolon-card-list'), false);
    ui.cards.setItems(['a', 'b', 'c']);
    assert.deepEqual(titles(ui), ['a', 'b', 'c']);
});

test('given items draw at once, even in a closed section, so later opening finds the cards', function () {
    var section = dom.el('div', { class: 'stolon-collapsible-section stolon-collapsed' });
    var body = section.appendChild(dom.el('div', { class: 'stolon-collapsible-content' }));
    body.hidden = true;
    dom.document.body.appendChild(section);
    var listEl = body.appendChild(dom.el('div'));
    createSortableCardList(listEl, { items: ['a', 'b'], render: function (item) { return { title: item }; } });
    assert.ok(listEl.classList.contains('stolon-card-list'));
    assert.equal(all(listEl, '.stolon-card-item').length, 2);
});

test('by default the cards keep their markup and grow with the page', function () {
    var ui = build();
    ui.cards.render();
    assert.ok(ui.listEl.classList.contains('stolon-card-list'));
    assert.ok(ui.listEl.classList.contains('stolon-list'));
    assert.ok(ui.listEl.classList.contains('stolon-plain'));
    assert.equal(ui.listEl.classList.contains('stolon-scrolls'), false);
    assert.equal(ui.listEl.getAttribute('role'), null);
    var first = cardsOf(ui)[0];
    assert.equal(first.className, 'stolon-card-item stolon-list-item');
    assert.equal(first.getAttribute('data-index'), '0');
    assert.equal(first.getAttribute('role'), null);
});

test('an arrow moves a card, keeps the open card on its record, and calls onMove', function () {
    var ui = build();
    ui.cards.setSelected(0);
    head(cardsOf(ui)[0], 1).querySelector('[data-move]').click();
    assert.deepEqual(titles(ui), ['b', 'a', 'c']);
    assert.equal(ui.cards.getSelected(), 1);
    assert.ok(cardsOf(ui)[1].classList.contains('stolon-selected'));
    assert.deepEqual(ui.moves, [[0, 1]]);
});

test('dragging a card onto the lower half of another drops it after that card', function () {
    var ui = build();
    ui.cards.render();
    var grip = head(cardsOf(ui)[0]);
    grip.dispatch('dragstart', { dataTransfer: { setData: function () {} } });
    assert.ok(cardsOf(ui)[0].classList.contains('stolon-dragging'));
    var target = cardsOf(ui)[2];
    target.dispatch('dragover', { clientY: 115, dataTransfer: {} });
    assert.ok(target.classList.contains('stolon-drop-after'));
    target.dispatch('drop', {});
    assert.deepEqual(titles(ui), ['b', 'c', 'a']);
    assert.deepEqual(ui.moves, [[0, 2]]);
});

test('dragging a card onto the upper half of another drops it before that card', function () {
    var ui = build();
    ui.cards.render();
    head(cardsOf(ui)[2]).dispatch('dragstart', { dataTransfer: { setData: function () {} } });
    var target = cardsOf(ui)[0];
    target.dispatch('dragover', { clientY: 102, dataTransfer: {} });
    assert.ok(target.classList.contains('stolon-drop-before'));
    target.dispatch('drop', {});
    assert.deepEqual(titles(ui), ['c', 'a', 'b']);
    assert.deepEqual(ui.moves, [[2, 0]]);
});

test('height and maxHeight go to the list, and setHeight changes them before or after the first render', function () {
    var ui = build({ maxHeight: 400 });
    ui.cards.setHeight(300);
    ui.cards.render();
    assert.ok(ui.listEl.classList.contains('stolon-fixed'));
    assert.equal(ui.listEl.style['--stolon-list-height'], '300px');
    assert.equal(ui.listEl.classList.contains('stolon-capped'), false);
    ui.cards.setHeight('auto', '50vh');
    assert.ok(ui.listEl.classList.contains('stolon-capped'));
    assert.equal(ui.listEl.style['--stolon-list-max'], '50vh');
    var capped = build({ maxHeight: 400 });
    capped.cards.render();
    assert.equal(capped.listEl.style['--stolon-list-max'], '400px');
});

test('destroy stops clicks from moving cards', function () {
    var ui = build();
    ui.cards.render();
    var button = head(cardsOf(ui)[0], 1).querySelector('[data-move]');
    ui.cards.destroy();
    button.click();
    assert.deepEqual(titles(ui), ['a', 'b', 'c']);
    assert.equal(ui.moves.length, 0);
});

test('a card is numbered by default, so existing lists keep their numbers', function () {
    var ui = build();
    ui.cards.render();
    assert.match(cardsOf(ui)[1].innerHTML, /<span class="stolon-card-item-num">2<\/span>/);
    assert.doesNotMatch(cardsOf(ui)[1].innerHTML, /stolon-collapsible-tile/);
});

test('a card whose render gives an icon leads with an icon tile in its color in place of its number', function () {
    var ui = build({ render: function (item) { return { title: item, icon: 'terminal', iconColor: item === 'b' ? 'green' : item === 'c' ? '#e91e63' : undefined }; } });
    ui.cards.render();
    var html = cardsOf(ui).map(function (c) { return c.innerHTML; });
    html.forEach(function (h) { assert.doesNotMatch(h, /stolon-card-item-num/); });
    assert.match(html[0], /<span class="stolon-collapsible-tile stolon-card-item-tile" aria-hidden="true"><span class="material-icons" aria-hidden="true">terminal<\/span><\/span>/);
    assert.match(html[1], /class="stolon-collapsible-tile stolon-card-item-tile stolon-green"/);
    assert.match(html[2], /class="stolon-collapsible-tile stolon-card-item-tile stolon-custom" style="--stolon-custom: #e91e63;/);
});

test('an icon name is escaped', function () {
    var ui = build({ render: function () { return { title: 'x', icon: '<b>' }; } });
    ui.cards.render();
    assert.match(cardsOf(ui)[0].innerHTML, /&lt;b&gt;/);
});

test('numbered false leads a card with no icon with nothing', function () {
    var ui = build({ numbered: false });
    ui.cards.render();
    cardsOf(ui).forEach(function (c) {
        assert.doesNotMatch(c.innerHTML, /stolon-card-item-num|stolon-collapsible-tile/);
    });
    assert.deepEqual(titles(ui), ['a', 'b', 'c']);
});

function listRule(file, selector) {
    var css = readFileSync(new URL('../../src/css/' + file, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    var at = css.indexOf(selector + ' {');
    assert.ok(at !== -1, file + ' has ' + selector);
    return css.slice(at, css.indexOf('}', at));
}

test('the action row lines its buttons up on the list edge, a narrow gap apart, past the emby-button margin', function () {
    var row = listRule('sortable-card-list.css', '.stolon-card-list-actions');
    assert.match(row, /display: flex/);
    assert.match(row, /gap: var\(--stolon-gap-narrow\)/);
    assert.match(listRule('sortable-card-list.css', '.stolon-card-list-actions > .stolon-button'), /margin: 0 !important/);
});

test('a card subtitle is plain text that stays on a narrow screen, and mono on the list or a card writes it in the mono font, the card winning', function () {
    function subClass(ui) { return cardsOf(ui).map(function (c) { return c.innerHTML.match(/<div class="(stolon-card-item-sub[^"]*)"/)[1]; }); }
    var plain = build({ render: function (item) { return { title: item, subtitle: 'Built in' }; } });
    assert.deepEqual(subClass(plain), ['stolon-card-item-sub stolon-card-item-sub-text stolon-item-row-secondary', 'stolon-card-item-sub stolon-card-item-sub-text stolon-item-row-secondary', 'stolon-card-item-sub stolon-card-item-sub-text stolon-item-row-secondary']);
    var mono = build({ mono: true, render: function (item) { return { title: item, subtitle: '10.0.0.1', mono: item === 'b' ? false : undefined }; } });
    assert.deepEqual(subClass(mono), ['stolon-card-item-sub stolon-mono stolon-item-row-secondary', 'stolon-card-item-sub stolon-card-item-sub-text stolon-item-row-secondary', 'stolon-card-item-sub stolon-mono stolon-item-row-secondary']);
    var one = build({ render: function (item) { return { title: item, subtitle: '/media/' + item, mono: item === 'a' }; } });
    assert.deepEqual(subClass(one).map(function (c) { return c.indexOf('stolon-mono') !== -1; }), [true, false, false]);
});

test('a plain card subtitle takes the page font and stays at tablet width, where a mono one hides', function () {
    var css = readFileSync(new URL('../../src/css/sortable-card-list.css', import.meta.url), 'utf8');
    assert.match(css, /\.stolon-card-item-sub\.stolon-card-item-sub-text \{\s*font-family: inherit;/);
    assert.match(css, /\.stolon-card-item-sub\.stolon-card-item-sub-text \{ display: block; \}/);
});
