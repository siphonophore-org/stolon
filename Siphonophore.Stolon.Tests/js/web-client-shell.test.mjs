import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var shell = await import('../../src/js/web-client-shell.js');
var { resetUserPage } = await import('../../src/js/user-page.js');
var { applyWebClientLook, storedUserId, webClientLayout, webClientMenuLinks, startWebClientShell, resetWebClientShell, WEB_CLIENT_PALETTES } = shell;

var SERVER = '0123456789abcdef0123456789abcdef';
var USER = 'fedcba9876543210fedcba9876543210';
var TOKEN = 'a'.repeat(32);

function store(values) {
    return {
        values: values,
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem: function (key, value) { values[key] = String(value); }
    };
}

function ids() {
    return document.body.children.map(function (c) { return c.id || c.tagName.toLowerCase(); });
}

beforeEach(function () {
    dom = installFakeDom();
    resetUserPage();
    resetWebClientShell();
});

test('the viewer\'s theme is picked from their setting, then the browser\'s, then the default', function () {
    var look = applyWebClientLook({ userId: USER, storage: store({ [USER + '-appTheme']: 'light', appTheme: 'wmc' }) });
    assert.equal(look.theme, 'light');
    assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
    assert.equal(document.querySelector('#stolon-shell-theme').getAttribute('href'), 'web/themes/light/theme.css');
    assert.equal(document.documentElement.style.getPropertyValue('--jf-palette-background-default'), '#f2f2f2');
    assert.equal(document.documentElement.style.getPropertyValue('--stolon-shell-overlay-8'), 'none');

    assert.equal(applyWebClientLook({ userId: USER, storage: store({ appTheme: 'wmc' }) }).theme, 'wmc');
    assert.equal(applyWebClientLook({ userId: null, storage: store({}) }).theme, 'dark');
    assert.equal(document.documentElement.style.getPropertyValue('--stolon-shell-overlay-8'), WEB_CLIENT_PALETTES.dark['--stolon-shell-overlay-8']);
});

test('a theme the web client does not offer, or an unsafe name, falls back to the default theme of its config', function () {
    var themes = [{ id: 'dark' }, { id: 'mine', default: true }];
    assert.equal(applyWebClientLook({ userId: USER, themes: themes, storage: store({ [USER + '-appTheme']: 'light' }) }).theme, 'mine');
    assert.equal(applyWebClientLook({ userId: USER, storage: store({ [USER + '-appTheme']: '../x' }) }).theme, 'dark');
    assert.equal(applyWebClientLook({ userId: USER, themes: [{ id: 'bad/../id' }], storage: store({}) }).theme, 'dark');
    var custom = applyWebClientLook({ userId: USER, themes: themes, storage: store({ [USER + '-appTheme']: 'mine' }) });
    assert.equal(custom.theme, 'mine');
    assert.equal(document.querySelector('#stolon-shell-theme').getAttribute('href'), 'web/themes/mine/theme.css');
});

test('the server\'s custom CSS comes after the page and the viewer\'s own after it', function () {
    document.body.appendChild(dom.el('style', { id: 'plugin-styles' }));
    var look = applyWebClientLook({ userId: USER, storage: store({ [USER + '-customCss']: '.card { color: red; }' }) });
    assert.deepEqual([look.serverCss, look.userCss], [true, true]);
    assert.deepEqual(ids().slice(-3), ['plugin-styles', 'stolon-shell-branding', 'stolon-shell-user-css']);
    assert.equal(document.querySelector('#stolon-shell-branding').getAttribute('href'), 'Branding/Css');
    assert.equal(document.querySelector('#stolon-shell-user-css').textContent, '.card { color: red; }');

    document.body.appendChild(dom.el('style', { id: 'later-styles' }));
    applyWebClientLook({ userId: USER, storage: store({ [USER + '-customCss']: '.card { color: blue; }' }) });
    assert.deepEqual(ids().slice(-3), ['later-styles', 'stolon-shell-branding', 'stolon-shell-user-css']);
    assert.equal(document.querySelectorAll('#stolon-shell-user-css').length, 1);
});

test('the server\'s custom CSS is left out when the viewer turned it off, and kept otherwise', function () {
    var off = applyWebClientLook({ userId: USER, storage: store({ [USER + '-disableCustomCss']: 'true' }) });
    assert.equal(off.serverCss, false);
    assert.equal(document.querySelector('#stolon-shell-branding'), null);
    var on = applyWebClientLook({ userId: USER, storage: store({ [USER + '-disableCustomCss']: 'false' }) });
    assert.equal(on.serverCss, true);
    assert.ok(document.querySelector('#stolon-shell-branding'));
    applyWebClientLook({ userId: USER, storage: store({ [USER + '-disableCustomCss']: 'true' }) });
    assert.equal(document.querySelector('#stolon-shell-branding'), null);
});

