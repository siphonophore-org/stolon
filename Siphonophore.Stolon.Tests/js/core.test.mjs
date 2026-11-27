// Behavior tests for the config page, shared bag, and browser helpers, run with the node test runner and the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { plural, setTabs, createConfigPage, createShared, BADGE_STATES } = await import('../../src/js/index.js');

var shared;
beforeEach(function () {
    dom = installFakeDom();
    shared = createShared(dom.el('div'), 'plugin-id', 'Api');
});

test('plural gives 1 item for exactly one and items for every other count', function () {
    assert.equal(plural(0, 'item'), '0 items');
    assert.equal(plural(1, 'item'), '1 item');
    assert.equal(plural(2, 'item'), '2 items');
    assert.equal(plural(-1, 'item'), '-1 items');
    assert.equal(plural(-2, 'item'), '-2 items');
});

test('plural takes an irregular plural word', function () {
    assert.equal(plural(1, 'child', 'children'), '1 child');
    assert.equal(plural(0, 'child', 'children'), '0 children');
    assert.equal(plural(2, 'child', 'children'), '2 children');
    assert.equal(plural(1, 'person', 'people'), '1 person');
    assert.equal(plural(3, 'person', 'people'), '3 people');
});

test('plural is on the shared bag', function () {
    assert.equal(shared.plural(3, 'item'), '3 items');
});

test('setStatus gives the element role status, and role alert for an error', function () {
    var el = dom.el('span');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'status');
    assert.equal(el.querySelector('.stolon-status-message').textContent, 'Saved.');
    shared.setStatus(el, 'Could not save.', true, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'alert');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'status');
});

test('setStatus shows the icon of its state beside the text, as stolon-icon-text, and a clear removes both', function () {
    var el = dom.el('div');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.classList.contains('stolon-icon-text'), true);
    assert.equal(el.classList.contains('stolon-success'), true);
    assert.equal(el.querySelector('.material-icons').textContent, 'check_circle');
    shared.setStatus(el, 'Could not save.', true, { timeout: 0 });
    assert.equal(el.classList.contains('stolon-error'), true);
    assert.equal(el.classList.contains('stolon-success'), false);
    assert.equal(el.querySelector('.material-icons').textContent, 'error');
    shared.setStatus(el, 'Checking.', false, { timeout: 0, state: 'info' });
    assert.equal(el.querySelector('.material-icons').textContent, 'info');
    assert.equal(el.getAttribute('role'), 'status');
    shared.setStatus(el, '', false, { timeout: 0 });
    assert.equal(el.querySelector('.material-icons'), null);
    assert.equal(el.classList.contains('stolon-icon-text'), false);
});

test('setStatus sets the role once and leaves it alone on a clear', function () {
    var el = dom.el('span');
    var sets = 0;
    var original = el.setAttribute.bind(el);
    el.setAttribute = function (k, v) { if (k === 'role') sets++; original(k, v); };
    shared.setStatus(el, 'One.', false, { timeout: 0 });
    shared.setStatus(el, 'Two.', false, { timeout: 0 });
    shared.setStatus(el, '', false, { timeout: 0 });
    assert.equal(sets, 1);
    assert.equal(el.getAttribute('role'), 'status');
});

