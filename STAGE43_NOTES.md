# Stage 43 — Family Feud immediate answer + rounds/profile + Draw room loading

- Family Feud player answer lock now exposes `myPlayerId` per socket from server state.
- Answer UI opens optimistically on the same tap so the input is inserted/focused immediately; server remains authoritative for the 10-second lock.
- Only the winning requester keeps the editor; simultaneous requests are denied by server lock.
- Added host-only round-count controls in player lobby (3/5/10/15/20) with `player:setRounds`.
- Family player names are smaller and show Saha profile avatars; create/join/resume paths pass the profile avatar.
- Unified Saha family creation exposes round count and sends `rounds/maxRounds` plus profile avatar.
- Draw room `E###` join/resume now lazily restores the room from Postgres when it is not currently in memory, reducing false “room missing/ended” errors after a restart.
- Draw existing Postgres persistence remains enabled; render.yaml already declares DATABASE_URL.
- Server syntax and all inline browser scripts were syntax-checked successfully.
