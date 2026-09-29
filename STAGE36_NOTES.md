# Stage 36

- Family Feud player mode replaced with the supplied 1ف1 UI and wired to the Saha room/session system through compatibility player:* events.
- Fixed Million answer/lifeline interaction guards and button types.
- Fixed Liar/Draw/Auction start robustness and host start visibility.
- Draw start now reconciles live Socket.IO room membership before rejecting the start.
- Champion is limited to 1–2 games, shuffles selected games, and child games use a single game segment; Family Feud child uses 2 questions.
- Champion child completion auto-returns players when the child reaches finished.
