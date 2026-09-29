# Stage 44 — Family Feud instant answer + rounds/player polish + Draw room lookup fix

- Family Feud written-answer UI now swaps the answer buttons for the text editor immediately on tap, before waiting for the Socket.IO lock response, and focuses/clicks the input to request the mobile keyboard immediately.
- The server still remains authoritative for the 10-second answer lock; the existing 10-second timer is preserved.
- Family Feud round selector now offers 1 / 3 / 5 / 10 / 15 / 20 / 30 rounds (host only, before the first question).
- Family Feud player names under teams and in the lobby were reduced in size while keeping the Arena profile avatar/name data.
- Draw room inspection now lazily restores active E*** rooms from Postgres before reporting an invalid/expired code. This prevents the home join flow from identifying the game as "ارسمها" but then failing because the in-memory room map was empty after a restart.
