// Injected before any page script (page.addInitScript). Records, in real time:
//  - every CSS animation and transition that starts (name, target, duration, delay, easing, iterations)
//  - ~20 samples per second of watched state (step label, play button, side panel title, table rows, URL bar)
//    and of the position of every short visible text (packet chips, device labels, arrow labels …)
// Phases are started from the test with window.__motion.start('<phase>').
(() => {
  const M = (window.__motion = { events: [], frames: [], phase: 'load', t0: performance.now(), sampling: true });
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const desc = el => {
    if (!el) return '?';
    for (let a = el, d = 0; a && d < 4; a = a.parentElement, d++) {
      const t = norm(a.innerText || a.textContent).toLowerCase();
      if (t && t.length <= 40) return (d ? '~' : '') + t;
      if (t) return (d ? '~' : '') + t.slice(0, 24) + '…';
    }
    return `(${el.tagName.toLowerCase()})`;
  };
  const onEvent = (kind, name, el, pseudo) => {
    let timing = {};
    try {
      const a = document.getAnimations().find(x => x.effect && x.effect.target === el && (x.effect.pseudoElement || '') === (pseudo || '') &&
        (kind === 'animation' ? x.animationName === name : x.transitionProperty === name));
      if (a) { const t = a.effect.getTiming(); timing = { duration: Math.round(Number(t.duration) * 10) / 10, delay: Math.round(t.delay * 10) / 10, easing: t.easing, iterations: t.iterations, direction: t.direction, fill: t.fill }; }
      if (kind === 'animation') { // CSS animations report 'linear' on the effect; the real curve is the animation-timing-function
        const c = getComputedStyle(el, pseudo || null), names = c.animationName.split(','), fns = c.animationTimingFunction.split(/,(?![^(]*\))/);
        const i = Math.max(0, names.map(x => x.trim()).indexOf(name)); timing.easing = (fns[i] || fns[0] || '').trim();
      }
    } catch {}
    M.events.push({ t: Math.round(performance.now() - M.t0), phase: M.phase, kind, name, target: desc(el) + (pseudo || ''), ...timing });
  };
  M.inputs = [];
  for (const type of ['keydown', 'pointerdown']) addEventListener(type, () => M.inputs.push({ phase: M.phase, t: Math.round((performance.now() - M.t0) * 10) / 10 }), true);
  addEventListener('animationstart', e => onEvent('animation', e.animationName, e.target, e.pseudoElement), true);
  addEventListener('transitionrun', e => onEvent('transition', e.propertyName, e.target, e.pseudoElement), true);

  const vis = el => el && el.getClientRects().length && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  const clipped = (el, r) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
      const b = a.getBoundingClientRect();
      if (r.bottom <= b.top + 1 || r.top >= b.bottom - 1 || r.right <= b.left + 1 || r.left >= b.right - 1) return true;
    }
    return false;
  };
  const WATCH = {
    status: /^(step \d+\/\d+ · .+|overview · \d+ steps|lesson complete)$/i,
    button: /^(play|pause|replay)$/i,
    side: /^(protocol overview|step details|lesson summary)$/i,
  };
  const sample = () => {
    const f = { t: Math.round(performance.now() - M.t0), phase: M.phase, w: {}, pos: {} };
    const seen = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const raw = norm(n.textContent);
      if (!raw || raw.length > 40) continue;
      const el = n.parentElement;
      if (!el || el.closest('script,style,noscript') || !vis(el)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect();
      if (!r.width || !r.height || clipped(el, r)) continue;
      for (const [k, re] of Object.entries(WATCH)) if (!f.w[k] && re.test(raw)) f.w[k] = raw.toUpperCase();
      if (!f.w.url && /example\.(com|org)/i.test(raw) && raw.length < 34 && !/ /.test(raw)) f.w.url = raw;
      if (raw.length > 24) continue;
      const key = raw.toLowerCase(), i = seen.get(key) || 0; seen.set(key, i + 1);
      f.pos[i ? `${key} #${i + 1}` : key] = [Math.round(r.x + scrollX), Math.round(r.y + scrollY)];
    }
    f.w.rows = [...document.querySelectorAll('tbody tr')].filter(tr => vis(tr) && tr.getBoundingClientRect().height > 2 && getComputedStyle(tr).opacity !== '0').length;
    M.frames.push(f);
  };
  let last = -1e9;
  const loop = () => {
    if (M.sampling && performance.now() - last >= 50) { last = performance.now(); try { sample(); } catch {} }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  M.start = phase => { M.phase = phase; M.t0 = performance.now(); last = -1e9; M.sampling = true; };
  M.stop = () => { M.sampling = false; };
  M.keyframes = () => {
    const out = {};
    const walk = rules => { for (const r of rules) {
      if (r.type === 7) out[r.name] = norm([...r.cssRules].map(k => `${k.keyText}{${norm(k.style.cssText)}}`).join(' '));
      else if (r.cssRules) walk(r.cssRules);
    } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    return out;
  };
})();
