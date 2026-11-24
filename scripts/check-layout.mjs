#!/usr/bin/env node
// Checks every preview page for layout faults at a phone, a small tablet, and a desktop width.
//
// It loads each page built by scripts/build-previews.mjs in a headless Chromium and fails on:
//   * the page scrolling sideways
//   * a part that reaches past the edge of the page outside a frame that scrolls or clips
//   * a short label wrapping onto a second line: a badge, a tag, a pill, a status pill, or a button
//   * two pieces of text in the same row drawn over each other
//
// Chromium comes from playwright-core. Set PLAYWRIGHT_CORE to its index.mjs and CHROMIUM to the browser binary when
// they are not installed in this repository.
//
// Usage: node scripts/check-layout.mjs [name ...]   (run scripts/bundle.sh and scripts/build-previews.mjs first)
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = path.join(root, 'docs', 'assets', 'previews');
const WIDTHS = [320, 480, 800];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const corePath = process.env.PLAYWRIGHT_CORE || path.join(root, 'node_modules', 'playwright-core', 'index.mjs');
if (!existsSync(corePath)) {
    console.error('playwright-core is missing. Set PLAYWRIGHT_CORE to its index.mjs.');
    process.exit(2);
}
const { chromium } = await import(pathToFileURL(corePath).href);

if (!existsSync(pages)) {
    console.error('docs/assets/previews is missing. Run scripts/build-previews.mjs first.');
    process.exit(2);
}

const server = createServer(async function (req, res) {
    const file = path.join(pages, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(pages) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const wanted = process.argv.slice(2);
const names = (await readdir(pages)).filter((f) => f.endsWith('.html') && !f.startsWith('_'))
    .map((f) => f.slice(0, -5)).filter((n) => !wanted.length || wanted.includes(n)).sort();

// Runs in the page. Returns each fault as a line of text.
function findFaults() {
    const faults = [];
    const width = document.documentElement.clientWidth;
    const name = (el) => {
        const cls = [...el.classList].filter((c) => c.startsWith('stolon-')).slice(0, 2).join('.');
        return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (el.textContent.trim() ? ' "' + el.textContent.trim().slice(0, 30) + '"' : '');
    };
    const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
    };
    // A frame that scrolls or clips keeps what reaches past it.
    const clipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
        }
        return false;
    };

    if (document.documentElement.scrollWidth > width + 1) faults.push(`the page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);

    const all = [...document.querySelectorAll('body *')].filter(visible);
    for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > width + 1 && !clipped(el) && getComputedStyle(el).position !== 'fixed') faults.push(`${name(el)} reaches ${Math.round(r.right - width)}px past the edge`);
    }

    // The line boxes of an element's own text, skipping icon glyphs and decorations such as a progress strip.
    const textRects = (el) => {
        const rects = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent.trim() || n.parentElement.closest('.material-icons')) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            rects.push(...[...range.getClientRects()]);
        }
        // Text cut short with an ellipsis measures past its box, so each line box is clipped to the element.
        const box = el.getBoundingClientRect();
        return rects.map((q) => ({ left: Math.max(q.left, box.left), right: Math.min(q.right, box.right), top: Math.max(q.top, box.top), bottom: Math.min(q.bottom, box.bottom) }))
            .map((q) => Object.assign(q, { width: q.right - q.left, height: q.bottom - q.top })).filter((q) => q.width > 1 && q.height > 1);
    };

    const labels = document.querySelectorAll('.stolon-badge, .stolon-tag, .stolon-pill, .stolon-status-pill, .stolon-button, button.raised');
    for (const el of labels) {
        if (!visible(el) || el.closest('[hidden]')) continue;
        // The text's lines and any icon, by where each is centered: all on one row means one line.
        const rects = textRects(el).concat([...el.querySelectorAll('.material-icons')].filter(visible).map((i) => i.getBoundingClientRect()));
        if (rects.length < 2) continue;
        const line = Math.min(...rects.map((q) => q.height));
        const middles = rects.map((q) => (q.top + q.bottom) / 2).sort((a, b) => a - b);
        if (middles[middles.length - 1] - middles[0] > line * 0.6) faults.push(`${name(el)} wraps onto a second line`);
    }

    // Text drawn over other text: two leaf text elements of one parent row whose boxes cross.
    const leaves = all.filter((el) => el.children.length === 0 && el.textContent.trim() && getComputedStyle(el).position === 'static');
    const byParent = new Map();
    for (const el of leaves) {
        const row = el.parentElement;
        if (!byParent.has(row)) byParent.set(row, []);
        byParent.get(row).push(el);
    }
    for (const [, kids] of byParent) {
        for (let i = 0; i < kids.length; i++) {
            for (let j = i + 1; j < kids.length; j++) {
                const crosses = textRects(kids[i]).some((a) => textRects(kids[j]).some((b) => {
                    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                    return x > 2 && y > 2;
                }));
                if (crosses) faults.push(`${name(kids[i])} overlaps ${name(kids[j])}`);
            }
        }
    }
    return [...new Set(faults)];
}

const exe = process.env.CHROMIUM;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
let failed = 0;
for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'dark' });
    for (const n of names) {
        await page.goto(base + n + '.html', { waitUntil: 'load' });
        await page.waitForTimeout(250);
        const faults = await page.evaluate(findFaults);
        for (const f of faults) { console.log(`${n} @ ${width}px: ${f}`); failed++; }
    }
    await page.close();
}
await browser.close();
server.close();
console.log(failed ? `${failed} layout fault(s) in ${names.length} page(s).` : `No layout faults in ${names.length} page(s) at ${WIDTHS.join(', ')}px.`);
process.exit(failed ? 1 : 0);
