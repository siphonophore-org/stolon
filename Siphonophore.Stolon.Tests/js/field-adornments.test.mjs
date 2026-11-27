// Behavior tests for the fixed prefix and suffix adornField draws inside a text field, and the createInputField options that set them, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var kit = await import('../../src/js/index.js');

beforeEach(function () { dom = installFakeDom(); });

function field(attrs) {
    var input = dom.el('input', attrs || {});
    dom.document.body.appendChild(input);
    return input;
}

test('a text field marked data-stolon-suffix shows the suffix inside its box, after what is typed, as its description', function () {
    var input = field({ type: 'text', 'data-stolon-suffix': '.example.com' });
    kit.adornField(input);
    var box = input.parentNode;
    assert.ok(box.classList.contains('stolon-adorned'));
    assert.ok(box.classList.contains('stolon-adorned-affix'));
    assert.ok(box.classList.contains('stolon-adorned-with-suffix'));
    assert.ok(box.classList.contains('stolon-adorned-end'));
    var suffix = box.querySelector('.stolon-adorned-suffix');
    assert.equal(suffix.textContent, '.example.com');
    assert.equal(suffix.getAttribute('aria-hidden'), 'true');
    assert.equal(input.getAttribute('aria-describedby'), suffix.id);
    assert.equal(box.children[box.children.length - 1], suffix);
    assert.equal(box.style.getPropertyValue('--stolon-adorned-suffix-room'), '12ch');
    input.value = 'media';
    assert.equal(input.value, 'media');
});

test('a prefix sits before the input, and a field with both keeps its text at the start', function () {
    var input = field({ 'data-stolon-prefix': 'https://', 'data-stolon-suffix': '/web' });
    kit.adornField(input);
    var box = input.parentNode;
    assert.equal(box.children[0].className, 'stolon-adorned-prefix');
    assert.equal(box.children[0].textContent, 'https://');
    assert.ok(box.classList.contains('stolon-adorned-with-prefix'));
    assert.ok(!box.classList.contains('stolon-adorned-end'));
    assert.equal(input.getAttribute('aria-describedby').split(' ').length, 2);
});

test('destroy puts the field back and drops the description it added, keeping one already there', function () {
    var input = field({ type: 'text', 'data-stolon-suffix': '.lan', 'aria-describedby': 'help-1' });
    var handle = kit.adornField(input);
    assert.equal(input.getAttribute('aria-describedby').split(' ')[0], 'help-1');
    handle.destroy();
    assert.equal(input.parentNode, dom.document.body);
    assert.equal(input.getAttribute('aria-describedby'), 'help-1');
});

test('a prefix or suffix on a field type it does not fit, such as a checkbox, leaves the field alone', function () {
    var input = field({ type: 'checkbox', 'data-stolon-suffix': 'x' });
    kit.adornField(input);
    assert.equal(input.parentNode, dom.document.body);
});

test('bindFieldAdornments draws the suffix of a field in page markup', function () {
    var input = field({ type: 'text', 'data-stolon-suffix': '.example.com' });
    var bound = kit.bindFieldAdornments(dom.document.body);
    assert.ok(input.parentNode.classList.contains('stolon-adorned-affix'));
    bound.destroy();
});

test('createInputField takes a suffix and a prefix, which are never part of its value, and can change them', function () {
    var f = kit.createInputField({ label: 'Subdomain', suffix: '.example.com', value: 'media' });
    var box = f.input.parentNode;
    assert.ok(box.classList.contains('stolon-adorned-affix'));
    assert.equal(box.parentNode, f.element);
    assert.equal(f.element.querySelector('.stolon-adorned-suffix').textContent, '.example.com');
    assert.equal(f.getValue(), 'media');
    f.setSuffix('.home.arpa');
    assert.equal(f.element.querySelectorAll('.stolon-adorned').length, 1);
    assert.equal(f.element.querySelector('.stolon-adorned-suffix').textContent, '.home.arpa');
    assert.equal(f.input.getAttribute('aria-describedby'), f.element.querySelector('.stolon-adorned-suffix').id);
    f.setPrefix('www.');
    assert.equal(f.element.querySelector('.stolon-adorned-prefix').textContent, 'www.');
    f.setPrefix(null);
    f.setSuffix('');
    assert.equal(f.element.querySelector('.stolon-adorned'), null);
    assert.equal(f.input.parentNode, f.element);
    assert.equal(f.input.getAttribute('aria-describedby'), null);
    assert.equal(f.getValue(), 'media');
});

test('createInputField leaves a field with no prefix or suffix unwrapped, and a number takes its suffix as its unit', function () {
    var plain = kit.createInputField({ label: 'Name' });
    assert.equal(plain.input.parentNode, plain.element);
    var n = kit.createInputField({ label: 'Limit', type: 'number', suffix: 'GB' });
    assert.equal(n.input.getAttribute('data-stolon-unit'), 'GB');
    assert.equal(n.input.getAttribute('data-stolon-suffix'), null);
    assert.equal(n.element.querySelector('.stolon-adorned-unit').textContent, 'GB');
    n.destroy();
    assert.equal(n.input.parentNode, n.element);
});

test('the prefix and suffix sit inside the box at the field padding, dimmed and out of the pointer path', function () {
    var css = readFileSync(new URL('../../src/css/field-adornments.css', import.meta.url), 'utf8');
    assert.match(css, /\.stolon-adorned-with-suffix > input \{ padding-right: calc\(var\(--stolon-field-pad\) \+ var\(--stolon-adorned-suffix-room, 0px\)\) !important; \}/);
    assert.match(css, /\.stolon-adorned-prefix,\n\.stolon-adorned-suffix \{[^}]*pointer-events: none;/);
    assert.match(css, /\.stolon-adorned-end > input \{ text-align: right; \}/);
});
