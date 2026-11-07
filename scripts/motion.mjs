// Motion comparison: records both apps in real time while they go through the same interactions,
// then compares CSS animations/transitions, keyframes, the playback timeline, moving elements,
// reduced-motion behaviour, and a filmstrip of frames. Used by compare-reference.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Injected before any page script: records CSS animation/transition starts, input times, and ~20 samples/s
// of watched state and the positions of short visible texts.
const RECORDER = "// Injected before any page script (page.addInitScript). Records, in real time:\n//  - every CSS animation and transition that starts (name, target, duration, delay, easing, iterations)\n//  - ~20 samples per second of watched state (step label, play button, side panel title, table rows, URL bar)\n//    and of the position of every short visible text (packet chips, device labels, arrow labels \u2026)\n// Phases are started from the test with window.__motion.start('<phase>').\n(() => {\n  const M = (window.__motion = { events: [], frames: [], phase: 'load', t0: performance.now(), sampling: true });\n  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();\n  const desc = el => {\n    if (!el) return '?';\n    for (let a = el, d = 0; a && d < 4; a = a.parentElement, d++) {\n      const t = norm(a.innerText || a.textContent).toLowerCase();\n      if (t && t.length <= 40) return (d ? '~' : '') + t;\n      if (t) return (d ? '~' : '') + t.slice(0, 24) + '\u2026';\n    }\n    return `(${el.tagName.toLowerCase()})`;\n  };\n  const onEvent = (kind, name, el, pseudo) => {\n    let timing = {};\n    try {\n      const a = document.getAnimations().find(x => x.effect && x.effect.target === el && (x.effect.pseudoElement || '') === (pseudo || '') &&\n        (kind === 'animation' ? x.animationName === name : x.transitionProperty === name));\n      if (a) { const t = a.effect.getTiming(); timing = { duration: Math.round(Number(t.duration) * 10) / 10, delay: Math.round(t.delay * 10) / 10, easing: t.easing, iterations: t.iterations, direction: t.direction, fill: t.fill }; }\n      if (kind === 'animation') { // CSS animations report 'linear' on the effect; the real curve is the animation-timing-function\n        const c = getComputedStyle(el, pseudo || null), names = c.animationName.split(','), fns = c.animationTimingFunction.split(/,(?![^(]*\\))/);\n        const i = Math.max(0, names.map(x => x.trim()).indexOf(name)); timing.easing = (fns[i] || fns[0] || '').trim();\n      }\n    } catch {}\n    M.events.push({ t: Math.round(performance.now() - M.t0), phase: M.phase, kind, name, target: desc(el) + (pseudo || ''), ...timing });\n  };\n  M.inputs = [];\n  for (const type of ['keydown', 'pointerdown']) addEventListener(type, () => M.inputs.push({ phase: M.phase, t: Math.round((performance.now() - M.t0) * 10) / 10 }), true);\n  addEventListener('animationstart', e => onEvent('animation', e.animationName, e.target, e.pseudoElement), true);\n  addEventListener('transitionrun', e => onEvent('transition', e.propertyName, e.target, e.pseudoElement), true);\n\n  const vis = el => el && el.getClientRects().length && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));\n  const clipped = (el, r) => {\n    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {\n      const c = getComputedStyle(a);\n      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;\n      const b = a.getBoundingClientRect();\n      if (r.bottom <= b.top + 1 || r.top >= b.bottom - 1 || r.right <= b.left + 1 || r.left >= b.right - 1) return true;\n    }\n    return false;\n  };\n  const WATCH = {\n    status: /^(step \\d+\\/\\d+ \u00b7 .+|overview \u00b7 \\d+ steps|lesson complete)$/i,\n    button: /^(play|pause|replay)$/i,\n    side: /^(protocol overview|step details|lesson summary)$/i,\n  };\n  const sample = () => {\n    const f = { t: Math.round(performance.now() - M.t0), phase: M.phase, w: {}, pos: {} };\n    const seen = new Map();\n    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);\n    let n;\n    while ((n = walker.nextNode())) {\n      const raw = norm(n.textContent);\n      if (!raw || raw.length > 40) continue;\n      const el = n.parentElement;\n      if (!el || el.closest('script,style,noscript') || !vis(el)) continue;\n      const rg = document.createRange(); rg.selectNodeContents(n);\n      const r = rg.getBoundingClientRect();\n      if (!r.width || !r.height || clipped(el, r)) continue;\n      for (const [k, re] of Object.entries(WATCH)) if (!f.w[k] && re.test(raw)) f.w[k] = raw.toUpperCase();\n      if (!f.w.url && /example\\.(com|org)/i.test(raw) && raw.length < 34 && !/ /.test(raw)) f.w.url = raw;\n      if (raw.length > 24) continue;\n      const key = raw.toLowerCase(), i = seen.get(key) || 0; seen.set(key, i + 1);\n      f.pos[i ? `${key} #${i + 1}` : key] = [Math.round(r.x + scrollX), Math.round(r.y + scrollY)];\n    }\n    f.w.rows = [...document.querySelectorAll('tbody tr')].filter(tr => vis(tr) && tr.getBoundingClientRect().height > 2 && getComputedStyle(tr).opacity !== '0').length;\n    M.frames.push(f);\n  };\n  let last = -1e9;\n  const loop = () => {\n    if (M.sampling && performance.now() - last >= 50) { last = performance.now(); try { sample(); } catch {} }\n    requestAnimationFrame(loop);\n  };\n  requestAnimationFrame(loop);\n  M.start = phase => { M.phase = phase; M.t0 = performance.now(); last = -1e9; M.sampling = true; };\n  M.stop = () => { M.sampling = false; };\n  M.keyframes = () => {\n    const out = {};\n    const walk = rules => { for (const r of rules) {\n      if (r.type === 7) out[r.name] = norm([...r.cssRules].map(k => `${k.keyText}{${norm(k.style.cssText)}}`).join(' '));\n      else if (r.cssRules) walk(r.cssRules);\n    } };\n    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }\n    return out;\n  };\n})();\n";

