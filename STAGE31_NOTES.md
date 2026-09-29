# Saha 2.0 — Stage 31

## Implemented
- Persistent profile image selection from the user's device, stored locally and attached to room create/join/resume events.
- Player avatars propagated through server public state and displayed in non-team player cards/lists; explicit team-game layouts remain team-based.
- Room lobby opens collapsed by default; settings remain host-only, with a small floating room button. Host can kick players.
- QR endpoint now returns an actual PNG image so `<img src="/api/qr?...">` works instead of receiving a text Data URL.
- Reconnect/session UI remains compact; main homepage game cards keep their normal sizing.
- Champion scoring changed to 3 / 2 / 1 / 0 for individual placements and +2 to each member of a winning explicit team (and Mafia winning side) when automatic round results are available.
- Champion homepage entry from the unified game cards now enters directly into the Champion flow without an extra create-room form.
- Guess It content expanded across categories/difficulties to reduce repetition.
- Draw: added host-only pre-game setting controlling whether incorrect guesses are shown in chat. Correct guesses always show only “فلان عرف الإجابة!” without revealing the answer.
- Liar: visual refresh toward the Saha design system; removed its audio/animation effects.
- Mafia lobby now keeps role/settings controls host-only and collapsible via a floating settings button; player cards use profile images.

## Validation
- `node --check server.js` passed.
- Inline JavaScript extracted from HTML files passed `node --check`.
- `npm install --ignore-scripts --no-audit --no-fund` could not complete within the environment timeout, so live Socket.IO/two-device testing was not available.
