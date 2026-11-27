// Behavior tests for the web push helpers and the service worker script WebPushWorker serves, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { webPushState, subscribeWebPush, unsubscribeWebPush, webPushText, webPushLabel } = await import('../../src/js/web-push.js');
var { urlBase64Bytes } = await import('../../src/js/lib/push.js');
var { setCurrentTranslations } = await import('../../src/js/lib/stolon-text.js');

var KEY = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
var CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
var IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

// A browser with push: a secure page, a navigator, the PushManager and Notification globals, and a permission to ask for.
function browser(opts) {
    opts = opts || {};
    globalThis.isSecureContext = opts.secure !== false;
    var nav = { userAgent: opts.ua || CHROME, maxTouchPoints: 0, standalone: opts.standalone };
    if (opts.serviceWorker !== false) nav.serviceWorker = {};
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
    if (opts.push === false) delete globalThis.PushManager; else globalThis.PushManager = function () {};
    var asked = [];
    globalThis.Notification = {
        permission: opts.permission || 'default',
        requestPermission: function () { asked.push(true); globalThis.Notification.permission = opts.answer || 'granted'; return Promise.resolve(opts.answer || 'granted'); }
    };
    globalThis.matchMedia = function (q) { return { matches: q === '(display-mode: standalone)' && !!opts.displayStandalone }; };
    return asked;
}

// A service worker registration whose push manager holds at most one subscription.
function registration(existing) {
    var state = { sub: existing || null, subscribed: [] };
    state.reg = {
        pushManager: {
            getSubscription: function () { return Promise.resolve(state.sub); },
            subscribe: function (options) { state.subscribed.push(options); state.sub = subscription('https://push.example/new', options.applicationServerKey); return Promise.resolve(state.sub); }
        }
    };
    return state;
}

function subscription(endpoint, key) {
    var sub = {
        endpoint: endpoint,
        options: { applicationServerKey: key ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : null },
        unsubscribed: false,
        toJSON: function () { return { endpoint: endpoint, keys: { p256dh: 'p', auth: 'a' } }; },
        unsubscribe: function () { sub.unsubscribed = true; return Promise.resolve(true); }
    };
    return sub;
}

beforeEach(function () {
    installFakeDom();
    setCurrentTranslations(null);
});

test('a page that is not on HTTPS needs HTTPS, before anything else is checked', async function () {
    browser({ secure: false, push: false });
    var state = await webPushState();
    assert.equal(state.state, 'insecure');
    assert.equal(state.message, 'Notifications work only when the page opens over HTTPS.');
    assert.equal((await subscribeWebPush({ registration: registration().reg, publicKey: KEY })).state, 'insecure');
});