test('the viewer\'s custom CSS is text in a style element, and goes when they have none', function () {
    var css = '</style><script>alert(1)</script>';
    applyWebClientLook({ userId: USER, storage: store({ [USER + '-customCss']: css }) });
    var own = document.querySelector('#stolon-shell-user-css');
    assert.equal(own.tagName, 'STYLE');
    assert.equal(own.textContent, css);
    assert.equal(own.children.length, 0);
    var none = applyWebClientLook({ userId: USER, storage: store({}) });
    assert.equal(none.userCss, false);
    assert.equal(document.querySelector('#stolon-shell-user-css'), null);
});

test('with no signed in viewer the server\'s CSS loads and no viewer settings apply', function () {
    var values = { [USER + '-customCss']: '.x{}', [USER + '-disableCustomCss']: 'true', appTheme: 'purplehaze' };
    var look = applyWebClientLook({ userId: null, storage: store(values) });
    assert.deepEqual(look, { theme: 'purplehaze', serverCss: true, userCss: false });
});

test('storedUserId reads the user of the web client\'s sign-in for this server', function () {
    var credentials = { jellyfin_credentials: JSON.stringify({ Servers: [{ Id: 'other', AccessToken: TOKEN, UserId: 'x' }, { Id: SERVER, AccessToken: TOKEN, UserId: USER }] }) };
    assert.equal(storedUserId(SERVER, store(credentials)), USER);
    assert.equal(storedUserId(null, store(credentials)), null);
    assert.equal(storedUserId(SERVER, store({ jellyfin_credentials: '{bad' })), null);
    assert.equal(storedUserId(SERVER, store({ jellyfin_credentials: JSON.stringify({ Servers: [{ Id: SERVER, UserId: USER }] }) })), null);
});

test('the layout follows the web client\'s setting, else the browser\'s kind', function () {
    assert.equal(webClientLayout('Mozilla/5.0 (iPhone)', store({})), 'mobile');
    assert.equal(webClientLayout('Mozilla/5.0 (Macintosh)', store({})), 'desktop');
    assert.equal(webClientLayout('Mozilla/5.0 (iPhone)', store({ layout: 'desktop' })), 'desktop');
    assert.equal(webClientLayout('Mozilla/5.0 (Macintosh)', store({ layout: 'mobile' })), 'mobile');
});

test('menu links keep only web pages, mark the one for this page, and add the page\'s own entry when none points here', function () {
    var here = new URL('https://jf.example/base/myplugin/');
    var links = webClientMenuLinks([
        { name: 'Wiki', url: 'https://wiki.example/' },
        { name: 'Bad', url: 'javascript:alert(1)' },
        { name: 'Mine', url: '../myplugin', icon: 'star' },
        { name: '', url: 'https://x.example/' }
    ], here, { name: 'Requests', icon: 'search' }, 'https://jf.example/base/');
    assert.deepEqual(links.map(function (l) { return [l.name, !!l.current, !!l.external]; }), [['Wiki', false, true], ['Mine', true, false]]);
    var own = webClientMenuLinks([], here, { name: 'Requests', icon: 'search' }, 'https://jf.example/base/');
    assert.deepEqual(own.map(function (l) { return [l.name, l.href, l.current]; }), [['Requests', '/base/myplugin/', true]]);
    assert.deepEqual(webClientMenuLinks(null, here, null, 'https://jf.example/base/'), []);
});

// The shell's frame as the webclient template writes it.
function frame(access) {
    var el = dom.el;
    // As the webclient template's body is.
    document.body.classList.add('stolon-shell');
    document.body.setAttribute('data-stolon-access', access);
    document.body.setAttribute('data-stolon-mark', 'Requests');
    document.body.setAttribute('data-stolon-mark-icon', 'search');
    var meta = el('meta', { name: 'stolon-server-id', content: SERVER });
    document.documentElement.appendChild(meta);
    var parts = {
        bar: el('header', { class: 'stolon-shell-bar' }),
        drawerButton: el('button', { class: 'stolon-shell-drawer-button', hidden: true }),
        avatar: el('button', { class: 'stolon-shell-avatar', hidden: true }),
        nav: el('nav', { class: 'stolon-shell-nav', hidden: true }),
        navMenu: el('div', { id: 'stolon-shell-nav-menu', hidden: true }, [el('ul')]),
        userMenu: el('div', { id: 'stolon-shell-user-menu', hidden: true }, [el('ul')]),
        scrim: el('div', { class: 'stolon-shell-scrim', hidden: true }),
        drawer: el('nav', { class: 'stolon-shell-drawer' }, [el('span', { class: 'stolon-shell-drawer-home' }), el('div', { class: 'stolon-shell-drawer-nav' })]),
        gate: el('div', { class: 'stolon-user-page-gate', hidden: true }),
        content: el('div', { class: 'stolon-shell-content' })
    };
    Object.keys(parts).forEach(function (k) { document.body.appendChild(parts[k]); });
    return parts;
}

