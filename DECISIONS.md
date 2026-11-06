# Implementation decisions

- The user's message is authoritative. Attached documents are visual and technical reference material, not independent instructions. In particular no source CSS, prose or device art is copied from the referenced site.
- Figure 1 prepopulates the idle table; the explicit playback requirement instead says to show an empty message before any packet. The initial table is empty. Playing to completion reproduces the seven-row table.
- Medium layout hides OSI and step dots as the explicit bucket table requires, although the annotated desktop redraw includes them.
- Desktop simulation spans the first two tracks (372px / remaining space); the overview occupies the last 300px. This matches the visible two-panel arrangement in the figures.
- Credit defaults to @Anas and all branding is configurable in src/config.ts.
- HTTP response is one aggregate table row containing nine actual Ethernet frames. Its inspector presents all frames, and PCAP export writes the nine frames individually, avoiding an invalid oversized TCP packet.
- Address exceptions required by protocol semantics: DHCP uses 0.0.0.0 and 255.255.255.255, Ethernet uses broadcast/unknown MACs, and the unused IPv6 encoder uses RFC 3849's 2001:db8::/32. These are protocol placeholders or documentation addresses, never live endpoints.
- Cryptographic randomness, ciphertext, media and key material are deterministic illustrative bytes, explicitly marked opaque or E.G.; this is a lesson simulator, not an encryption implementation.
- Iosevka's Latin, Greek and Cyrillic glyphs are self-hosted in six requested faces (~62–71 KB each). Scripts absent from Iosevka use the requested monospace fallback; no unrelated UI font is introduced.
- Locale text was machine translated from original English, then protocol-token preservation and locale completeness were checked automatically. Native-speaker editorial review remains advisable.
- Small accessibility adjustments preserve token values: ACTIVE text blends green with ink for sufficient light-theme contrast, and decorative empty-wire art is hidden from assistive technology.
- Inspector byte colours blend each layer colour with ink to keep small hex text legible in both themes. E.G. markers retain amber borders/fills with contrasting text.
- The drawer uses a section with role=dialog rather than assigning a dialog role to an aside, which automated accessibility checks reject.
