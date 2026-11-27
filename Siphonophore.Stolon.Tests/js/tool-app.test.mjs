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

// A tool app whose tools load from a stub server: each page is one view with no controller.
function serve() {
    dom.document.baseURI = 'http://server/web/';
    globalThis.location = { hash: '#/configurationpage?name=p' };
    globalThis.history = { state: null, replaceState: function (s, t, url) { globalThis.location.hash = url; } };
    globalThis.fetch = function () { return Promise.resolve({ ok: true, text: function () { return Promise.resolve('<div></div>'); } }); };
    globalThis.DOMParser = function () {};
    globalThis.DOMParser.prototype.parseFromString = function () {
        return { querySelector: function () { return dom.el('div', { 'data-role': 'page', class: 'page' }); } };
    };
    dom.document.importNode = function (node) { return node; };
}

function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }

var SWITCHED = [
    { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', page: 'p_dashboard' },
    { key: 'vpn', name: 'VPN', icon: 'vpn_lock', page: 'p_vpn', visibleWhen: function (c) { return !!c.Vpn; } },
    { key: 'ddns', name: 'DDNS', icon: 'public', page: 'p_ddns', visibleWhen: function (c) { return !!c.Ddns; } }
];

function buildSwitched(loadConfig) {
    var view = dom.el('div', { class: 'page' }, [dom.el('div', { class: 'content-primary' })]);
    dom.document.body.appendChild(view);
    var handle = app.createToolApp(view, { storageKey: 'p', tools: SWITCHED, loadConfig: loadConfig });
    return { view: view, handle: handle };
}

test('a tool with visibleWhen shows until the configuration says otherwise, and the answer is kept for the next visit', async function () {
    var ui = buildSwitched(function () { return Promise.resolve({ Vpn: true, Ddns: false }); });
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN', 'DDNS']);
    await settle();
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN']);
    assert.deepEqual(JSON.parse(store['stolon.toolApp.p.shown']), { vpn: true, ddns: false });
    var again = buildSwitched();
    assert.deepEqual(names(again.view), ['Dashboard', 'VPN']);
});

test('applyConfig and refreshToolConfig redraw the sidebar only when a tool joins or leaves it', function () {
    var ui = buildSwitched();
    assert.equal(ui.handle.applyConfig({ Vpn: false, Ddns: true }), true);
    assert.deepEqual(names(ui.view), ['Dashboard', 'DDNS']);
    assert.equal(ui.handle.applyConfig({ Vpn: false, Ddns: true }), false);
    app.refreshToolConfig(ui.handle.shell.content, { Vpn: true, Ddns: true });
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN', 'DDNS']);
});

test('pluginId reads the configuration through ApiClient, and a visibleWhen that throws shows its tool', async function () {
    var asked = [];
    globalThis.ApiClient = { getPluginConfiguration: function (id) { asked.push(id); return Promise.resolve({ Vpn: true }); } };
    var view = dom.el('div', { class: 'page' }, [dom.el('div', { class: 'content-primary' })]);
    dom.document.body.appendChild(view);
    var tools = SWITCHED.concat([{ key: 'odd', name: 'Odd', page: 'p_odd', visibleWhen: function () { throw new Error('no'); } }]);
    app.createToolApp(view, { storageKey: 'p', pluginId: 'guid', tools: tools });
    await settle();
    delete globalThis.ApiClient;
    assert.deepEqual(asked, ['guid']);
    assert.deepEqual(names(view), ['Dashboard', 'VPN', 'Odd']);
});

test('a slow configuration answer never undoes a newer one', async function () {
    var answers = [];
    var ui = buildSwitched(function () { return new Promise(function (r) { answers.push(r); }); });
    var later = ui.handle.reloadConfig();
    answers[1]({ Vpn: false, Ddns: true });
    await later;
    answers[0]({ Vpn: true, Ddns: false });
    await settle();
    assert.deepEqual(names(ui.view), ['Dashboard', 'DDNS']);
});

test('a tool hidden while it is open hands over to the first tool, and showing a tool reads the configuration again', async function () {
    serve();
    var reads = 0;
    var config = { Vpn: true, Ddns: true };
    var ui = buildSwitched(function () { reads++; return Promise.resolve(config); });
    await settle();
    await ui.handle.show('vpn');
    assert.equal(ui.handle.getCurrent(), 'vpn');
    config = { Vpn: true, Ddns: false };
    await ui.handle.show('dashboard');
    await settle();
    assert.equal(reads, 2);
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN']);
    await ui.handle.show('vpn');
    ui.handle.applyConfig({ Vpn: false, Ddns: false });
    await settle();
    assert.equal(ui.handle.getCurrent(), 'dashboard');
    assert.equal(location.hash, '#/configurationpage?name=p&tool=dashboard');
});

test('a stored answer never hides a tool that has no visibleWhen', function () {
    store['stolon.toolApp.p.shown'] = JSON.stringify({ vpn: false });
    var ui = build();
    assert.deepEqual(names(ui.view), ['Dashboard', 'VPN']);
});
