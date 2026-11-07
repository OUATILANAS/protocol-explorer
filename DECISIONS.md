# Implementation decisions

## Correction pass — 6 November 2026

The user's correction request supersedes the earlier specification. The correction PDF supplies visual/measured references; its embedded prompt is supporting material, not a separate instruction. `tests/fixtures/reference-packets.json` is an unchanged copy of the supplied packet targets.

### Corrected behavior

- Medium/wide use a permanent sidebar, a 76px single-row top bar and a simulation-local inspector. The exact supplied 1280×800 panel measurements are reproduced: 372×710 / 554×446 / 300×446 / 865×248.
- Tablet has a two-row top bar, OSI strip and credit; narrow/phone use the bottom transport bar. Only wide shows legend notes and the RESET label. The current protocol uses the supplied red border/fill. Slate replaces the former grey packet color. Primary controls use the corrected theme colors.
- Overview/reset previews all lesson packets. PLAY starts a fresh, empty live capture. Preview rows remain inspectable and exportable; replay and natural playback use the same capture events.
- Each lesson has an explicit packet-to-step plan. Original overview descriptions, step explanations/subtitles and outros are preserved. Names, titles, packet metadata, legends and node labels use the correction targets. Some preserved prose/facts still describe the earlier illustrative exchanges (for example TCP byte ranges and POP3/IMAP closing outcomes); the reference intentionally stops some captures before those outcomes. The corrected packet table is authoritative for what is shown on the wire.
- Iosevka 500 was already present and is now explicitly used as body/table/description weight. All six requested faces remain self-hosted with the SIL OFL license.

### Details the supplied references do not uniquely determine

- Sizes printed as `1.9 KB`, `2.9 KB`, etc. specify rounded values, not exact byte counts. The corresponding frame collections use the nearest whole byte to that KiB value, except the explicitly specified three-packet TLS flight (1514 + 1514 + 1084) and HTTP's existing 13107-byte response aggregate. Display sizes are always computed from encoded bytes; tests compare them to the supplied strings.
- The JSON supplies packet metadata rather than full payloads. DNS name compression, referrals, glue records, EDNS and padding are encoded structurally; opaque cryptographic/file/media content is illustrative and marked `··`. Algorithm/key examples are not executable encryption. Plain FTP message framing is encoded to the requested lengths. Where a plaintext message is abbreviated in the reference, the remaining text is an illustrative protocol-valid completion, not a claimed original capture.
- SSH KEXINIT uses an illustrative vendor algorithm entry to fill the supplied proposal lengths, labelled as an example. It offers the requested sntrup761x25519 exchange and ChaCha20-Poly1305, whose framing accommodates the short protected packets in the target. Real public keys, ciphertext and cookies are unavailable and remain opaque.
- The live reference uses a fixed 398px hex column even in the medium inspector, leaving a narrow field tree. That measured behavior supersedes the earlier 48% approximation. Stacked inspectors occupy the full viewport.
- The phone wordmark stays compact (16px) to fit the 40px menu, logo, language and theme controls on the 380px canvas. Narrow uses 22px. At phone width a 22–27px wordmark would force another header row or overlap controls; the corrected PDF provides no phone figure to resolve that conflict.
- A 900–1099px tablet canvas is not scaled above 1. Its available inner width therefore grows with the viewport. The later live-reference pass replaces the original approximate device geometry with measured SVG geometry.

## Retained implementation choices

- Branding is configurable in `src/config.ts`, with credit defaulting to @Anas.
- Captured aggregates export individual Ethernet frames to PCAP; they are never invalid oversized TCP packets.
- The earlier address restriction is superseded by the corrected JSON, including the alternate server IPs, NAT address, traceroute hop and service domain names. DHCP's unspecified/broadcast addresses retain their protocol meaning.
- Locale text remains the existing machine translation of the original prose. No translation regeneration or prose rewriting is part of this correction pass. Iosevka's missing scripts use the requested monospace fallback.
- Existing contrasting E.G./byte text colors and focus treatment remain; layer bars, packet dots and link lines use the corrected palette.
- This correction is local-only, continuing the user's localhost preference. The previously hosted version is unchanged.
- Wireshark validates all transport/header checksums and finds no malformed packets. This machine's SSH dissector warns that it does not implement the sntrup761x25519-specific key decoder; it still recognizes the negotiated setup and protected packets.

