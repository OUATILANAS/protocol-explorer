# Protocol Explorer

An original static networking lesson app built with Vite and vanilla TypeScript. No production runtime dependencies, API calls, backend, UI framework or animation library. All simulator state stays in browser storage.

## Run

```sh
npm install
npm run dev
```

The development URL is `http://127.0.0.1:5173`. `npm run build` type-checks and builds `dist/`; `npm run preview` serves the production build at `http://127.0.0.1:4173`. Deploy the contents of `dist/` to a static host.

Branding lives in `src/config.ts`. Theme tokens live in `src/styles/tokens.css`. The six self-hosted Iosevka faces, with Latin, Cyrillic, Greek and Vietnamese subsets, carry their SIL Open Font License in `src/fonts/OFL.txt`.

## Use

Choose a protocol from the desktop sidebar or the **Protocols** drawer, press **Play**, and open a table row to inspect its layers. The response aggregate in HTTP has segment tabs: each of its nine real Ethernet frames has its own complete field tree and byte dump. Hover or focus a field or hex byte to see their correspondence.

- Space: play or pause.
- Left / Right: previous or next step, reversed in RTL.
- V: network or sequence view.
- Escape: close the active overlay, or reset the lesson.
- Inspector Left / Right: previous or next captured packet.
- Language menu Up / Down / Home / End: navigate native language names; Left / Right move between columns.
- Inspector brackets: previous or next segment.
- Cmd / Ctrl + K: search protocols and steps.

Theme, language, diagram view, speed and lesson progress persist in localStorage; unavailable or malformed storage is handled gracefully. All motion honors reduced-motion preferences. Dialogs make the workspace inert, trap focus and return focus to their opening control.

## Architecture

`src/lessons/current.ts` exposes the current 33-lesson catalog with 195 steps and 445 packet rows, original explanations and lazy wire recipes. The historical 14-lesson registry remains exported for the 187-row compatibility tests. The current recipes are verified separately against `tests/fixtures/reference-33-packets.json`. `src/sim/engine.ts` owns deterministic event playback and seeking. Network and sequence views consume that same state. Encoders in `src/wire/` compute lengths and IPv4, TCP, UDP and ICMP checksums. Ethernet padding stays outside the IP and transport checksums.

TLS and SSH records are structurally educational captures, not working cryptographic handshakes. Random values, public-key examples and ciphertext are deterministic illustrations, explicitly labelled E.G. or hidden with `··`. There are no real credentials or private keys.

English is bundled; the other 20 languages load as separate chunks. Translations were machine generated from original English, with protocol-token preservation checks. Native-speaker review would improve editorial quality. Iosevka does not cover every script; those characters use the configured monospace fallback.

The live reference supersedes the earlier PDFs and written measurements. Original long lesson prose is retained. `DECISIONS.md` records measured behavior, comparison results and unresolved differences.

## Verification

```sh
npm test
node tests/current-browser.mjs
node tests/upgrade-browser.mjs
node tests/languages-browser.mjs
node tests/inspector-motion-browser.mjs
node tests/playback-timing-browser.mjs
```

The current upgrade browser checks use Playwright Chromium. Legacy browser checks use an installed Google Chrome. `tests/browser.mjs` and `tests/a11y.mjs` currently select the standard macOS Chrome path; change `executablePath` for another platform. Tests verify all lessons, packet sizes/checksums, seeking, responsive overflow, field/byte linking, overlays and locale persistence. `qa/` contains generated PCAPs and audit evidence. These sample captures contain only documentation/example traffic.

```sh
npx tsx scripts/export-captures.ts
```

The parity development menu exports classic `.pcap`; normal mode exports `.pcapng` in production too. The HTTP seven-row capture exports 15 actual frames because its final row represents nine segments. Wireshark/tshark can decode the files without a backend.

Translation regeneration scripts are build-time maintenance tools only; they use an online translation service and are never included in the shipped app. The checked-in locale modules need no network service at runtime.

## Live-reference comparison

```sh
npx playwright install chromium
npm run compare -- --only medium-dark-overview
npm run compare -- --no-motion
npm run compare -- --only motion
```

`npm run compare` runs the upgrade comparator, which enables `?parity=1`. The supplied comparator defaults to the development server on port 5173. To compare the production build, start `npm run preview` and pass `--local http://127.0.0.1:4173/`. Reports, screenshots, differences and motion traces are written under `reference-diff/` and are excluded from Git. Its cases, tolerances and ignore list are unchanged. See `DECISIONS.md` for failing cases and the limits of exact comparisons with retained prose and changing full-page camera bounds.