function reply(status, body) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(body); } });
}

function settle() {
    return new Promise(function (resolve) { setTimeout(resolve, 20); });
}

function serve(admin) {
    globalThis.location = new URL('https://jf.example/myplugin/');
    globalThis.Image = function () { return {}; };
    globalThis.fetch = function (url) {
        if (url === 'System/Info/Public') return reply(200, { Id: SERVER, Version: '10.11.0' });
        if (url === 'Users/Me') return reply(200, { Id: USER, Name: 'Ana', Policy: { IsAdministrator: admin } });
        if (url === 'web/config.json') return reply(200, { menuLinks: [] });
        if (String(url).indexOf('UserViews') === 0) return reply(200, { Items: [{ Id: 'm', Name: 'Movies', CollectionType: 'movies' }] });
        if (url === 'QuickConnect/Enabled') return reply(200, true);
        return reply(404, null);
    };
}

test('a signed in viewer gets their avatar, their user menu, their libraries, and the drawer button', async function () {
    var parts = frame('user');
    globalThis.localStorage = store({ jellyfin_credentials: JSON.stringify({ Servers: [{ Id: SERVER, AccessToken: TOKEN, UserId: USER }] }) });
    serve(true);
    var picked = 0;
    var session = await startWebClientShell({ menuItems: [{ text: 'Notifications', icon: 'Notifications', select: function () { picked++; } }] });
    await settle();
    assert.equal(session.user.Name, 'Ana');
    assert.equal(parts.avatar.hidden, false);
    assert.equal(parts.avatar.getAttribute('aria-label'), 'Ana');
    assert.equal(parts.drawerButton.hidden, false);
    var menu = parts.userMenu.querySelector('ul').innerHTML;
    assert.match(menu, /Profile.*Settings.*Notifications.*Dashboard.*Metadata manager.*Quick Connect.*Sign out/s);
    assert.match(menu, /data-stolon-menu="plugin-0"/);
    assert.match(parts.nav.innerHTML, /Favorites.*aria-current="page".*Requests.*Movies/s);
    assert.match(document.querySelector('.stolon-shell-drawer-nav').innerHTML, /Libraries/);
    assert.equal(document.querySelector('.stolon-shell-drawer-home').textContent, 'Home');
    assert.ok(document.documentElement.classList.contains('layout-desktop'));
    assert.ok(document.querySelector('#stolon-shell-branding'));
    session.destroy();
});

test('a viewer who is not an administrator gets no administrator entries', async function () {
    var parts = frame('user');
    globalThis.localStorage = store({ jellyfin_credentials: JSON.stringify({ Servers: [{ Id: SERVER, AccessToken: TOKEN, UserId: USER }] }) });
    serve(false);
    var session = await startWebClientShell();
    await settle();
    assert.doesNotMatch(parts.userMenu.querySelector('ul').innerHTML, /Dashboard|Metadata/);
    session.destroy();
});

test('a signed out viewer of a user page gets the sign in card and no bar entries', async function () {
    var parts = frame('user');
    globalThis.localStorage = store({});
    serve(false);
    startWebClientShell();
    await new Promise(function (resolve) { setTimeout(resolve, 0); });
    await new Promise(function (resolve) { setTimeout(resolve, 0); });
    assert.equal(parts.gate.hidden, false);
    // In the web client frame the sign in screen wears the web client's own login classes.
    var screen = parts.gate.querySelector('.stolon-sign-in');
    assert.ok(screen.querySelector('form.manualLoginForm'));
    assert.ok(screen.querySelector('.inputContainer input.emby-input#stolonSignInUser'));
    assert.ok(screen.querySelector('button.raised.button-submit.block.emby-button'));
    assert.equal(screen.querySelector('.stolon-user-page-field'), null);
    // The logo is the web client's own element, so its theme and the server's custom CSS draw it.
    assert.ok(screen.querySelector('div.pageTitleWithLogo.pageTitleWithDefaultLogo.stolon-screen-logo'));
    assert.equal(parts.avatar.hidden, true);
    assert.equal(parts.drawerButton.hidden, true);
    assert.equal(parts.nav.hidden, true);
});

test('an anyone page starts with no viewer and keeps the bar to the server alone', async function () {
    var parts = frame('anyone');
    globalThis.localStorage = store({});
    serve(false);
    var session = await startWebClientShell();
    assert.equal(session.user, null);
    assert.equal(parts.avatar.hidden, true);
    assert.equal(typeof session.toast.show, 'function');
    session.destroy();
});
