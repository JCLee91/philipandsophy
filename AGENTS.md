# Repository Guidelines

## Project Structure & Module Organization
- `index.html` houses the one-page layout, analytics scripts, and CTA markup; keep structural changes minimal and documented.
- `styles/main.css` contains all styling—use existing section comments when adding modules and keep selectors kebab-case (e.g., `.cta-button`).
- `image/` stores optimized `.webp` hero assets and the favicon; name additions descriptively (e.g., `PnS_schedule.webp`) and update preload tags.
- `robots.txt`, `sitemap.xml`, and `vercel.json` handle discoverability and deployment behaviour; review them whenever new routes or domains are introduced.

## Build, Test, and Development Commands
- `python3 -m http.server 4173` — quick local preview from the repository root.
- `npx serve@latest .` — Node-based static server that mirrors production headers more closely.
- `vercel dev` — replicate the Vercel edge environment before releasing (requires logged-in Vercel CLI).

## Coding Style & Naming Conventions
- HTML: 4-space indentation, lowercase tags, and semantic ordering of meta tags (SEO first, then scripts); keep third-party scripts grouped at the top.
- CSS: 4-space indentation, grouped rule blocks with blank lines between sections, and descriptive class names matching component intent.
- Assets: prefer `.webp` or `.png`, compress before committing, and keep file names title-cased with underscores for readability.

## Testing Guidelines
- No automated suite yet; run a manual regression covering desktop (≥1440px) and mobile (≤390px) layouts, CTA behaviour, and analytics beacons via browser dev tools.
- After content edits, validate HTML (`npx htmlhint index.html`) and CSS (`npx stylelint styles/main.css`) if the tools are available locally.
- Rebuild `sitemap.xml` when URLs change and confirm Lighthouse performance ≥90 on mobile before release.

## Commit & Pull Request Guidelines
- Follow the existing short, descriptive Korean commit style (e.g., `웹사이트 디자인 및 기능 개선 업데이트`); start with the area touched when relevant.
- Each PR should summarize changes, list manual checks performed, attach before/after screenshots for visual updates, and reference related tickets or Notion docs.
- Confirm deployment settings in `vercel.json` for routing changes and note any tracking-ID updates in the PR description.

## Deployment Notes
- Production deploys are triggered through Vercel; verify environment variables and domain mappings there before merge.
- Keep `canonical` and Open Graph tags aligned with the live domain, and update preload hints when swapping hero media.
