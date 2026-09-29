# Stage 19 — Unified Live Room Experience

- Rebuilt the shared room lobby as a single polished live-room panel.
- Added a persistent connection indicator and live online/ready summaries.
- Reworked player cards with host badge, readiness, connection state, current-player highlight, and host kick control.
- Added a dedicated room-code card plus copy/share/QR actions.
- Added visual team cards with live members, captain badge, team switching, and host captain assignment for Family Feud, Bomb, and Faceoff.
- Added host management cards for room lock and max-player control.
- Kept game-specific settings and start actions inside the unified room panel.
- Added mobile responsive layout for players, teams, host controls, and settings.
- Kept existing Socket.IO room/reconnect/session architecture and server-side authorization.
- Added reconnect connection-state rendering and room sync on reconnect.
- All JavaScript files, including server.js and shared room lobby, pass node --check.
