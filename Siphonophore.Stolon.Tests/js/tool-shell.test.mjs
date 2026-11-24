// Behavior tests for createToolShell, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createToolShell } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var TOOLS = [
    { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', href: '#dashboard' },
    { key: 'vpn', name: 'VPN', icon: 'vpn_lock', href: '#vpn', badge: { label: '2', color: 'orange' } },
    { key: 'storage', name: 'Storage', icon: 'storage' }
];

function build(extra) {
    var picked = [];
    var shell = createToolShell(Object.assign({ tools: TOOLS, current: 'vpn', onSelect: function (key, tool, event) { picked.push([key, tool.name, event.type]); } }, extra));
    dom.document.body.appendChild(shell.element);
    return {
        shell: shell,
        picked: picked,
        nav: shell.element.querySelector('.stolon-tool-shell-nav'),
        entries: function () { return all(shell.element, '.stolon-tool-shell-item'); },
        title: shell.element.querySelector('.stolon-tool-shell-title'),
        button: shell.element.querySelector('.stolon-menu-button'),
        menuItems: function () { return all(shell.element, '.stolon-menu-list .stolon-menu-item'); }
    };
}

function compactAt(ui, width) {
    Object.defineProperty(ui.shell.element, 'clientWidth', { value: width, configurable: true });
    dom.dispatchWindow('resize');
}

test('the sidebar is a nav landmark of links and buttons, with the current tool marked', function () {
    var ui = build();
    assert.equal(ui.nav.tagName, 'NAV');
    assert.equal(ui.nav.getAttribute('aria-label'), 'Tools');
    var entries = ui.entries();
    assert.deepEqual(entries.map(function (e) { return e.tagName; }), ['A', 'A', 'BUTTON']);
    assert.equal(entries[0].getAttribute('href'), '#dashboard');
    assert.equal(entries[1].getAttribute('aria-current'), 'page');
    assert.ok(entries[1].classList.contains('stolon-selected'));
    assert.equal(entries[0].getAttribute('aria-current'), null);
    assert.equal(entries[1].querySelector('.material-icons').textContent, 'vpn_lock');
    assert.equal(entries[1].querySelector('.stolon-menu-label').textContent, 'VPN');
    assert.ok(entries[1].querySelector('.stolon-menu-badge').classList.contains('orange'));
});

test('the heading is the current tool name by default, or the title given', function () {
    assert.equal(build().title.textContent, 'VPN');
    var named = build({ title: 'Peers' });
    assert.equal(named.title.textContent, 'Peers');
    assert.equal(named.button.querySelector('.stolon-menu-text').textContent, 'Peers');
});

test('choosing a tool marks it current, sets the heading, and reports it with the click', function () {
    var ui = build();
    ui.entries()[2].click();
    assert.deepEqual(ui.picked, [['storage', 'Storage', 'click']]);
    assert.equal(ui.shell.getCurrent(), 'storage');
    assert.equal(ui.title.textContent, 'Storage');
    assert.equal(ui.entries()[2].getAttribute('aria-current'), 'page');
    assert.equal(ui.entries()[1].getAttribute('aria-current'), null);
});

test('a click with Ctrl or Cmd on a tool link leaves it to the browser', function () {
    var ui = build();
    ui.entries()[0].dispatch('click', { metaKey: true });
    assert.deepEqual(ui.picked, []);
    assert.equal(ui.shell.getCurrent(), 'vpn');
});

test('the shell turns compact by its own width, and the heading stays for a screen reader', function () {
    var ui = build();
    assert.equal(ui.shell.element.classList.contains('stolon-compact'), false);
    compactAt(ui, 375);
    assert.ok(ui.shell.element.classList.contains('stolon-compact'));
    assert.ok(ui.title.classList.contains('stolon-sr-only'));
    compactAt(ui, 1200);
    assert.equal(ui.shell.element.classList.contains('stolon-compact'), false);
    assert.equal(ui.title.classList.contains('stolon-sr-only'), false);
});

test('the title menu lists every tool, opens on the current one, and moves with the arrows', function () {
    var ui = build();
    compactAt(ui, 375);
    assert.equal(ui.button.getAttribute('aria-haspopup'), 'menu');
    assert.equal(ui.button.querySelector('.stolon-menu-text').textContent, 'VPN');
    ui.button.click();
    var items = ui.menuItems();
    assert.deepEqual(items.map(function (i) { return i.textContent.replace(/^[a-z_]+/, ''); }), ['Dashboard', 'VPN2', 'Storage']);
    assert.equal(items[1].getAttribute('aria-current'), 'page');
    assert.equal(dom.document.activeElement, items[1]);
    items[1].dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(dom.document.activeElement, items[2]);
    items[2].dispatch('keydown', { key: 'Escape' });
    assert.equal(ui.button.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.activeElement, ui.button);
});

test('choosing in the title menu reports the tool, and preventDefault keeps the page for an in-place switch', function () {
    var events = [];
    var ui = build({ onSelect: function (key, tool, event) { event.preventDefault(); events.push([key, event.defaultPrevented]); } });
    compactAt(ui, 375);
    ui.button.click();
    ui.menuItems()[0].click();
    assert.deepEqual(events, [['dashboard', true]]);
    assert.equal(ui.shell.getCurrent(), 'dashboard');
    assert.equal(ui.button.querySelector('.stolon-menu-text').textContent, 'Dashboard');
});

test('setCurrent and setTools redraw the sidebar, the heading, and the menu', function () {
    var ui = build();
    ui.shell.setCurrent('dashboard', 'Overview');
    assert.equal(ui.title.textContent, 'Overview');
    assert.equal(ui.entries()[0].getAttribute('aria-current'), 'page');
    ui.shell.setCurrent('vpn');
    assert.equal(ui.title.textContent, 'VPN');
    ui.shell.setTools([{ key: 'users', name: 'Users' }], 'users');
    assert.equal(ui.entries().length, 1);
    assert.equal(ui.shell.getCurrent(), 'users');
    assert.equal(ui.title.textContent, 'Users');
    assert.equal(ui.menuItems().length, 1);
});

test('the label names the sidebar and the menu, and content is the slot for the page', function () {
    var ui = build({ label: 'Sections' });
    assert.equal(ui.nav.getAttribute('aria-label'), 'Sections');
    assert.equal(ui.shell.element.querySelector('.stolon-menu-list').getAttribute('aria-label'), 'Sections');
    assert.ok(ui.shell.content.classList.contains('stolon-tool-shell-content'));
    assert.equal(ui.shell.content.parentNode.className, 'stolon-tool-shell-main');
});

test('destroy removes the resize listener', function () {
    var before = dom.windowListeners('resize');
    var ui = build();
    assert.equal(dom.windowListeners('resize'), before + 1);
    ui.shell.destroy();
    assert.equal(dom.windowListeners('resize'), before);
});
