import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { startUserPage, showUserPageView, setUserPageMessage, storedTokens, pageAccess, resetUserPage } = await import('../../src/js/user-page.js');

var SERVER = '0123456789abcdef0123456789abcdef';
var GOOD = 'a'.repeat(32);
var OLD = 'b'.repeat(32);
var calls;

function storage(servers) {
    return { getItem: function (key) { return key === 'jellyfin_credentials' ? JSON.stringify({ Servers: servers }) : null; } };
}

function reply(status, body) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(body); } });
}

// A server whose stored sign-ins answer by token, and whose user is an administrator when admin is true.
function server(options) {
    globalThis.fetch = function (url, init) {
        var auth = init && init.headers ? (init.headers.Authorization || (init.headers.get && init.headers.get('Authorization'))) : null;
        calls.push({ url: url, auth: auth });
        if (options.down) return Promise.reject(new TypeError('Failed to fetch'));
        if (url === 'System/Info/Public') return reply(200, { Id: SERVER, ServerName: 'Den' });
        if (url === 'Users/Me') {
            if (auth === 'MediaBrowser Token="' + GOOD + '"') return reply(200, { Id: 'u1', Name: 'Ana', Policy: { IsAdministrator: !!options.admin } });
            return reply(401, null);
        }
        if (url === 'MyPlugin/Access') return reply(options.listed ? 204 : 403, null);
        return reply(200, { url: url });
    };
}

function page(access) {
    document.body.setAttribute('data-stolon-access', access);
    var gate = dom.el('div', { class: 'stolon-user-page-gate', hidden: true });
    var content = dom.el('div', { class: 'stolon-user-page-content' });
    document.body.appendChild(gate);
    document.body.appendChild(content);
    return { gate: gate, content: content };
}

beforeEach(function () {
    dom = installFakeDom();
    resetUserPage();
    calls = [];
    globalThis.localStorage = storage([{ Id: 'other', AccessToken: 'c'.repeat(32) }, { Id: SERVER, AccessToken: OLD }, { Id: SERVER, AccessToken: GOOD }]);
});

test('storedTokens reads the web client sign-ins for one server and skips malformed ones', function () {
    var store = storage([{ Id: SERVER, AccessToken: GOOD }, { Id: SERVER, AccessToken: 'bad token' }, { Id: SERVER, AccessToken: GOOD }, { Id: 'other', AccessToken: OLD }]);
    assert.deepEqual(storedTokens(SERVER, store), [GOOD]);
    assert.deepEqual(storedTokens(null, store), []);
    assert.deepEqual(storedTokens(SERVER, { getItem: function () { return '{not json'; } }), []);
    assert.deepEqual(storedTokens(SERVER, { getItem: function () { throw new Error('blocked'); } }), []);
});

test('pageAccess reads the body and falls back to anyone', function () {
    document.body.setAttribute('data-stolon-access', 'administrator');
    assert.equal(pageAccess(), 'administrator');
    document.body.setAttribute('data-stolon-access', 'everyone');
    assert.equal(pageAccess(), 'anyone');
});

test('an anyone page is ready at once and asks the server nothing', async function () {
    page('anyone');
    server({});
    var session = await startUserPage();
    assert.equal(session.access, 'anyone');
    assert.equal(session.user, null);
    assert.equal(document.body.hasAttribute('data-stolon-ready'), true);
    assert.equal(calls.length, 0);
});

test('a user page tries each stored sign-in until one answers', async function () {
    var parts = page('user');
    server({});
    var session = await startUserPage();
    assert.equal(session.user.Name, 'Ana');
    assert.equal(session.token, GOOD);
    assert.equal(session.serverId, SERVER);
    assert.equal(document.body.hasAttribute('data-stolon-ready'), true);
    assert.equal(parts.gate.hidden, true);
    assert.deepEqual(calls.map(function (c) { return c.url; }), ['System/Info/Public', 'Users/Me', 'Users/Me']);
});

test('the session calls the API as the viewer', async function () {
    page('user');
    server({});
    var session = await startUserPage();
    await session.request('MyPlugin/Devices');
    var last = calls[calls.length - 1];
    assert.equal(last.url, 'MyPlugin/Devices');
    assert.equal(last.auth, 'MediaBrowser Token="' + GOOD + '"');
});

