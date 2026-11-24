/*
 * web-client-parity.js
 * Compares a plugin's web client shell page with the installed web client, side by side, and prints what differs.
 *
 * It runs in the browser, not in node. Sign in to the server's /web/, open the developer console, set the options, and
 * paste this file:
 *
 *     window.parityOptions = { page: 'myplugin/' };
 *
 * Run it again without pasting: webClientParity({ page: 'myplugin/', widths: [375] }). The report is kept in
 * window.parityReport, and copy(JSON.stringify(parityReport)) copies it.
 *
 * It opens both pages in frames at each width, waits for them, measures the probes of each scenario on both, and prints a
 * table of the boxes and styles that differ. It only reads. Its only clicks are the ones a scenario's open steps name, inside
 * its own frames, such as the avatar and the drawer button.
 *
 * Options:
 *   page       the plugin's page, relative to the server root, such as myplugin/ (required)
 *   widths     frame widths to compare at (default [375, 820, 1400])
 *   height     frame height (default 900)
 *   tolerance  pixels a box or length may differ by. Colors and other values must match exactly (default 1)
 *   timeout    milliseconds to wait for each page's content (default 20000)
 *   keep       true leaves the last pair of frames on screen (default false)
 *   scenarios  the scenarios to run, ids of the built in ones, appBar, userMenu, and drawer, or the plugin's own scenario
 *              objects (default the three built in ones)
 *   probes     the plugin's own probes, added to the built in ones
 *   context    async (ctx) => ctx, which adds what the plugin's scenarios need, such as an item from the library
 *   beforeMeasure async ({ scenario, width, web, page }) => {}, called before measuring with both frames' windows
 *
 * A probe: { group, name, web, page, anchor, ignore, props, pseudo, optional }. web and page are where to find it on each
 * side: a CSS selector, with 'a >> b' for b inside the first visible a, 'sel@1' for the second visible match,
 * 'section(Title)' for the visible .verticalSection whose .sectionTitle starts with Title, and 'text()' for the first text
 * inside. anchor measures from another element. ignore lists the keys not compared, such as ['y'] or ['background-image'].
 *
 * A scenario: { id, groups, sections, web(ctx), page(ctx), ready, settle, open, at(width, widths), note(docs) }. web and page
 * give the hash after each address. ready and settle are { web: [...], page: [...] } selectors to wait for. open is a step,
 * or a list of steps, { web, page, show: { web, page } }, each clicking a button inside the frames and waiting for what shows.
 * webClientParity.sectionProbes(title) gives the probes of a row of cards, for a scenario's sections.
 */
