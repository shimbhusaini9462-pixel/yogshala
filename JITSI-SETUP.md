# Jitsi integration

Teachers can now start any assigned upcoming class at their discretion; scheduled times remain visible to students. Ended and cancelled classes cannot be restarted. Admins can set a direct HTTPS MP4/WebM waiting-video URL in the dashboard. Students see a muted autoplay loop while waiting, can enable sound themselves, and their page checks live status every 10 seconds. The waiting video stops when a Join button becomes available; live entry still requires the student's click and membership/assignment checks. No video URL has been supplied yet.

Current selected setup: public `meet.jit.si`, live classes only. Student access remains inside the website with guest video access; only the teacher completes the public provider's host sign-in. Recording controls, dashboard recording sections and public recording promises have been removed. No native app link is offered by the portal, and SDK deep linking is disabled. Private-server deployment templates are optional future preparation, not required for this selected setup.

Private-server preparation is now available in `deployment/VIDEO-SERVER.md`. The inline room obtains access through `api/videoAccess.php`, supports a configured server and signed room tokens, and uses Retry Connection rather than external-room links. No private server is deployed yet. Public-provider sign-in and branding remain until deployment.

Student and teacher dashboards use the official Jitsi IFrame API on `meet.jit.si`. The SDK loads only when an authorized user opens a class. No Jitsi API key is required for this public-service integration.

Student Join first checks membership and assigned batch through `api/joinClass.php`. Teacher Start verifies the assigned teacher and start-time window through `api/startClass.php`. A live teacher can reopen their room. Class names are generated on the server with random room identifiers.

The embedded room supplies the account display name, keeps the prejoin device check, mutes student microphones initially, and includes standard media controls. Leave Class disposes the iframe; it does not end the scheduled class for everyone. Teachers use End Class for the portal status. New-tab access remains available if embedding fails.

Public meet.jit.si requires host authentication to create rooms. Portal teacher access does not automatically grant Jitsi moderator status. The teacher must complete Jitsi's host sign-in. Portal role/membership checks protect portal links, but the public Jitsi service does not enforce Yogshala membership for someone who already has a room URL. Provider-level identity enforcement requires a separately configured JaaS/JWT or self-hosted authenticated deployment.

Before live use, test two devices: teacher Start, Jitsi host sign-in, student Join, camera/mic permissions, leaving/rejoining, and teacher End. Camera and microphone need HTTPS on a production domain; localhost is suitable for local testing. Jitsi handles its own media service; Yogshala's PHP server serves the portal and account APIs.

Automated checks: `node tests/video-class.test.cjs` and `npm.cmd test`. These verify integration behavior and account permissions, not a real audio/video call.

Official references:
- https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
- https://jitsi.org/blog/authentication-on-meet-jit-si/
