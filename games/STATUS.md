# Canvas games — checkpoint status

**Branch:** `feat/horror-ward`  
**Date:** 2026-07-23  
**Decision:** Horror Ward owns the large 3D narrative effort on **Three.js**. Mini-games stay a small marketing/demo set.

## Shipped (keep)

| Route | Game | Stack | Notes |
|-------|------|-------|--------|
| `/games` | Hub | Astro | Cards, thumbs, nav + homepage link |
| `/games/cosmic-breaker` | Cosmic Breaker | Phaser **3.87** | 2D neon brick-breaker |
| `/games/ring-runner` | Ring Runner | Three.js | Small 3D ring-flight demo — **do not expand into horror epic** |
| `/games/horror-ward` | Horror Ward | **Three.js** | Authored Kenney ward grid, Fast Play streaming, Anya + endings A–D |
| (shell) | Fullscreen | `src/games/fullscreen.ts` | Button + `F` + double-click; Fullscreen API with CSS fallback |

Also: SEO via `BaseLayout`, `public/games/ATTRIBUTION.md`, Games nav in header/footer.

## Deferred / out of scope here

- Extra mini-games beyond Cosmic + Ring Runner
- Polishing Cosmic into a long campaign
- Live Wallpaper
- Production wrangler deploy + umbrella submodule bump (optional)

## Local verify

```bash
cd website && npm run build && npx astro preview --port 4325
# open /games/horror-ward?autostart=1&safe=1&at=lobby
```