## Live-reference match pass — 7 November 2026 (in progress)

The latest user request makes the live reference authoritative over both earlier specifications. The attached comparison scripts are test tooling, not additional product requirements. Their tolerances, cases and ignore list are unchanged. The ZIP contains two self-contained scripts; their embedded extractor and recorder were also saved separately as requested. One reporting defect was corrected: missing boxes are direct objects, so the report reads `x.rect` rather than the nonexistent `x.ref.rect`. Without that fix a failing comparison crashed before writing its report.

Measured reference colors, typography, SVG device geometry, logo geometry and shared paint definitions now replace the earlier approximations. This supersedes the earlier notes about retaining the old drawings and the incorrect 16px description. The description is 13.1px with 21.5px line height; 16px belongs to the protocol's full-name line. Camera fitting waits for actual panel dimensions and loaded fonts, and rejects zero-sized panels rather than producing an infinite viewBox.

### Original prose versus pixel equality

The user explicitly requires retaining the authored long descriptions, explanations and outros. The comparator skips long text in its text comparison, but still compares that prose in its whole-page pixel diff. It also compares the positions of facts and subsequent panels, which naturally move when the retained prose occupies a different number of lines. We have not copied reference prose, inserted artificial blank lines, changed comparison tolerances, or hidden those differences.

At the intermediate `reference-diff/overview-checkpoint/report.md` checkpoint, the dark/light pixel differences were respectively: wide 1.94% / 2.29%; medium 1.88% / 2.27%; tablet 2.56% / 2.98%; narrow 6.28% / 7.09%; phone 11.00% / 11.73%. These are failing results, not completion claims. In medium, 135/145 short text measurements matched: the ten remaining text differences were facts displaced by exactly 43px because the retained description is two lines shorter. Narrow/phone propagate a one-line prose difference into the packet panel. Additional non-prose refinements are ongoing; the final report must supersede these intermediate percentages.

### Measured implementation changes

- Every requested Iosevka face is self-hosted, including 400 and 500. Shared raw colors, text tints, typography, panel geometry, icons, device drawings and responsive visibility follow measurements from the live app.
- Network actors, packet rows, the drawer, progress indicators and sequence arrows retain their DOM identities during playback. The hidden sequence view follows the same events. Labels use shared collision avoidance, not viewport-specific offsets.
- HTTP playback is independent of capture timestamps: it lasts about 43.2 seconds at 1× while the capture spans 0.094 seconds. Route distance controls chip travel; the chip holds at a lane endpoint between hops. Camera interpolation takes 1100ms with cubic easing. URL typing, node entrances, text/panel slides, live-card changes and screen rendering use frame-driven state.
- Explicit waits belong to lesson data. Seeking reconstructs earlier logical events; its interruptible lead-in is tested. Overview rows fade away on PLAY, and an arriving reduced-motion capture clears any preview rows that are still fading. This prevents duplicate captures.
- Partial progress is persisted separately from completion and capped below a whole lesson until the outro. Replaying a completed lesson does not count it twice.
- All 78 short step subtitles and the two differing step titles use the live labels. Long step explanations, overview descriptions and outros remain authored prose. Existing native translations are retained as aliases for the updated short keys; they have not received a new native-speaker review.
- The production CSS build preserves authored unitless SVG dash offsets. Otherwise the minifier changes `-11` to `-11px`: visually equivalent, but a different keyframe serialization in the supplied recorder.

### Reproducible comparison limits

The full-page inspector check is not stable even when the reference is compared to itself. Running the unchanged phone-dark-inspector case with both URLs set to the reference produced **2.74%** differing pixels and **46/70** matching short text measurements. This is diagnostic evidence, not a passing result.

A separate before/after probe of one reference phone page recorded its camera changing from `-88.02 195.58 470.00 475.26` to `-81.36 187.77 470.00 475.26` during a full-page screenshot. The client label anchor changed from `(189.9, 480.1)` to `(172.0, 478.8)`. The viewport SVG box stayed 349.34×353.25px. The reference recomputes SVG bounds during capture; its screenshot is not simply a frozen rendering of the pre-capture viewport.