export const MOTION_TOL = { ms: 120, timingMs: 20, px: 6, delayMs: 20, jitterMs: 40 };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const visibleButton = (page, re) => page.locator('button:visible, [role=button]:visible').filter({ hasText: re }).first();
async function untilReplay(page, maxMs = 60000) {
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.offsetParent && /replay/i.test(b.innerText)), null, { timeout: maxMs }).catch(() => {});
}

// The interactions both apps go through, in order. Each records into its own phase.
function phasesFor(vp) {
  const stacked = vp.width < 1100;
  const list = [
    { name: 'load', run: async () => { await sleep(3500); } },
    { name: 'play', run: async page => { await page.keyboard.press(' '); await untilReplay(page); await sleep(1500); } },
    { name: 'view-switch', run: async page => { await page.keyboard.press('v'); await sleep(1600); await page.keyboard.press('v'); await sleep(1400); } },
    { name: 'inspector', run: async page => { await page.locator('tbody tr:visible').first().click(); await sleep(1600); await page.keyboard.press('Escape'); await sleep(1000); } },
    { name: 'language-menu', run: async page => { await visibleButton(page, /^\s*EN\s*$/i).click(); await sleep(1100); await page.keyboard.press('Escape'); await sleep(700); } },
  ];
  if (stacked) list.push({ name: 'drawer', run: async page => { await page.getByRole('button', { name: /protocols/i }).filter({ visible: true }).first().click(); await sleep(1600); await page.keyboard.press('Escape'); await sleep(1000); } });
  return list;
}

async function newPage(browser, url, vp, theme, reducedMotion) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: theme, reducedMotion });
  await context.addInitScript(t => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('protocol-explorer')) localStorage.removeItem(k); localStorage.setItem('protocol-explorer:theme', t); } catch {} }, theme);
  await context.addInitScript({ content: RECORDER });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

async function record(browser, url, vp, theme, reducedMotion = 'no-preference') {
  const { context, page } = await newPage(browser, url, vp, theme, reducedMotion);
  const errors = [];
  for (const ph of phasesFor(vp)) {
    if (ph.name !== 'load') await page.evaluate(n => window.__motion.start(n), ph.name);
    try { await ph.run(page); } catch (e) { errors.push(`${ph.name}: ${e.message.split('\n')[0]}`); }
  }
  const data = await page.evaluate(() => ({ events: window.__motion.events, frames: window.__motion.frames, inputs: window.__motion.inputs, keyframes: window.__motion.keyframes() }));
  await context.close();
  return { ...data, errors };
}

