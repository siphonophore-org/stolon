// Behavior tests for createToolApp, run on the stub DOM in fake-dom.mjs. Loading a tool's page needs a server, so
// these cover the sidebar, the fold memory, and the events a tool sends.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var app = await import('../../src/js/index.js');

var store = {};
beforeEach(function () {
    dom = installFakeDom();
    store = {};
    globalThis.localStorage = {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem: function (key, value) { store[key] = String(value); }
    };
});

var TOOLS = [
    { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', page: 'p_dashboard' },
    { key: 'vpn', name: 'VPN', icon: 'vpn_lock', page: 'p_vpn' }
];

function build(tools) {
    var view = dom.el('div', { class: 'page' }, [dom.el('div', { class: 'content-primary' })]);
    dom.document.body.appendChild(view);
    var handle = app.createToolApp(view, { storageKey: 'p', name: 'Plugin', tools: tools || TOOLS });
    return { view: view, handle: handle };
}

function names(view) {
    return all(view, '.stolon-tool-shell-item').filter(function (e) { return e.getAttribute('data-key'); })
        .map(function (e) { return e.querySelector('.stolon-menu-label').textContent; });
}

test('the shell goes in content-primary, with every tool as a button and the name atop the sidebar', function () {
    var ui = build();
    assert.ok(ui.view.querySelector('.content-primary > .stolon-tool-shell'));
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN']);
    assert.equal(ui.view.querySelector('[data-key="vpn"]').tagName, 'BUTTON');
    assert.equal(ui.view.querySelector('.stolon-tool-shell-name').textContent, 'Plugin');
});

test('the folded sidebar is remembered under the storage key', function () {
    var ui = build();
    ui.view.querySelector('.stolon-tool-shell-fold').click();
    assert.equal(store['stolon.toolApp.p.folded'], '1');
    var again = build();
    assert.ok(again.handle.shell.isFolded());
});

test('a tool list given as a function is read again on refreshTools', function () {
    var list = TOOLS.slice(0, 1);
    var ui = build(function () { return list; });
    assert.deepEqual(names(ui.view), ['Dashboard']);
    list = TOOLS;
    ui.handle.refreshTools();
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN']);
});

test('the helpers send bubbling events a tool app hears', function () {
    var el = dom.el('div');
    var heard = [];
    el.addEventListener(app.TOOL_TITLE_EVENT, function (e) { heard.push(['title', e.detail, e.bubbles]); });
    el.addEventListener(app.TOOL_OPEN_EVENT, function (e) { heard.push(['open', e.detail.key, e.detail.param, e.bubbles]); });
    el.addEventListener(app.TOOLS_CHANGE_EVENT, function (e) { heard.push(['tools', e.bubbles]); });
    app.setToolTitle(el, 'Peers');
    app.openTool(el, 'vpn', 'peers');
    app.refreshTools(el);
    assert.deepEqual(heard, [['title', 'Peers', true], ['open', 'vpn', 'peers', true], ['tools', true]]);
});
