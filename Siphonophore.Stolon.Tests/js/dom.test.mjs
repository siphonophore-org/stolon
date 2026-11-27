// Tests for the element builders make and h from the DOM helpers, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var kit = await import('../../src/js/index.js');
var lib = await import('../../src/js/lib/dom.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('make and h are exported from the bundle entry as the DOM helpers themselves', function () {
    assert.equal(kit.make, lib.make);
    assert.equal(kit.h, lib.h);
});

test('make builds an element with its class, attributes, and text', function () {
    var el = kit.make('span', 'stolon-badge', { title: 'Ready' }, 'Ready');
    assert.equal(el.tagName, 'SPAN');
    assert.equal(el.className, 'stolon-badge');
    assert.equal(el.getAttribute('title'), 'Ready');
    assert.equal(el.textContent, 'Ready');
});

test('h sets attributes as text, true as an empty attribute, and leaves out null, undefined, and false', function () {
    var el = kit.h('input', { type: 'number', min: 0, required: true, disabled: false, placeholder: null, title: undefined });
    assert.equal(el.getAttribute('type'), 'number');
    assert.equal(el.getAttribute('min'), '0');
    assert.equal(el.getAttribute('required'), '');
    assert.equal(el.hasAttribute('disabled'), false);
    assert.equal(el.hasAttribute('placeholder'), false);
    assert.equal(el.hasAttribute('title'), false);
});

test('h takes the class as a string or a list whose empty entries are skipped, and sets the text', function () {
    assert.equal(kit.h('div', { class: 'a b' }).className, 'a b');
    assert.equal(kit.h('div', { class: ['a', null, false, '', 'b'] }).className, 'a b');
    assert.equal(kit.h('div', { text: 5 }).textContent, '5');
});

test('h sets is as an attribute after the element is made, never through createElement', function () {
    var calls = [];
    var make = dom.document.createElement;
    dom.document.createElement = function (tag, opts) { calls.push(opts); return make.call(dom.document, tag); };
    var input = kit.h('input', { type: 'checkbox', is: 'emby-checkbox' });
    assert.deepEqual(calls, [undefined]);
    assert.equal(input.getAttribute('is'), 'emby-checkbox');
});

test('h appends nodes and text in order and skips empty children', function () {
    var child = kit.h('span', { text: 'b' });
    var el = kit.h('label', null, ['a', child, null, undefined, false, 3]);
    assert.equal(el.children.length, 3);
    assert.equal(el.textContent, 'ab3');
    assert.equal(el.children[1], child);
    assert.equal(kit.h('div', null, child).children[0], child);
});

test('h adds each listener under on, by event type', function () {
    var heard = [];
    var button = kit.h('button', { type: 'button', on: { click: function (e) { heard.push(e.type); } } });
    button.click();
    assert.deepEqual(heard, ['click']);
    assert.equal(button.hasAttribute('on'), false);
});