async function filmstrip(browser, url, vp, theme, times) {
  const { context, page } = await newPage(browser, url, vp, theme, 'no-preference');
  await page.evaluate(() => window.__motion.stop());
  await sleep(3500);
  const shots = [];
  await page.keyboard.press(' ');
  const t0 = Date.now();
  for (const t of times) {
    const wait = t0 + t - Date.now();
    if (wait > 0) await sleep(wait);
    shots.push({ t, actual: Date.now() - t0, png: await page.screenshot() });
  }
  await context.close();
  return shots;
}

// ---------- comparisons ----------
const group = evs => { const m = new Map(); for (const e of evs) { const k = `${e.kind} ${e.name}`; if (!m.has(k)) m.set(k, []); m.get(k).push(e); } return m; };
const uniq = a => [...new Set(a)];
const fmtSet = a => uniq(a.map(v => (typeof v === 'number' ? Math.round(v) : v))).slice(0, 6).join(', ');

function compareCss(ref, loc, phase) {
  const out = [];
  const R = group(ref.events.filter(e => e.phase === phase)), L = group(loc.events.filter(e => e.phase === phase));
  for (const [k, re] of R) {
    const le = L.get(k);
    if (!le) { out.push(`\`${k}\` runs ${re.length}× in the reference (duration ${fmtSet(re.map(e => e.duration))} ms, delay ${fmtSet(re.map(e => e.delay))} ms, easing ${fmtSet(re.map(e => e.easing))}) on ${fmtSet(re.map(e => `\`${e.target}\``))}, but never locally`); continue; }
    const d = [];
    if (le.length !== re.length) d.push(`runs ${le.length}× (ref ${re.length}×)`);
    const rd = uniq(re.map(e => Math.round(e.duration))).sort((a, b) => a - b), ld = uniq(le.map(e => Math.round(e.duration))).sort((a, b) => a - b);
    if (rd.length !== ld.length || rd.some((v, i) => Math.abs(v - ld[i]) > MOTION_TOL.timingMs)) d.push(`duration ${ld.join('/')} ms (ref ${rd.join('/')} ms)`);
    const reas = uniq(re.map(e => e.easing)).sort(), leas = uniq(le.map(e => e.easing)).sort();
    if (reas.join() !== leas.join()) d.push(`easing ${leas.join(' / ')} (ref ${reas.join(' / ')})`);
    const rdel = re.map(e => e.delay).sort((a, b) => a - b), ldel = le.map(e => e.delay).sort((a, b) => a - b);
    if (rdel.length === ldel.length && rdel.some((v, i) => Math.abs(v - ldel[i]) > MOTION_TOL.delayMs)) d.push(`delays ${fmtSet(ldel)} ms (ref ${fmtSet(rdel)} ms; staggers must match)`);
    const rit = uniq(re.map(e => String(e.iterations))), lit = uniq(le.map(e => String(e.iterations)));
    if (rit.join() !== lit.join()) d.push(`iterations ${lit.join('/')} (ref ${rit.join('/')})`);
    const rTargets = uniq(re.map(e => e.target)), lTargets = new Set(le.map(e => e.target));
    const missingT = rTargets.filter(t => !lTargets.has(t));
    if (missingT.length && missingT.length <= 6) d.push(`not on ${missingT.map(t => `\`${t}\``).join(', ')}`);
    const rFirst = Math.min(...re.map(e => e.t)), lFirst = Math.min(...le.map(e => e.t));
    if (Math.abs(rFirst - lFirst) > MOTION_TOL.ms) d.push(`first starts at ${lFirst} ms (ref ${rFirst} ms)`);
    if (d.length) out.push(`\`${k}\`: ${d.join('; ')}`);
  }
  for (const [k, le] of L) if (!R.has(k) && !/^transition (outline|caret-color)/.test(k)) out.push(`\`${k}\` runs ${le.length}× locally (duration ${fmtSet(le.map(e => e.duration))} ms) but not in the reference`);
  return out;
}

function changes(frames, key) {
  const out = []; let prev;
  for (const f of frames) { const v = f.w[key] ?? null; if (v !== prev) { out.push({ t: f.t, v }); prev = v; } }
  return out;
}

