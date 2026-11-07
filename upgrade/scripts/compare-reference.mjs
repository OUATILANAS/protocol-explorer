#!/usr/bin/env node
// Compare the local build against the reference app, pixel by pixel and element by element.
//
//   node scripts/compare-reference.mjs                       # all cases
//   node scripts/compare-reference.mjs --only medium         # filter cases by substring
//   node scripts/compare-reference.mjs --strict              # also compare long prose
//   node scripts/compare-reference.mjs --ignore 'handle1|handle2'   # text allowed to differ
//   node scripts/compare-reference.mjs --only motion          # only the animation checks
//   node scripts/compare-reference.mjs --no-motion            # skip the animation checks (faster)
//   node scripts/compare-reference.mjs --langs en,fr,ar        # run every case once per UI language
//   node scripts/compare-reference.mjs --no-parity            # don't append ?parity=1 to --local
//
// Parity: the upgraded app hides its new lessons and features behind ?parity=1. This script appends it
// to --local automatically so the comparison checks only the replica. --no-parity turns that off.
// Languages: each language sets localStorage 'protocol-explorer:lang' in BOTH apps before load, so
// untranslated strings show up as text diffs. 'en' leaves the key unset (browser default).
//
// Motion cases (motion-medium-dark, motion-phone-dark) record both apps in real time and compare
// keyframes, every CSS animation/transition, the playback timeline, moving elements, reduced motion,
// and a filmstrip. See motion.mjs.
//
// Needs only Playwright (npm i -D playwright && npx playwright install chromium) and motion.mjs next to this file.
// Output: reference-diff/report.md, reference-diff/summary.json, and per case ref/local/diff PNGs.
// Exit code 1 while any case is outside tolerance.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMotion } from './motion.mjs';
import { collectPixelMasks, compareProseGeometry } from '../../scripts/comparison-prose-mask.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const REF = arg('ref', 'https://protocol-explorer-alpha.vercel.app/');
const PARITY = !args.includes('--no-parity');
const withParity = u => { if (!PARITY) return u; const x = new URL(u); x.searchParams.set('parity', '1'); return x.toString(); };
const LOCAL = withParity(arg('local', 'http://127.0.0.1:5173/'));
const LANGS = arg('langs', 'en').split(',').map(s => s.trim()).filter(Boolean);
const OUT = path.resolve(arg('out', 'reference-diff'));
const ONLY = arg('only', '');
const STRICT = args.includes('--strict');
const HEADED = args.includes('--headed');
const MOTION = !args.includes('--no-motion');
// text that is meant to differ (the credit handle). Matched case-insensitively against text and box labels.
const IGNORE = new RegExp(arg('ignore', 'dilumsanjaya|@anas'), 'i');

const TOL = { pos: 1, size: 1, font: 0.05, tracking: 0.05, color: 6, pixelPct: 0.5 };

const VIEWPORTS = [
  { name: 'wide', width: 1680, height: 945 },
  { name: 'medium', width: 1280, height: 800 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'narrow', width: 700, height: 900 },
  { name: 'phone', width: 375, height: 812, mobile: true },
];
const THEMES = ['dark', 'light'];

// ---------- states: the same keyboard/mouse steps are applied to both apps ----------
const key = async (page, k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(120); } };
const visibleText = (page, re) => page.locator('button:visible, [role=button]:visible').filter({ hasText: re }).first();
async function waitForReplay(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.offsetParent && (b.matches('.toggle.is-done') || /replay/i.test(b.innerText))), null, { timeout: 30000 });
}
async function complete(page) { await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {}); await key(page, 'ArrowRight', 5); await waitForReplay(page); }
const STATES = {
  overview: async () => {},
  step2: async page => { await key(page, 'ArrowRight', 2); await page.keyboard.press(' '); },
  complete,
  sequence: async page => { await complete(page); await key(page, 'v'); },
  inspector: async page => { await complete(page); await page.locator('tbody tr:visible').first().click(); },
  drawer: async page => { await page.getByRole('button', { name: /protocols/i }).filter({ visible: true }).first().click(); },
};
const STATE_LIST = ['overview', 'step2', 'complete', 'sequence', 'inspector', 'drawer'];

