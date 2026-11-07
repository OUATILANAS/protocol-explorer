# 02 · Fixes spec (phase A) and parity mode (phase B)

Every fix here must leave the reference comparison green:
`node scripts/compare-reference.mjs --local "http://127.0.0.1:5173/"` → 0 diffs (parity mode is appended
automatically, see §6).

## 1. Keyboard / pointer guard
```ts
function targetEl(e: Event): Element | null {
  const t = e.target;
  return t instanceof Element ? t : t instanceof Node ? t.parentElement : null;
}
// use targetEl(e)?.closest(...) everywhere instead of (e.target as Element).closest(...)
```
Test: dispatch `new KeyboardEvent('keydown', {key: 'ArrowRight'})` on `document` → no console error.

## 2. Segment tabs in the inspector (design board 10)
Rows that stand for several TCP segments stay **one table row** with the same time, info and size
(the packet test must not change). Only the inspector changes.

- Packet event gets an optional `segments` description, e.g.
  `wire()` returns `{ segments: [{layers, bytes}, …], reassembled: {layers, bytes} }` in addition to the
  current single-frame shape. Old rows keep the old shape.
- Each segment is a **valid frame**: ≤ 1,514 bytes on the wire (14 Ethernet + ≤ 1,500 IP), correct IPv4
  total length and ID, TCP sequence numbers that continue (`Seq = previous Seq + previous payload`),
  valid checksums. Payload split at 1,460 bytes (MSS) except the last.
- Tabs above the byte view: `SEGMENT 1 / 3 · 1,514 B`, `2 / 3 · 1,514 B`, `3 / 3 · 1,058 B`, then a dashed
  tab `REASSEMBLED TLS · 3,920 B` that shows only the TLS layer(s) as one record stream.
- TLS fields that cross a segment border get a note: "Continues in segment 2".
- The "Total length" field note in each segment says "One segment: fits the 1,500-byte MTU."
- Applies to: HTTPS #6–7, TLS #4, SMTP / POP3 / IMAP Server Hello rows, DoH #7, HTTP/3 row 9 and 12
  (QUIC: tabs are UDP datagrams, each ≤ 1,242 B on the wire), WebSocket none.
- Keyboard: `[` and `]` switch tabs while the inspector is open.
- Tests: for every segmented row, sum of segment payloads = reassembled length; every segment ≤ 1,514;
  checksums valid.

## 3. Translations
- Add a test that loads every locale and fails if any key used by the UI is missing.
- Keep English for: Info column, protocol names, field names, hex/ASCII, header names (`Host:`,
  `Upgrade:`), DNS record types. Translate everything else.
- New content keys: `lessons.<id>.*` for the six new lessons, `quiz.<id>.<n>.*`, `glossary.<term>`.
  English is the source of truth; other locales may be drafts marked `// review`.
- RTL check for new components (lab card, compare view, quiz, filter, capture): mirror with logical CSS
  properties (`inset-inline-start`, `margin-inline-end`), not `left/right`.

## 4. CSS refactor of `measured.css` (do last in phase A, optional)
- Extract repeated literal values into tokens on `:root` / `[data-theme="dark"]` (`--pe-gap-*`,
  `--pe-fs-*`, colours already exist as `--k-*`).
- Rule: computed styles must not change. Run the compare script before and after; diff count must stay 0.
- Do it in small commits (one component per commit) so a regression is easy to find.

## 5. SEO
```html
<link rel="canonical" href="https://YOUR-DOMAIN/">
<meta property="og:image" content="https://YOUR-DOMAIN/og.png">
<meta property="og:url" content="https://YOUR-DOMAIN/">
```
- `public/robots.txt`: `User-agent: *` / `Allow: /` / `Sitemap: https://YOUR-DOMAIN/sitemap.xml`.
- `public/sitemap.xml`: the root URL. (Hash deep links are not crawlable; do not list them.)

## 6. Parity mode (phase B)
The comparison scripts check the replica against the reference. New lessons and features would make that
comparison fail by design, so the app gets a switch:

- `?parity=1` in the URL (read once at startup, kept for the session) → `PARITY = true`.
- When `PARITY` is true:
  - only the 14 reference lessons, in reference order; tab counts 14 / 4 / 7 / 3;
  - no NEW badges, no quiz badges, no OSI coverage dots, no `•••` sidebar menu items beyond the reference;
  - no lab, compare view, quiz entry, filter box, glossary underline, capture drop target, shortcut overlay,
    toasts or service-worker registration;
  - no deep-link hash rewriting (read nothing from the hash either);
  - progress counts out of 14 and is stored under the same key the reference uses.
- Implement as one `features.ts` module: `export const PARITY = …; export const has = (f: Feature) => !PARITY && …`.
  Every new feature checks `has('lab')` etc. Never sprinkle `if (PARITY)` through the reference code paths.
- The compare scripts append `?parity=1` to `--local` automatically; `--no-parity` turns that off.
- CI: run the compare (parity) and the unit tests on every PR. Both must pass.
