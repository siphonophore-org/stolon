// Behavior tests for fitWidth, the shared compact switch, run on the stub DOM in fake-dom.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { fitWidth } = await import('../../src/js/lib/fit.js');

function box(width) {
    var el = document.createElement('div');
    var w = width;
    Object.defineProperty(el, 'clientWidth', { get: function () { return w; }, configurable: true });
    return { el: el, resize: function (n) { w = n; } };
}

test('an element turns compact by its own width, and a check after a resize follows it', function () {
    var b = box(300);
    var fitter = fitWidth(b.el, function (width) { return width < 400; });
    assert.ok(b.el.classList.contains('stolon-compact'));
    b.resize(500);
    fitter.check();
    assert.ok(!b.el.classList.contains('stolon-compact'));
    fitter.stop();
});

test('an element not laid out yet is never compact', function () {
    var b = box(0);
    fitWidth(b.el, function () { return true; }).stop();
    assert.ok(!b.el.classList.contains('stolon-compact'));
});