function compareTimeline(ref, loc, phase) {
  const out = [];
  const rf = ref.frames.filter(f => f.phase === phase), lf = loc.frames.filter(f => f.phase === phase);
  if (!rf.length || !lf.length) return [`no frames recorded (${rf.length} ref, ${lf.length} local)`];
  for (const key of ['status', 'button', 'side', 'rows', 'url']) {
    const rc = changes(rf, key), lc = changes(lf, key);
    const n = Math.max(rc.length, lc.length);
    const bad = [];
    for (let i = 0; i < n; i++) {
      const a = rc[i], b = lc[i];
      if (!a) { bad.push(`extra local change → ${JSON.stringify(b.v)} at ${b.t} ms`); continue; }
      if (!b) { bad.push(`missing change → ${JSON.stringify(a.v)} (ref at ${a.t} ms)`); continue; }
      if (String(a.v) !== String(b.v)) { bad.push(`#${i + 1}: ${JSON.stringify(b.v)} at ${b.t} ms (ref ${JSON.stringify(a.v)} at ${a.t} ms)`); break; }
      if (Math.abs(a.t - b.t) > MOTION_TOL.ms) bad.push(`→ ${JSON.stringify(a.v)} at ${b.t} ms (ref ${a.t} ms, ${b.t - a.t > 0 ? '+' : ''}${b.t - a.t} ms)`);
    }
    if (bad.length) out.push(`**${key}**: ${bad.slice(0, 8).join('; ')}${bad.length > 8 ? `; …${bad.length - 8} more` : ''}`);
  }
  return out;
}

function track(frames) {
  const m = new Map();
  for (const f of frames) for (const [k, p] of Object.entries(f.pos)) { if (!m.has(k)) m.set(k, []); m.get(k).push([f.t, p[0], p[1]]); }
  return m;
}
const at = (series, t) => { // linear interpolation, null outside the series
  if (t < series[0][0] || t > series[series.length - 1][0]) return null; // only inside the recorded span (appearance timing is checked separately)
  let i = series.findIndex(s => s[0] >= t); if (i <= 0) return series[Math.max(0, i)].slice(1); if (i === -1) return series[series.length - 1].slice(1);
  const [t0, x0, y0] = series[i - 1], [t1, x1, y1] = series[i]; const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
};

function compareMovement(ref, loc, phase) {
  const out = [];
  const R = track(ref.frames.filter(f => f.phase === phase)), L = track(loc.frames.filter(f => f.phase === phase));
  const moving = s => { const xs = s.map(p => p[1]), ys = s.map(p => p[2]); return Math.max(...xs) - Math.min(...xs) > 3 || Math.max(...ys) - Math.min(...ys) > 3; };
  const transient = (s, frames) => s.length < frames * 0.9;
  const rF = ref.frames.filter(f => f.phase === phase), lF = loc.frames.filter(f => f.phase === phase);
  const nR = rF.length, rLast = rF.length ? rF[rF.length - 1].t : 0, lLast = lF.length ? lF[lF.length - 1].t : 0;
  for (const [k, rs] of R) {
    if (!moving(rs) && !transient(rs, nR)) continue; // static text is covered by the static comparison
    const ls = L.get(k);
    if (!ls) { out.push(`\`${k}\` ${moving(rs) ? 'moves' : 'appears'} in the reference (${rs[0][0]}–${rs[rs.length - 1][0]} ms) but never shows locally`); continue; }
    const d = [];
    if (Math.abs(ls[0][0] - rs[0][0]) > MOTION_TOL.ms) d.push(`appears at ${ls[0][0]} ms (ref ${rs[0][0]} ms)`);
    const lEnd = ls[ls.length - 1][0], rEnd = rs[rs.length - 1][0];
    const stillThere = rEnd >= rLast - 60 && lEnd >= lLast - 60; // on screen when recording stopped: not a disappearance
    if (!stillThere && Math.abs(lEnd - rEnd) > MOTION_TOL.ms) d.push(`disappears at ${lEnd} ms (ref ${rEnd} ms)`);
    let worst = 0, worstT = 0;
    // compare against the local position within ±40 ms, so sampling jitter between the two runs doesn't count
    for (let t = Math.max(rs[0][0], ls[0][0]); t <= Math.min(rEnd, lEnd); t += 50) { // only where both recordings have data
      const a = at(rs, t); if (!a) continue;
      let best = Infinity;
      for (let dt = -MOTION_TOL.jitterMs; dt <= MOTION_TOL.jitterMs; dt += 10) { const b = at(ls, t + dt); if (b) best = Math.min(best, Math.hypot(a[0] - b[0], a[1] - b[1])); }
      if (best !== Infinity && best > worst) { worst = best; worstT = t; }
    }
    if (worst > MOTION_TOL.px) d.push(`path off by up to ${Math.round(worst)} px (at ${worstT} ms)`);
    if (d.length) out.push(`\`${k}\`: ${d.join('; ')}`);
  }
  for (const [k, ls] of L) if (!R.has(k) && moving(ls)) out.push(`\`${k}\` moves locally (${ls[0][0]}–${ls[ls.length - 1][0]} ms) but not in the reference`);
  return out;
}

