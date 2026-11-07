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

During development the lesson options menu exports the current capture as `.pcap`. It is excluded from production. The HTTP seven-row capture exports 15 actual frames because its final row represents nine segments. Wireshark/tshark can decode the files without a backend.

Translation regeneration scripts are build-time maintenance tools only; they use an online translation service and are never included in the shipped app. The checked-in locale modules need no network service at runtime.

## Live-reference comparison

```sh
npx playwright install chromium
npm run compare -- --only medium-dark-overview
npm run compare -- --no-motion
npm run compare -- --only motion
```

`npm run compare` runs the upgrade comparator, which enables `?parity=1`. The supplied comparator defaults to the development server on port 5173. To compare the production build, start `npm run preview` and pass `--local http://127.0.0.1:4173/`. Reports, screenshots, differences and motion traces are written under `reference-diff/` and are excluded from Git. Its cases, tolerances and ignore list are unchanged. See `DECISIONS.md` for failing cases and the limits of exact comparisons with retained prose and changing full-page camera bounds.

`src/styles/measured.css` contains the shared measured component styles and raw color remaps. `src/ui/motion.ts` implements frame-driven text/panel swaps; packet routes and camera interpolation remain in `src/sim/`. The comparison does not currently pass in full; a successful build or packet test is not a visual-match claim.

## Vercel production

Live app: https://protocol-explorer-hamada.vercel.app/

Deploy the compiled static app without source, recordings or QA files:

```sh
npm run build
npx vercel@65.12.1 deploy dist --prod --yes --project protocol-explorer-hamada --scope acme-7153
```

The currently deployed site predates the in-progress 33-lesson upgrade. Local verification does not deploy changes.

The Vercel project uses static files from `dist/`; it requires no backend or environment variables. Deployment and live browser checks are recorded in `qa/vercel/`.
