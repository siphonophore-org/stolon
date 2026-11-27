// Behavior tests for createTimeline's list and its avatar markers, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTimeline } = await import('../../src/js/index.js');


beforeEach(function () {
    dom = installFakeDom();
});

test('by default the timeline grows with its events and stays an ordered list of items', function () {
    var t = createTimeline({ items: [{ title: 'A' }, { title: 'B' }] });
    var ol = t.element.querySelector('ol');
    assert.equal(ol.getAttribute('role'), null);
    assert.equal(ol.classList.contains('stolon-scrolls'), false);
    assert.equal(ol.children.length, 2);
    ol.children.forEach(function (li) {
        assert.equal(li.tagName, 'LI');
        assert.equal(li.getAttribute('role'), null);
    });
    t.setItems([]);
    assert.equal(ol.children.length, 0);
});

test('height, maxHeight, and minHeight reach the ordered list, and setHeight switches them', function () {
    var t = createTimeline({ height: 'fill', minHeight: 120, items: [{ title: 'A' }] });
    var ol = t.element.querySelector('ol');
    assert.ok(ol.classList.contains('stolon-fill'));
    assert.equal(ol.style['--stolon-list-min'], '120px');
    t.setHeight(200, '50vh');
    assert.ok(ol.classList.contains('stolon-fixed'));
    assert.equal(ol.style['--stolon-list-height'], '200px');
    assert.equal(ol.style['--stolon-list-max'], '50vh');
    var capped = createTimeline({ maxHeight: 320 });
    assert.ok(capped.element.querySelector('ol').classList.contains('stolon-capped'));
});

test('an item with pre shows a mono block kept as written under its body', function () {
    var t = createTimeline({ items: [{ title: 'Failed', body: 'The sync stopped.', pre: 'Error: timeout\n  at sync' }, { title: 'Done' }] });
    var pres = t.element.querySelectorAll('pre');
    assert.equal(pres.length, 1);
    assert.ok(pres[0].classList.contains('stolon-mono'));
    assert.ok(pres[0].classList.contains('stolon-timeline-pre'));
    assert.equal(pres[0].textContent, 'Error: timeout\n  at sync');
});

test('a timeline avatar is the marker, a picture with its name, and the person icon while empty or after the picture fails', function () {
    var t = createTimeline({ items: [
        { title: 'Ada', body: 'Please add it.', avatar: 'ada.png', avatarLabel: 'Ada', status: 'green' },
        { title: 'Bob', avatar: '' },
        { title: 'Plain', status: 'green' }
    ] });
    var items = t.element.querySelectorAll('.stolon-timeline-item');
    var marker = items[0].querySelector('.stolon-timeline-marker');
    assert.ok(marker.classList.contains('stolon-timeline-avatar'));
    assert.equal(marker.getAttribute('aria-hidden'), 'true');
    var img = marker.querySelector('img.stolon-avatar-image');
    assert.equal(img.getAttribute('src'), 'ada.png');
    assert.equal(img.getAttribute('alt'), 'Ada');
    assert.equal(marker.querySelector('.stolon-avatar').getAttribute('title'), 'Ada');
    assert.equal(marker.querySelector('.stolon-timeline-marker > .material-icons'), null);
    assert.equal(items[0].querySelector('.stolon-sr-only').textContent, 'Done');
    img.dispatch('error');
    assert.equal(marker.querySelector('.stolon-avatar-icon').textContent, 'person');
    assert.equal(items[1].querySelector('.stolon-timeline-avatar .stolon-avatar-icon').textContent, 'person');
    assert.equal(items[2].querySelector('.stolon-timeline-avatar'), null);
    assert.equal(items[2].querySelector('.stolon-timeline-marker .material-icons').textContent, 'check_circle');
});

test('a timeline avatar marker keeps the marker size, so the line between events still meets it', function () {
    var text = readFileSync(new URL('../../src/css/timeline.css', import.meta.url), 'utf8');
    assert.match(text, /\.stolon-timeline-avatar > \.stolon-avatar \{ width: 100%; height: 100%; \}/);
    assert.match(text, /\.stolon-timeline-item \.stolon-timeline-marker\.stolon-timeline-avatar \{ background: transparent;/);
});