Initial lesson selection also depends on font readiness and asset loading. Separate reference recordings selected HTTP at approximately **819ms** and **1517ms**. Local self-hosted assets settle much sooner. No artificial network delay was added to make a particular recording pass.

The static comparator ignores the configured credit handles, but its motion recorder still tracks the reference handle as moving text. Original field notes also differ in the inspector. These effects, retained lesson prose and text-key reuse explain some reported mismatches; they do not explain every remaining animation difference. Exact CSS event counts, UI timing and some chip/device paths still fail the supplied motion oracle.

Matching the live light-theme tints also retains some of its low-contrast small text. Keyboard scrolling, visible focus, dialog focus management, inert backgrounds and reduced motion are maintained; no new Lighthouse accessibility score of 95 is claimed.

No stage is recorded as fully matched while its comparison still fails. The comparator's tolerances, cases and ignore list have not been relaxed. The reports below are failing evidence, not completion claims.

## Brag skill run (2026-11-07)

At the user's explicit request, installed latent-spaces/brag into `/Users/ouatilanas/.codex/skills/brag` using the system skill installer (Git fallback because the system Python certificate bundle rejected the ZIP request). Installed its four Hyperframes dependencies and created a local, editable 20-second video under `brag-output/`. The app itself gains no video runtime dependency. Captured only local educational UI, cropped out the personal credit, used bundled licensed music and CC0 effects, and enabled no narration or publishing.

Hyperframes 0.9.19 check passes: zero lint/runtime/layout/contrast/craft errors or warnings; 20/20 text contrast checks; 160 craft samples. Reviewed snapshots for all five scenes. Preview is served at `http://localhost:3017/#project/composition`. Final MP4 rendering is pending the explicit preview approval required by brag's `references/step-4-deliver.md`.

The new table renderer now waits for boot/font readiness before starting preview row entrances. This prevents hidden boot rows from retaining a stale “shown” state. Three independent recording contexts each confirmed seven visible HTTP preview rows, with no browser errors. Latest production build passes; main JS is 72.90 KB gzip and CSS 18.69 KB gzip (CSS remains above the approximate 15 KB target). All 23 unit/capture/checksum tests pass. These results do not mean the strict live-reference comparison passes.

The latest browser QA also passes: all ten viewport/theme combinations, all fourteen reference captures, all 187 packet inspector opens, keyboard seeking and field/byte hover linking, with no browser errors (`qa/corrections/browser.json`).

## Brag preview revision 2

After the user rejected the first preview, replaced its headline/side-screen layout with a product-first cut: four scenes, immediate network playback, a 1728×820 main screen, close sequence/inspector crops, real field/byte hover linking and a short branded outro. Original files are retained in `brag-output/revisions/v1/`. Captures use a 3360×1890 viewport with the app's existing zoom rules so enlarged UI remains sharp. The updated video preview uses the same localhost URL. This changes only the video artifacts, not the application's layout or lesson behavior. Final MP4 remains pending preview approval.

Revision 2 final check passes with zero errors or warnings, including 19/19 text contrast checks and 160 craft samples. Reviewed updated high-resolution snapshots of network playback, sequence, inspector hover linking and outro (`brag-output/snapshots-v2/`).

## Vercel production deployment

Deployed the compiled `dist/` app to the requested production address, `https://protocol-explorer-hamada.vercel.app/`, on Vercel project `protocol-explorer-hamada` (deployment `dpl_7cAwSAzxN3iXt9cc5AtsBjjih9Y3`). Video sources, QA captures and comparison artifacts were not uploaded. Public, unauthenticated access returns HTTP 200. The production build and all 23 tests pass. Live browser checks verify packet preview, inspector bytes, play/reset, sequence view, a lazy French locale, theme switching and phone overflow/drawer behavior, with no browser errors or failed HTTP requests. Evidence: `qa/vercel/deployment.json` and `qa/vercel/smoke.json`. Deployment does not imply the earlier strict live-reference comparison is fully passing.

## Longer platform tour

