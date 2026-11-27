import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var m = await import('../../src/js/web-client-markup.js');

beforeEach(function () {
    dom = installFakeDom();
});

// Every builder's markup, with sample values, so the class check sees each one.
function everything(desktop) {
    document.documentElement.classList.toggle('layout-desktop', !!desktop);
    var button = { action: 'more', icon: 'more_vert', title: 'More' };
    return [
        m.WEB_SPINNER, m.webEmptyState('Nothing', 'Add one.', m.webRaisedButton('retry', 'Retry')), m.webSecondaryText('Line', 'mine'),
        m.webBlockButton('go', 'Go', 'submit'), m.webBlockButton('drop', 'Drop', 'delete'), m.webIcon('Favorite'), m.webIcon('search'),
        m.webLibraryIcon({ Id: 'a', CollectionType: 'movies' }), m.webNavButton('web/', m.webIcon('Movie'), 'Movies', true, true), m.webNavMoreButton(),
        m.webMenuItem(m.webIcon('Settings'), 'Settings', 'web/#/x'), m.webMenuItem(m.webIcon('Logout'), 'Sign out', null, 'signout'), m.webMenuDivider(),
        m.webDrawerList(m.webDrawerItem('web/', m.webIcon('Home'), 'Home', true), true, 'Libraries'),
        m.WEB_FORM_DIALOG.box, m.WEB_FORM_DIALOG.header, m.WEB_FORM_DIALOG.content, m.WEB_FORM_DIALOG.footer,
        m.WEB_CONFIRM_DIALOG.box, m.WEB_CONFIRM_DIALOG.header, m.WEB_CONFIRM_DIALOG.content, m.WEB_CONFIRM_DIALOG.footer,
        m.webFormDialogFooter('Save'), m.webConfirmDialogFooter('Delete', 'delete'), m.webCancelDialogFooter('Send'),
        m.webActionsDialogFooter([{ id: 'a', text: 'A', type: 'submit' }, { id: 'b', text: 'B' }]), m.webConfirmDialogBody('Sure?'),
        m.webFilterPopover('f', 'Filters', m.webFilterAccordion('genre', 'Genres', m.webFilterCheckbox({ 'data-value': 'x' }, 'Drama', true)) + m.webResetFiltersButton('r', 'Reset filters', true)),
        m.webSelectField('s', 'Sort', [{ value: 'a', text: 'A' }]), m.webTextareaField({ id: 't', label: 'Note', maxLength: 100, descriptions: ['One', { text: 'Two', id: 'two' }] }),
        m.webCheckboxListContainer('Seasons', 'box', 'Loading'), m.WEB_CHECKBOX_LIST, m.webCheckbox({ id: 'c' }, 'Season 1', 'Here', true, true),
        m.webSettingsCheckbox('n', 'Notify', 'nd'), m.webLinkButton({ id: 'all' }, 'Select all'), m.webPaperList('', 'mine'),
        m.webCard({ title: 'Film', image: 'a.jpg', type: 'Movie', secondary: '2020', indicator: { icon: 'check', title: 'Played' }, progress: 0.5, fab: button, buttons: [button] }),
        m.webCard({ title: 'Grid', shape: m.WEB_CARD_GRID, oneLine: true }),
        m.webPosterCard(m.WEB_CARD_GRID, null, 'Poster', 'Series'), m.webPlaceholderGrid(1), m.webPlaceholderLines(2), m.webPlaceholderRow(1),
        m.webCardSection({ id: 'r1', title: 'Row', inner: '', scroll: true, listHref: '#', listKey: 'k' }), m.webCardSection({ id: 'r2', title: 'Grid', inner: '' }),
        m.webSearchSuggestions([{ href: '#', text: 'A' }]), m.webDetailGrid('Movies', ''), m.webChildrenGrid(''),
        m.webOfficialRating('PG'), m.webStarRating(7.25), m.webCriticRating(40), m.webCriticRating(80), m.webInfoRow('', 'mine'),
        m.webDetailButton('d', 'info', 'Info'), m.webDetailLinkButton('#', 'link', 'Link', true), m.webFavoriteButton('f', true), m.webFavoriteButton('g', false),
        m.webMediaInfoContent(m.webMediaInfoSource('File', m.webMediaInfoStream('Video', m.webMediaInfoAttribute('Codec', 'h264')))),
        m.webDetailsGroupItem('Genres', m.webPersonLinks([{ href: '#', name: 'A', key: 'k' }]), true), m.webDetailsGroupItem('Studio', 'X'),
        m.webExternalLinks([{ href: 'https://example.com', text: 'IMDb' }]),
        m.webOverlayButton(button), m.webOverlayButton(button, 'hover'), m.webOverlayButton(button, 'fab'), m.webMuiIcon('<path d="M0 0"></path>', 'MuiSvgIcon-root'),
        m.webStatusTag('Requested', 'mine'), m.webDetailStatus('schedule', 'Requested'), m.webListLinks([{ href: '#', name: 'Drama', key: 'g' }]),
        m.webNoteRow({ title: 'No sound', secondary: 'Today', asideHtml: m.webStatusTag('Open'), by: 'Ana', notes: [{ by: 'Bo', text: 'Fixed' }] }),
        m.webNoticeBlock('Report', 'Say what is wrong.'), m.webLimitsBox('Limits', [{ label: 'Movies', amount: '2 left', percent: 60 }])
    ].join('\n');
}