function compareKeyframes(ref, loc) {
  const out = [];
  for (const [name, def] of Object.entries(ref.keyframes)) {
    if (!(name in loc.keyframes)) out.push(`\`@keyframes ${name}\` is missing locally (ref: \`${def}\`)`);
    else if (loc.keyframes[name] !== def) out.push(`\`@keyframes ${name}\` differs: local \`${loc.keyframes[name]}\` · ref \`${def}\``);
  }
  return out;
}

function compareReduced(ref, loc) {
  const long = d => d.events.filter(e => (e.duration || 0) > 1 || (e.delay || 0) > 1);
  const key = e => `${e.kind} ${e.name} on \`${e.target}\``;
  const refLong = new Set(long(ref).map(key));
  const bad = uniq(long(loc).filter(e => !refLong.has(key(e))).map(e => `${key(e)} still takes ${e.duration} ms${e.delay ? ` (+${e.delay} ms delay)` : ''}`));
  return bad.map(b => `with prefers-reduced-motion: ${b}; the reference makes it instant`);
}

async function contactSheet(browser, refShots, locShots, scale = 0.4) {
  const page = await browser.newPage();
  const b64 = s => 'data:image/png;base64,' + s.png.toString('base64');
  const res = await page.evaluate(async ({ rows, scale }) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const imgs = await Promise.all(rows.map(async r => [await load(r.a), await load(r.b)]));
    const w = Math.round(imgs[0][0].width * scale), h = Math.round(imgs[0][0].height * scale), pad = 28;
    const c = new OffscreenCanvas(w * 3 + 40, (h + pad) * rows.length + 30), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111'; x.font = 'bold 15px sans-serif';
    x.fillText('reference', 10, 20); x.fillText('local', w + 20, 20); x.fillText('difference (red)', 2 * w + 30, 20);
    const pct = [];
    imgs.forEach(([a, b], i) => {
      const y = 30 + i * (h + pad);
      x.font = '13px sans-serif'; x.fillStyle = '#111'; x.fillText(`t = ${rows[i].t} ms (actual ${rows[i].ta} / ${rows[i].tb})`, 10, y + 16);
      x.drawImage(a, 10, y + pad - 6, w, h); x.drawImage(b, w + 20, y + pad - 6, w, h);
      const W = a.width, H = a.height, ca = new OffscreenCanvas(W, H), cb = new OffscreenCanvas(W, H);
      ca.getContext('2d').drawImage(a, 0, 0); cb.getContext('2d').drawImage(b, 0, 0, W, H);
      const da = ca.getContext('2d').getImageData(0, 0, W, H).data, db = cb.getContext('2d').getImageData(0, 0, W, H).data;
      const od = new ImageData(W, H); let bad = 0;
      for (let p = 0; p < da.length; p += 4) { const d = Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])); const g = 200 + da[p] * 0.2; if (d > 24) { bad++; od.data[p] = 255; od.data[p + 1] = 0; od.data[p + 2] = 60; } else { od.data[p] = od.data[p + 1] = od.data[p + 2] = g; } od.data[p + 3] = 255; }
      const cd = new OffscreenCanvas(W, H); cd.getContext('2d').putImageData(od, 0, 0); x.drawImage(cd, 2 * w + 30, y + pad - 6, w, h);
      pct.push(Math.round((bad / (W * H)) * 10000) / 100);
    });
    const blob = await c.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { png: btoa(s), pct };
  }, { rows: refShots.map((r, i) => ({ t: r.t, ta: r.actual, tb: locShots[i].actual, a: b64(r), b: b64(locShots[i]) })), scale });
  await page.close();
  return { png: Buffer.from(res.png, 'base64'), pct: res.pct };
}

