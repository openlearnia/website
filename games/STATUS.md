# Canvas games — checkpoint status

**Branch:** `feat/canvas-games`  
**Date:** 2026-07-23  
**Decision:** Pause further expansion. A dedicated Babylon.js horror game (`horror-ward/`) owns the large 3D narrative effort. This pack stays a small marketing/demo set.

## Shipped (keep)

| Route | Game | Stack | Notes |
|-------|------|-------|--------|
| `/games` | Hub | Astro | Cards, thumbs, nav + homepage link |
| `/games/cosmic-breaker` | Cosmic Breaker | Phaser **3.87** | 2D neon brick-breaker; HTML start/over overlays |
| `/games/ring-runner` | Ring Runner | Three.js | Small 3D ring-flight demo — **do not expand into horror epic** |
| `/games/horror-ward` | Horror Ward | Babylon.js | Phase 2 pipeline smoke — lighting/loader/FPS walk; gameplay Phase 3 |
| (shell) | Fullscreen | `src/games/fullscreen.ts` | Button + `F` + double-click; Fullscreen API with CSS fallback |

Also: SEO via `BaseLayout`, `public/games/ATTRIBUTION.md` (procedural assets), Games nav in header/footer.

## Deferred / out of scope here

- Extra mini-games beyond the 2 above
- Polishing Cosmic into a long campaign / asset-pack rewrite
- Any horror / story / Babylon work → **`horror-ward/`** (parallel)
- Live Wallpaper (already excluded)
- Production wrangler deploy + umbrella submodule bump (optional follow-up when this branch is merge-ready)

## Known gaps at checkpoint

- Cosmic Breaker: Phaser 4 was briefly pulled then pinned to 3.87 after a boot crash; last browser pass still needs a clean re-verify of in-game bricks after Play
- Automated browsers often block native `requestFullscreen`; CSS fallback (`is-css-fullscreen`) verified — native API expected under real user gesture
- Not merged to `website` main / not deployed in this checkpoint

## Local verify

```bash
cd website && npm run build && npx astro preview --port 4325
# open /games, /games/cosmic-breaker, /games/ring-runner
# Fullscreen button / F / Esc
```
