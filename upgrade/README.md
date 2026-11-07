# Protocol Explorer — upgrade pack

Everything needed to take the replica beyond the reference without breaking it.

1. Copy this folder into your repo as `upgrade/`.
2. Open `design/design-book.pdf` to see what is being built (11 boards + colour appendix).
3. Paste `CODEX_PROMPT.md` (below its line) into Codex.

```
CODEX_PROMPT.md            the prompt: rules + phases A (fixes) → B (parity mode) → C (lessons) → D (features)
docs/
  01-audit-findings.md     what already matches the reference, and the issues found
  02-fixes-spec.md         segment tabs, translations, keyboard guard, SEO, CSS tokens, parity mode
  03-new-lessons.md        HTTP/3, WebSocket, IPv6, Ethernet, Wi-Fi, DoH + DNSSEC
  04-new-features.md       deep links, what-if lab, compare view, quiz, filter, glossary,
                           capture import/export, shortcuts, offline
design/
  design-book.pdf          mockups with the rules for each board
  boards/01…11-*.png       each board at 2× for zooming in
data/
  new-lessons.json         6 lessons: steps, facts, legend, nodes, packets with fields + notes
  quiz.json                3 questions × 20 lessons, each linked to a packet
  glossary-en.json         40 terms
reference/
  reference-packets.json   the 14 reference lessons' 187 rows (packet test source of truth)
scripts/
  compare-reference.mjs    layout / text / pixel / motion comparison against the reference
  motion.mjs               motion recorder (imported by the compare script)
```

## Comparison script — what's new
```bash
npm i -D playwright && npx playwright install chromium
node upgrade/scripts/compare-reference.mjs --local http://127.0.0.1:5173/            # parity mode added automatically
node upgrade/scripts/compare-reference.mjs --langs en,fr,ar --no-motion               # one run per UI language
node upgrade/scripts/compare-reference.mjs --no-parity                                # compare the full upgraded app (diffs expected)
```
- `?parity=1` is appended to `--local` unless `--no-parity` is given.
- `--langs` sets `localStorage['protocol-explorer:lang']` in both apps before load; case ids get a
  `-fr` suffix. If your app stores the language differently, change that one line in `capture()`.
- Earlier options still work: `--ref`, `--out`, `--only`, `--strict`, `--headed`, `--no-motion`, `--ignore`.
