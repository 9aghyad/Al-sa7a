# Stage 29 — Homepage card sizing clarification

## User-requested correction
The previous Stage 28 interpreted “الألعاب غير المكتملة” as games marked “تطوير وتحسين”. The user meant the **saved/reconnect sessions** section that appears after leaving a game.

## Changes
- Main homepage game cards restored to the normal/older visual proportions instead of the compact upgrade-card style.
- All games, including games marked “🛠️ تطوير وتحسين”, now keep the same normal card dimensions so the homepage is visually consistent.
- Reconnect/session cards under “🟡 ألعابك غير المكتملة” are now intentionally small horizontal rectangles, with compact code/name/time/actions.
- Session cards remain separate from the main game-card sizing and do not affect the game grid.
- Desktop main cards: moderate 245px height; mobile main cards: ~215px height.
- Desktop session cards: ~96px height, responsive small grid.

## Verification
- `node --check server.js` passed.
- Inline JavaScript extracted from `public/index.html` passed `node --check`.
