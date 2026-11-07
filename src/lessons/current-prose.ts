/** Original teaching text. Reference captions and technical rows live separately. */
export interface AuthoredLesson{overview:string;outro:string;steps:string[]}
export const authored:Record<string,AuthoredLesson>={
 websocket:{overview:'WebSocket turns an HTTP connection into a lasting channel for messages in both directions. Follow the upgrade, exchange live data, and close the channel cleanly.',outro:'The peers negotiated a message channel over a reliable byte stream. They exchanged application messages and control frames before closing the connection.',steps:[
 'The browser first opens a TCP connection to the server. WebSocket needs that ordered byte stream before its HTTP upgrade can begin.',
 'An HTTP request asks the server to switch protocols. A fresh challenge key lets the browser check that the response belongs to this upgrade.',
 'The server accepts with status 101 and a derived accept value. Both endpoints now interpret subsequent bytes as WebSocket frames.',
 'Either endpoint can send a message without waiting for a new HTTP request. Client frames are masked, and frame boundaries preserve message structure.',
 'A ping asks whether the peer is still responsive. The matching pong keeps application liveness separate from the underlying TCP connection.',
 'A close frame communicates the reason for ending the channel. The other endpoint acknowledges it before the transport is released.'
 ]},
 wifi:{overview:'Joining Wi-Fi combines network discovery, association and key establishment. Watch a station find an access point, complete WPA2 key negotiation, and send protected data.',outro:'The station discovered the network and established shared encryption keys. Later radio frames protect their payload while leaving enough header information for local delivery.',steps:[
 'An access point periodically advertises its network in beacon frames. A station can also probe for networks and read their advertised capabilities.',
 'The station authenticates at the wireless MAC layer and requests association. Association assigns local state, but it does not yet establish data-encryption keys.',
 'The access point supplies a fresh nonce and the station returns its own. Both derive pairwise keys from the shared secret, addresses and these challenges.',
 'The access point proves possession of the derived key and delivers group-key information. The station confirms receipt so protected traffic can begin.',
 'Data frames now carry encrypted payload and integrity protection. The wireless headers still identify radio endpoints and support retransmission.'
 ]},
 wpa3:{overview:'WPA3 replaces a captured-password guessing opportunity with an interactive password-authenticated exchange. Follow SAE, then see how its result feeds the familiar wireless key handshake.',outro:'SAE established a secret without transmitting the password. Association and the four-way handshake then installed the keys used for protected wireless traffic.',steps:[
 'The network advertises SAE as its authentication method. The station checks the advertised security capabilities before selecting the access point.',
 'Both peers send fresh scalar and group-element contributions. These values bind the exchange to the password without sending that password over the air.',
 'Each side confirms the shared result with an authenticator. A peer with a different password cannot produce the expected confirmation.',
 'The station associates and completes the four-way key handshake. Fresh nonces turn the SAE result into keys for this specific connection.',
 'An observed SAE transcript does not provide the same offline guessing test as a WPA2 handshake. Strong passwords and correct endpoint implementations still matter.'
 ]},
 portal:{overview:'A captive network can provide an address while withholding general internet access. Follow the operating system’s connectivity check, the login redirect, and the change after access is granted.',outro:'The portal changed the client’s access policy after the user accepted its terms. Connectivity checks can now receive their expected response instead of another login redirect.',steps:[
 'The client has joined the local network and received configuration. An IP address alone does not prove that ordinary internet access is allowed.',
 'The operating system requests a known connectivity-check resource. Its expected status or body helps distinguish unrestricted access from an interception page.',
 'The network returns a redirect toward its portal. The client opens a limited sign-in view instead of treating that response as the requested internet resource.',
 'The portal page explains the network’s access requirements. Its web resources travel through the access path the network permits before sign-in.',
 'The user submits the portal form or accepts the terms. The portal associates this action with the client’s current access session.',
 'A new connectivity check gets the expected result. The operating system can leave the captive state and allow normal browsing.'
 ]},
 proxy:{overview:'A forward proxy makes requests on a client’s behalf. Compare an ordinary proxied HTTP request with CONNECT, which creates a byte tunnel for an end-to-end TLS connection.',outro:'The proxy fetched cleartext HTTP resources directly and relayed protected HTTPS bytes through a tunnel. The location of TLS endpoints determines what content the proxy can read.',steps:[
 'The client is configured to use a proxy for web access. This changes the first connection destination without changing the resource the user requested.',
 'The client opens a transport connection to the proxy. The origin server is not the peer of this first TCP connection.',
 'The HTTP request names the full target URL. The proxy needs that authority and path to decide where to forward the request.',
 'The proxy opens its own connection toward the origin. It forwards the request using a separate transport conversation.',
 'The origin’s response returns through the proxy. The proxy relays the status, headers and body to the waiting client.',
 'For HTTPS, the client asks the proxy to CONNECT to a host and port. A successful response changes the connection into a transparent byte tunnel.',
 'The client negotiates TLS with the origin through that tunnel. The proxy can observe connection metadata but cannot read correctly protected application content.'
 ]},
 socks:{overview:'SOCKS5 relays transport connections without requiring the client’s application to speak HTTP. Follow method selection, destination addressing, and the resulting tunnel.',outro:'The SOCKS negotiation selected a method and opened the requested remote connection. Subsequent application bytes used that relay path without becoming SOCKS commands themselves.',steps:[
 'The client opens a TCP connection to its configured SOCKS proxy. Application traffic waits until the proxy negotiation finishes.',
 'The client lists authentication methods it supports. The proxy selects one method or rejects the proposed choices.',
 'A CONNECT request names the destination using an address or domain name and port. The proxy reports whether it established that remote connection.',
 'After success, bytes pass through the proxy in both directions. Any application encryption is negotiated by the endpoints above this relay layer.'
 ]},
 reverse:{overview:'A reverse proxy is the public endpoint in front of an application server. Trace where TLS ends and how the proxy forwards requests to its backend.',outro:'The public and backend connections are separate conversations. Encryption on one hop does not automatically protect the other, so deployment boundaries determine the exposure.',steps:[
 'The client reaches the service’s public address. That address belongs to the reverse proxy rather than the backend application process.',
 'The proxy authenticates itself and terminates the client’s TLS session. It can now inspect the decrypted HTTP request.',
 'The proxy forwards the request over a separate backend connection. If that connection is plaintext, the backend network must be trusted or otherwise protected.',
 'The application processes the request and returns its response. Its transport peer is the proxy, which may add routing or client-address metadata.',
 'The proxy wraps the response in the client-facing TLS session. The browser sees one secure origin even though the backend used another connection.',
 'TLS can end at the proxy, continue with a new backend TLS session, or pass through to the application. These choices change visibility, trust boundaries and operational responsibility.'
 ]},
 wireguard:{overview:'WireGuard carries IP packets inside authenticated encrypted UDP messages. Follow its compact key handshake and distinguish an inner web packet from the outer tunnel transport.',outro:'The tunnel protected inner packets between its configured peers. Traffic beyond the remote peer still follows the routing and application-security rules of that network.',steps:[
 'Peers are configured with identities and allowed address ranges. The configuration determines which destinations should enter the tunnel.',
 'The peers exchange fresh ephemeral contributions and authenticate their identities. The resulting session keys protect subsequent transport messages.',
 'The sender wraps an inner IP packet in a protected tunnel message. An outer UDP/IP header routes that message to the remote peer.',
 'The remote peer verifies and decrypts the message before forwarding its inner packet. The public web server sees the forwarded connection rather than the encrypted tunnel packet.',
 'The response follows the reverse route into the tunnel. The local peer removes the outer protection and delivers the inner response to the application.',
 'A small authenticated keepalive can preserve a NAT mapping during idle periods. It maintains reachability without carrying application content.'
 ]},
 ipsec:{overview:'IKEv2 negotiates security associations, and ESP protects the packets they carry. Follow NAT detection, authenticated key negotiation, and encapsulated traffic through an IPsec tunnel.',outro:'IKE established identities and keys while ESP carried the protected data. NAT traversal changed the outer transport without exposing the encrypted inner packet.',steps:[
 'The peers propose cryptographic algorithms and exchange public key contributions. Fresh nonces help derive unique keys for this negotiation.',
 'NAT detection reveals that addresses changed along the path. The peers can use UDP encapsulation so ESP traverses the mapping reliably.',
 'An authenticated exchange proves the configured identities. It also installs the child security association used to protect application traffic.',
 'An inner IP packet is encrypted and authenticated by ESP. Its outer headers route the tunnel message to the remote gateway.',
 'The gateway decapsulates, forwards and protects the returning traffic. Separate sequence counters help reject replayed tunnel packets.',
 'VPN protocols differ in negotiation, identity management and deployment requirements. The security boundary remains the pair of endpoints that decrypt the tunnel.'
 ]},
 quic:{overview:'QUIC combines secure connection setup and reliable streams over UDP. Follow an HTTP/3 exchange and see how a connection identifier can survive a network-address change.',outro:'QUIC protected independent application streams without relying on a TCP connection. Connection identifiers allowed the session to continue when the outer network path changed.',steps:[
 'The client chooses HTTP/3 for the requested origin. QUIC will carry the HTTP exchange over UDP rather than first opening a TCP byte stream.',
 'Initial packets begin TLS negotiation and advertise connection identifiers. Packet padding and protection follow QUIC’s rules even before final application keys exist.',
 'The server returns its selected parameters and encrypted handshake flight. Multiple datagrams can carry certificate data while packet acknowledgments track delivery.',
 'The client finishes authenticating the handshake and sends its HTTP request. QUIC streams provide ordering within a stream without making every stream wait behind unrelated data.',
 'The server returns the HTTP response on the chosen stream. QUIC packet numbers and stream offsets serve different roles in delivery and reassembly.',
 'A new network can change the client’s address or port. Connection identifiers and path validation let an existing connection move to that path safely.'
 ]},
 ipv6:{overview:'An IPv6 host can configure itself using local discovery and router advertisements. Watch duplicate-address detection, prefix discovery and neighbour lookup prepare the host for communication.',outro:'The host obtained a usable address and learned its router’s link address without an IPv4 ARP exchange. IPv6 neighbour discovery carried these local configuration messages.',steps:[
 'The host forms a link-local IPv6 address for communication on this network. Duplicate-address detection checks whether another interface already claims it.',
 'A router solicitation asks local routers to advertise their configuration. Its multicast destination reaches the devices responsible for this link.',
 'A router advertisement supplies a prefix, routing lifetime and other settings. The host uses those values according to the advertised configuration flags.',
 'The host forms a global address from the advertised prefix and its interface identifier. It tests that address before treating it as usable.',
 'Neighbour solicitation resolves the next-hop IPv6 address to a link address. A neighbour advertisement provides the mapping used for local frame delivery.',
 'The address and route are now ready for ordinary traffic. DHCPv6 may supply additional configuration in other networks, but this exchange did not require it.'
 ]},
 ntp:{overview:'Network Time Protocol estimates clock offset despite transit delay. Follow the four timestamps in a request and reply, then see why a system normally adjusts its clock gradually.',outro:'The client used both directions of the exchange to estimate delay and offset. Multiple samples and careful clock adjustment reduce the impact of jitter and sudden clock jumps.',steps:[
 'Independent clocks drift because their oscillators are imperfect. A client periodically compares its clock with a selected time source.',
 'The request records the client’s transmit time. The server will echo that value so the reply can be matched to this particular sample.',
 'The server includes its receive and transmit timestamps. The client adds its local arrival time to complete the four-timestamp observation.',
 'The client estimates transit delay and clock offset from the four timestamps. The estimate assumes that the two directions have roughly comparable delay.',
 'A clock discipline process combines repeated samples and adjusts the local clock. Gradual slewing avoids disruptive jumps while tracking the reference time.'
 ]},
 doh:{overview:'DNS over HTTPS carries DNS messages inside an authenticated web connection. Compare the visible plaintext lookup with a protected lookup, while separating privacy from the resolver’s trustworthiness.',outro:'HTTPS concealed the DNS message from observers on the path. The selected resolver still processed the question, and connection metadata remained visible outside encryption.',steps:[
 'A conventional DNS message exposes its question to observers along the path. The reply also reveals the returned records and their cache lifetimes.',
 'The client establishes an authenticated HTTPS connection to its configured resolver. Bootstrap information must already tell it how to reach that service.',
 'The DNS question is encoded inside the HTTPS application exchange. Network observers can see the connection but cannot read the protected query contents.',
 'The resolver returns a DNS response inside the protected connection. The client decodes the DNS records after HTTPS authentication and decryption.',
 'Encryption does not hide the resolver endpoint, traffic timing or every destination signal. The resolver itself still sees the names it is asked to resolve.'
 ]},
 dnssec:{overview:'DNSSEC adds signatures and a chain of trust to DNS data. Follow an answer’s signature through zone keys and parent delegations to a configured trust anchor.',outro:'Validation connected the answer’s signature to trusted key material. DNSSEC authenticates DNS data; it does not encrypt the question or its response.',steps:[
 'The client asks its resolver for the desired DNS record. A validating resolver can request the signatures needed to check the returned data.',
 'The answer arrives with a signature covering its record set. The signature must be checked against an appropriate zone key and its validity period.',
 'The resolver obtains the zone’s DNSKEY records. A valid signature alone is insufficient until the key’s authority is established.',
 'The parent zone supplies a DS record identifying the child’s trusted key. The resolver checks that delegation against the signed child key material.',
 'Validation follows signed delegations toward a configured trust anchor. A break in this chain prevents treating the response as securely authenticated.',
 'The resolver returns a validated result when all required checks succeed. A validation failure is different from an ordinary unsigned answer.'
 ]},
 radius:{overview:'Enterprise Wi-Fi separates radio access from central identity verification. Follow EAP-TLS through the access point and RADIUS server, then install the wireless session keys.',outro:'The authentication server verified the client and returned an access decision with key material. The access point used that result to establish encryption on the local wireless link.',steps:[
 'The access point asks the station to identify itself through EAP. Association alone does not authorize ordinary traffic on this enterprise network.',
 'The access point packages the EAP exchange in a RADIUS request. The authentication server decides which challenge or response should follow.',
 'EAP-TLS carries a TLS handshake inside authentication messages. Large TLS records may be fragmented across several EAP or RADIUS messages.',
 'The client supplies its certificate and proves possession of the matching private key. That proof authenticates the endpoint without sending its private key.',
 'Both TLS peers verify the handshake transcript and finish key establishment. Authentication succeeds only when the required identity checks complete.',
 'The RADIUS server returns acceptance and protected session key material. Attributes may also select a VLAN or other access policy for this user.',
 'The station and access point complete the four-way handshake. Fresh nonces derive the keys that protect this wireless association.',
 'A central identity system can grant, revoke and audit individual access. Its trust configuration and certificate validation remain essential to the result.'
 ]},
 smb:{overview:'SMB exposes remote files through authenticated network shares. Trace negotiation, authentication, share connection, and the open/read/close operations used to fetch a file.',outro:'The client authenticated a session, connected a share and used a file handle for its operations. Closing the handle releases file state while the larger session may remain available.',steps:[
 'The client opens a TCP connection to the file server’s SMB service. File operations will share this transport connection.',
 'The peers select a compatible SMB dialect and security capabilities. Negotiated limits bound later read and write operations.',
 'Session setup begins a challenge-response authentication exchange. The server’s challenge helps distinguish this attempt from a replay.',
 'The client returns an authentication response derived from its credentials. The server accepts or rejects the session before granting share access.',
 'A tree-connect request identifies the desired network share. The returned tree identifier scopes subsequent operations to that share.',
 'The client requests a file open with explicit access and sharing requirements. The server returns a file identifier for later reads and closure.',
 'The client requests bytes at a chosen file offset. The response carries the data and reports how much was returned.',
 'A close request releases the open file handle. Session and transport resources can remain open for later operations.'
 ]},
 modbus:{overview:'Modbus/TCP exposes device data and control operations as simple register and coil messages. Follow reads, writes and an exception, then examine the protocol’s lack of built-in access security.',outro:'The client read registers and wrote control values using request/reply transactions. Network placement and external security controls are critical because ordinary Modbus/TCP does not authenticate these operations.',steps:[
 'The controller opens a TCP connection to the device’s Modbus service. The connection provides delivery, not proof that the client is authorized.',
 'A read request names a starting register and a quantity. The response supplies consecutive 16-bit values in the requested range.',
 'A write operation changes a selected register value. The reply confirms the addressed register and value, rather than granting an additional authorization check.',
 'A coil write changes a boolean control output. The meaning of that bit depends on the device’s configured process model.',
 'An unsupported address or operation produces an exception response. The function code’s high bit marks the error and the exception code explains it.',
 'Classic Modbus/TCP has no application-layer encryption or identity check. A teaching network must distinguish protocol correctness from safe industrial access control.'
 ]},
 bgp:{overview:'BGP exchanges reachability between autonomous systems. Follow session establishment, route advertisement and withdrawal, then connect routing policy to the packets that follow it.',outro:'BGP distributed route information rather than carrying the application’s data. Policy and path attributes determined the selected next hop, while a withdrawal removed obsolete reachability.',steps:[
 'The internet consists of networks operated under different routing policies. BGP lets those autonomous systems advertise which prefixes they can reach.',
 'Two routers open a TCP session for BGP. The reliable transport carries routing messages independently of later user traffic.',
 'OPEN messages identify the speakers and advertise capabilities. KEEPALIVE messages confirm that the session remains responsive.',
 'An UPDATE advertises a reachable prefix and its path attributes. The receiving router applies policy before accepting or selecting that route.',
 'A router can advertise an accepted route to another peer under its export policy. The AS path records network traversal and helps prevent loops.',
 'Application packets follow the installed forwarding route. Their path depends on routing decisions, but they do not travel inside BGP messages.',
 'A withdrawal removes a previously advertised route. Peers must select another usable path or stop forwarding toward that destination.',
 'A route announcement is not automatically proof of address ownership. Origin validation and operational policy reduce the impact of incorrect or malicious announcements.'
 ]},
 webrtc:{overview:'WebRTC combines signaling, connectivity checks and media encryption to connect browsers. Trace candidate discovery, ICE path selection and DTLS key establishment before protected audio and video flow.',outro:'Signaling exchanged session descriptions, ICE selected a reachable path and DTLS established media keys. Protected media then used that path, with a relay available when direct connectivity was impossible.',steps:[
 'The browser joins an application’s signaling session. Signaling exchanges setup information but does not have to carry the eventual media stream.',
 'A STUN request discovers the address and port observed outside the local NAT. That mapped address becomes one of the connectivity candidates.',
 'An offer describes supported media, codecs and connectivity credentials. It also identifies certificate fingerprints used to authenticate the later DTLS exchange.',
 'The other browser returns compatible session parameters and its candidates. Both peers now have enough information to attempt connectivity checks.',
 'ICE checks candidate pairs using authenticated STUN messages. Successful checks identify a path that can carry traffic through the relevant NAT mappings.',
 'The selected peers negotiate DTLS and verify the signaled certificate fingerprints. Keying material from that handshake protects the media session.',
 'Audio and video use protected RTP packets with independent sequence and media timestamps. Arrival time can vary without changing the intended media timeline.',
 'A successful direct path avoids sending every media packet through the signaling server. If direct checks fail, a TURN relay can provide a reachable alternative.'
 ]}
};
