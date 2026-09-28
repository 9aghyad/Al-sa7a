# Stage 22 — Room Entry + Draw Connectivity Fix

- Fixed the Draw game entry/reconnect path so the player page explicitly waits for Socket.IO connection, resumes using the session token, and retries automatically.
- Draw now saves its session token locally and shows a clear connection state instead of getting stuck at an apparent connection failure.
- Server resume now sends the Draw state directly to the reconnecting socket as well as broadcasting the room state.
- Draw page reconnects after temporary network loss and provides a retry action for recoverable failures; finished rooms are not offered as reconnectable sessions.
- Removed the repeated room-code join box from the unified "Play Now" game entry screen. Joining an existing room remains available from the main home-page "انضمام لغرفة" button, as requested.
- Generated a fresh Stage 22 ZIP from the Stage 21 Draw project.