test('toDateInput gives the local date, not the UTC date', function () {
    var zone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
        // 03:00 UTC on the 10th is the evening of the 9th in Los Angeles.
        assert.equal(shared.toDateInput('2026-03-10T03:00:00Z'), '2026-03-09');
        assert.equal(shared.toDateInput(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
    } finally {
        if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone;
    }
});

test('toDateInput keeps a date only string and gives an empty string for nothing or nonsense', function () {
    assert.equal(shared.toDateInput('2026-03-10'), '2026-03-10');
    assert.equal(shared.toDateInput(null), '');
    assert.equal(shared.toDateInput('not a date'), '');
});

test('createChangeTracker gives the indicator role status', function () {
    var indicator = dom.el('span', { class: 'stolon-unsaved' });
    shared.createChangeTracker({ indicator: indicator });
    assert.equal(indicator.getAttribute('role'), 'status');
});

test('flashSaved shows savedText on the label and restores the original after the pulse', function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var indicator = dom.el('span', { class: 'stolon-unsaved' }, [dom.el('span', { class: 'stolon-unsaved-dot' })]);
        var label = { nodeType: 3, nodeValue: 'Unsaved changes' };
        indicator.childNodes = [indicator.children[0], label];
        var tracker = shared.createChangeTracker({ indicator: indicator, savedText: 'Saved' });
        tracker.flashSaved();
        assert.equal(label.nodeValue, 'Saved');
        assert.ok(indicator.classList.contains('stolon-save-success'));
        tracker.flashSaved();
        mock.timers.tick(1500);
        assert.equal(label.nodeValue, 'Unsaved changes');
        assert.equal(indicator.classList.contains('stolon-visible'), false);
    } finally {
        mock.timers.reset();
    }
});

test('flashSaved changes the text of a plain indicator and leaves it alone without savedText', function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var plain = dom.el('span');
        plain.textContent = 'Unsaved';
        var withText = shared.createChangeTracker({ indicator: plain, savedText: 'Saved' });
        withText.flashSaved();
        assert.equal(plain.textContent, 'Saved');
        mock.timers.tick(1500);
        assert.equal(plain.textContent, 'Unsaved');

        var untouched = dom.el('span');
        untouched.textContent = 'Unsaved';
        shared.createChangeTracker({ indicator: untouched }).flashSaved();
        assert.equal(untouched.textContent, 'Unsaved');
    } finally {
        mock.timers.reset();
    }
});

async function flush() { await Promise.resolve(); await Promise.resolve(); }

test('a poller with pauseWhenHidden skips ticks while the page is hidden and ticks once when it shows', async function () {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        var calls = 0;
        dom.document.hidden = true;
        var poller = shared.createPoller(function () { calls++; }, 1000, { pauseWhenHidden: true });
        poller.start();
        mock.timers.tick(3000);
        await flush();
        assert.equal(calls, 0);

        dom.document.hidden = false;
        dom.document.dispatch('visibilitychange');
        await flush();
        assert.equal(calls, 1);

        mock.timers.tick(1000);
        await flush();
        assert.equal(calls, 2);

        poller.stop();
        assert.equal((dom.document.listeners.visibilitychange || []).length, 0);
    } finally {
        mock.timers.reset();
    }
});

test('a poller without pauseWhenHidden keeps ticking while the page is hidden', async function () {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        var calls = 0;
        dom.document.hidden = true;
        var poller = shared.createPoller(function () { calls++; }, 1000);
        poller.start();
        await flush();
        mock.timers.tick(1000);
        await flush();
        mock.timers.tick(1000);
        await flush();
        assert.equal(calls, 3);
        assert.equal((dom.document.listeners.visibilitychange || []).length, 0);
        poller.stop();
    } finally {
        mock.timers.reset();
    }
});

test('setTabs hands LibraryMenu a getter that re-reads a function each time the tabs are shown', function () {
    var getters = [];
    globalThis.LibraryMenu = { setTabs: function (key, index, getter) { getters.push({ key: key, index: index, getter: getter }); } };
    try {
        var n = 0;
        setTabs('plugin', 1, function () { n++; return [{ href: 'a', name: 'A' + n }]; });
        assert.equal(getters[0].key, 'plugin');
        assert.equal(getters[0].index, 1);
        assert.equal(getters[0].getter()[0].name, 'A1');
        assert.equal(getters[0].getter()[0].name, 'A2');

        var fixed = [{ href: 'b', name: 'B' }];
        setTabs('plugin', 0, fixed);
        assert.equal(getters[1].getter(), fixed);
    } finally {
        delete globalThis.LibraryMenu;
    }
});

