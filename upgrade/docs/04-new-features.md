# 04 · New features (phase D)

Nine features. Each is behind `has('<feature>')` from `features.ts`, so `?parity=1` turns all of them off.
Board numbers refer to `design/design-book.pdf` and `design/boards/*.png`. Every component needs a light
theme version built from existing tokens, logical CSS properties for RTL, keyboard access and
reduced-motion behaviour (no movement; state changes only).

Build in this order — each one is useful on its own and later ones reuse earlier ones.

## D1 · Deep links (board 09)
- Hash routes: `#http3` (lesson), `#http3/step-4`, `#http3/packet-8` (opens the inspector on that row),
  `#http3/sequence` (sequence view). Combine: `#tcp/step-4/sequence`.
- Update the hash with `history.replaceState` while playing (no history spam); use `pushState` only when the
  user picks a lesson or a step, so Back / Forward move between those.
- On load: parse, validate (unknown lesson → default lesson, step out of range → clamp), then render the
  lesson **paused** at that step with the same state as if the user had clicked there.
- "Copy link to this step" (••• menu, <kbd>⇧L</kbd>) → clipboard + toast "Link copied".

## D2 · What-if lab (boards 04, 11)
- Available for TCP, UDP, HTTP, HTTPS, HTTP/3. Open with <kbd>L</kbd> or the ••• menu.
- Controls: round-trip time 10–300 ms (default = lesson's own), packet loss 0–30 %, random seed (number
  shown; ↻ picks a new one), toggle "show retransmission timer".
- Engine: copy the lesson's packet list; rescale times by `rtt / lessonRtt` per round trip; drop packets
  with a seeded PRNG (mulberry32 or similar; same seed + settings ⇒ same run). TCP: 3 duplicate ACKs ⇒ fast
  retransmit, else RTO (initial 1 s per RFC 6298, or min(1 s, 3×RTT) — choose one, write it in
  `DECISIONS.md`). UDP: the gap stays. QUIC: PTO-based resend of the lost frames.
- Table: lab rows get `LOST` (red) or `RESENT` (amber) tags; legend adds "Lab run · not the lesson capture".
- Amber "⚗ WHAT-IF LAB" badge on the simulation while active. Result box: "N× slower than default",
  "N lost · N resent". Lab note in Step Details when the outcome differs from the lesson text.
- "Reset to lesson" restores the exact reference packets (packet test must still pass after a reset).
- Phone: bottom sheet above the transport bar; ⚗ replaces reset in the bottom bar; swipe down / Esc closes.

## D3 · Compare view (board 05)
- Third view next to Network and Sequence. Pick 2–3 lessons with chips (default HTTP, HTTPS, HTTP/3).
- One horizontal time axis (ms). Bars per lesson: DNS, TCP handshake, TLS or QUIC handshake, request →
  first byte — all derived from the packet times, never typed.
- Amber marker = GET leaves; green marker = first response byte.
- Side panel rows: round trips before GET, GET sent, first byte, encrypted (yes/no), packets; then one
  generated sentence ("HTTP/3 sends the GET N ms sooner than HTTPS because …") from a template per pair.

## D4 · Quiz "Check yourself" (board 06)
- Entry: button on the Lesson Summary. Data: `data/quiz.json` (3 questions × 20 lessons).
- One question at a time, progress bar, options shuffled (keep `answer` mapped after shuffle).
- Choosing: option turns green or red, explanation shows, plus "See packet N ›" that opens the inspector on
  that row (uses D1's router).
- Score stored in progress (`quiz: {http3: 3}`); drawer shows a `3/3` badge and fills the lesson ring.
- Keys: <kbd>1</kbd>–<kbd>4</kbd> choose, <kbd>Enter</kbd> next, <kbd>Esc</kbd> back to summary.

## D5 · Packet filter (board 07)
- Box in the Packet Flow header; <kbd>/</kbd> focuses it, <kbd>Esc</kbd> clears.
- Free text matches any column (case-insensitive). Expressions: `proto==tcp`, `ip==8.8.8.8` (src or dst),
  `src==`, `dst==`, `len>100` / `<` / `>=` / `<=`, joined with `&&`. Invalid → red border, no filtering.
- Non-matching rows dim to 28 % opacity; numbering is unchanged; counter "3 of 11".
- Playback still runs every packet; the filter is visual only.

## D6 · Glossary (board 07)
- `data/glossary-en.json` (40 terms). Underline the first occurrence of each term per explanation, whole
  word, case-insensitive: `text-decoration: underline dotted var(--active-border)`, offset 3px.
- Hover or focus (it is a `button`) shows a card: definition + "Seen in packet N ›" for the current lesson
  if the term appears in a packet's Info.
- Translate per locale; if a locale lacks a term, don't underline it there.

## D7 · Capture import / export (board 08)
- Import: ••• → "Open a capture…" or drop a file anywhere. `.pcap` and `.pcapng`, up to 50 MB /
  100,000 packets. Parse in a Web Worker, **in the browser only** (privacy line is mandatory: "Stays on
  your device. Nothing is uploaded.").
- Decode Ethernet, ARP, IPv4/6, ICMP/v6, UDP, TCP, DNS, DHCP, HTTP/1.1, TLS records, QUIC Initial headers by
  running the lesson encoders' field definitions in reverse; anything else is raw hex labelled "not decoded".
- "Your capture" mode: cyan banner (file name, count, duration, Export, Back to lessons); same table and
  inspector, virtualised table; no animation. Panel "In this capture": protocols with counts,
  conversations, and links to the lessons that explain them.
- Export: ••• → "Export lesson as .pcap" writes the current lesson's frames (already in `src/wire/pcap.ts`).
  Round-trip test: export → import → identical rows.

## D8 · Shortcuts overlay (board 09)
<kbd>?</kbd> opens a modal listing: Space play/pause · ← → step · V network/sequence · L lab · / filter ·
Enter open packet · Esc close · ? this list. Focus is trapped; Esc closes; it lists only features that
are enabled.

## D9 · Offline (board 09)
- Service worker (Workbox or a small hand-written one): precache the built assets, fonts and locale chunks.
- First successful install → toast "Available offline · lessons cached on this device".
- Not registered in parity mode or on `localhost` unless `?sw=1` (so dev reloads stay fresh).

## Done means
- Unit tests for router parsing, PRNG determinism, filter parser, quiz shuffle mapping, pcap round-trip.
- Compare script with parity: 0 diffs. Without parity (`--no-parity`) diffs are expected; don't chase them.
- Every board in `design/` reproduced in dark and light theme, wide and phone layouts.
