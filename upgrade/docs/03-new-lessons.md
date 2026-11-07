# 03 · New lessons (phase C)

Six lessons that the reference does not have. All data is in `data/new-lessons.json`; designs are boards
01–03 in `design/`. Each lesson uses the **same engine, table, inspector, step list, overview and summary**
as the existing 14 — no lesson-specific UI except the two small live cards in Ethernet and Wi-Fi.

## Drawer and tabs
Order: HTTP, HTTPS, **HTTP/3**, **WebSocket**, TCP, UDP, IP, **IPv6**, **Ethernet**, **Wi-Fi**, DNS, **DoH**,
DHCP, ICMP, SMTP, POP3, IMAP, FTP, SSH, TLS/SSL.
Tabs: ALL 20 · CORE 6 (+IPv6, Ethernet) · APPLICATION 9 (+HTTP/3, WebSocket) · SECURITY 5 (+Wi-Fi, DoH).
NEW badge until the lesson has been opened once (store in the progress object).

## How to use `new-lessons.json`
| Key | Use |
|---|---|
| `id, name, fullName, title, layer, category` | Same meaning as in `src/lessons/index.ts`. |
| `nodes` | Node ids and labels for the network view. New device kinds: `switch`, `desktop`, `ap`. |
| `legend` | `[colour, label]`; `null` colour = a note in the legend row (italic, like the reference). |
| `overview.facts`, `outro.facts` | Overview panel and lesson summary. |
| `steps[].title/desc/facts/packets` | Step list; `packets` are 0-based indices into `packets`. |
| `steps[].teach` | **Content brief, not final text.** Write the explanation yourself, 2–4 sentences, in the tone of the existing lessons. |
| `packets[]` | Row data (time, src, dst, proto, info, size, colour) plus `fields`: the layers and fields with notes to encode. |

Sizes are whole frames without FCS (Wi-Fi: 802.11 without radiotap). Build each packet with a real encoder
from the field list; the encoder's computed size is authoritative. If it differs from the table, update the
JSON and record why in `DECISIONS.md`. Then add the lesson to the packet test so the final values are locked.

## The six lessons

### HTTP/3 · Faster Web over QUIC (layer 7, application) — 12 packets, 6 steps
DNS HTTPS record (alpn=h3) → QUIC Initial padded to 1,200 B → server flight (Initial + Handshake) →
client Finished + GET together → streams with independent loss → 0-RTT on the next visit.
New colour use: teal for QUIC handshake. Compare chip "vs HTTPS: GET N ms sooner" is computed from both
lessons' packet times, not typed. Inspector: QUIC long header (form, version, DCID/SCID, token, length,
packet number), CRYPTO / PADDING / ACK / STREAM frames.

### WebSocket · A Live Two-Way Channel (layer 7, application) — 13 packets, 6 steps
TCP handshake → `GET /chat` with `Upgrade: websocket` and `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==` →
`101 Switching Protocols` with `Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` (verified) → masked
client frames, unmasked server frames → ping/pong → close frames then FIN. Legend note: real sites use
`wss://`. Inspector must show the mask key and the unmasked payload side by side.

### IPv6 · Addresses Without DHCP (layer 3, core) — 6 packets, 5 steps
DAD Neighbor Solicitation to the solicited-node address `ff02::1:ffe0:5d21` (verified) → Router
Solicitation → Router Advertisement (prefix 2001:db8:1::/64, RDNSS, source link-layer) → second DAD for
the global address → TCP SYN / SYN-ACK end to end. Notes explain that there is no NAT and no ARP.

### Ethernet · Frames on the Local Network (layer 2, core) — 5 packets, 5 steps
ARP broadcast → unicast reply (switch learns the port) → TCP between laptop and desktop on known ports →
a frame to a remote IP addressed to the router's MAC → step 5 (no packet) explains MAC table ageing.
New devices: **switch** (8 port LEDs), **desktop**. Live card: MAC address table (board 02).
Frames below 60 B are padded — show the padding as a field with a note.

### Wi-Fi · Joining a Wireless Network (layer 2, security) — 12 packets, 5 steps
Beacon → SAE commit/confirm both ways (WPA3, group 19) → association request/response → EAPOL 4-way
handshake → one CCMP-protected data frame. New device: **access point**; radio links as dotted curves.
Live card: "Joining HomeNet" stages (board 02). Never show a real password or PMK; use labelled examples.

### DoH · Private, Verified Lookups (layer 7, security) — 14 packets, 6 steps
Plain DNS query/response (what an observer sees) → TCP + TLS to `dns.example.net` (row 7 is multi-segment:
use segment tabs) → `POST /dns-query` (application/dns-message) → resolver's DNSSEC queries (DNSKEY, DS,
RRSIG) to the authoritative server → encrypted answer with AD bit → step 6 (no packet): what is still
visible (SNI, IP, timing).

## Quiz and glossary
`data/quiz.json` has three questions for **all 20** lessons (`q`, `options[4]`, `answer` index, `why`,
`packet` 1-based link). `data/glossary-en.json` has 40 terms. See `04-new-features.md`.

## Tests to add
- Packet test: 6 new lessons × all rows (time, src, dst, proto, info, size, colour).
- Bytes test: 0 uncovered bytes, every field has a note, checksums valid (IPv4, IPv6 pseudo-header, TCP,
  UDP, ICMPv6).
- WebSocket accept key and solicited-node address computed, not hard-coded.
