// Behavior tests for createAvatarStack, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createAvatarStack } = await import('../../src/js/avatar-stack.js');

beforeEach(function () {
    dom = installFakeDom();
});

var people = ['Ada', 'Bob', 'Cy', 'Dee', 'Eve', 'Finn'].map(function (name) { return { name: name }; });

test('up to max users each show an avatar, named together as one image', function () {
    var stack = createAvatarStack({ users: people.slice(0, 3), label: 'Watched by' });
    assert.equal(all(stack.element, '.stolon-avatar').length, 3);
    assert.equal(stack.element.querySelector('.stolon-avatar-more'), null);
    assert.equal(stack.element.getAttribute('role'), 'img');
    assert.equal(stack.element.getAttribute('aria-label'), 'Watched by Ada, Bob, Cy');
    all(stack.element, '.stolon-avatar').forEach(function (a) { assert.equal(a.getAttribute('aria-hidden'), 'true'); });
});

test('past max the rest fold into a +N bubble that names them in its tooltip', function () {
    var stack = createAvatarStack({ users: people, max: 4 });
    var more = stack.element.querySelector('.stolon-avatar-more');
    assert.equal(all(stack.element, '.stolon-avatar').length, 4);
    assert.equal(more.textContent, '+3');
    assert.equal(more.getAttribute('data-stolon-tip'), 'Dee, Eve, Finn');
    assert.equal(stack.element.getAttribute('title'), 'Ada, Bob, Cy, Dee, Eve, Finn');
});

test('moreText and size apply, and setValue redraws', function () {
    var stack = createAvatarStack({ users: people, max: 2, size: 'medium', moreText: 'and {value} more' });
    assert.equal(stack.element.querySelector('.stolon-avatar-more').textContent, 'and 5 more');
    assert.ok(stack.element.querySelector('.stolon-avatar').classList.contains('stolon-avatar-medium'));
    stack.setValue([]);
    assert.equal(stack.element.hidden, true);
    assert.deepEqual(stack.getValue(), []);
});