At the user's request, created a separate 100-second tour in `brag-output/tour-100s/`, preserving the earlier short edit. It shows all fourteen protocols through the picker and recorded lessons, followed by sequence view, field/byte inspection, playback controls and live progress, French/Arabic/RTL, themes and phone use. The outro names the deployed Vercel URL. The longer duration is an explicit user-directed exception to brag's short-video default. Hyperframes check passes without errors or warnings, with 27/27 text contrast checks and 26 layout samples. Reviewed 22 snapshots, including every lesson montage and feature chapter. Source captures contain no browser errors. Preview: `http://localhost:3018/#project/protocol-explorer-tour`. No application source or production deployment changed. Final MP4 still awaits approval of this revised preview under the skill's delivery workflow.

## Requested narration

Added user-requested English narration to the 100-second tour using Hyperframes' local Kokoro-82M workflow and af_heart voice. Installed its dependencies in a separate Python environment under the Hyperframes cache. All thirteen original chapter scripts are generated as editable WAV clips, normalized, checked for overruns and aligned to their chapters. Music ducks to .12 under speech and returns to .16 during longer gaps. The separate `brag-output/tour-100s/narration.wav` is exactly 100 seconds; peak speech level is −1.5 dBFS. The final composition check passes with no audio, runtime, layout or lint errors. No application code or Vercel deployment changed; this update affects the video preview and its audio artifacts. The final MP4 remains pending preview approval.

## Upgrade baseline and Phase A §1

The supplied upgrade audit's claim of a green visual baseline was not reproduced. Before any upgrade source changes, its unchanged comparator reported medium-dark-overview: 2.25% differing pixels, 135/145 exact text elements and 5 box issues. The user explicitly chose to fix existing parity failures before advancing beyond Phase A. Comparison scripts remain unchanged; baseline metrics are in `qa/upgrade/baseline-summary.json`.

Phase A §1 uses one `targetEl` helper for delegated handlers. Text nodes resolve to their parent element; document/window targets resolve to null. This preserves normal interaction while avoiding unsafe `.closest()`/`.matches()` calls. Tests: 24/24, plus the browser regression dispatching synthetic document and text-node events without errors.

Phase A §2 preserves the existing valid frame encoders and 187 table rows. Aggregate rows expose their constituent segments plus the original reassembled application stream. Inspector tabs replace the segment select, support brackets and arrow/Home/End navigation, and keep focus trapped after packet/tab changes. IPv4 IDs advance between segments, checksums are recomputed, and continuation/MTU notes describe the actual frame. The HTTPS server flight encodes 3,950 application bytes in 1,514/1,514/1,084-byte frames; these computed lengths are retained rather than the board's illustrative 3,920/1,058 values. Verified all segmented rows' bounds, payload reassembly, sequence continuity and checksums, plus browser tabs in light/dark at 1680 and 375 pixels.

Phase A §3 adds a missing-key/placeholder test for every locale and all 304 existing lesson text entries. Filled the missing completion label and new segment UI keys in all fourteen lazy locales, marked as drafts for review. Packet Info, protocol full names and decoded field names remain English; field explanations remain translated. Browser checks confirm this in French, Arabic/RTL and English. All 15 locale tests pass. The requested five-language comparator was attempted unchanged: English remains at the pre-existing 2.25% baseline; French reports 4.08%, then the supplied reporter crashes at line 314 (`b.missing` entries have `rect`, but the reporter reads `x.ref.rect`). Scripts were not edited. Remaining locale cases and parity repair require further diagnostics.

Phase A §5 uses the deployed `https://protocol-explorer-hamada.vercel.app/` origin for canonical, OG URL, OG/Twitter image URLs, robots and sitemap. The sitemap lists only the root: hash routes are client-side fragments, not independently crawlable pages. No per-route social metadata is claimed without prerendering.

Parity repair: the overview facts were displaced because the authored HTTP description was shorter than the reference, not because the panel spacing was wrong. Added one original sentence about pausing and inspecting packets, with translations in all locales. Measured paragraph heights now match at all five widths without viewport-specific CSS. The unchanged medium-dark-overview comparator improves from 135/145 exact text elements and five box issues to 145/145 and zero box issues; pixels remain 1.44% because paragraph glyphs, network framing and small icon details still differ. Prose is still original.
