// Checks that text a user types or a server sends can never make a pattern run slowly: each check of a long, hostile
// input finishes at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { validateValue } = await import('../../src/js/lib/validate.js');
var { parseColor } = await import('../../src/js/lib/color.js');
var { urlBase64Bytes } = await import('../../src/js/lib/push.js');

function quick(fn) {
    var start = Date.now();
    fn();
    var took = Date.now() - start;
    assert.ok(took < 200, 'took ' + took + 'ms');
}

test('a long address, number, color, or key is checked at once', function () {
    quick(function () { assert.notEqual(validateValue('a://!' + '!'.repeat(50000) + ' x', { type: 'url' }), ''); });
    quick(function () { assert.notEqual(validateValue('9' + '99'.repeat(50000) + 'x', { type: 'number' }), ''); });
    quick(function () { assert.equal(parseColor('rgb(1' + ' '.repeat(50000) + 'x'), null); });
    quick(function () { assert.equal(urlBase64Bytes('='.repeat(50000) + 'x').length, 0); });
});

test('the patterns still accept what they accepted before', function () {
    assert.equal(validateValue('https://example.com:8096/web?x=1#top', { type: 'url' }), '');
    assert.equal(validateValue('1.5e3', { type: 'number' }), '');
    assert.deepEqual(parseColor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 });
    assert.deepEqual(parseColor('rgba(10, 20, 30, 0.25)'), { r: 10, g: 20, b: 30, a: 0.25 });
});