// In-page measuring function: every visible text run and bordered/filled box, with geometry and computed styles.
// Keys come from the text (case-insensitive) so the two apps can use different markup.
const extract = () => {
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const sx = scrollX, sy = scrollY;
  const vis = el => {
    if (!el || !el.getClientRects().length) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clipped = (el, rect) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
      const r = a.getBoundingClientRect();
      if (rect.bottom <= r.top + 1 || rect.top >= r.bottom - 1 || rect.right <= r.left + 1 || rect.left >= r.right - 1) return true;
    }
    return false;
  };
  const round = a => a.map(v => Math.round(v * 10) / 10);
  const texts = [], seen = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const raw = norm(n.textContent);
    if (!raw) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,title') || !vis(el)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rr = range.getBoundingClientRect();
    if (rr.width === 0 || rr.height === 0 || clipped(el, rr)) continue;
    const c = getComputedStyle(el);
    const inSvg = !!el.closest('svg');
    const k = raw.toLowerCase().slice(0, 80);
    const i = seen.get(k) || 0; seen.set(k, i + 1);
    texts.push({
      key: i ? `${k} #${i + 1}` : k, text: raw, explanation:!!el.closest('.ins-note'),
      rect: round([rr.x + sx, rr.y + sy, rr.width, rr.height]),
      size: parseFloat(c.fontSize), weight: c.fontWeight, style: c.fontStyle,
      tracking: parseFloat(c.letterSpacing) || 0, line: c.lineHeight, transform: c.textTransform,
      color: inSvg && c.fill && c.fill !== 'none' ? c.fill : c.color, svg: inSvg,
    });
  }
  const boxes = [], bseen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const c = getComputedStyle(el);
    const bw = parseFloat(c.borderTopWidth) + parseFloat(c.borderLeftWidth);
    const filled = !/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor);
    if (!(bw > 0 && c.borderTopStyle !== 'none') && !filled) continue;
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 120 || clipped(el, r)) continue;
    const label = norm(el.innerText || el.getAttribute('aria-label') || '').toLowerCase().split(' ').slice(0, 5).join(' ') || `(${el.tagName.toLowerCase()})`;
    const k = label.slice(0, 60);
    const i = bseen.get(k) || 0; bseen.set(k, i + 1);
    boxes.push({ key: i ? `${k} #${i + 1}` : k, rect: round([r.x + sx, r.y + sy, r.width, r.height]),
      bg: c.backgroundColor, borderWidth: parseFloat(c.borderTopWidth) || 0, borderColor: c.borderTopColor, radius: c.borderTopLeftRadius });
  }
  const html = document.documentElement;
  return {
    title: document.title, layout: html.dataset.layout || null, theme: html.dataset.theme || null,
    page: [html.scrollWidth, html.scrollHeight],
    fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`))].sort(),
    texts, boxes,
  };
};

// ---------- helpers ----------
const parseColor = s => {
  if (!s) return [0, 0, 0, 0];
  const nums = (s.match(/-?[\d.]+/g) || []).map(Number);
  if (s.startsWith('color(srgb')) return [...nums.slice(0, 3).map(v => Math.round(v * 255)), nums[3] ?? 1];
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1];
};
const colorDelta = (a, b) => { const x = parseColor(a), y = parseColor(b); return Math.max(...[0, 1, 2].map(i => Math.abs(x[i] - y[i])), Math.round(Math.abs(x[3] - y[3]) * 255)); };
const hex = s => { const [r, g, b, a] = parseColor(s); const h = '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); return a < 1 ? `${h}/${Math.round(a * 100)}%` : h; };
const fmt = v => (Math.round(v * 10) / 10).toString();

async function capture(browser, url, vp, theme, state, lang = 'en') {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
    isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: theme,
  });
  await context.addInitScript(t => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('protocol-explorer')) localStorage.removeItem(k);
      localStorage.setItem('protocol-explorer:theme', t.theme);
      if (t.lang !== 'en') localStorage.setItem('protocol-explorer:lang', t.lang);
    } catch {}
  }, { theme, lang });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  let stateError = null;
  try { await STATES[state](page); } catch (e) { stateError = e.message.split('\n')[0]; }
  await page.waitForTimeout(2200);
  // freeze anything still moving so both screenshots are comparable
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(100);
  const data = await page.evaluate(extract);
  const masks = await page.evaluate(collectPixelMasks, {strict: STRICT, ignoreSource: IGNORE.source, ignoreFlags: IGNORE.flags});
  const png = await page.screenshot({ fullPage: true });
  await context.close();
  return { data, png, masks, errors, stateError };
}

// pixel diff done in a browser canvas so no extra npm packages are needed
async function pixelDiff(browser, a, b, masks = []) {
  const page = await browser.newPage();
  const res = await page.evaluate(async ({ a, b, masks }) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const get = img => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = get(ia), db = get(ib);
    const out = new OffscreenCanvas(w, h), ox = out.getContext('2d'), od = ox.createImageData(w, h);
    const excluded = new Uint8Array(w * h);
    for (const {rect:[x,y,width,height]} of masks) for(let py=Math.max(0,Math.floor(y));py<Math.min(h,Math.ceil(y+height));py++)
      excluded.fill(1,py*w+Math.max(0,Math.floor(x)),py*w+Math.min(w,Math.ceil(x+width)));
    let bad = 0, rawBad = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      const grey = (da[i] * 0.3 + da[i + 1] * 0.59 + da[i + 2] * 0.11) * 0.25 + 190;
      if(d > 24)rawBad++;
      if (d > 24 && !excluded[i / 4]) { bad++; od.data[i] = 255; od.data[i + 1] = 0; od.data[i + 2] = 60; }
      else { od.data[i] = od.data[i + 1] = od.data[i + 2] = grey; }
      od.data[i + 3] = 255;
    }
    ox.putImageData(od, 0, 0);
    const blob = await out.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { pct: (bad / (w * h)) * 100, rawPct: (rawBad / (w * h)) * 100, maskedPixels: excluded.reduce((n,v)=>n+v,0), w, h, sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], png: btoa(s) };
  }, { a: 'data:image/png;base64,' + a.toString('base64'), b: 'data:image/png;base64,' + b.toString('base64'), masks });
  await page.close();
  return { ...res, png: Buffer.from(res.png, 'base64') };
}

function compareTexts(ref, loc) {
  const L = new Map(loc.texts.map(t => [t.key, t]));
  const R = new Map(ref.texts.map(t => [t.key, t]));
  const prose = t => IGNORE.test(t.text) || (!STRICT && (t.text.length > 60 || t.explanation));
  const diffs = [], missing = [], extra = [];
  let exact = 0;
  for (const r of ref.texts) {
    if (prose(r)) continue;
    const l = L.get(r.key);
    if (!l) { missing.push(r); continue; }
    const d = [];
    const [rx, ry, rw, rh] = r.rect, [lx, ly, lw, lh] = l.rect;
    if (Math.abs(lx - rx) > TOL.pos || Math.abs(ly - ry) > TOL.pos) d.push(`position off by ${fmt(lx - rx)}, ${fmt(ly - ry)}`);
    if (Math.abs(lw - rw) > TOL.size || Math.abs(lh - rh) > TOL.size) d.push(`text box ${fmt(lw)}×${fmt(lh)} (ref ${fmt(rw)}×${fmt(rh)})`);
    if (Math.abs(l.size - r.size) > TOL.font) d.push(`font-size ${fmt(l.size)}px (ref ${fmt(r.size)}px)`);
    if (l.weight !== r.weight) d.push(`font-weight ${l.weight} (ref ${r.weight})`);
    if (l.style !== r.style) d.push(`font-style ${l.style} (ref ${r.style})`);
    if (Math.abs(l.tracking - r.tracking) > TOL.tracking) d.push(`letter-spacing ${Math.round(l.tracking * 100) / 100}px (ref ${Math.round(r.tracking * 100) / 100}px)`);
    if (l.line !== r.line && !r.svg) d.push(`line-height ${l.line} (ref ${r.line})`);
    if (colorDelta(l.color, r.color) > TOL.color) d.push(`color ${hex(l.color)} (ref ${hex(r.color)})`);
    if (d.length) diffs.push({ key: r.key, ref: r, score: Math.abs(ly - ry) + Math.abs(lx - rx) + Math.abs(l.size - r.size) * 10 + d.length, d });
    else exact++;
  }
  for (const l of loc.texts) if (!prose(l) && !R.has(l.key)) extra.push(l);
  diffs.sort((a, b) => b.score - a.score);
  return { exact, diffs, missing, extra, total: ref.texts.filter(t => !prose(t)).length };
}

function compareBoxes(ref, loc) {
  const L = new Map(loc.boxes.map(b => [b.key, b]));
  const diffs = [], missing = [];
  for (const r of ref.boxes) {
    if (IGNORE.test(r.key)) continue;
    const l = L.get(r.key);
    if (!l) { missing.push(r); continue; }
    const d = [];
    const [rx, ry, rw, rh] = r.rect, [lx, ly, lw, lh] = l.rect;
    if (Math.abs(lx - rx) > TOL.pos || Math.abs(ly - ry) > TOL.pos) d.push(`position off by ${fmt(lx - rx)}, ${fmt(ly - ry)}`);
    if (Math.abs(lw - rw) > TOL.size || Math.abs(lh - rh) > TOL.size) d.push(`size ${fmt(lw)}×${fmt(lh)} (ref ${fmt(rw)}×${fmt(rh)})`);
    if (colorDelta(l.bg, r.bg) > TOL.color) d.push(`background ${hex(l.bg)} (ref ${hex(r.bg)})`);
    if (Math.abs(l.borderWidth - r.borderWidth) > 0.1) d.push(`border-width ${l.borderWidth}px (ref ${r.borderWidth}px)`);
    if (r.borderWidth > 0 && colorDelta(l.borderColor, r.borderColor) > TOL.color) d.push(`border-color ${hex(l.borderColor)} (ref ${hex(r.borderColor)})`);
    if (l.radius !== r.radius) d.push(`radius ${l.radius} (ref ${r.radius})`);
    if (d.length) diffs.push({ key: r.key, ref: r, d });
  }
  return { diffs, missing, total: ref.boxes.filter(b => !IGNORE.test(b.key)).length };
}

// ---------- run ----------
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: !HEADED });
const cases = [];
for (const lang of LANGS) for (const vp of VIEWPORTS) for (const theme of THEMES) for (const state of STATE_LIST) {
  if (state === 'drawer' && ['wide', 'medium'].includes(vp.name)) continue; // sidebar is always open there
  const id = `${vp.name}-${theme}-${state}` + (lang === 'en' ? '' : `-${lang}`);
  if (ONLY && !ONLY.split(',').some(o => id.includes(o))) continue;
  cases.push({ id, vp, theme, state, lang });
}

const summary = [];
let md = `# Reference comparison\n\nReference: ${REF}\nLocal: ${LOCAL}${PARITY ? ' (parity mode)' : ''}\nLanguages: ${LANGS.join(', ')}\nRun: ${new Date().toISOString()}\n\n`;
md += `Tolerances: position/size ±${TOL.pos}px · font-size ±${TOL.font}px · letter-spacing ±${TOL.tracking}px · colour ±${TOL.color}/255 per channel · pixels ≤${TOL.pixelPct}% differing\n`;
md += STRICT ? '\nStrict mode: long prose included.\n' : '\nOriginal lesson prose, field explanations and ignored credit handles are excluded from pixel checks by user-approved exception (2026-11-07); raw pixel percentages are retained. Prose geometry is still checked. Long prose is skipped in text matching. Use --strict to include prose.\n';
let details = '';

for (const c of cases) {
  process.stdout.write(`${c.id} … `);
  const [ref, loc] = await Promise.all([capture(browser, REF, c.vp, c.theme, c.state, c.lang), capture(browser, LOCAL, c.vp, c.theme, c.state, c.lang)]);
  const px = await pixelDiff(browser, ref.png, loc.png, [...ref.masks,...loc.masks]);
  await fs.writeFile(path.join(OUT, `${c.id}.ref.png`), ref.png);
  await fs.writeFile(path.join(OUT, `${c.id}.local.png`), loc.png);
  await fs.writeFile(path.join(OUT, `${c.id}.diff.png`), px.png);
  const t = compareTexts(ref.data, loc.data);
  const b = compareBoxes(ref.data, loc.data);
  const fontsMissing = ref.data.fonts.filter(f => !loc.data.fonts.includes(f));
  const meta = compareProseGeometry(ref.masks,loc.masks,TOL.pos);
  if (ref.data.layout !== loc.data.layout) meta.push(`data-layout is "${loc.data.layout}" (ref "${ref.data.layout}")`);
  if (ref.data.title !== loc.data.title) meta.push(`document title "${loc.data.title}" (ref "${ref.data.title}")`);
  if (ref.data.page[0] !== loc.data.page[0] || Math.abs(ref.data.page[1] - loc.data.page[1]) > 2) meta.push(`page size ${loc.data.page.join('×')} (ref ${ref.data.page.join('×')})`);
  if (fontsMissing.length) meta.push(`fonts not loaded: ${fontsMissing.join(', ')}`);
  if (ref.stateError) meta.push(`could not reach state on reference: ${ref.stateError}`);
  if (loc.stateError) meta.push(`could not reach state on local: ${loc.stateError}`);
  if (loc.errors.length) meta.push(`console errors on local: ${loc.errors.slice(0, 3).join(' | ')}`);
  const pass = px.pct <= TOL.pixelPct && !t.diffs.length && !t.missing.length && !t.extra.length && !b.diffs.length && !b.missing.length && !meta.length;
  const row = { id: c.id, pass, pixelPct: Math.round(px.pct * 100) / 100, rawPixelPct: Math.round(px.rawPct * 100) / 100, maskedPixels: px.maskedPixels, texts: `${t.exact}/${t.total}`, textDiffs: t.diffs.length, missing: t.missing.length, extra: t.extra.length, boxDiffs: b.diffs.length + b.missing.length, notes: meta };
  summary.push(row);
  console.log(pass ? 'PASS' : `pixels ${row.pixelPct}% · texts exact ${row.texts} · box issues ${row.boxDiffs}`);

  details += `\n## ${c.id} ${pass ? '✅' : '❌'}\n\nImages: \`${c.id}.ref.png\` · \`${c.id}.local.png\` · \`${c.id}.diff.png\` (red = differing pixels). Pixels differing: **${row.pixelPct}%** (${row.rawPixelPct}% raw; ${row.maskedPixels} prose/credit pixels excluded by user-approved exception).\n`;
  if (meta.length) details += `\n${meta.map(m => `- ⚠️ ${m}`).join('\n')}\n`;
  if (t.diffs.length) {
    details += `\n### Text that differs (${t.diffs.length}, worst first)\n\n| Text (ref position) | What differs |\n|---|---|\n`;
    for (const x of t.diffs.slice(0, 60)) details += `| \`${x.ref.text.slice(0, 50).replace(/\|/g, '\\|')}\` @ ${Math.round(x.ref.rect[0])},${Math.round(x.ref.rect[1])} | ${x.d.join('; ')} |\n`;
    if (t.diffs.length > 60) details += `\n…and ${t.diffs.length - 60} more.\n`;
  }
  if (t.missing.length) details += `\n### In the reference but not found locally (${t.missing.length})\n\n${t.missing.slice(0, 40).map(x => `- \`${x.text.slice(0, 60)}\` @ ${Math.round(x.rect[0])},${Math.round(x.rect[1])} · ${fmt(x.size)}px/${x.weight} ${hex(x.color)}`).join('\n')}\n`;
  if (t.extra.length) details += `\n### Shown locally but not in the reference (${t.extra.length})\n\n${t.extra.slice(0, 40).map(x => `- \`${x.text.slice(0, 60)}\` @ ${Math.round(x.rect[0])},${Math.round(x.rect[1])}`).join('\n')}\n`;
  if (b.diffs.length || b.missing.length) {
    details += `\n### Boxes (panels, buttons, badges) that differ (${b.diffs.length + b.missing.length})\n\n| Box, keyed by its first words (ref rect) | What differs |\n|---|---|\n`;
    for (const x of b.diffs.slice(0, 40)) details += `| \`${x.key.slice(0, 40)}\` @ ${x.ref.rect.map(Math.round).join(',')} | ${x.d.join('; ')} |\n`;
    for (const x of b.missing.slice(0, 20)) details += `| \`${x.key.slice(0, 40)}\` @ ${x.rect.map(Math.round).join(',')} | not found locally (bg ${hex(x.bg)}, border ${x.borderWidth}px ${hex(x.borderColor)}) |\n`;
  }
}
const motionCases = MOTION ? [VIEWPORTS[1], VIEWPORTS[4]].map(vp => ({ id: `motion-${vp.name}-dark`, vp, theme: 'dark' })).filter(c => !ONLY || ONLY.split(',').some(o => c.id.includes(o))) : [];
for (const c of motionCases) {
  process.stdout.write(`${c.id} (records ~2 min) … `);
  try {
    const m = await runMotion(browser, { REF, LOCAL, OUT, vp: c.vp, theme: c.theme, id: c.id, strict: STRICT,ignoreSource:IGNORE.source,ignoreFlags:IGNORE.flags });
    summary.push(m.row); details += m.md;
    console.log(m.row.pass ? 'PASS' : `${m.row.textDiffs} motion issues · filmstrip frames up to ${m.row.pixelPct}% different`);
  } catch (e) {
    summary.push({ id: c.id, pass: false, pixelPct: 0, texts: '—', textDiffs: 1, missing: 0, extra: 0, boxDiffs: 0, notes: [e.message] });
    details += `\n## ${c.id} ❌\n\nMotion recording failed: ${e.message.split('\n')[0]}\n`;
    console.log('ERROR ' + e.message.split('\n')[0]);
  }
}
await browser.close();

md += `\n| Case | Result | Pixels differing | Text exact | Text diffs (motion: issues) | Missing | Extra | Box issues |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of summary) md += `| ${r.id} | ${r.pass ? '✅' : '❌'} | ${r.pixelPct}% | ${r.texts} | ${r.textDiffs} | ${r.missing} | ${r.extra} | ${r.boxDiffs} |\n`;
md += details;
await fs.writeFile(path.join(OUT, 'report.md'), md);
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
const failed = summary.filter(r => !r.pass).length;
console.log(`\n${summary.length - failed}/${summary.length} cases pass. Report: ${path.join(OUT, 'report.md')}`);
process.exit(failed ? 1 : 0);
