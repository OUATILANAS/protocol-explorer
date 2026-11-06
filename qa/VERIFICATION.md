# Verification record — 6 November 2026

Reference files were read in full and all seven figures were rendered and visually inspected. Screenshots are retained locally in `qa/` (ignored by Git); the production artifact contains the app assets only.

| Phase | Evidence |
| --- | --- |
| 1. Scaffold | Vite + strict vanilla TypeScript; six self-hosted Iosevka faces; both themes persist; production build succeeds. |
| 2. Shell | 1180px desktop compared visually with the Figure 1 redraw; header reduced after initial comparison. Original prose and device drawings replace placeholders. |
| 3. Layout | 1672, 1180, 900, 640, 375px, both themes: no horizontal document overflow. Phone bottom controls, sheet and scrim checked. |
| 4. SVG | Nine device builders, isometric grid, dashed lanes and eight camera frames. Desktop and phone screenshots inspected. |
| 5. HTTP engine | Plays to seven rows; byte counts 75, 91, 66, 66, 60, 484, 13107. Summary 0.094s. Playback, step, back, reset and replay exercised. |
| 6. Sequence | Shared packet state, drawn arrows and auto-follow; V toggle and view persistence checked. |
| 7. Inspector | Field-to-byte and byte-to-field hover tests; field offsets/lengths, real checksums and nine-frame aggregate PCAP verified. |
| 8. Drawer | All/core/application/security counts, accordion and step jumps; progress saved; focus trap, inert background and Escape tested. |
| 9. Lessons | All 14 lessons / 78 steps run to completion with expected packet counts. All packet lengths and IPv4/TCP/UDP/ICMP checksums tested. |
| 10. i18n | English + 14 lazy chunks; 1,152 current unique source strings covered. All 15 selections load. French, Arabic, Hebrew and Japanese screenshots inspected. RTL keyboard direction and LTR technical fields implemented. |
| 11. Polish | Desktop Lighthouse: performance 100, accessibility 100. Mobile Lighthouse: performance 100, accessibility 100. Both themes: idle, complete, inspector and drawer axe audits have no violations. No browser page errors in full functional audit. |

## Packet decoder evidence

`tshark` from the installed Wireshark application decoded captures for all 14 lessons. No malformed-packet diagnostics or invalid IPv4/TCP/UDP checksum statuses were found. Core tests independently calculate ICMP checksums too. TLS ClientHello/ServerHello and SSH KEXINIT/ECDH/NEWKEYS are recognized by the decoder; encrypted bodies are illustrative opaque data.

HTTP's seven displayed rows export 15 physical frames. The nine response frames contain 12,621 HTTP bytes and 486 Ethernet/IP/TCP header bytes, totalling 13,107 bytes (12.8 KiB at the displayed precision). The HTTP Content-Length agrees with the generated HTML body length.

## Limits and intentional differences

These checks do not establish pixel identity with every reference redraw. The PDF contains placeholder prose and simplified device art, and its idle-table and medium-layout instructions conflict. See DECISIONS.md. Machine translations have automatic coverage and protocol-token checks, but no native-speaker editorial sign-off. Cryptographic examples demonstrate wire structure; they are not live encrypted sessions.