// Re-zero every phase (except page load) on the moment the page received the first key press or click of
// that phase, so the variable delay between the script and the page doesn't count as a timing difference.
function align(rec) {
  rec.anchors = {};
  for (const inp of rec.inputs || []) if (inp.phase !== 'load' && !(inp.phase in rec.anchors)) rec.anchors[inp.phase] = inp.t;
  for (const f of rec.frames) f.t = Math.round(f.t - (rec.anchors[f.phase] || 0));
  for (const e of rec.events) e.t = Math.round(e.t - (rec.anchors[e.phase] || 0));
  // anything sampled before the phase's first input still shows the previous state
  rec.frames = rec.frames.filter(f => f.phase === 'load' || f.t >= 0);
  rec.events = rec.events.filter(e => e.phase === 'load' || e.t >= 0);
  return rec;
}

export async function runMotion(browser, { REF, LOCAL, OUT, vp, theme, id }) {
  const ref = align(await record(browser, REF, vp, theme));
  const loc = align(await record(browser, LOCAL, vp, theme));
  const sections = [];
  const add = (title, items) => sections.push({ title, items });
  add('Keyframes', compareKeyframes(ref, loc));
  for (const ph of phasesFor(vp).map(p => p.name)) {
    add(`CSS animations & transitions · ${ph}`, compareCss(ref, loc, ph));
    if (ph === 'play' || ph === 'load') add(`Timeline · ${ph}`, compareTimeline(ref, loc, ph));
    add(`Moving and appearing elements · ${ph}`, compareMovement(ref, loc, ph));
  }
  const refR = await record(browser, REF, vp, theme, 'reduce');
  const locR = await record(browser, LOCAL, vp, theme, 'reduce');
  add('Reduced motion', compareReduced(refR, locR));
  const errs = [...ref.errors.map(e => `reference ${e}`), ...loc.errors.map(e => `local ${e}`)];
  if (errs.length) add('Could not run', errs);

  const times = [300, 800, 1500, 2500, 3500, 5000, 7000, 9000, 12000, 15000, 18000, 22000];
  const sheet = await contactSheet(browser, await filmstrip(browser, REF, vp, theme, times), await filmstrip(browser, LOCAL, vp, theme, times));
  await fs.writeFile(path.join(OUT, `${id}.filmstrip.png`), sheet.png);
  await fs.writeFile(path.join(OUT, `${id}.trace.json`), JSON.stringify({ reference: ref, local: loc }, null, 1));

  const issues = sections.reduce((n, s) => n + s.items.length, 0);
  let md = `\n## ${id} ${issues ? '❌' : '✅'}\n\nRecorded in real time while both apps go through: ${phasesFor(vp).map(p => p.name).join(' → ')}. Each phase after load is timed from the moment the page receives its first key press or click. Timing tolerance ±${MOTION_TOL.ms} ms for events, ±${MOTION_TOL.timingMs} ms for durations, ±${MOTION_TOL.delayMs} ms for delays, ±${MOTION_TOL.px} px for paths.\n`;
  md += `\nFilmstrip: \`${id}.filmstrip.png\` (reference · local · difference at the same moments after pressing play; pixels differing per frame: ${sheet.pct.join('% · ')}%). Raw recordings: \`${id}.trace.json\`.\n`;
  for (const s of sections) if (s.items.length) md += `\n### ${s.title} (${s.items.length})\n\n${s.items.slice(0, 40).map(i => `- ${i}`).join('\n')}${s.items.length > 40 ? `\n- …${s.items.length - 40} more` : ''}\n`;
  return { md, row: { id, pass: !issues, pixelPct: Math.max(...sheet.pct), texts: '—', textDiffs: issues, missing: 0, extra: 0, boxDiffs: 0, notes: [] } };
}
