// Behavior tests for the form field builders, run on the stub DOM in fake-dom.mjs. They build the web client's own field
// markup, with is set as an attribute so the web client upgrades each control once it is in the page.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var kit = await import('../../src/js/index.js');

beforeEach(function () { dom = installFakeDom(); });

function kids(el) {
    return el.children.map(function (c) { return c.tagName.toLowerCase() + (c.className ? '.' + c.className.split(' ').join('.') : ''); });
}

test('an input field is a label, an emby-input, and its description, in that order', function () {
    var f = kit.createInputField({ label: 'Port', help: 'The port it listens on.', type: 'number', min: 1, max: 65535, field: 'Port', value: 8096 });
    assert.equal(f.element.className, 'inputContainer');
    assert.deepEqual(kids(f.element), ['label.inputLabel.inputLabelUnfocused', 'input', 'div.fieldDescription']);
    assert.equal(f.input.getAttribute('is'), 'emby-input');
    assert.equal(f.input.getAttribute('type'), 'number');
    assert.equal(f.input.getAttribute('min'), '1');
    assert.equal(f.input.getAttribute('data-field'), 'Port');
    assert.equal(f.element.querySelector('label').getAttribute('for'), f.input.id);
    assert.equal(f.getValue(), '8096');
    f.setValue('9000');
    assert.equal(f.input.value, '9000');
    assert.equal(f.help.textContent, 'The port it listens on.');
});

test('a field with no help has no description, and ids never repeat', function () {
    var a = kit.createInputField({ label: 'A' });
    var b = kit.createInputField({ label: 'B' });
    assert.equal(a.help, null);
    assert.deepEqual(kids(a.element), ['label.inputLabel.inputLabelUnfocused', 'input']);
    assert.notEqual(a.input.id, b.input.id);
});

test('an invalid value shows its message through the validation core, and validateAll refuses it', function () {
    var f = kit.createInputField({ label: 'Port', type: 'number', min: 1, max: 10, value: 50 });
    var custom = kit.createInputField({ label: 'Host', value: 'bad host', validate: function (v) { return / /.test(v) ? 'No spaces.' : null; } });
    var form = dom.el('div', {}, [f.element, custom.element]);
    dom.document.body.appendChild(form);
    assert.equal(kit.validateAll(form), false);
    assert.equal(f.input.getAttribute('aria-invalid'), 'true');
    var messages = all(form, '.stolon-field-message');
    assert.equal(messages.length, 2);
    assert.ok(messages.every(shown));
    assert.match(messages[1].textContent, /No spaces\./);
    f.setValue('5');
    custom.setValue('host');
    assert.equal(kit.validateAll(form), true);
});

test('a select is written as the web client upgrades it, with one label and one arrow, and setOptions keeps a value still offered', function () {
    var f = kit.createSelectField({ label: 'Mode', help: 'How it runs.', options: [{ value: 'a', text: 'Allow' }, { value: 'b', text: 'Block' }], value: 'b' });
    assert.deepEqual(kids(f.element), ['label.selectLabel', 'select.emby-select.emby-select-withcolor', 'div.selectArrowContainer', 'div.fieldDescription']);
    assert.equal(f.input.getAttribute('is'), 'emby-select');
    assert.equal(f.element.querySelector('.selectArrow').getAttribute('aria-hidden'), 'true');
    assert.equal(f.getValue(), 'b');
    f.setOptions([{ value: 'b', text: 'Block' }, { value: 'c', text: 'Count' }]);
    assert.equal(f.getValue(), 'b');
    assert.equal(f.input.options.length, 2);
    f.setValue('c');
    assert.equal(f.getValue(), 'c');
});

test('a text area takes lines as an array, and readLines gives them back trimmed with the blank ones left out', function () {
    var f = kit.createTextareaField({ label: 'Hosts', value: ['a.example', 'b.example'] });
    assert.deepEqual(kids(f.element), ['label.textareaLabel.textareaLabelUnfocused', 'textarea.emby-textarea']);
    assert.equal(f.input.getAttribute('is'), 'emby-textarea');
    assert.equal(f.input.getAttribute('rows'), '4');
    assert.equal(f.getValue(), 'a.example\nb.example');
    f.input.value = '  c.example \r\n\n d.example';
    assert.deepEqual(kit.readLines(f.input), ['c.example', 'd.example']);
    assert.deepEqual(kit.readLines(null), []);
});

test('a checkbox field is the web client checkbox with its description, and reads as a boolean', function () {
    var f = kit.createCheckboxField({ label: 'Enabled', help: 'Turns the tool on.', checked: true, field: 'Enabled' });
    assert.equal(f.element.className, 'checkboxContainer checkboxContainer-withDescription');
    assert.equal(f.input.getAttribute('is'), 'emby-checkbox');
    assert.equal(f.input.getAttribute('type'), 'checkbox');
    assert.equal(f.element.querySelector('.checkboxLabel').textContent, 'Enabled');
    assert.equal(f.help.className, 'fieldDescription checkboxFieldDescription');
    assert.equal(f.getValue(), true);
    f.setValue(false);
    assert.equal(f.input.checked, false);
    assert.equal(kit.createCheckboxField({ label: 'Plain' }).element.className, 'checkboxContainer');
});

test('a secret field keeps a stored secret out of the page and posts the kept sentinel until it is typed or cleared', function () {
    var f = kit.createSecretField({ label: 'Token', help: 'The API token.', stored: true });
    assert.deepEqual(kids(f.element), ['label.inputLabel.inputLabelUnfocused', 'input.stolon-secret-stored', 'button.raised.stolon-button.stolon-secondary.stolon-small', 'div.fieldDescription']);
    assert.equal(f.input.getAttribute('type'), 'password');
    assert.equal(f.input.getAttribute('autocomplete'), 'new-password');
    assert.equal(f.clear.textContent, 'Clear');
    assert.equal(f.getValue(), kit.SECRET_KEPT);
    f.clear.click();
    assert.equal(f.getValue(), '');
    assert.ok(f.clear.classList.contains('stolon-hidden'));
    f.setStored(false);
    f.setValue('new');
    assert.equal(f.getValue(), 'new');
});

test('readNumber gives a number, or null for blank or anything that is not a number', function () {
    assert.equal(kit.readNumber({ value: ' 42 ' }), 42);
    assert.equal(kit.readNumber({ value: '1.5' }), 1.5);
    assert.equal(kit.readNumber({ value: '' }), null);
    assert.equal(kit.readNumber({ value: '12abc' }), null);
    assert.equal(kit.readNumber(null), null);
});
