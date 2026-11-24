// typings.test.ts
// Checks the shipped typings, dist/stolon.d.ts. It imports the bundle by a configurationpage path the way
// a plugin page does. Every export is called the way a plugin would, and each
// line marked as an expected error is a call the typings must reject. Run it with scripts/check-types.sh.

import * as B from './configurationpage?name=test_stolon.js';
import type { Shared, PageHandle, PagedResult, TableHandle } from './configurationpage?name=test_stolon.js';

declare var view: HTMLElement;
declare var input: HTMLInputElement;

interface Row {
    id: string;
    name: string;
}

var page: PageHandle = B.createConfigPage(view, {
    pluginId: 'guid',
    tabsKey: 'plugin',
    tabs: [{ href: 'configurationpage?name=a', name: 'A' }],
    load: function (shared: Shared) { shared.setStatus('status', 'Saved.'); }
});
var shared: Shared = B.createShared(view, 'guid', 'Plugin');
var table: TableHandle<Row> = B.createPaginatedTable<Row>(view, shared, { containerId: 'rows', endpoint: 'Rows', columns: [{ key: 'name' }] });
var result: PagedResult<Row> = { Items: [], TotalCount: 0, Page: 1, PageSize: 25, TotalPages: 1, HasMore: false };

B.setTabs('plugin', 0, function () { return [{ href: 'x', name: 'X' }]; });
B.initCollapsibles(view);
B.generateGuid({ compact: true });
B.bindSecretField(input, true, { placeholder: 'Kept' });
B.clearSecretField(input);
var secret: string = B.readSecretField(input);
B.errorText(new Error('x'), 'Could not save.').then(function (text: string) { return text; });
B.debounce(function (query: string) { return query; }, 200)('a');
B.downloadJson('export.json', { a: 1 });
B.pickJsonFile();
var label: string = B.plural(2, 'item');
var kept: string = B.SECRET_KEPT;
var states: string[] = B.BADGE_STATES.names;
var safe: string = B.escapeHtml('<b>');
B.copyToClipboard('text');
B.createAvatar({});
B.createUserChip({});
B.createBanner({});
B.createBreadcrumbs({});
B.createSortableCardList<Row>(view, { render: function (row: Row) { return { title: row.name }; } });
B.createCheckboxList({});
B.createChipSelect({ options: ['a', { value: 'b', label: 'B' }] });
var combo: B.ComboBoxFieldHandle = B.createComboBox({ suggestions: ['a', { value: 'b', label: 'B' }], onChange: function (value: string) { return value; } });
combo.setSuggestions(null);
var resizable = B.createDataTable<Row>({ columns: [{ key: 'name', label: 'Name', width: 'auto', maxWidth: '12rem' }], rows: [], widthKey: 'rows' });
resizable.setColumnWidth('name', 'fit');
B.createBanner({ actions: [{ text: 'Apply', primary: true, onClick: function (button: HTMLButtonElement) { button.disabled = true; } }] });
B.createColorPicker({ opacityOnly: true }).setOpacityOnly(false);
B.createImagePicker({ fallback: 'logo.png', removable: false }).setFallback(null);
B.createRepeater({ fields: [{ key: 'Id', label: 'Id', hidden: true }, { key: 'token', label: 'Token', type: 'secret', clearable: true, transform: function (t: string) { return t.toUpperCase(); } }], newItem: function () { return { Id: '' }; } });
// @ts-expect-error A column width is pixels, 'fit', or null.
resizable.setColumnWidth('name', '20px');
B.createChoiceGroup(view, {});
B.createCopyField({});
B.createDefinitionList({});
B.openDialog({ title: 'Title', size: 'large' });
B.bindDialog('dialogId', {});
B.confirmDialog('Remove it?').then(function (yes: boolean) { return yes; });
B.openEditorDialog({});
B.openEditorDialog({ actions: [{ text: 'Duplicate', icon: 'content_copy', onClick: function (handle, button) { handle.markClean(); button.disabled = true; } }, { text: 'Send', variant: 'primary', onClick: function () {} }] });
// @ts-expect-error an action needs its onClick
B.openEditorDialog({ actions: [{ text: 'Duplicate' }] });
// @ts-expect-error an action's variant is one of the button variants
B.openEditorDialog({ actions: [{ text: 'Duplicate', variant: 'loud', onClick: function () {} }] });
B.createCopyField({ value: 'https://example.com', wrap: true });
B.promptDialog([{ name: 'name', value: '' }]);
B.createDivider({});
B.createFieldMessage({});
B.setFieldState(input, 'error', 'Required.');
B.createFilePicker({});
B.createHelpHint({ text: 'Help.' });
B.createKeyValueEditor({});
B.createLogViewer({});
B.createNumberUnitField({ units: ['minutes', { value: 'hours', factor: 60 }] });
B.createOrderedList<Row>({ render: function (row: Row) { return row.name; } });
B.createOverflowMenu({});
B.createPagination({ pageSize: 25, onChange: function (value) { return value.skip + value.take; } });
B.createPillGroup(view, {});
B.insertAtCursor(input, '{name}');
B.placeholderHint([['name', 'The name.']]);
B.bindPlaceholders(view);
B.createProgressRing({});
B.createSchedulePicker({});
B.createSearchField({});
B.createSkeleton({});
B.createSliderField({});
B.createSpinner({});
B.createStatusCard({ icon: 'vpn_lock', title: 'VPN', status: 'Ok', statusColor: 'green', detail: '3 of 7 peers online' }).setStatus('Check', 'orange');
B.createStatusCardGrid({ cards: [{ title: 'Storage', value: 82, valueLabel: '%', href: '#storage' }] }).add({ title: 'Users', onClick: function (e: MouseEvent) { return e; } });
B.createToolShell({ tools: [{ key: 'vpn', name: 'VPN', icon: 'vpn_lock', href: '#vpn', badge: { label: '2', color: 'red' } }], current: 'vpn', onSelect: function (key: string, tool, event: MouseEvent) { event.preventDefault(); return tool.name + key; } }).setCurrent('vpn');
B.createStatusDot({});
B.createStepper({});
B.createStringList({});
B.createSubTabs({});
B.createTagInput({});
B.createTimeline({});
B.createToaster({});
B.setTooltip(input, 'Tip');
B.bindTooltips(view);
B.createUserSelector({});
B.createUserMultiSelector({});
B.balanceRows(view, { minWidth: 160, maxColumns: 4 }).update();
B.bindBalancedRows(view).destroy();
B.createList<Row>({ items: [{ id: '1', name: 'One' }], render: function (row: Row) { return row.name; }, height: 'fill', onEndReached: function () { return undefined; } });
B.createMediaCard({ shape: B.mediaShape('Episode'), title: 'Title', actions: [{ label: 'Remove', icon: 'close', value: 'remove' }] });
B.createMediaPicker({ itemTypes: ['Movie'], onChange: function (items) { return items[0].Id; } });
B.createFolderPicker({});
B.createImagePicker({});
B.createAccessSchedule({ value: [{ DayOfWeek: 'Weekday', StartHour: 16, EndHour: 21.5 }], onChange: function (windows) { return windows[0].EndHour - windows[0].StartHour; } });
B.createMappingTable({ rows: [{ value: 'a', label: 'Movies' }], targets: [{ value: 'm' }], value: { a: 'm' }, unique: true });
B.createFilterPanel({ groups: [{ name: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }] }], value: { status: ['active'] }, onChange: function (value) { return value.status.length; } });
B.createSearchField({ size: 'small' }).setSize('large');
B.createPagination({ size: 'small' });

