// Checks that a class names one thing: a component's own class is never also a modifier of another component.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
var cssDir = join(root, 'src', 'css');

// Each selector in the CSS, with pseudo-class arguments such as :not(...) taken out, as its compounds of classes.
function selectors() {
    var out = [];
    readdirSync(cssDir).filter(function (f) { return f.endsWith('.css'); }).forEach(function (file) {
        var css = readFileSync(join(cssDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        (css.match(/[^{}]+(?=\{)/g) || []).forEach(function (group) {
            if (group.trim().charAt(0) === '@') return;
            var stripped = group;
            while (/:[\w-]+\([^()]*\)/.test(stripped)) stripped = stripped.replace(/:[\w-]+\([^()]*\)/g, '');
            stripped.split(',').forEach(function (selector) {
                var plain = selector.trim();
                var parts = plain.split(/[\s>+~]+/).filter(Boolean).map(function (part) {
                    return (part.match(/\.[A-Za-z_][\w-]*/g) || []).map(function (c) { return c.slice(1); });
                });
                // bare: the selector starts with a class, not an element or an attribute.
                out.push({ file: file, parts: parts, bare: plain.charAt(0) === '.' });
            });
        });
    });
    return out;
}

// Modifiers many components share. None of them is ever a component of its own.
var MODIFIERS = ['stolon-info', 'stolon-success', 'stolon-warn', 'stolon-error', 'stolon-small', 'stolon-medium', 'stolon-large',
    'stolon-compact', 'stolon-selected', 'stolon-disabled', 'stolon-field-sized', 'stolon-toggle-cell',
    'stolon-red', 'stolon-orange', 'stolon-yellow', 'stolon-green', 'stolon-teal', 'stolon-blue', 'stolon-purple', 'stolon-pink', 'stolon-gray'];
// Components whose own class is never used as a modifier of another component.
var COMPONENTS = ['stolon-field', 'stolon-toggle', 'stolon-card', 'stolon-callout-info', 'stolon-callout-success', 'stolon-callout-warn',
    'stolon-callout-error', 'stolon-callout-neutral'];

test('a shared modifier is never styled as a component of its own', function () {
    var found = [];
    selectors().forEach(function (sel) {
        var first = sel.parts[0];
        if (sel.file === 'utility-classes.css' || !first || first.length !== 1 || !sel.bare) return;
        if (MODIFIERS.indexOf(first[0]) !== -1) found.push(first[0] + ' in ' + sel.file);
    });
    assert.deepEqual(found, []);
});

test('a component class is never a modifier of another component', function () {
    var found = [];
    selectors().forEach(function (sel) {
        sel.parts.forEach(function (classes) {
            classes.slice(1).forEach(function (cls) {
                if (COMPONENTS.indexOf(cls) !== -1 && classes[0] !== cls) found.push('.' + classes.join('.') + ' in ' + sel.file);
            });
        });
    });
    assert.deepEqual(found, []);
});
