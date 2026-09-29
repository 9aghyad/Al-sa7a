# Stage 46 — Render startup + Draw room persistence fix

- Fixed Render startup sequencing: the HTTP/Socket.IO server now listens immediately, and Draw room restoration from Postgres runs asynchronously after `/health` is available.
- This prevents a slow/unavailable Postgres connection from keeping Render's web service from becoming healthy and being terminated during startup.
- Tightened Postgres connection/idle/statement timeouts.
- Draw room lazy restore on join/resume now queries Postgres directly with a bounded query timeout instead of waiting on the startup DB promise.
- Draw room restoration from Postgres is authoritative over the JSON session snapshot, preventing an older filesystem snapshot from overriding a newer Draw room state.
- Draw start counts players from the actual Socket.IO room and repairs stale socket IDs/online flags before checking the minimum player count.
- Syntax checked with `node --check server.js`.
