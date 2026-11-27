// Behavior tests for createUsageMeter, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createUsageMeter } = await import('../../src/js/usage-meter.js');

beforeEach(function () {
    dom = installFakeDom();
});

var GB = 1024 * 1024 * 1024;

test('it writes the used line in sizes and fills the bar by its share', function () {
    var meter = createUsageMeter({ label: 'Cache', used: 10 * GB, total: 40 * GB, bytes: true });
    assert.equal(meter.element.querySelector('.stolon-usage-meter-text').textContent, '10 GB of 40 GB used');
    var fill = meter.element.querySelector('.stolon-usage-meter-fill');
    assert.equal(fill.style.getPropertyValue('--stolon-usage-share'), '25%');
    var bar = meter.element.querySelector('[role="meter"]');
    assert.equal(bar.getAttribute('aria-valuetext'), '10 GB of 40 GB used');
    assert.equal(bar.getAttribute('aria-labelledby'), meter.element.querySelector('.stolon-usage-meter-label').id);
});

test('plain numbers take the unit, and usedText takes the percent', function () {
    var meter = createUsageMeter({ used: 3, total: 4, unit: 'files', usedText: '{percent} full, {used}' });
    assert.equal(meter.element.querySelector('.stolon-usage-meter-text').textContent, '75% full, 3 files');
});

test('it turns warning past 80 percent and danger past 95 percent, and the thresholds can move', function () {
    var meter = createUsageMeter({ used: 50, total: 100 });
    assert.equal(meter.element.classList.contains('stolon-warning'), false);
    meter.setValue({ used: 85 });
    assert.ok(meter.element.classList.contains('stolon-warning'));
    meter.setValue({ used: 96 });
    assert.ok(meter.element.classList.contains('stolon-danger'));
    assert.equal(meter.element.classList.contains('stolon-warning'), false);
    var low = createUsageMeter({ used: 50, total: 100, warning: 40, danger: 60 });
    assert.ok(low.element.classList.contains('stolon-warning'));
});

test('parts draw a colored segment each and a legend, and used defaults to their sum', function () {
    var meter = createUsageMeter({ total: 100, parts: [{ label: 'Movies', value: 30 }, { label: 'Music', value: 10, color: 'orange' }] });
    var fills = all(meter.element, '.stolon-usage-meter-fill');
    assert.equal(fills.length, 2);
    assert.ok(fills[1].classList.contains('stolon-orange'));
    assert.equal(fills[0].style.getPropertyValue('--stolon-usage-share'), '30%');
    assert.equal(meter.element.querySelector('.stolon-usage-meter-text').textContent, '40 of 100 used');
    var legend = meter.element.querySelector('.stolon-usage-meter-legend');
    assert.equal(legend.hidden, false);
    assert.equal(all(legend, '.stolon-usage-meter-key').length, 2);
});

test('a share past the total stays full, and a missing total shows an empty bar', function () {
    var over = createUsageMeter({ used: 150, total: 100 });
    assert.equal(over.element.querySelector('.stolon-usage-meter-fill').style.getPropertyValue('--stolon-usage-share'), '100%');
    var empty = createUsageMeter({ used: 5 });
    assert.equal(empty.element.querySelector('.stolon-usage-meter-fill').style.getPropertyValue('--stolon-usage-share'), '0%');
});

test('a badge shows in the head beside the label, as { label, color } or a node, and setBadge swaps or removes it', function () {
    var meter = createUsageMeter({ label: 'Media', used: 40 * GB, total: 100 * GB, bytes: true, badge: { label: 'Healthy', color: 'green' } });
    var head = meter.element.querySelector('.stolon-usage-meter-head');
    assert.deepEqual(head.children.map(function (c) { return c.className; }), ['stolon-usage-meter-label', 'stolon-usage-meter-badge', 'stolon-usage-meter-text']);
    var slot = head.querySelector('.stolon-usage-meter-badge');
    assert.equal(slot.hidden, false);
    assert.equal(slot.querySelector('.stolon-badge').className, 'stolon-badge stolon-green');
    assert.equal(slot.textContent, 'Healthy');
    meter.setBadge({ label: 'Failing', color: 'Errored' });
    assert.equal(slot.querySelector('.stolon-badge').className, 'stolon-badge stolon-red');
    meter.setBadge({ label: 'Odd', color: 'not-a-color' });
    assert.equal(slot.querySelector('.stolon-badge').className, 'stolon-badge stolon-gray');
    var own = dom.el('span', { class: 'stolon-dot' });
    meter.setBadge(own);
    assert.equal(slot.children[0], own);
    meter.setBadge(null);
    assert.equal(slot.hidden, true);
    assert.equal(slot.children.length, 0);
    var plain = createUsageMeter({ used: 1, total: 2 });
    assert.equal(plain.element.querySelector('.stolon-usage-meter-badge').hidden, true);
});

test('a plain progress bar fill takes every named color and a hex code, and the meter shares those rules', function () {
    var bar = readFileSync(new URL('../../src/css/progress-bar.css', import.meta.url), 'utf8');
    ['green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal'].forEach(function (c) {
        assert.match(bar, new RegExp('\\.stolon-progress-bar\\.stolon-' + c + ' \\{ background: var\\(--stolon-' + c + '-fg\\); \\}'));
    });
    assert.match(bar, /\.stolon-progress-bar\.stolon-custom \{ background: var\(--stolon-custom\); \}/);
    var meter = readFileSync(new URL('../../src/css/usage-meter.css', import.meta.url), 'utf8');
    assert.doesNotMatch(meter, /\.stolon-usage-meter-fill\.stolon-green/);
});
