# Private Yogshala video server — prepared, not deployed

Required: a domain, public Linux VPS, DNS pointing `video.<your-domain>` at the VPS, HTTPS certificate and the official stable docker-jitsi-meet release. The website itself also needs public HTTPS hosting, including PHP/MySQL and its email helper. A local Windows computer is not the public server.

Use the official Docker deployment guide for release installation, directory permissions, Compose configuration and generated internal passwords. Merge `video-server.env.example` into that release's `.env`, replacing all example values. Open 80/TCP and 443/TCP for HTTPS and 10000/UDP for video. Verify the actual public IP configuration against the selected release.

Set JWT authentication, `JWT_ALLOW_EMPTY=0` and `ENABLE_GUESTS=0`: users must have the short-lived room-specific token issued by Yogshala. Do not configure anonymous guests. Copy `database/video-config.example.json` to the ignored `database/video-config.json` on the website server, using the same application ID/secret as the video server. The token subject must match the video deployment's expected XMPP domain (the official Docker sample uses `meet.jitsi`).

The website's `api/videoAccess.php` checks the logged-in user, live class, assigned batch, teacher ownership and student membership before issuing a signed token. Private-server tokens expire in 20 minutes. A signed moderator claim is included; **the server's token affiliation/moderation plugin must be configured and tested to enforce teacher/student moderator permissions**. JWT verification by itself must not be assumed to enforce that claim.

Apply `interface_config.js` to the private server configuration using the selected release's customization mechanism. Configure its own logo, page title, welcome/close pages, help links, device-prejoin text and any remaining provider labels; frontend flags alone are not a guarantee that every branding element is removed. Disable native app deep links in the server configuration too. The website has no external-room buttons and uses inline video with a Retry Connection button.

Test before switching real classes: teacher login starts a room with no provider login, authorized students enter using their existing Yogshala login, unauthenticated direct room links fail, expired memberships fail, students cannot become moderators, and all desktop/mobile video screens show Yogshala branding. Verify two-device audio/video, HTTPS camera/microphone access, reconnect and teacher End Class.

No domain/VPS has been supplied, so the current working service remains `meet.jit.si` and retains that service's host authentication/branding. The private settings are templates, not a deployed server. There are no paid purchases or external deployments in this change.

Official setup: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/
