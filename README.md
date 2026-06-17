# Openlearnia Website

Astro marketing site for [openlearnia.com](https://openlearnia.com).

## Develop

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Deploy

Pushes to `main` deploy `dist/` to Cloudflare Pages via GitHub Actions (`.github/workflows/deploy.yml`). Required org secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`. Pages project name is in `wrangler.toml`.