// @ts-expect-error A page needs its plugin id.
B.createConfigPage(view, {});
// @ts-expect-error The tabs are objects, not names.
B.setTabs('plugin', 0, ['A']);
// @ts-expect-error The count is a number.
B.plural('2', 'item');
// @ts-expect-error A help hint needs its text.
B.createHelpHint({});
// @ts-expect-error A number field needs its units.
B.createNumberUnitField({});
// @ts-expect-error The page size is a number.
B.createPagination({ pageSize: '25' });
// @ts-expect-error A table column needs its key.
B.createPaginatedTable<Row>(view, shared, { containerId: 'rows', endpoint: 'Rows', columns: [{}] });
// @ts-expect-error A status card value label is text.
B.createStatusCard({ valueLabel: 3 });
// @ts-expect-error A tool needs its key and name.
B.createToolShell({ tools: [{ icon: 'dns' }] });
// @ts-expect-error confirmDialog resolves to a boolean.
B.confirmDialog('Remove it?').then(function (yes: string) { return yes; });
// @ts-expect-error A secret field is an input.
B.readSecretField('field');
// @ts-expect-error lib/dom helpers are not exported from the bundle.
B.make('div');
// @ts-expect-error classNames is not exported from the bundle.
B.classNames('a');
// @ts-expect-error minWidth is a number of pixels.
B.balanceRows(view, { minWidth: '160px' });
// @ts-expect-error A dialog size is small, medium, or large.
B.openDialog({ size: 'wide' });
// @ts-expect-error A list needs render.
B.createList({ items: [1] });
// @ts-expect-error A list height is auto, fill, or a length.
B.createList({ render: function () { return ''; }, height: true });
// @ts-expect-error The layout is a row or a card.
B.createMediaCard({ layout: 'grid' });
// @ts-expect-error An action needs its icon and value.
B.createMediaCard({ actions: [{ label: 'Remove' }] });
// @ts-expect-error searchFn returns a promise of items.
B.createMediaPicker({ searchFn: function (query: string) { return [query]; } });
// @ts-expect-error The path is text.
B.createFolderPicker({ value: 5 });
// @ts-expect-error The shape is square, portrait, or wide.
B.createImagePicker({ shape: 'round' });
// @ts-expect-error A day is a Jellyfin day name or number, not a list.
B.createAccessSchedule({ value: [{ DayOfWeek: ['Monday'] }] });
// @ts-expect-error The step is a number of hours.
B.createAccessSchedule({ step: '0.5' });
// @ts-expect-error The mapping value maps strings to strings.
B.createMappingTable({ value: { a: 1 } });
// @ts-expect-error A filter group needs its options.
B.createFilterPanel({ groups: [{ name: 'status', label: 'Status' }] });
// @ts-expect-error A picked value is an array of strings.
B.createFilterPanel({ value: { status: 'active' } });
// @ts-expect-error The size is small, medium, or large.
B.createTagInput({ size: 'huge' });

