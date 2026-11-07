# Codex prompt — Protocol Explorer upgrade

Paste everything below the line into Codex, with this whole folder copied into the repo as `upgrade/`.

---

You are working in the Protocol Explorer repo (Vite + vanilla TypeScript). The app is already an exact
replica of https://protocol-explorer-alpha.vercel.app/ — 14 lessons, all 187 packet rows and every
legend match, every byte has a field note, checksums are valid. **Do not break that.**

Your job is to upgrade it in four phases. The `upgrade/` folder has everything you need:

| Path | What it is |
|---|---|
| `upgrade/docs/01-audit-findings.md` | What already works (don't rebuild it) and the issues found. Read first. |
| `upgrade/docs/02-fixes-spec.md` | Phase A fixes and phase B parity mode. |
| `upgrade/docs/03-new-lessons.md` | Phase C: six new lessons. |
| `upgrade/docs/04-new-features.md` | Phase D: nine features. |
| `upgrade/design/design-book.pdf`, `upgrade/design/boards/*.png` | Mockups for every new screen, with rules next to each board. |
| `upgrade/data/new-lessons.json` | Lesson content, steps, packets with fields and notes. |
| `upgrade/data/quiz.json`, `upgrade/data/glossary-en.json` | Quiz (20 lessons × 3) and glossary (40 terms). |
| `upgrade/reference/reference-packets.json` | The 14 reference lessons' rows — the packet test's source of truth. |
| `upgrade/scripts/compare-reference.mjs`, `motion.mjs` | Pixel, text, layout and motion comparison against the reference. |

## Rules (apply to every phase)
1. **Parity must stay green.** After every phase run
   `node upgrade/scripts/compare-reference.mjs --local http://127.0.0.1:5173/` (it adds `?parity=1`).
   Exit code 0 is required. Fix regressions before moving on. Don't edit the scripts to make them pass.
2. **Packet test must stay green** for the 14 reference lessons; extend it to each new lesson as you add it.
3. **Write explanations in your own words.** `teach` fields are briefs; the reference's prose is not to be
   copied into new lessons.
4. Reuse the existing engine, components and tokens. New UI follows the design boards; every new
   component gets light and dark theme, RTL via logical properties, keyboard access, and
   reduced-motion behaviour.
5. All new features go through `features.ts` (`has('lab')` …) so `?parity=1` hides them in one place.
6. Small commits, one item each, with a message saying which doc section it implements.
7. When the spec leaves a choice open, choose, and write one line in `DECISIONS.md` (what, why).
8. Don't add network calls: capture parsing, quiz, glossary and the lab all run in the browser.

## Phase A — fixes (`02-fixes-spec.md §1–5`)
1. Event-target guard for keyboard/pointer handlers (+ test).
2. Segment tabs in the inspector for multi-segment rows (board 10). Table rows and sizes unchanged.
3. Translations: missing-key test across locales; Info column / field names / protocol names stay English.
   Run the compare with `--langs en,fr,es,de,ar` (use the locale codes the app ships) to find untranslated UI.
4. SEO: absolute `og:image`, canonical, `robots.txt`, `sitemap.xml`.
5. Optional, last: fold `measured.css` literals into tokens with zero compare diffs.

## Phase B — parity mode (`02-fixes-spec.md §6`)
Create `features.ts` and the `?parity=1` switch **before** adding any new lesson or feature. Verify:
compare with parity = 0 diffs; the app without the flag still works unchanged at this point.

## Phase C — new lessons (`03-new-lessons.md`)
Order: Ethernet → IPv6 → WebSocket → HTTP/3 → DoH → Wi-Fi (simplest encoders first).
For each: encoder from the field list → packet rows → steps/overview/outro (own words) → legend → nodes
and new devices (switch, desktop, access point per board 02) → packet test and bytes test → translations.
Then update the drawer order, tab counts (20 / 6 / 9 / 5), NEW badges and OSI coverage dots (board 01).
If an encoder's size differs from `new-lessons.json`, the encoder wins: update the JSON and `DECISIONS.md`.

## Phase D — features (`04-new-features.md`)
Order: D1 deep links → D5 filter → D8 shortcuts → D4 quiz → D6 glossary → D3 compare view → D2 what-if
lab → D7 capture import/export → D9 offline. Match boards 04–09 and 11. Unit tests listed under
"Done means" are required.

## When you finish each phase
Reply with: what was done (one line per item), test and compare results (pass counts), entries added to
`DECISIONS.md`, and anything you could not do and why. Then continue with the next phase.