`src/styles/measured.css` contains the shared measured component styles and raw color remaps. `src/ui/motion.ts` implements frame-driven text/panel swaps; packet routes and camera interpolation remain in `src/sim/`. The full motion comparison remains unresolved; English static parity passes under the agreed phase gate.

## Vercel production

Live app: https://protocol-explorer-hamada.vercel.app/

Deploy the compiled static app without source, recordings or QA files:

```sh
npm run build
npx vercel@65.12.1 deploy dist --prod --yes --project protocol-explorer-hamada --scope acme-7153
```

Production was updated on 8 November 2026 with all 34 lessons, upgrade features, the device visibility fix and readable packet pacing. The public live browser checks pass; see `qa/upgrade/production-deployment.json`.

The Vercel project uses static files from `dist/`; it requires no backend or environment variables. Deployment and live browser checks are recorded in `qa/vercel/`.

## Upgrade features

Normal mode now has **34 lessons, 200 steps and 450 rows**. Ethernet adds a switch, desktop, computed frames and a live MAC learning table. `?parity=1` disables all upgrade features together and retains the 33-lesson reference catalog.

- Deep links restore a lesson, step, packet or sequence view paused; Shift+L copies the current link.
- Compare displays packet-derived DNS, transport, encryption and response timing for 2–3 lessons.
- L opens the seeded what-if lab for HTTP, HTTPS, TCP, UDP and QUIC. Repeated TCP/QUIC losses use exponential recovery backoff with an eight-retry limit; scope and remaining losses are shown. Reset to lesson restores the source capture. This is an illustrative recovery model, not a full congestion controller.
- `/` focuses the visual packet filter. `?` shows enabled shortcuts.
- Quizzes cover all 34 lessons (102 questions), with saved scores, explicit answer feedback and packet links. Explanation terms open glossary cards.
- Lesson options import `.pcap`/`.pcapng` captures or export grouped lesson rows as `.pcapng`. Parsing runs in a worker, with 50 MB / 100,000-packet limits and a virtualized table. Nothing is uploaded. Follow TCP stream reassembles up to 2 MB per direction, marks missing/conflicting bytes, handles retransmissions and separates reused connections. It never decrypts protected traffic.
- Production builds precache assets, fonts, lessons and locales. Local production previews require `?sw=1`; parity mode and Vite development never register the service worker.

The Phase D English static matrix passes **56/56**, with the agreed original-prose/credit exclusions. The final production overview check passes **10/10**. Motion parity remains unreliable: the reference-versus-itself control fails, so the user approved static parity as the phase gate. Spanish, German and Arabic retain documented visual differences because technical Info stays English. See `qa/upgrade/upgrade-completion.json` for the verification record. This upgrade is deployed at https://protocol-explorer-hamada.vercel.app/.


## Learning tools and performance update

The side panel exposes Guide, Quiz, Capture and Listen, plus Lab on supported lessons. First-time visitors get a dismissible introduction. These additions are hidden together by `?parity=1`.

Listen uses only matching voices reported as installed locally by the browser. It never selects a remote voice or starts automatically after reload. Install a system voice if none is available; captions still work without one. Voice and reading speed preferences stay on this device. Narration pauses with playback and when the page is hidden.

Quiz translations and packet-field notes load only when needed, and lesson explanations load per lesson. Lossless Latin font subsets preserve original outlines, advances and global metrics; full and native-script faces remain available. The normal app preloads the small fonts, while parity preserves the reference's initial font/camera measurement timing. Lighthouse measured **96 performance / 100 accessibility** on the compressed local production preview (mobile simulation, native Node 24); this is a local audit, not a guaranteed score on every device. Main JS remains below the approximate 80 KB gzip target. CSS remains above its original approximate 15 KB target; reference styling is retained.

Offline registration waits until initial fonts are ready and the browser is idle. Navigations fetch fresh HTML first; offline fallback prefers the current release. One previous asset cache is retained for already-open tabs that request an older lazy chunk. A three-release regression test checks this upgrade path.

```sh
npm run test:playback
npm run test:features
node tests/offline-browser.mjs
node tests/cache-updates-browser.mjs
npm run preview:compressed
npm run qa:production
```

Browser suites use the documented development/preview ports (5173 and 5175); `preview:compressed` serves `dist/` on 5177 for compressed-delivery audits. Translation and content generation commands are maintenance tools. The checked-in lazy chunks are used at runtime, with no translation service calls.