// The options that shape one component into its final state.
B.createCheckbox({ label: 'Enabled', size: 'large', description: 'Sync it.', boxed: false });
B.createCheckbox({ ariaLabel: 'Enabled', field: true, boxed: true }).setIndeterminate(true);
// @ts-expect-error The checkbox size is small, medium, or large.
B.createCheckbox({ size: 'huge' });
B.createOverflowMenu({ text: 'VPN', items: [{ label: 'VPN', href: '#vpn', current: true, badge: 2 }], onSelect: function (value, item, event: MouseEvent) { return event; } }).setText('DDNS');
// @ts-expect-error A menu item badge is text, a number, or { label, color }.
B.createOverflowMenu({ items: [{ label: 'VPN', badge: true }] });
B.createDefinitionList({ layout: 'columns', arrow: true, items: [{ label: 'From', value: 'Living Room', meta: '12 GB', note: 'Main' }] });
B.createCompareTable({ columns: [{ key: 'a', label: 'A' }], rows: [{ section: 'Genres' }, { note: 'Changed by a rule.' }] });
var grid = B.createMatrixGrid({ rows: [{ key: 'speed', label: 'Speed', cells: { at: null } }], columns: [{ key: 'limit', label: 'Limit', type: 'number', unit: 'Mbps' }, { key: 'role', label: 'Role', type: 'badge' }], note: 'Speeds are per server.' });
grid.setColumnHidden('limit', true);
var section = B.createCollapsibleSection({ title: 'Movies', icon: 'movie', subtitle: 'Living Room to Office', collapsible: false });
section.setSubtitle(null);
section.setAside(document.createElement('span'));
B.createQrCode({ value: 'https://example.com', layout: 'inline', showText: 'Show QR Code' }).open();
// @ts-expect-error The layout is full or inline.
B.createQrCode({ layout: 'popup' });
var pie: B.PieChartHandle = B.createPieChart({ label: 'Storage', donut: true, centerText: '2.2k', centerLabel: 'Total', size: 'small', slices: [{ label: 'Movies', value: 820, color: '#e91e63' }], onSelect: function (slice: B.PieSlice | null, index: number) { return slice ? index : -1; } });
pie.setSlices([{ label: 'Shows', value: 1 }]);
pie.select(null);
// @ts-expect-error The size is small, medium, or large.
B.createPieChart({ size: 'huge' });
// Casing and the page's current translations.
var english: B.TranslationsHandle = B.createTranslations({ Guide: 'open the epg' }, 'en-us', ['EPG']);
english.title('Guide');
english.sentence('Guide');
var casing: string[] = english.casing;
B.titleCase('allow media playback', { exceptions: ['TV'], language: 'en-gb' });
B.sentenceCase('Allow Media Playback');
var pageStrings: B.TranslationsHandle | null = B.currentTranslations();
// @ts-expect-error The exceptions are a list of words.
B.titleCase('allow', { exceptions: 'TV' });

