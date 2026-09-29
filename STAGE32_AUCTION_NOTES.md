# Stage 32 — المزاد

Replaced the previous السوق gameplay with a server-authoritative multiplayer auction game using the existing room/socket system.

- Same room codes/persistence/reconnect infrastructure; no new room system.
- Game label changed from السوق to المزاد.
- Normal auction + secret auction + scheduled special double-points events.
- Automatic judge selected from players other than the auction winner.
- Server-side bid validation, timers, scoring, ability usage, and execution result.
- One-use insurance and one-use personal multiplier per player, persisted in room state.
- Modular question bank with accepted answers stored server-side.
- Host-only auction settings: rounds, question value, bid time, execution time, sound flag/sequence.
- Mobile RTL responsive auction UI with custom hammer visuals, bid animations, result states, and light sound hooks using existing site audio assets.
- Reconnect returns the current server state and ability usage/score state.
- Removed the old market buzz/vote gameplay from the active player flow.