test('createConfigPage re-evaluates a tabs function on each viewshow', function () {
    var getters = [];
    globalThis.LibraryMenu = { setTabs: function (key, index, getter) { getters.push(getter); } };
    globalThis.addEventListener = function () {};
    globalThis.removeEventListener = function () {};
    try {
        var n = 0;
        var view = dom.el('div');
        createConfigPage(view, { pluginId: 'p', tabsKey: 'k', tabs: function () { n++; return [{ href: 'x', name: 'X' + n }]; } });
        view.dispatch('viewshow');
        view.dispatch('viewshow');
        assert.equal(getters.length, 2);
        assert.equal(getters[1]()[0].name, 'X1');
        assert.equal(getters[1]()[0].name, 'X2');
    } finally {
        delete globalThis.LibraryMenu;
        delete globalThis.addEventListener;
        delete globalThis.removeEventListener;
    }
});

test('BADGE_STATES names Locked, Expired, and the extra state names, and lists pink and teal', function () {
    ['Locked', 'Expired', 'Completed', 'Enabled', 'Failed', 'Paused', 'Running', 'Skipped', 'Unknown'].forEach(function (name) {
        assert.ok(BADGE_STATES.names.indexOf(name) >= 0, name);
    });
    assert.ok(BADGE_STATES.colors.indexOf('pink') >= 0);
    assert.ok(BADGE_STATES.colors.indexOf('teal') >= 0);
});

test('BADGE_STATES maps the common state words to their meaning colors, with Pending purple', function () {
    var want = { Pending: 'purple', On: 'green', Online: 'green', Off: 'gray', Idle: 'gray', Offline: 'red', Warning: 'orange', 'Needs-Attention': 'orange' };
    Object.keys(want).forEach(function (name) {
        assert.ok(BADGE_STATES.names.indexOf(name) >= 0, name);
        assert.equal(BADGE_STATES.stateColors[name], want[name], name);
    });
});

test('every BADGE_STATES name has a color and every state color is a listed color', function () {
    assert.deepEqual(Object.keys(BADGE_STATES.stateColors).sort(), BADGE_STATES.names.slice().sort());
    BADGE_STATES.names.forEach(function (name) { assert.ok(BADGE_STATES.colors.indexOf(BADGE_STATES.stateColors[name]) >= 0, name); });
});

test('every BADGE_STATES name and color has a rule in badge.css', function () {
    var css = readFileSync(new URL('../../src/css/badge.css', import.meta.url), 'utf8');
    BADGE_STATES.names.forEach(function (name) {
        assert.ok(css.indexOf('.stolon-table-status-badge.stolon-' + name + ',') >= 0 || css.indexOf('.stolon-table-status-badge.stolon-' + name + ' {') >= 0, name);
    });
    BADGE_STATES.colors.forEach(function (color) {
        assert.ok(css.indexOf('.stolon-badge.stolon-' + color + ',') >= 0 || css.indexOf('.stolon-badge.stolon-' + color + ' {') >= 0, color);
    });
});

test('apiRequest and fetchObjectUrl send the page\'s language, from its current translations, else the viewer\'s', async function () {
    var { createTranslations } = await import('../../src/js/index.js');
    var { setCurrentTranslations } = await import('../../src/js/lib/stolon-text.js');
    var sent = [];
    globalThis.ApiClient = {
        getUrl: function (u) { return '/' + u; },
        fetch: function (o) { sent.push(o); return Promise.resolve({ ok: true, blob: function () { return Promise.resolve(new Blob(['x'])); } }); }
    };
    globalThis.localStorage = { getItem: function () { return null; } };
    Object.defineProperty(globalThis, 'navigator', { value: { language: 'fr-FR', languages: ['fr-FR'] }, configurable: true, writable: true });
    try {
        setCurrentTranslations(null);
        await shared.apiRequest('Items', 'GET');
        assert.equal(sent[0].headers['X-Jellyfin-Plugin-Language'], 'fr-fr');
        setCurrentTranslations(createTranslations({ A: 'a' }, 'pt-br'));
        await shared.apiRequest('Items', 'POST', { a: 1 });
        assert.equal(sent[1].headers['X-Jellyfin-Plugin-Language'], 'pt-br');
        globalThis.URL.createObjectURL = function () { return 'blob:x'; };
        await shared.fetchObjectUrl('Image');
        assert.equal(sent[2].headers['X-Jellyfin-Plugin-Language'], 'pt-br');
    } finally {
        setCurrentTranslations(null);
        delete globalThis.ApiClient;
    }
});