// Notification previews and web push.
var notice: B.NotifyPreviewHandle = B.createNotifyPreview({ preview: { Channel: 'Discord', Body: '{}', Discord: { embeds: [] } }, username: 'Jellyfin', now: new Date() });
notice.setPreview({ channel: 2, header: 'Approved', text: 'Dune was approved.' });
notice.setPreview(null);
// @ts-expect-error The channel is a channel name or number.
B.createNotifyPreview({ preview: { Channel: 'Email' } });
declare var registration: ServiceWorkerRegistration;
var pushed: Promise<B.WebPushResult> = B.subscribeWebPush({ registration: registration, publicKey: 'key', save: function (s: B.WebPushSubscriptionJson) { return Promise.resolve(s.endpoint); } });
B.unsubscribeWebPush({ registration: Promise.resolve(registration), remove: function () { return Promise.resolve(); } });
B.webPushState(registration).then(function (r: B.WebPushResult) { var state: B.WebPushState = r.state; return state; });
var pushText: string = B.webPushText('insecure') + B.webPushLabel('ua');
// @ts-expect-error Subscribing needs the registration.
B.subscribeWebPush({ publicKey: 'key' });
// @ts-expect-error A state is one of the six names.
B.webPushText('maybe');

// User pages that a plugin hosts.
var viewer: Promise<B.UserPageSession | null> = B.startUserPage({ translations: 'MyPlugin/Translations', notFoundMessage: 'That device was removed.' });
viewer.then(function (s) { return s ? s.request('MyPlugin/Devices', { method: 'POST' }) : null; });
B.showUserPageView('done');
B.setUserPageMessage(view, 'error', 'That username is taken.');
// @ts-expect-error A message state is one of the four names.
B.setUserPageMessage(view, 'danger', 'No.');

