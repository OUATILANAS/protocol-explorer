# 01 · Audit findings

What the full inspection of the local build (`http://127.0.0.1:5173/`) found, compared with the reference
(`https://protocol-explorer-alpha.vercel.app/`). Read this first: it says what is already done, so nothing
that works gets rebuilt.

## 1. Already correct — do not touch

| Area | Result |
|---|---|
| Lessons | All 14 reference lessons present and complete: HTTP, HTTPS, TCP, UDP, IP, DNS, DHCP, ICMP, SMTP, POP3, IMAP, FTP, SSH, TLS/SSL. |
| Packet rows | 187 / 187 rows match the reference exactly (time, source, destination, protocol, info, size, colour, lost flag). Data: `reference/reference-packets.json`. |
| Legends | 14 / 14 match (colour + label). |
| Bytes | Every packet's `wire()` covers 100 % of its bytes: 0 uncovered bytes, every field has a note. Field `offset` is layer-relative (correct, keep it). |
| Checksums | IPv4 header, TCP, UDP and ICMP checksums valid in every generated frame. |
| RTL | Arabic / Hebrew mirror correctly. |
| Contrast | Text and controls pass WCAG AA in both themes. |
| Collapsed steps | Collapsed step buttons are inert (not focusable) — correct. |
| Comparison tooling | `scripts/compare-reference.mjs` + `scripts/motion.mjs` pass on layout, text, canvas and motion when run against the current build. |

There is **no protocol missing** relative to the reference: the reference has 14 lessons and so does the
replica. Everything in `03-new-lessons.md` goes *beyond* the reference.

## 2. Issues found (fix in phase A)

### 2.1 Multi-segment rows show one oversized frame in the inspector
Rows such as HTTPS #6–7 "Server Hello + encrypted handshake, 3 segments", TLS #4, the SMTP/POP3/IMAP
Server Hello rows and (new) DoH #7 are a single table row standing for several TCP segments. The inspector
currently renders them as **one** frame whose IPv4 total length is larger than the 1,500-byte MTU. That is
not a valid frame and contradicts the lesson ("3 segments"). Fix: segment tabs — see `02-fixes-spec.md §2`
and design board 10.

### 2.2 Translations
- Some UI strings fall back to English in non-English locales. Run the new `--langs` option of the compare
  script (it switches `protocol-explorer:lang`) and grep the DOM for English words in each locale; every
  key must exist in every `*.locale.ts`.
- **Packet Info column, protocol names, field names and hex stay English** in every locale (that is how
  Wireshark and the reference show them; learners will look these strings up). Only explanations, step
  titles, buttons, legends and notes are translated.
- New lessons, quiz and glossary need keys in every locale (English is the source; machine-draft others,
  mark them `// review` in the locale file).

### 2.3 `src/styles/measured.css`
76 KB / 777 rules of measured values. It works, but it is the main reason small changes break parity.
Keep it during phase A–B (parity first), then fold repeated values into tokens (`--pe-*`) without
changing any computed style. The compare script is the safety net: zero new diffs allowed.

### 2.4 Keyboard handler guard
Global keydown/pointerdown handlers call `event.target.closest(...)`. When the target is `document` or a
text node this throws `closest is not a function`. Real users rarely hit it, but synthetic events and some
extensions do. Guard with `const el = e.target instanceof Element ? e.target : null;`.

### 2.5 SEO / sharing
- `og:image` must be an **absolute** URL (relative URLs are ignored by most crawlers).
- Add `<link rel="canonical">`, `robots.txt` and `sitemap.xml` (one URL per lesson once deep links exist).
- Add `og:title`/`og:description` per deep link only if you prerender; otherwise one site-wide set is fine.

## 3. What is left to upgrade (summary)

| Kind | Items | Spec |
|---|---|---|
| Fixes | Segment tabs, translations, guard, SEO, CSS tokens | `02-fixes-spec.md` |
| Parity mode | `?parity=1` keeps the exact 14-lesson replica | `02-fixes-spec.md §6` |
| New lessons | HTTP/3, WebSocket, IPv6, Ethernet, Wi-Fi, DoH + DNSSEC | `03-new-lessons.md`, `data/new-lessons.json` |
| New features | Deep links, what-if lab, compare view, quiz, packet filter, glossary, capture import/export, shortcuts, offline | `04-new-features.md`, `design/` |