test('a viewer with no sign-in gets the sign in card and the content stays hidden', async function () {
    var parts = page('user');
    globalThis.localStorage = storage([]);
    server({});
    var session = await startUserPage();
    assert.equal(session, null);
    assert.equal(document.body.hasAttribute('data-stolon-ready'), false);
    assert.equal(parts.gate.hidden, false);
    var card = parts.gate.querySelector('.stolon-user-page-done');
    assert.equal(card.getAttribute('data-stolon-state'), 'info');
    assert.equal(parts.gate.querySelector('a.stolon-button').getAttribute('href'), 'web/');
    assert.equal(parts.gate.querySelector('a.stolon-button').textContent, 'Sign in');
    assert.equal(parts.gate.querySelector('.stolon-user-page-lead').textContent, 'Sign in to Jellyfin to open this page.');
});

test('an administrator page turns away a signed in viewer who is not an administrator', async function () {
    var parts = page('administrator');
    server({ admin: false });
    var session = await startUserPage({ deniedMessage: 'Admins only.' });
    assert.equal(session, null);
    assert.equal(parts.gate.querySelector('.stolon-user-page-done').getAttribute('data-stolon-state'), 'warn');
    assert.equal(parts.gate.querySelector('.stolon-user-page-lead').textContent, 'Admins only.');
    assert.equal(parts.gate.querySelector('a.stolon-button').textContent, 'Back to Jellyfin');
});

test('an administrator page opens for an administrator', async function () {
    page('administrator');
    server({ admin: true });
    var session = await startUserPage();
    assert.equal(session.user.Policy.IsAdministrator, true);
});

test('a selected users page turns away a viewer the plugin does not list', async function () {
    var parts = page('selected');
    document.body.setAttribute('data-stolon-access-check', 'MyPlugin/Access');
    server({ listed: false });
    var session = await startUserPage();
    assert.equal(session, null);
    assert.equal(parts.gate.querySelector('.stolon-user-page-done').getAttribute('data-stolon-state'), 'warn');
    assert.equal(parts.gate.querySelector('.stolon-user-page-lead').textContent, "This page is for selected people. Ask your server's administrator for access.");
    assert.equal(calls[calls.length - 1].auth, 'MediaBrowser Token="' + GOOD + '"');
});

test('a selected users page opens for a listed viewer, and an administrator skips the check', async function () {
    page('selected');
    document.body.setAttribute('data-stolon-access-check', 'MyPlugin/Access');
    server({ listed: true });
    assert.equal((await startUserPage()).access, 'selected');
    resetUserPage();
    calls = [];
    server({ admin: true, listed: false });
    assert.ok(await startUserPage());
    assert.ok(calls.every(function (c) { return c.url !== 'MyPlugin/Access'; }));
});

test('a server that does not answer shows the unreachable card', async function () {
    var parts = page('user');
    server({ down: true });
    var session = await startUserPage();
    assert.equal(session, null);
    assert.equal(parts.gate.querySelector('.stolon-user-page-done').getAttribute('data-stolon-state'), 'error');
    assert.equal(parts.gate.querySelector('.stolon-user-page-lead').textContent, 'Could not reach the server.');
});

test('later calls return the first check', async function () {
    page('user');
    server({});
    var first = startUserPage();
    var second = startUserPage({ signInText: 'Other' });
    assert.equal(first, second);
    await first;
    assert.equal(calls.filter(function (c) { return c.url === 'System/Info/Public'; }).length, 1);
});

test('showUserPageView shows one view and hides the rest', function () {
    var form = dom.el('form', { 'data-stolon-view': 'form' });
    var done = dom.el('section', { 'data-stolon-view': 'done', hidden: true });
    document.body.appendChild(form);
    document.body.appendChild(done);
    showUserPageView('done');
    assert.equal(form.hidden, true);
    assert.equal(done.hidden, false);
});

test('setUserPageMessage draws a callout with the state icon and hides when empty', function () {
    var box = dom.el('div', {});
    setUserPageMessage(box, 'error', 'That username is taken.');
    assert.equal(box.className, 'stolon-user-page-message stolon-icon-text stolon-error');
    assert.equal(box.getAttribute('role'), 'alert');
    assert.equal(box.querySelector('.material-icons').textContent, 'error');
    assert.equal(box.hidden, false);
    setUserPageMessage(box, 'success', 'Saved.');
    assert.equal(box.getAttribute('role'), 'status');
    assert.equal(box.querySelector('.material-icons').textContent, 'check_circle');
    setUserPageMessage(box, 'warn', '');
    assert.equal(box.hidden, true);
    assert.equal(box.children.length, 0);
});
