# Stage 45 — Draw start / connected players fix

- Fixed Draw game start race on mobile/reconnect: the host socket is re-attached to the room before online-player validation.
- Re-synchronizes player socket IDs and online flags from active Socket.IO connections.
- Sends draw state directly to the starter after the round starts.
- Start errors now appear in the in-page status instead of an intrusive alert.
- Increased fallback timeout to 5 seconds and made the fallback message actionable.
