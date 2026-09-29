# Stage 38 — Family Feud player mode transplant/reference integration

- Used the supplied `1ف1.zip` Family Feud `server.js` + `public/index.html` as the behavioral/UI reference.
- Kept the Saha room/session/reconnect system instead of replacing it with the standalone 1ف1 room system.
- The existing Saha player-mode server already contains the reference `player:*` event flow; preserved its Saha enhancements (session tokens, reconnect, Champion hooks).
- Fixed the critical state mismatch: Family Feud player mode now exposes `questionBank` to the player client, so the reference UI can render the lobby's **ابدأ بسؤال عشوائي** button and start questions.
- Presenter + display modes remain intact.
