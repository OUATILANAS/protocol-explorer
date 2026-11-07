export default () => {
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
      key: i ? `${k} #${i + 1}` : k, text: raw,
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