function classesIn(html) {
    var names = new Set();
    (html.match(/class="[^"]*"/g) || []).forEach(function (a) {
        a.slice(7, -1).split(/\s+/).forEach(function (n) { if (n) names.add(n); });
    });
    // The dialog class lists are plain strings.
    [m.WEB_FORM_DIALOG, m.WEB_CONFIRM_DIALOG].forEach(function (d) {
        Object.keys(d).forEach(function (k) { d[k].split(/\s+/).forEach(function (n) { names.add(n); }); });
    });
    m.WEB_CHECKBOX_LIST.split(' ').forEach(function (n) { names.add(n); });
    return names;
}

function shellClasses() {
    var source = readFileSync(new URL('../../src/WebClientCheck.cs', import.meta.url), 'utf8');
    var list = source.slice(source.indexOf('ShellClasses ='), source.indexOf('];', source.indexOf('ShellClasses =')));
    return new Set((list.match(/"([^"]+)"/g) || []).map(function (s) { return s.slice(1, -1); }));
}

// Names that are not Jellyfin's stylesheet classes: Stolon's own, Material UI's runtime ones, the page's own passed in,
// Material Icons ligature names, and the web client's helpers its markup carries without a stylesheet rule.
function jellyfinOnly(name) {
    return !/^(stolon-|Mui|Private)/.test(name) && ['mine', 'lazy', 'cardContent', 'personCard', 'smoothScrollY', 'no-grow', 'align-items-center',
        'justify-content-center', 'list', 'check', 'person', 'tv', 'movie', 'more_vert', 'info', 'link', 'favorite', 'star', 'chevron_left',
        'chevron_right', 'keyboard_arrow_down', 'text', 'label', 'content', 'mediaInfo', 'secondary', 'mdl-spinner__layer-1', 'mdl-spinner__layer-2',
        'mdl-spinner__layer-3', 'mdl-spinner__layer-4', 'defaultCardBackground', 'detail-clamp-text', 'hide', 'two-line', 'schedule', 'add',
        'centeredDialog', 'opened', 'btnCancel', 'autoSize', 'arrow_back'].indexOf(name) === -1;
}

test('every Jellyfin class the builders write is in the startup check list, so a renamed one is reported', function () {
    var listed = shellClasses();
    var names = new Set([...classesIn(everything(true)), ...classesIn(everything(false))]);
    var template = readFileSync(new URL('../../src/templates/webclient.html', import.meta.url), 'utf8');
    classesIn(template).forEach(function (n) { names.add(n); });
    var missing = [...names].filter(jellyfinOnly).filter(function (n) { return !listed.has(n); }).sort();
    assert.deepEqual(missing, []);
});

test('the builders escape the text and attributes they are given', function () {
    var html = m.webCard({ title: '<b>"x"</b>', href: 'a" onclick="y', key: 'k&' }) + m.webCheckbox({ 'data-x': '"><script>', 'bad name': 'z' }, '<i>');
    // No tag the input carried survives as a tag, in any case or spacing.
    assert.doesNotMatch(html, /<\s*\/?\s*(?:b|script|i)\b|onclick="y/i);
    assert.match(html, /&lt;b&gt;&quot;x&quot;&lt;\/b&gt;/);
    assert.match(html, /href="a&quot; onclick=&quot;y"/);
    assert.doesNotMatch(html, /bad name/);
});

test('webCssUrl encodes what could end the url early', function () {
    assert.equal(m.webCssUrl('a b") x(\'\\'), 'url("a b%22%29 x%28%27%5C")');
});

test('a card shows its hover menu on a desktop and its corner buttons on a phone', function () {
    var button = { action: 'request', icon: 'add', title: 'Request' };
    document.documentElement.classList.add('layout-desktop');
    var desktop = m.webCard({ title: 'A', buttons: [button], fab: button });
    assert.match(desktop, /card-hoverable/);
    assert.match(desktop, /cardOverlayContainer/);
    assert.match(desktop, /data-stolon-action="request"/);
    document.documentElement.classList.remove('layout-desktop');
    var phone = m.webCard({ title: 'A', buttons: [button], fab: button });
    assert.doesNotMatch(phone, /cardOverlayContainer|card-hoverable|cardOverlayFab-primary/);
    assert.match(phone, /cardOverlayButton-br/);
});

test('a card with no image takes the web client\'s color for its name and its type icon', function () {
    var html = m.webCard({ title: 'Andor', type: 'Series' });
    assert.match(html, new RegExp('defaultCardBackground' + m.webDefaultColorIndex('Andor') + ' '));
    assert.match(html, /material-icons tv/);
    assert.equal(m.webDefaultColorIndex(''), 1);
    assert.ok(m.webDefaultColorIndex('Star Wars') >= 1 && m.webDefaultColorIndex('Star Wars') <= 5);
    assert.match(m.webCard({ title: 'B', image: 'b.jpg' }), /lazy" aria-label="B" data-src="b.jpg"/);
});

test('the bar shows as many entries as fit the width, and all of them when only one would be left over', function () {
    assert.equal(m.webUserViewsShown(4, 800), 4);
    assert.equal(m.webUserViewsShown(5, 800), 3);
    assert.equal(m.webUserViewsShown(6, 1200), 6);
    assert.equal(m.webUserViewsShown(7, 1200), 5);
    assert.equal(m.webUserViewsShown(20, 1600), 8);
});

test('a library goes to its own page in the web client', function () {
    assert.equal(m.webLibraryRoute({ Id: 'a b', CollectionType: 'movies' }), '#/movies?topParentId=a%20b&collectionType=movies');
    assert.equal(m.webLibraryRoute({ Id: 'x', CollectionType: 'tvshows' }), '#/tv?topParentId=x&collectionType=tvshows');
    assert.equal(m.webLibraryRoute({ Id: 'x', CollectionType: 'livetv' }), '#/livetv?collectionType=livetv');
    assert.equal(m.webLibraryRoute({ Id: 'x', CollectionType: null, Type: 'CollectionFolder' }), '#/mixed?topParentId=x&collectionType=mixed');
    assert.equal(m.webLibraryRoute({ Id: 'x', CollectionType: 'folders', ServerId: 's' }), '#/list?parentId=x&serverId=s');
    assert.match(m.webLibraryIcon({ Id: 'x', CollectionType: 'music' }), new RegExp(m.WEB_ICONS.MusicNote.slice(0, 12)));
    assert.match(m.webLibraryIcon({ Id: 'x' }), new RegExp(m.WEB_ICONS.OndemandVideo.slice(0, 12)));
});

test('the dialog footers write Cancel in the page\'s language and the action in its color', function () {
    assert.match(m.webConfirmDialogFooter('Delete', 'delete'), /id="dialogCancel">Cancel<\/button>.*button-delete emby-button" id="dialogSubmit">Delete/);
    assert.equal(m.webConfirmDialogWidth(1000), '500px');
    assert.equal(m.webConfirmDialogWidth(320), '270px');
    assert.equal(m.webNoResultsText('Andor'), 'Sorry! No results found for "Andor"');
});

test('a toast shows its text and its action, and is reused for the next one', function () {
    var shown = m.createWebToaster(document.body);
    var undone = 0;
    globalThis.requestAnimationFrame = function (fn) { fn(); return 0; };
    shown.show('Removed.', 'Undo', function () { undone++; });
    var box = document.querySelector('.toastContainer');
    assert.equal(box.getAttribute('role'), 'status');
    assert.equal(box.querySelectorAll('.toast').length, 1);
    shown.show('Saved.');
    assert.equal(box.querySelectorAll('.toast').length, 1);
    shown.destroy();
    assert.equal(document.querySelector('.toastContainer'), null);
    assert.equal(undone, 0);
});

// A details template with every part adoptDetailsTemplate fills.
function template(skip) {
    var el = dom.el;
    var page = el('div', { id: 'itemDetailPage' });
    function add(parent, props) { var e = el('div', props); parent.appendChild(e); return e; }
    ['itemBackdrop', 'detailLogo', 'nameContainer', 'itemMiscInfo itemMiscInfo-primary', 'itemMiscInfo itemMiscInfo-secondary', 'mainDetailButtons', 'trackSelections',
        'itemExternalLinks', 'itemDetailsGroup', 'detailPageSecondaryContainer', 'detailImageContainer hide-mobile', 'detailImageContainer hide-desktop']
        .filter(function (c) { return c !== skip; })
        .forEach(function (c) { add(page, { class: c }); });
    var section = add(page, { class: 'detailSectionContent' });
    add(section, { class: 'tagline' });
    add(section, { class: 'overview' });
    var controls = add(page, { class: 'overview-controls' });
    add(controls, { class: 'overview-expand hide' });
    ['itemBirthday', 'itemBirthLocation', 'itemDeathDate', 'castCollapsible', 'similarCollapsible'].forEach(function (id) { add(page, { id: id }); });
    var children = add(page, { id: 'listChildrenCollapsible' });
    add(children, { id: 'childrenContent' });
    var content = el('div');
    content.appendChild(page);
    return { content: content };
}

test('adoptDetailsTemplate puts the template in the view with the ids the page fills', function () {
    var view = dom.el('div', {}, [dom.el('p', { class: 'old' })]);
    assert.equal(m.adoptDetailsTemplate(view, template()), true);
    assert.equal(view.querySelector('.old'), null);
    assert.ok(view.querySelector('#detailButtons'));
    assert.ok(view.querySelector('#detailOverview').classList.contains('detail-clamp-text'));
    assert.ok(view.querySelector('#detailLogo').classList.contains('hide'));
    assert.equal(view.querySelector('#overviewExpand').textContent, 'Show more');
    assert.ok(!view.querySelector('#overviewExpand').classList.contains('hide'));
    assert.equal(view.querySelector('.itemMiscInfo-secondary').classList.contains('hide'), true);
});

test('adoptDetailsTemplate leaves the view as it was and says what a template lacks', function () {
    var view = dom.el('div', {}, [dom.el('p', { class: 'old' })]);
    var missing = [];
    assert.equal(m.adoptDetailsTemplate(view, template('mainDetailButtons'), missing), false);
    assert.deepEqual(missing, ['.mainDetailButtons']);
    assert.ok(view.querySelector('.old'));
    assert.equal(m.adoptDetailsTemplate(view, null), false);
});

test('webFillDetailSection fills a section of cards, and hides it when there are none', function () {
    var section = dom.el('div', { class: 'hide' }, [dom.el('h2', { class: 'sectionTitle' }), dom.el('div', {}, [dom.el('div', { class: 'itemsContainer' })])]);
    m.webFillDetailSection(section, 'cast', 'Cast', '<div></div>');
    assert.equal(section.classList.contains('hide'), false);
    assert.equal(section.querySelector('.sectionTitle').textContent, 'Cast');
    assert.equal(section.querySelector('.itemsContainer').parentNode.id, 'cast');
    m.webFillDetailSection(section, 'cast', 'Cast', '');
    assert.equal(section.classList.contains('hide'), true);
});

test('a link to an address that runs script goes nowhere, and an ordinary one keeps its address', function () {
    var icon = '<svg></svg>';
    assert.match(m.webMenuItem(icon, 'Bad', 'javascript:alert(1)'), /href="#"/);
    assert.match(m.webNavButton(' \tJaVaScRiPt:alert(1)', icon, 'Bad'), /href="#"/);
    assert.match(m.webDrawerItem('data:text/html,x', icon, 'Bad'), /href="#"/);
    assert.match(m.webMenuItem(icon, 'Good', 'web/#/home'), /href="web\/#\/home"/);
    assert.match(m.webNavButton('https://example.com/a?b=1', icon, 'Out', false, true), /href="https:\/\/example.com\/a\?b=1"/);
});

test('webDetailStatus is a plain icon with its words, never a disabled button', function () {
    var html = m.webDetailStatus('schedule', 'Waiting <for> approval');
    assert.match(html, /^<span class="detailButton stolon-web-detail-status" role="img" title="Waiting &lt;for&gt; approval" aria-label="Waiting &lt;for&gt; approval">/);
    assert.match(html, /detailButton-icon schedule/);
    assert.doesNotMatch(html, /<button|disabled/);
});

test('webOverlayButton places a button in the corner, in the hover menu, or as its middle button', function () {
    var b = { action: 'request', icon: 'add', title: 'Request "it"', key: 'k1' };
    assert.match(m.webOverlayButton(b), /^<button type="button" class="cardOverlayButton itemAction paper-icon-button-light" data-stolon-action="request" data-stolon-key="k1" title="Request &quot;it&quot;"/);
    assert.doesNotMatch(m.webOverlayButton(b), /hover/);
    assert.match(m.webOverlayButton(b, 'hover'), /paper-icon-button-light cardOverlayButton-hover".*cardOverlayButtonIcon cardOverlayButtonIcon-hover add/);
    assert.match(m.webOverlayButton(b, 'fab'), /cardOverlayButton-hover cardOverlayFab-primary/);
});

test('webStatusTag and webListLinks escape their text and keep their keys', function () {
    assert.equal(m.webStatusTag('<b>', 'mine'), '<div class="mediaInfoText mine mediaInfoItem">&lt;b&gt;</div>');
    assert.equal(m.webStatusTag('Open'), '<div class="mediaInfoText mediaInfoItem">Open</div>');
    var links = m.webListLinks([{ href: 'a?x=1&y=2', name: 'A&B', key: 'g1' }, { href: '#', name: 'C' }]);
    assert.match(links, /href="a\?x=1&amp;y=2" data-stolon-list="g1">A&amp;B<\/a>/);
    assert.match(links, /<span>, <\/span>/);
    assert.doesNotMatch(links.split('<span>, </span>')[1], /data-stolon-list/);
});

test('webNoteRow shows its title, aside, and notes, and leaves out what it is not given', function () {
    var full = m.webNoteRow({ title: '<No sound>', secondary: 'Today', asideHtml: '<i>raw</i>', by: 'Ana', notes: [{ by: 'Bo', text: 'Line 1\nLine 2' }] });
    assert.match(full, /stolon-web-note-title">&lt;No sound&gt;<\/h3>/);
    assert.match(full, /stolon-web-note-aside"><i>raw<\/i>/);
    assert.match(full, /stolon-web-note-from">Ana</);
    assert.match(full, /stolon-web-note-by">Bo<\/div><div class="stolon-web-note-text">Line 1\nLine 2/);
    var bare = m.webNoteRow({ title: 'Only' });
    assert.doesNotMatch(bare, /stolon-web-notes|stolon-web-note-aside|secondary/);
});

test('webNoticeBlock heads a form as a settings page does', function () {
    assert.equal(m.webNoticeBlock('A<', 'B&'), '<div class="verticalSection stolon-web-notice"><h2 class="sectionTitle">A&lt;</h2><div class="fieldDescription">B&amp;</div></div>');
});

test('webLimitsBox colors each bar by how much is used and keeps it in range', function () {
    var html = m.webLimitsBox('Limits', [{ label: 'A', amount: '9 left', percent: 10 }, { label: 'B', amount: '1 left', percent: 85 }, { label: 'C', amount: '0 left', percent: 140 }]);
    assert.match(html, /^<div class="checkboxListContainer"><h3 class="checkboxListLabel">Limits<\/h3>/);
    assert.match(html, /stolon-web-limit-success" role="progressbar" aria-label="A" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10">.*translateX\(-90%\)/);
    assert.match(html, /stolon-web-limit-warning/);
    assert.match(html, /stolon-web-limit-error" role="progressbar" aria-label="C" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">.*translateX\(0%\)/);
});

test('webMuiIcon draws a Material UI icon box around its path', function () {
    assert.equal(m.webMuiIcon('<path d="M0 0"></path>', 'MuiSvgIcon-root mine'), '<svg class="MuiSvgIcon-root mine" focusable="false" aria-hidden="true" viewBox="0 0 24 24"><path d="M0 0"></path></svg>');
});

// Every class in a built element and its children.
function classesOfTree(el, names) {
    var out = names || new Set();
    (el.className || '').split(/\s+/).forEach(function (n) { if (n) out.add(n); });
    (el.children || []).forEach(function (c) { classesOfTree(c, out); });
    return out;
}

function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

test('openWebDialog builds the web client\'s form dialog in its container over its backdrop', function () {
    var opener = dom.el('button', {});
    document.body.appendChild(opener);
    opener.focus();
    var d = m.openWebDialog({ title: 'Report a problem', html: '<p>x</p>', buttons: [{ id: 'dialogSubmit', text: 'Send', type: 'submit' }] });
    var kids = document.body.children;
    assert.ok(kids[kids.length - 2].classList.contains('dialogBackdrop'));
    assert.ok(kids[kids.length - 2].classList.contains('dialogBackdropOpened'));
    assert.equal(kids[kids.length - 1], d.container);
    assert.ok(d.container.classList.contains('dialogContainer'));
    m.WEB_FORM_DIALOG.box.split(' ').forEach(function (c) { assert.ok(d.element.classList.contains(c), c); });
    assert.equal(d.element.getAttribute('aria-modal'), 'true');
    var header = d.element.querySelector('.formDialogHeader');
    assert.ok(header.querySelector('button.btnCancel .material-icons.arrow_back'));
    assert.equal(header.querySelector('h3.formDialogHeaderTitle').textContent, 'Report a problem');
    assert.equal(d.element.getAttribute('aria-labelledby'), header.querySelector('h3').id);
    assert.ok(d.element.querySelector('.formDialogContent.smoothScrollY > .dialogContentInner.dialog-content-centered'));
    var send = d.footer.querySelector('#dialogSubmit');
    assert.equal(send.className, 'btnOption raised formDialogFooterItem button-submit emby-button');
    assert.ok(d.element.contains(document.activeElement), 'focus moves into the dialog');
    d.close();
});

test('every Jellyfin class the dialogs build is in the startup check list', function () {
    var form = m.openWebDialog({ title: 'T', text: 'x', buttons: [{ id: 'a', text: 'A' }] });
    var message = m.openWebDialog({ look: 'message', title: 'T', text: 'x', buttons: [{ id: 'b', text: 'B', type: 'delete' }] });
    var names = new Set();
    [form.container, message.container].forEach(function (c) { classesOfTree(c, names); });
    names.add('dialogBackdrop'); names.add('dialogBackdropOpened');
    var listed = shellClasses();
    assert.deepEqual([...names].filter(jellyfinOnly).filter(function (n) { return !listed.has(n); }).sort(), []);
    form.close(); message.close();
});

test('a footer button closes the dialog with its id, Back with null, and onAction can keep it open', async function () {
    var seen = [];
    var d = m.openWebDialog({ buttons: [{ id: 'dialogCancel', text: 'Cancel' }, { id: 'dialogSubmit', text: 'Save' }], onAction: function (id) { seen.push(id); return id !== 'dialogSubmit' || seen.length > 1; } });
    d.footer.querySelector('#dialogSubmit').click();
    assert.ok(d.element.classList.contains('opened'), 'onAction kept it open');
    d.footer.querySelector('#dialogSubmit').click();
    assert.equal(await d.closed, 'dialogSubmit');
    assert.deepEqual(seen, ['dialogSubmit', 'dialogSubmit']);
    await wait(320);
    assert.equal(document.querySelector('.dialogContainer'), null, 'the container goes after its exit animation');
    assert.equal(document.querySelector('.dialogBackdrop'), null, 'the backdrop goes after its fade');

    var back = m.openWebDialog({ title: 'T' });
    back.element.querySelector('.btnCancel').click();
    assert.equal(await back.closed, null);
});

test('Escape closes a web dialog, and a dialog that is not dismissable stays and hides Back', async function () {
    var d = m.openWebDialog({ title: 'T', buttons: [{ id: 'ok', text: 'Done' }] });
    document.dispatch('keydown', { key: 'Escape' });
    assert.equal(await d.closed, null);
    var kept = m.openWebDialog({ title: 'T', dismissable: false, buttons: [{ id: 'ok', text: 'Done' }] });
    document.dispatch('keydown', { key: 'Escape' });
    assert.equal(kept.element.querySelector('.btnCancel').hidden, true);
    assert.ok(kept.element.classList.contains('opened'));
    kept.close('ok');
    assert.equal(await kept.closed, 'ok');
});

test('webConfirm opens the web client\'s message dialog and resolves to whether the action was chosen', async function () {
    var asked = m.webConfirm('The invite stops working.', { title: 'Delete Den', confirmText: 'Delete', destructive: true });
    var box = document.querySelector('.dialogContainer .dialog');
    m.WEB_CONFIRM_DIALOG.box.split(' ').forEach(function (c) { assert.ok(box.classList.contains(c), c); });
    assert.ok(box.classList.contains('centeredDialog'));
    assert.equal(box.querySelector('h1.formDialogHeaderTitle').textContent, 'Delete Den');
    assert.equal(box.querySelector('.dialogContentInner .text').textContent, 'The invite stops working.');
    var buttons = box.querySelectorAll('.formDialogFooter button');
    assert.deepEqual([buttons[0].textContent, buttons[1].textContent], ['Cancel', 'Delete']);
    assert.equal(buttons[1].className, 'btnOption raised formDialogFooterItem formDialogFooterItem-autosize button-delete emby-button');
    assert.equal(document.activeElement, buttons[0], 'Cancel takes focus, never the destructive action');
    buttons[1].click();
    assert.equal(await asked, true);

    var cancelled = m.webConfirm('Sure?');
    var next = document.querySelectorAll('.dialogContainer .dialog');
    var last = next[next.length - 1];
    assert.ok(last.querySelector('h1.formDialogHeaderTitle').classList.contains('hide'), 'no title hides the heading');
    assert.equal(last.getAttribute('aria-label'), 'Sure?');
    last.querySelector('#dialogCancel').click();
    assert.equal(await cancelled, false);
});

test('webOverlayButton takes a longer accessible name than its tooltip', function () {
    var html = m.webOverlayButton({ action: 'request', icon: 'add', title: 'Request', label: 'Request Charade (1963)' });
    assert.match(html, /title="Request"/);
    assert.match(html, /aria-label="Request Charade \(1963\)"/);
    assert.match(m.webOverlayButton({ action: 'more', icon: 'more_vert', title: 'More' }), /aria-label="More"/);
});

test('the filter popover grows in as the web client\'s does, and not under reduced motion', function () {
    var css = readFileSync(new URL('../../src/css/web-client-markup.css', import.meta.url), 'utf8');
    var rule = /\n\.stolon-web-filters \{([^}]*)\}/.exec(css)[1];
    assert.match(rule, /animation: stolon-web-grow-fade [^,]+, stolon-web-grow-scale/);
    assert.match(rule, /transform-origin: top left/);
    assert.match(css, /@keyframes stolon-web-grow-scale \{ from \{ transform: scale\(0\.75, 0\.5625\); \} \}/);
    var reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)[1];
    assert.match(reduced, /\.stolon-web-filters,[\s\S]*animation: none/);
    assert.match(reduced, /stolon-web-dialog-opening/);
});
