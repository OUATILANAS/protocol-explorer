# Protocol Explorer

An original static networking lesson app built with Vite and vanilla TypeScript. No production runtime dependencies, API calls, backend, UI framework or animation library. All simulator state stays in browser storage.

## Run

```sh
npm install
npm run dev
```

The development URL is `http://127.0.0.1:5173`. `npm run build` type-checks and builds `dist/`; `npm run preview` serves the production build at `http://127.0.0.1:4173`. Deploy the contents of `dist/` to a static host.

Branding lives in `src/config.ts`. Theme tokens live in `src/styles/tokens.css`. The six self-hosted Iosevka faces carry their SIL Open Font License in `src/fonts/OFL.txt`.

## Use

Choose a protocol from **Protocols**, press **Play**, and open an arrived table row to inspect its layers. The response aggregate in HTTP has a segment selector: each of its nine real Ethernet frames has its own complete field tree and byte dump. Hover or focus a field or hex byte to see their correspondence.

- Space: play or pause.
- Left / Right: previous or next step, reversed in RTL.
- V: network or sequence view.
- Escape: close the active overlay, or reset the lesson.
- Inspector Left / Right: previous or next captured packet.
- Language menu Up / Down / Home / End: navigate native language names.

Theme, language, diagram view, speed and lesson progress persist in localStorage; unavailable or malformed storage is handled gracefully. All motion honors reduced-motion preferences. Dialogs make the workspace inert, trap focus and return focus to their opening control.

## Architecture

`src/lessons/` contains 14 independent lessons with 78 steps, original explanations and real byte builders. `src/sim/engine.ts` owns deterministic event playback and seeking. Network and sequence views consume that same state. Encoders in `src/wire/` compute lengths and IPv4, TCP, UDP and ICMP checksums. Ethernet padding stays outside the IP and transport checksums.

TLS and SSH records are structurally educational captures, not working cryptographic handshakes. Random values, public-key examples and ciphertext are deterministic illustrations, explicitly labelled E.G. or hidden with `··`. There are no real credentials or private keys.

English is bundled; the other 14 languages load as separate chunks. Translations were machine generated from original English, with protocol-token preservation checks. Native-speaker review would improve editorial quality. Iosevka does not cover every script; those characters use the configured monospace fallback.

The annotated PDF is a layout reference, not a pixel-perfect oracle: its figures contain placeholder prose, simplified art and some conflicting state/layout descriptions. `DECISIONS.md` records how those conflicts were resolved.

## Verification

```sh
npm test
npm run qa
```

The browser checks use Playwright and an installed Google Chrome. `tests/browser.mjs` and `tests/a11y.mjs` currently select the standard macOS Chrome path; change `executablePath` for another platform. Tests verify all lessons, packet sizes/checksums, seeking, responsive overflow, field/byte linking, overlays and locale persistence. `qa/` contains generated PCAPs and audit evidence. These sample captures contain only documentation/example traffic.

```sh
npx tsx scripts/export-captures.ts
```

During development the inspector download button exports the current capture as `.pcap`. It is excluded from production. The HTTP seven-row capture exports 15 actual frames because its final row represents nine segments. Wireshark/tshark can decode the files without a backend.

Translation regeneration scripts are build-time maintenance tools only; they use an online translation service and are never included in the shipped app. The checked-in locale modules need no network service at runtime.
