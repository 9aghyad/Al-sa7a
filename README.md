# الساحة 2.0 — Stage 13: Unified Design System

This stage adds a shared visual system across the site and games.

## Included
- Shared `/shared/arena-ui.css` design system for panels, lobby/settings layouts, actions, TV mode, phone mode, focus states, responsive spacing and reduced-motion support.
- Shared connection indicator now reflects both browser network state and Socket.IO connection state.
- Connection indicator is injected once and updates automatically.
- Shared design stylesheet and connection behavior are included across existing HTML game pages.
- Homepage gets a compact unified Arena 2.0 top bar.
- No game room protocol was replaced; existing room/reconnect systems remain in place.

## Validation
- Syntax checks should be run with Node in an environment where dependencies are installed.
- This environment may not have `node_modules`, so live multi-device testing is not claimed.