test('an iPhone page not added to the home screen is asked to be, and one that is can subscribe', async function () {
    browser({ ua: IPHONE, push: false });
    assert.equal((await webPushState()).state, 'install');
    assert.equal(webPushText('install'), 'Add this page to the home screen to get notifications on an iPhone or iPad.');
    browser({ ua: IPHONE, standalone: true });
    assert.equal((await webPushState(registration().reg)).state, 'off');
    browser({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.1 Safari/605.1.15', displayStandalone: false });
    globalThis.navigator.maxTouchPoints = 5;
    assert.equal((await webPushState()).state, 'install');
});

test('a browser without push is unsupported, a blocked one is denied, and a subscribed one is on', async function () {
    browser({ push: false });
    assert.equal((await webPushState()).state, 'unsupported');
    browser({ serviceWorker: false });
    assert.equal((await webPushState()).state, 'unsupported');
    browser({ permission: 'denied' });
    assert.equal((await webPushState()).state, 'denied');
    browser({ permission: 'granted' });
    assert.equal((await webPushState(registration(subscription('https://push.example/a')).reg)).state, 'on');
    assert.equal((await webPushState(Promise.resolve(registration().reg))).state, 'off');
    assert.equal((await webPushState()).state, 'off');
});

test('subscribing asks once, subscribes with the key as bytes, and sends the subscription with a label', async function () {
    var asked = browser();
    var reg = registration();
    var saved = [];
    var result = await subscribeWebPush({ registration: Promise.resolve(reg.reg), publicKey: KEY, save: function (s) { saved.push(s); return Promise.resolve(); } });
    assert.deepEqual(result, { state: 'on', message: 'Notifications are on.' });
    assert.equal(asked.length, 1);
    assert.equal(reg.subscribed.length, 1);
    assert.equal(reg.subscribed[0].userVisibleOnly, true);
    assert.deepEqual(Array.from(reg.subscribed[0].applicationServerKey), Array.from(urlBase64Bytes(KEY)));
    assert.deepEqual(saved, [{ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' }, label: 'Chrome · macOS' }]);
});

test('a subscription made with another key is replaced, and one with the same key is kept', async function () {
    browser();
    var old = subscription('https://push.example/old', new Uint8Array([4, 1, 2]));
    var reg = registration(old);
    await subscribeWebPush({ registration: reg.reg, publicKey: KEY });
    assert.equal(old.unsubscribed, true);
    assert.equal(reg.subscribed.length, 1);

    var same = subscription('https://push.example/same', urlBase64Bytes(KEY));
    var kept = registration(same);
    var saved = [];
    await subscribeWebPush({ registration: kept.reg, publicKey: KEY, save: function (s) { saved.push(s.endpoint); } });
    assert.equal(same.unsubscribed, false);
    assert.equal(kept.subscribed.length, 0);
    assert.deepEqual(saved, ['https://push.example/same']);
});

test('a person who blocks notifications is told so, and nothing is subscribed or sent', async function () {
    browser({ answer: 'denied' });
    var reg = registration();
    var saved = [];
    var result = await subscribeWebPush({ registration: reg.reg, publicKey: KEY, save: function (s) { saved.push(s); } });
    assert.equal(result.state, 'denied');
    assert.equal(result.message, 'Notifications are blocked. Allow them in the browser\'s settings for this site.');
    assert.equal(reg.subscribed.length, 0);
    assert.deepEqual(saved, []);
    browser({ answer: 'default' });
    assert.equal((await subscribeWebPush({ registration: reg.reg, publicKey: KEY })).state, 'off');
    await assert.rejects(subscribeWebPush({ registration: reg.reg, publicKey: '' }));
});

test('unsubscribing tells the plugin first, then removes the browser\'s subscription', async function () {
    browser({ permission: 'granted' });
    var order = [];
    var sub = subscription('https://push.example/a');
    var origUnsubscribe = sub.unsubscribe;
    sub.unsubscribe = function () { order.push('browser'); return origUnsubscribe(); };
    var result = await unsubscribeWebPush({ registration: registration(sub).reg, remove: function (s) { order.push('plugin ' + s.endpoint); return Promise.resolve(); } });
    assert.deepEqual(result, { state: 'off', message: 'Notifications are off.' });
    assert.deepEqual(order, ['plugin https://push.example/a', 'browser']);
    assert.equal((await unsubscribeWebPush({ registration: registration().reg })).state, 'off');
});

test('the sentences come from the page\'s translations', function () {
    setCurrentTranslations({ language: 'de', has: function (k) { return k === 'Stolon.PushOn'; }, tr: function () { return 'Benachrichtigungen sind an.'; } });
    assert.equal(webPushText('on'), 'Benachrichtigungen sind an.');
    assert.equal(webPushText('unsupported'), 'This browser cannot show notifications.');
});

test('the label names the browser and the device', function () {
    assert.equal(webPushLabel(IPHONE), 'Safari · iPhone');
    assert.equal(webPushLabel(CHROME), 'Chrome · macOS');
    assert.equal(webPushLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0'), 'Edge · Windows');
    assert.equal(webPushLabel('Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0'), 'Firefox · Android');
    assert.equal(webPushLabel('curl/8'), '');
});

test('base64url text turns into its bytes, and anything else into none', function () {
    assert.deepEqual(Array.from(urlBase64Bytes('BTBZMqHH6r4Tts7J_aSIgg')).length, 16);
    assert.deepEqual(Array.from(urlBase64Bytes('-_8')), [251, 255]);
    assert.equal(urlBase64Bytes('not base64!').length, 0);
    assert.equal(urlBase64Bytes(KEY)[0], 4);
});

// The script WebPushWorker.Script holds, read from the C# source so the test runs the text plugins serve.
function workerScript() {
    var source = fs.readFileSync(new URL('../../src/WebPushWorker.cs', import.meta.url), 'utf8');
    var start = source.indexOf('"""') + 3;
    var end = source.indexOf('"""', start);
    var lines = source.slice(start, end).split('\n').slice(1, -1);
    return lines.map(function (l) { return l.replace(/^ {8}/, ''); }).join('\n');
}

// Runs the worker in a sandbox with a fake service worker scope, and returns its listeners and what it did.
function worker(clients) {
    var handlers = {};
    var shown = [];
    var opened = [];
    var self = {
        registration: { scope: 'https://jf.example.com/requests/', showNotification: function (title, options) { shown.push({ title: title, options: options }); return Promise.resolve(); } },
        clients: {
            matchAll: function () { return Promise.resolve(clients || []); },
            openWindow: function (url) { opened.push(url); return Promise.resolve(null); }
        },
        addEventListener: function (type, fn) { handlers[type] = fn; }
    };
    vm.runInNewContext(workerScript(), { self: self, URL: URL, String: String, Number: Number });
    return { handlers: handlers, shown: shown, opened: opened };
}

function event(extra) {
    var waits = [];
    return Object.assign({ waitUntil: function (p) { waits.push(p); }, waits: waits }, extra);
}

test('the worker shows a push as the notification its payload describes', async function () {
    var w = worker();
    var push = event({ data: { json: function () { return { title: 'Approved', body: 'Dune was approved.', icon: 'https://x/i.png', url: 'https://jf.example.com/web/', tag: 'r1', lang: 'en-us', timestamp: 5 }; } } });
    w.handlers.push(push);
    await Promise.all(push.waits);
    assert.equal(w.shown.length, 1);
    assert.equal(w.shown[0].title, 'Approved');
    assert.deepEqual(JSON.parse(JSON.stringify(w.shown[0].options)), { body: 'Dune was approved.', data: { url: 'https://jf.example.com/web/' }, icon: 'https://x/i.png', tag: 'r1', lang: 'en-us', timestamp: 5 });

    var text = event({ data: { json: function () { throw new Error('not json'); }, text: function () { return 'plain'; } } });
    w.handlers.push(text);
    assert.equal(w.shown[1].options.body, 'plain');
    w.handlers.push(event({ data: null }));
    assert.equal(w.shown[2].title, '');
});

test('a click focuses a window already at the address, or opens one, and never opens another scheme', async function () {
    var focused = [];
    var w = worker([{ url: 'https://jf.example.com/other', focus: function () { focused.push('other'); } }, { url: 'https://jf.example.com/web/', focus: function () { focused.push('web'); } }]);
    var closed = [];
    var click = event({ notification: { data: { url: 'https://jf.example.com/web/' }, close: function () { closed.push(true); } } });
    w.handlers.notificationclick(click);
    await Promise.all(click.waits);
    assert.deepEqual(focused, ['web']);
    assert.equal(closed.length, 1);
    assert.deepEqual(w.opened, []);

    var open = worker([]);
    var relative = event({ notification: { data: { url: 'details?id=1' }, close: function () {} } });
    open.handlers.notificationclick(relative);
    var bad = event({ notification: { data: { url: 'javascript:alert(1)' }, close: function () {} } });
    open.handlers.notificationclick(bad);
    await Promise.all(relative.waits.concat(bad.waits));
    assert.deepEqual(open.opened, ['https://jf.example.com/requests/details?id=1', 'https://jf.example.com/requests/']);
});

var { createWebPushToggle, webPushScope } = await import('../../src/js/web-push.js');

function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }

// A plugin whose routes answer the key and record what is posted to them.
function plugin(key) {
    var calls = [];
    return {
        calls: calls,
        request: function (path, init) {
            calls.push([path, init && init.method || 'GET', init && init.body ? JSON.parse(init.body) : null]);
            if (path === 'Push/Key') return Promise.resolve({ ok: true, json: function () { return Promise.resolve(key === undefined ? { PublicKey: KEY } : key); } });
            return Promise.resolve({ ok: true, json: function () { return Promise.resolve(null); } });
        }
    };
}

function toggle(server, reg, extra) {
    return createWebPushToggle(Object.assign({ keyUrl: 'Push/Key', subscribeUrl: 'Push/Subscribe', unsubscribeUrl: 'Push/Unsubscribe', registration: reg, request: server.request }, extra || {}));
}

test('the toggle turns notifications on, posting the subscription to the plugin, and off again', async function () {
    browser();
    var server = plugin();
    var reg = registration();
    var t = toggle(server, reg.reg);
    await settle();
    assert.equal(t.getState(), 'off');
    assert.equal(t.status.textContent.trim().endsWith('Notifications are off.'), true);
    assert.equal(t.button.textContent, 'Turn on notifications');
    assert.equal(t.button.hidden, false);
    t.button.click();
    await settle(); await settle();
    assert.equal(t.getState(), 'on');
    assert.equal(t.button.textContent, 'Turn off notifications');
    assert.deepEqual(server.calls[1], ['Push/Subscribe', 'POST', { endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' }, label: 'Chrome · macOS' }]);
    t.button.click();
    await settle(); await settle();
    assert.equal(t.getState(), 'off');
    assert.equal(server.calls[2][0], 'Push/Unsubscribe');
});

test('an unsupported browser and a blocked one show their sentence with no button', async function () {
    browser({ push: false });
    var t = toggle(plugin(), registration().reg);
    await settle();
    assert.equal(t.getState(), 'unsupported');
    assert.equal(t.button.hidden, true);
    assert.match(t.status.textContent, /This browser cannot show notifications\./);
    browser({ permission: 'denied' });
    var d = toggle(plugin(), registration().reg);
    await settle();
    assert.equal(d.getState(), 'denied');
    assert.equal(d.button.hidden, true);
    assert.equal(d.status.getAttribute('role'), 'status');
});

test('the toggle hides while the server offers no key, and a failed change shows its line', async function () {
    browser();
    var none = toggle(plugin({ PublicKey: '' }), registration().reg);
    await settle();
    assert.equal(none.element.hidden, true);
    assert.equal(none.getState(), null);
    var server = plugin('BAD');
    server.request = (function (inner) {
        return function (path, init) { return path === 'Push/Subscribe' ? Promise.reject(new Error('no')) : inner(path, init); };
    })(plugin().request);
    var t = toggle(server, registration().reg, { failedText: 'It did not work.' });
    await settle();
    t.button.click();
    await settle(); await settle();
    assert.match(t.status.textContent, /It did not work\./);
    assert.equal(t.status.getAttribute('role'), 'alert');
    assert.equal(t.button.disabled, false);
});

test('a worker address is registered at the base path of the page', async function () {
    browser();
    dom = installFakeDom();
    document.baseURI = 'https://media.example/jellyfin/web/index.html';
    var registered = [];
    navigator.serviceWorker = { register: function (url, o) { registered.push([url, o.scope]); return Promise.resolve(registration().reg); } };
    var t = toggle(plugin(), undefined, { workerUrl: '../Push/Worker.js', scope: webPushScope('https://media.example/jellyfin/') });
    await settle();
    assert.deepEqual(registered, [['https://media.example/jellyfin/Push/Worker.js', '/jellyfin/']]);
    assert.equal(t.getState(), 'off');
    assert.equal(webPushScope('https://media.example/jellyfin'), '/jellyfin/');
    assert.equal(webPushScope('not an address'), '/');
});