(function () {
    'use strict';

    var STYLE = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'background-image', 'padding', 'margin', 'border-radius', 'opacity'];
    var LAYER = STYLE.concat('position');
    var TEXT = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'opacity'];
    var SURFACE = ['background-color', 'background-image', 'padding', 'margin', 'border-radius', 'opacity'];
    var ICON = ['color', 'fill', 'opacity'];
    var ARTWORK = ['background-image', 'background-color', 'opacity'];

    var WEB_SERVER = 'header a.MuiButton-sizeLarge';
    var WEB_MENU = '#app-user-menu .MuiMenu-paper';
    var PAGE_MENU = '#stolon-shell-user-menu';
    var WEB_DRAWER = '.MuiDrawer-paper';
    var PAGE_DRAWER = '#stolon-shell-drawer';

    var PROBES = [
        { group: 'appBar', name: 'app bar', web: 'header.MuiAppBar-root', page: '.stolon-shell-bar', props: LAYER },
        { group: 'appBar', name: 'app bar toolbar', web: 'header .MuiToolbar-root', page: '.stolon-shell-toolbar', props: SURFACE },
        { group: 'appBar', name: 'server button', web: WEB_SERVER, page: '.stolon-shell-server', props: SURFACE },
        { group: 'appBar', name: 'server logo', web: WEB_SERVER + ' >> img', page: '.stolon-shell-server >> img', props: SURFACE },
        { group: 'appBar', name: 'server name', web: WEB_SERVER + ' >> text()', page: '.stolon-shell-server >> text()', props: TEXT, ignore: ['w'] },
        { group: 'appBar', name: 'menu button', web: 'header [aria-label="Open Menu" i]', page: '.stolon-shell-drawer-button', props: SURFACE },
        { group: 'appBar', name: 'menu button icon', web: 'header [aria-label="Open Menu" i] >> svg', page: '.stolon-shell-drawer-button >> svg', props: ICON },
        { group: 'appBar', name: 'library button', web: 'header .MuiToolbar-root a.MuiButton-root@1', page: '.stolon-shell-nav-button@1', props: SURFACE, optional: true, ignore: ['x', 'w'] },
        { group: 'appBar', name: 'user avatar', web: 'header [aria-label="User Menu" i] >> .MuiAvatar-root', page: '.stolon-shell-avatar', props: SURFACE.concat('color') },

        { group: 'userMenu', name: 'menu paper', web: WEB_MENU, page: PAGE_MENU, props: LAYER, ignore: ['padding', 'h'] },
        { group: 'userMenu', name: 'menu item 1', web: WEB_MENU + ' >> .MuiMenuItem-root', page: PAGE_MENU + ' >> .MuiMenuItem-root' },
        { group: 'userMenu', name: 'menu item 1 icon', web: WEB_MENU + ' >> .MuiMenuItem-root >> svg', page: PAGE_MENU + ' >> .MuiMenuItem-root >> svg', props: ICON },
        { group: 'userMenu', name: 'menu item 1 text', web: WEB_MENU + ' >> .MuiMenuItem-root >> text()', page: PAGE_MENU + ' >> .MuiMenuItem-root >> text()', props: TEXT, ignore: ['w'] },
        { group: 'userMenu', name: 'menu item 2', web: WEB_MENU + ' >> .MuiMenuItem-root@1', page: PAGE_MENU + ' >> .MuiMenuItem-root@1' },
        { group: 'userMenu', name: 'menu divider', web: WEB_MENU + ' >> hr', page: PAGE_MENU + ' >> hr', optional: true, ignore: ['y'] },

        { group: 'drawer', name: 'drawer paper', web: WEB_DRAWER, page: PAGE_DRAWER, props: LAYER, ignore: ['w', 'h'] },
        { group: 'drawer', name: 'drawer backdrop', web: '.MuiDrawer-root .MuiBackdrop-root', page: '.stolon-shell-scrim', props: LAYER },
        { group: 'drawer', name: 'drawer server item', web: WEB_DRAWER + ' >> .MuiListItemButton-root', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-server', ignore: ['w'] },
        { group: 'drawer', name: 'drawer server logo', web: WEB_DRAWER + ' >> .MuiListItemButton-root >> img', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-server >> img', props: SURFACE },
        { group: 'drawer', name: 'drawer server name', web: WEB_DRAWER + ' >> .MuiListItemText-primary', page: '.stolon-shell-drawer-server-name', props: TEXT, ignore: ['w'] },
        { group: 'drawer', name: 'drawer server version', web: WEB_DRAWER + ' >> .MuiListItemText-secondary', page: '.stolon-shell-drawer-server-version', props: TEXT, ignore: ['w'] },
        { group: 'drawer', name: 'drawer item 1', web: WEB_DRAWER + ' >> .MuiListItemButton-root@1', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-item@1', ignore: ['w'] },
        { group: 'drawer', name: 'drawer item 1 icon', web: WEB_DRAWER + ' >> .MuiListItemButton-root@1 >> svg', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-item@1 >> svg', props: ICON },
        { group: 'drawer', name: 'drawer item 1 text', web: WEB_DRAWER + ' >> .MuiListItemButton-root@1 >> text()', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-item@1 >> text()', props: TEXT, ignore: ['w'] },
        { group: 'drawer', name: 'drawer divider', web: WEB_DRAWER + ' >> hr', page: PAGE_DRAWER + ' >> hr', optional: true, ignore: ['y', 'w'] },

        { group: 'details', name: 'banner', web: '.itemBackdrop', page: '.itemBackdrop', ignore: ARTWORK },
        { group: 'details', name: 'ribbon', web: '.detailRibbon', page: '.detailRibbon' },
        { group: 'details', name: 'poster card', web: '.detailImageContainer .card', page: '.detailImageContainer .card' },
        { group: 'details', name: 'name', web: '.nameContainer .itemName', page: '.nameContainer .itemName', ignore: ['w', 'h'] },
        { group: 'details', name: 'name text', web: '.nameContainer .itemName >> text()', page: '.nameContainer .itemName >> text()', props: TEXT, ignore: ['w', 'h'] },
        { group: 'details', name: 'info row', web: '.itemMiscInfo-primary', page: '.itemMiscInfo-primary', ignore: ['w', 'h'] },
        { group: 'details', name: 'buttons row', web: '.mainDetailButtons', page: '.mainDetailButtons', ignore: ['x', 'w'] },
        { group: 'details', name: 'first button', web: '.mainDetailButtons .detailButton', page: '.mainDetailButtons .detailButton', optional: true, ignore: ['x'] },
        { group: 'details', name: 'overview text', web: '.overview >> text()', page: '.overview >> text()', props: TEXT, ignore: ['w', 'h'] },
        { group: 'details', name: 'details group', web: '.itemDetailsGroup', page: '.itemDetailsGroup', ignore: ['y', 'h'] },

        { group: 'dialog', name: 'dialog', web: '.dialogContainer .dialog', page: '.dialogContainer .dialog', optional: true, props: LAYER },
        { group: 'dialog', name: 'dialog header', web: '.dialog .formDialogHeader', page: '.dialog .formDialogHeader', optional: true },
        { group: 'dialog', name: 'dialog footer button', web: '.dialog .formDialogFooterItem', page: '.dialog .formDialogFooterItem', optional: true },

        { group: 'search', name: 'search input', web: '.searchfields-txtSearch', page: '.searchfields-txtSearch' },
        { group: 'search', name: 'first row heading', web: '.sectionTitle >> text()', page: '.sectionTitle >> text()', props: TEXT, ignore: ['w'] }
    ];

    // A row of cards: its heading, scroll buttons, and first two cards, measured from the row so rows above it do not move it.
    function sectionProbes(title) {
        var s = 'section(' + title + ') >> ';
        var g = 'section:' + title;
        var a = s + '.itemsContainer';
        var p = title + ': ';
        return [
            { group: g, name: p + 'heading text', web: s + '.sectionTitle >> text()', page: s + '.sectionTitle >> text()', anchor: a, props: TEXT, ignore: ['w'] },
            { group: g, name: p + 'scroll button', web: s + '.emby-scrollbuttons-button', page: s + '.emby-scrollbuttons-button', anchor: a, optional: true },
            { group: g, name: p + 'row', web: a, page: a, ignore: ['y'] },
            { group: g, name: p + 'card 1', web: s + '.card', page: s + '.card', anchor: a },
            { group: g, name: p + 'card 1 image', web: s + '.card >> .cardImageContainer', page: s + '.card >> .cardImageContainer', anchor: a, ignore: ARTWORK },
            { group: g, name: p + 'card 1 text', web: s + '.card >> .cardText', page: s + '.card >> .cardText', anchor: a },
            { group: g, name: p + 'card 2', web: s + '.card@1', page: s + '.card@1', anchor: a, optional: true }
        ];
    }

    var SCENARIOS = [
        {
            id: 'appBar',
            groups: ['appBar'],
            web: function () { return '#/home'; },
            page: function () { return ''; },
            ready: { web: ['header .MuiToolbar-root'], page: ['.stolon-shell-toolbar'] },
            settle: { web: ['header [aria-label="User Menu" i]'], page: ['.stolon-shell-avatar'] }
        },
        {
            id: 'userMenu',
            at: function (w) { return w >= 1000; },
            groups: ['userMenu'],
            web: function () { return '#/home'; },
            page: function () { return ''; },
            ready: { web: ['header [aria-label="User Menu" i]'], page: ['.stolon-shell-avatar'] },
            open: { web: 'header [aria-label="User Menu" i]', page: '.stolon-shell-avatar', show: { web: WEB_MENU + ' >> .MuiMenuItem-root', page: PAGE_MENU + ' >> .MuiMenuItem-root' } }
        },
        {
            id: 'drawer',
            at: function (w, all) { return w === Math.min.apply(null, all) && w < 900; },
            groups: ['drawer'],
            web: function () { return '#/home'; },
            page: function () { return ''; },
            ready: { web: ['header [aria-label="Open Menu" i]'], page: ['.stolon-shell-drawer-button'] },
            open: { web: 'header [aria-label="Open Menu" i]', page: '.stolon-shell-drawer-button', show: { web: WEB_DRAWER + ' >> .MuiListItemButton-root@1', page: PAGE_DRAWER + ' >> .stolon-shell-drawer-item@1' } }
        }
    ];

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function visible(el) {
        if (!el || !el.getClientRects().length) return false;
        var cs = el.ownerDocument.defaultView.getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none';
    }

    function textLeaf(el) {
        var walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (var n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.nodeValue.trim() && visible(n.parentElement)) return n;
        }
        return null;
    }

    // Finds a probe's element, { el, text } or null, by the selector extras the header describes.
    function find(doc, spec) {
        if (!spec) return null;
        if (typeof spec === 'function') { var f = spec(doc); return f ? { el: f, text: null } : null; }
        var scope = doc;
        var text = null;
        var steps = spec.split(' >> ');
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i].trim();
            var m;
            if (step === 'text()') {
                text = scope === doc ? null : textLeaf(scope);
                if (!text) return null;
                scope = text.parentElement;
            } else if ((m = /^section\((.+)\)$/.exec(step))) {
                var want = m[1].toLowerCase();
                scope = Array.prototype.find.call(scope.querySelectorAll('.verticalSection'), function (s) {
                    var t = s.querySelector('.sectionTitle');
                    return visible(s) && t && t.textContent.trim().toLowerCase().indexOf(want) === 0;
                });
                if (!scope) return null;
            } else {
                var at = /^(.*)@(\d+)$/.exec(step);
                var css = at ? at[1] : step;
                var nth = at ? +at[2] : 0;
                scope = Array.prototype.filter.call(scope.querySelectorAll(css), visible)[nth];
                if (!scope) return null;
            }
        }
        return { el: scope, text: text };
    }

    function round(v) { return Math.round(v * 10) / 10; }

    function measure(win, found, anchor, probe) {
        var r;
        if (found.text) {
            var range = win.document.createRange();
            range.selectNodeContents(found.text);
            r = range.getBoundingClientRect();
        } else {
            r = found.el.getBoundingClientRect();
        }
        var ox = win.scrollX;
        var oy = win.scrollY;
        if (anchor) { var a = anchor.el.getBoundingClientRect(); ox = -a.left; oy = -a.top; }
        var cs = win.getComputedStyle(found.el, probe.pseudo || null);
        var style = {};
        (probe.props || STYLE).forEach(function (p) { style[p] = cs.getPropertyValue(p); });
        return { box: { x: round(r.left + ox), y: round(r.top + oy), w: round(r.width), h: round(r.height) }, style: style };
    }

    function normalise(prop, v) {
        v = String(v).trim();
        if (prop === 'background-image') v = v.replace(/url\([^)]*\)/g, 'url(…)');
        if (prop === 'font-family') v = v.split(',')[0].replace(/["']/g, '').trim();
        return v;
    }

    // null when equal within the tolerance, else the difference, a number or ≠.
    function compare(prop, a, b, tol) {
        a = normalise(prop, a);
        b = normalise(prop, b);
        if (a === b) return null;
        if (/color/.test(prop)) return '≠';
        var ta = a.split(/\s+/);
        var tb = b.split(/\s+/);
        var px = /^-?[\d.]+px$/;
        if (ta.length === tb.length && ta.every(function (t) { return px.test(t); }) && tb.every(function (t) { return px.test(t); })) {
            var worst = 0;
            ta.forEach(function (t, i) { var d = parseFloat(tb[i]) - parseFloat(t); if (Math.abs(d) > Math.abs(worst)) worst = d; });
            return Math.abs(worst) <= tol ? null : round(worst);
        }
        if (prop === 'opacity' && Math.abs(parseFloat(a) - parseFloat(b)) < 0.01) return null;
        return '≠';
    }

    async function waitFor(win, specs, timeout) {
        var missing = (specs || []).slice();
        var end = Date.now() + timeout;
        while (missing.length && Date.now() < end) {
            missing = missing.filter(function (s) { var f = find(win.document, s); return !f || !(f.el.getBoundingClientRect().height > 0); });
            if (missing.length) await sleep(250);
        }
        return missing;
    }

    // Waits until every probe's box stops moving, up to six seconds.
    async function settle(wins, probes) {
        await Promise.all(wins.map(function (w) { return w.document.fonts ? w.document.fonts.ready : null; }));
        var last = '';
        var end = Date.now() + 6000;
        while (Date.now() < end) {
            await sleep(400);
            var sig = wins.map(function (w, i) {
                return probes.map(function (p) {
                    var f = find(w.document, i ? p.page : p.web);
                    if (!f) return '-';
                    var r = f.el.getBoundingClientRect();
                    return [r.left, r.top, r.width, r.height].map(Math.round).join(',');
                }).join('|');
            }).join('#');
            if (sig === last) return;
            last = sig;
        }
    }

    function atRest(el) {
        for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
            var cs = e.ownerDocument.defaultView.getComputedStyle(e);
            if (parseFloat(cs.opacity) < 1) return false;
            if (cs.transform !== 'none' && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(cs.transform)) return false;
        }
        return true;
    }

    async function waitAtRest(win, spec, timeout) {
        var end = Date.now() + timeout;
        while (Date.now() < end) {
            var f = find(win.document, spec);
            if (f && atRest(f.el)) return true;
            await sleep(200);
        }
        return false;
    }

    function frame(holder, url, width, height, label) {
        return new Promise(function (resolve, reject) {
            var box = document.createElement('div');
            box.style.cssText = 'display:inline-block;vertical-align:top;margin:0 16px 16px 0;';
            var caption = document.createElement('div');
            caption.style.cssText = 'font:14px sans-serif;color:#fff;margin:4px 0';
            caption.textContent = label + ' at ' + width + 'px';
            box.appendChild(caption);
            var f = document.createElement('iframe');
            f.style.cssText = 'width:' + width + 'px;height:' + height + 'px;border:1px solid #555;background:#101010;display:block;';
            var timer = setTimeout(function () { reject(new Error(label + ' did not load: ' + url)); }, 30000);
            f.onload = function () { clearTimeout(timer); resolve(f); };
            box.appendChild(f);
            holder.appendChild(box);
            f.src = url;
        });
    }

    async function runOne(holder, sc, width, ctx, o, base, probes) {
        var webUrl = base.web + sc.web(ctx);
        var pageUrl = base.page + sc.page(ctx);
        var result = { scenario: sc.id, width: width, web: webUrl, page: pageUrl, notes: [], probes: {}, differences: [], measured: 0, skipped: [] };
        holder.textContent = '';
        var frames = await Promise.all([frame(holder, webUrl, width, o.height, 'Web client'), frame(holder, pageUrl, width, o.height, 'Plugin page')]);
        var wins = frames.map(function (f) { return f.contentWindow; });
        var ready = sc.ready || { web: [], page: [] };
        var missing = await Promise.all([waitFor(wins[0], ready.web, o.timeout), waitFor(wins[1], ready.page, o.timeout)]);
        if (missing[0].length) result.notes.push('the web client never showed ' + missing[0].join(', '));
        if (missing[1].length) result.notes.push('the plugin page never showed ' + missing[1].join(', '));
        if (sc.settle) await Promise.all([waitFor(wins[0], sc.settle.web, 6000), waitFor(wins[1], sc.settle.page, 6000)]);

        var groups = sc.groups.concat((sc.sections ? sc.sections(ctx) : []).map(function (t) { return 'section:' + t; }));
        var chosen = probes.concat((sc.sections ? sc.sections(ctx) : []).reduce(function (all, t) { return all.concat(sectionProbes(t)); }, []))
            .filter(function (p) { return groups.indexOf(p.group) !== -1; });

        var steps = sc.open ? [].concat(sc.open) : [];
        var sides = ['web', 'page'];
        var labels = ['the web client', 'the plugin page'];
        for (var st = 0; st < steps.length; st++) {
            var step = steps[st];
            var buttons = sides.map(function (side, i) { return step[side] ? find(wins[i].document, step[side]) : null; });
            sides.forEach(function (side, i) {
                if (!step[side]) return;
                if (buttons[i]) buttons[i].el.click(); else result.notes.push(labels[i] + ' has no visible ' + step[side]);
            });
            var shown = await Promise.all(sides.map(function (side, i) { return buttons[i] ? waitAtRest(wins[i], step.show[side], 8000) : true; }));
            sides.forEach(function (side, i) {
                if (buttons[i] && !shown[i]) result.notes.push(labels[i] + ' did not finish opening ' + step.show[side] + '. Keep this tab in front.');
            });
        }
        if (o.beforeMeasure) await o.beforeMeasure({ scenario: sc.id, width: width, web: wins[0], page: wins[1] });
        await settle(wins, chosen);
        var note = sc.note && sc.note([wins[0].document, wins[1].document]);
        if (note) result.notes.push(note);

        chosen.forEach(function (p) {
            var docs = [wins[0].document, wins[1].document];
            var f = [find(docs[0], p.web), find(docs[1], p.page)];
            if (!f[0] && !f[1]) { result.skipped.push(p.name); return; }
            var row = /^section\(([^)]+)\)/.exec(typeof p.web === 'string' ? p.web : '');
            if (row && (!find(docs[0], row[0]) || !find(docs[1], row[0]))) {
                var only = 'row "' + row[1] + '" is only on ' + (find(docs[0], row[0]) ? 'the web client' : 'the plugin page') + ', so it is not compared';
                if (result.notes.indexOf(only) === -1) result.notes.push(only);
                result.skipped.push(p.name);
                return;
            }
            if (!f[0] || !f[1]) {
                if (p.optional) { result.skipped.push(p.name); return; }
                result.differences.push({ probe: p.name, what: 'element', web: f[0] ? 'present' : 'missing', page: f[1] ? 'present' : 'missing', delta: '≠' });
                return;
            }
            var anchors = [null, null];
            if (p.anchor) {
                anchors = [find(docs[0], p.anchor.web || p.anchor), find(docs[1], p.anchor.page || p.anchor)];
                if (!anchors[0] || !anchors[1]) { anchors = [null, null]; result.notes.push(p.name + ': anchor missing, measured from the page'); }
            }
            var m = [measure(wins[0], f[0], anchors[0], p), measure(wins[1], f[1], anchors[1], p)];
            result.probes[p.name] = { web: m[0], page: m[1] };
            result.measured++;
            var ignore = p.ignore || [];
            ['x', 'y', 'w', 'h'].forEach(function (k) {
                if (ignore.indexOf(k) !== -1) return;
                var d = round(m[1].box[k] - m[0].box[k]);
                if (Math.abs(d) > o.tolerance) result.differences.push({ probe: p.name, what: k, web: m[0].box[k], page: m[1].box[k], delta: d });
            });
            Object.keys(m[0].style).forEach(function (k) {
                if (ignore.indexOf(k) !== -1) return;
                var d = compare(k, m[0].style[k], m[1].style[k], o.tolerance);
                if (d !== null) result.differences.push({ probe: p.name, what: k, web: m[0].style[k], page: m[1].style[k], delta: d });
            });
        });
        return result;
    }

    async function webClientParity(options) {
        var o = Object.assign({ widths: [375, 820, 1400], height: 900, tolerance: 1, timeout: 20000, keep: false, scenarios: ['appBar', 'userMenu', 'drawer'], probes: [] }, options || {});
        if (!o.page || typeof o.page !== 'string') throw new Error('Name the plugin page to compare, such as webClientParity({ page: \'myplugin/\' }).');
        var api = window.ApiClient;
        if (!api || !api.getCurrentUserId || !api.getCurrentUserId()) throw new Error('Run this on the web client, /web/, while signed in.');

        var root = location.pathname.replace(/\/web(\/.*)?$/, '/');
        var base = { web: root + 'web/', page: root + o.page.replace(/^\/+/, '') };
        var ctx = { userId: api.getCurrentUserId(), serverId: api.serverId ? api.serverId() : '', api: api };
        if (o.context) ctx = (await o.context(ctx)) || ctx;
        var scenarios = o.scenarios.map(function (s) {
            return typeof s === 'string' ? SCENARIOS.filter(function (b) { return b.id === s; })[0] : s;
        }).filter(Boolean);
        var probes = PROBES.concat(o.probes || []);
        console.log('[parity] comparing ' + base.web + ' with ' + base.page);

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.92);overflow:auto;padding:12px;';
        var holder = document.createElement('div');
        holder.style.cssText = 'transform-origin:0 0;white-space:nowrap;';
        overlay.appendChild(holder);
        document.body.appendChild(overlay);

        var report = { startedAt: new Date().toISOString(), page: base.page, options: { widths: o.widths, height: o.height, tolerance: o.tolerance }, results: [] };
        try {
            for (var s = 0; s < scenarios.length; s++) {
                var sc = scenarios[s];
                for (var w = 0; w < o.widths.length; w++) {
                    var width = o.widths[w];
                    if (sc.at && !sc.at(width, o.widths)) continue;
                    holder.style.transform = 'scale(' + Math.min(1, (window.innerWidth - 40) / (2 * width + 40)) + ')';
                    console.log('[parity] ' + sc.id + ' at ' + width + 'px');
                    var r;
                    try {
                        r = await runOne(holder, sc, width, ctx, o, base, probes);
                    } catch (e) {
                        r = { scenario: sc.id, width: width, notes: ['failed: ' + e.message], probes: {}, differences: [], measured: 0, skipped: [] };
                    }
                    report.results.push(r);
                }
            }
        } finally {
            if (!o.keep) overlay.remove();
        }

        var total = 0;
        var measured = 0;
        report.results.forEach(function (r) {
            measured += r.measured;
            total += r.differences.length;
            var title = r.scenario + ' at ' + r.width + 'px: ' + r.differences.length + ' differences in ' + r.measured + ' probes';
            if (r.differences.length || r.notes.length) {
                console.group(title);
                r.notes.forEach(function (n) { console.warn(n); });
                if (r.differences.length) console.table(r.differences);
                console.groupEnd();
            } else {
                console.log(title);
            }
        });
        report.summary = total + ' differences across ' + measured + ' probes in ' + report.results.length + ' page pairs, tolerance ' + o.tolerance + 'px';
        console.log('[parity] ' + report.summary + '. The report is in window.parityReport.');
        window.parityReport = report;
        return report;
    }

    window.webClientParity = webClientParity;
    window.webClientParity.PROBES = PROBES;
    window.webClientParity.SCENARIOS = SCENARIOS;
    window.webClientParity.sectionProbes = sectionProbes;
    if (window.parityOptions) return webClientParity(window.parityOptions);
    console.log('[parity] Loaded. Run webClientParity({ page: \'myplugin/\' }).');
    return null;
})();
