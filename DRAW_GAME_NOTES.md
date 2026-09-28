# 🎨 ارسمها — Stage 21

Replaced the old «الصملة» card/entry with the new real-time drawing game.

## Modes
- 📱 جوال فقط
- 📺 شاشة + جوالات (display URL opens a live TV board)

## Styles
- 🎨 رسم عادي: one secret drawer per round.
- 👥 ارسموا سوا: two players receive the same secret and can draw on the same board together.

## Gameplay
- 2–20 players.
- 5/8/10/15/20 rounds.
- 30/45/60/90 second drawing timer.
- Secret word is sent only to the drawer(s).
- Live strokes synchronized through Socket.IO.
- Colors, brush size, undo, clear.
- Players see the live drawing on their own phones and submit guesses.
- Round result keeps the drawing visible with the answer underneath.
- Faster correct guesses score more.
- Reconnect uses the existing session-token room flow.
- Display mode has a dedicated live TV page.

## Verification
- `node --check server.js` passed.
- Inline JavaScript syntax checks passed for the home page and drawing pages.
- Full live Socket.IO test was not run because project dependencies are not installed in this runtime (`express` missing).