test('saveConfigWith resolves with the config it saved, the replacement when the mutator returns one', async function () {
    var posted = [];
    globalThis.ApiClient = {
        getPluginConfiguration: function () { return Promise.resolve({ A: 1 }); },
        updatePluginConfiguration: function (id, config) { posted.push(config); return Promise.resolve({ ok: true }); }
    };
    try {
        var saved = await shared.saveConfigWith(function (config) { config.A = 2; });
        assert.deepEqual(saved, { A: 2 });
        assert.equal(saved, posted[0]);
        var replaced = await shared.saveConfigWith(function () { return { B: 3 }; });
        assert.deepEqual(replaced, { B: 3 });
        assert.equal(replaced, posted[1]);
    } finally {
        delete globalThis.ApiClient;
    }
});

test('apiRequest takes a prefix for one call, where an empty one calls the endpoint as given', async function () {
    var urls = [];
    globalThis.ApiClient = {
        getUrl: function (u) { return '/' + u; },
        fetch: function (o) { urls.push(o.url); return Promise.resolve({}); }
    };
    try {
        await shared.apiRequest('Items');
        await shared.apiRequest('Groups/Users', 'GET', null, { prefix: '' });
        await shared.apiRequest('Items', 'GET', null, { prefix: 'Other' });
        await shared.apiRequest('Items', 'GET', null, {});
        assert.deepEqual(urls, ['/Api/Items', '/Groups/Users', '/Other/Items', '/Api/Items']);
    } finally {
        delete globalThis.ApiClient;
    }
});

test('runScheduledTask starts the task found by its key, then follows it on the button', async function () {
    var started = [];
    var timers = mock.timers;
    timers.enable({ apis: ['setInterval'] });
    globalThis.ApiClient = {
        getUrl: function (u) { return '/' + u; },
        getScheduledTasks: function () { return Promise.resolve([{ Id: 'other', Key: 'Other' }, { Id: 't1', Key: 'MyTask', State: 'Idle' }]); },
        startScheduledTask: function (id) { started.push(id); return Promise.resolve(); }
    };
    try {
        var btn = dom.el('button', { class: 'stolon-small' }, [dom.el('span')]);
        dom.document.body.appendChild(btn);
        var handle = await shared.runScheduledTask(btn, 'MyTask', 'Scan');
        assert.deepEqual(started, ['t1']);
        assert.equal(btn.disabled, true);
        assert.equal(btn.querySelector('span').textContent, 'Scan 0%');
        handle.cancel();
        assert.equal(btn.disabled, false);
    } finally {
        timers.reset();
        delete globalThis.ApiClient;
    }
});

test('runScheduledTask posts to the running tasks route without startScheduledTask, and rejects for an unknown key', async function () {
    var sent = [];
    var timers = mock.timers;
    timers.enable({ apis: ['setInterval'] });
    globalThis.ApiClient = {
        getUrl: function (u) { return '/' + u; },
        getScheduledTasks: function () { return Promise.resolve([{ Id: 't 1', Key: 'MyTask' }]); },
        fetch: function (o) { sent.push(o); return Promise.resolve({}); }
    };
    try {
        var btn = dom.el('button', {}, [dom.el('span')]);
        var handle = await shared.runScheduledTask(btn, 'MyTask', 'Scan');
        assert.deepEqual(sent.map(function (o) { return [o.url, o.type]; }), [['/ScheduledTasks/Running/t%201', 'POST']]);
        handle.cancel();
        await assert.rejects(shared.runScheduledTask(dom.el('button'), 'Missing', 'Scan'), /Missing/);
    } finally {
        timers.reset();
        delete globalThis.ApiClient;
    }
});