// The web client shell and its markup.
var shellSession: Promise<B.WebClientShellSession | null> = B.startWebClientShell({ translations: 'MyPlugin/Translations', menuItems: [{ text: 'Alerts', icon: 'Notifications', select: function () { return undefined; } }] });
shellSession.then(function (s) { if (s) { s.toast.show('Saved.', 'Undo', function () { return undefined; }); s.destroy(); } });
var look: B.WebClientLook = B.applyWebClientLook({ userId: 'u1', themes: [{ id: 'dark', default: true }], storage: null });
var palette: string = B.WEB_CLIENT_PALETTES.dark['--jf-palette-primary-main'];
var webButton: B.WebOverlayButton = { action: 'request', icon: 'add', title: 'Request' };
var markup: string = B.webCssUrl('a.jpg') + B.WEB_SPINNER + B.webEmptyState('Nothing', 'Add one.') + B.webSecondaryText('Line') + B.webNoResultsText('x')
    + B.webRaisedButton('r', 'Retry') + B.webBlockButton('b', 'Go', 'submit') + B.webIcon(Object.keys(B.WEB_ICONS)[0]) + B.webLibraryIcon({ Id: 'a', CollectionType: 'movies' })
    + B.webLibraryRoute({ Id: 'a' }) + String(B.webUserViewsShown(4, 800)) + B.webNavButton('web/', '', 'Movies', true) + B.webNavMoreButton()
    + B.webMenuItem('', 'Settings', 'web/') + B.webMenuDivider() + B.webDrawerList(B.webDrawerItem('web/', '', 'Home'), true, 'Libraries')
    + B.WEB_FORM_DIALOG.box + B.WEB_CONFIRM_DIALOG.footer + B.webConfirmDialogWidth(800) + B.webFormDialogFooter('Save') + B.webConfirmDialogFooter('Delete', 'delete')
    + B.webCancelDialogFooter('Send') + B.webActionsDialogFooter([{ id: 'a', text: 'A' }]) + B.webConfirmDialogBody('Sure?')
    + B.webFilterPopover('f', 'Filters', B.webFilterAccordion('g', 'Genres', B.webFilterCheckbox({ 'data-value': 'x' }, 'Drama', true)) + B.webResetFiltersButton('r', 'Reset filters'))
    + B.webSelectField('s', 'Sort', [{ value: 'a', text: 'A' }]) + B.webSelectOptions([]) + B.webTextareaField({ id: 't', label: 'Note', maxLength: 10, descriptions: [{ text: 'x', id: 'y' }] })
    + B.webFieldDescription('x') + B.WEB_CHECKBOX_LIST + B.webCheckboxListContainer('Seasons', 'box', 'Loading') + B.webCheckbox({ id: 'c' }, 'One', null, true)
    + B.webSettingsCheckbox('n', 'Notify', 'nd') + B.webLinkButton({ id: 'all' }, 'Select all') + B.webPaperList('')
    + B.webCard({ title: 'Film', shape: B.WEB_CARD_GRID, buttons: [webButton], indicator: { icon: 'check', title: 'Played' } }) + B.webCardImage(null, 'Film')
    + String(B.webDefaultColorIndex('Film')) + B.webDefaultCardIcon('Movie') + B.webIndicator(null) + B.webProgressBar(0.5)
    + B.webPosterCard(B.WEB_CARD_ROW, null, 'Poster') + B.webPlaceholderCards(2) + B.webPlaceholderGrid(2) + B.webPlaceholderLines(2) + B.webPlaceholderRow(2)
    + B.webScrollButtons('row') + B.webCardSection({ id: 'row', title: 'Row', inner: '', scroll: true }) + B.webSearchSuggestions([{ href: '#', text: 'A' }])
    + B.webDetailGrid('Movies', '') + B.webChildrenGrid('') + B.webBdi('Name') + B.webMediaInfoItem('x') + B.webOfficialRating('PG') + B.webStarRating(7)
    + B.webCriticRating(80) + B.webInfoRow('') + B.webDetailButton(null, 'info', 'Info') + B.webDetailLinkButton('#', 'link', 'Link') + B.webFavoriteButton('f', false)
    + B.webMediaInfoContent(B.webMediaInfoSource('File', B.webMediaInfoStream('Video', B.webMediaInfoAttribute('Codec', 'h264'))))
    + B.webDetailsGroupItem('Genres', B.webPersonLinks([{ href: '#', name: 'A' }]), true) + B.webExternalLinks([{ href: '#', text: 'IMDb' }]);
var adopted: boolean = B.adoptDetailsTemplate(view);
B.webFillDetailSection(view, 'cast', 'Cast', markup);
var toaster: B.WebToasterHandle = B.createWebToaster(view);
// @ts-expect-error A card needs its title.
B.webCard({ image: 'a.jpg' });
// @ts-expect-error A menu entry needs its text.
B.startWebClientShell({ menuItems: [{ icon: 'star' }] });

var thumbColumn: B.TableColumn<Row> = { key: 'name', label: 'Name', image: function () { return function () { return Promise.resolve(new Blob()); }; } };

export { page, table, result, secret, label, kept, states, safe, casing, pageStrings, pushed, pushText, viewer, thumbColumn, shellSession, look, palette, markup, adopted, toaster };
