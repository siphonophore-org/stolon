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
        m.webExternalLinks([{ href: 'https://example.com', text: 'IMDb' }])
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
        'mdl-spinner__layer-3', 'mdl-spinner__layer-4', 'defaultCardBackground', 'detail-clamp-text', 'hide'].indexOf(name) === -1;
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
