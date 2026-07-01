# Project Memory

## Project

- GitHub repository: `MKE258/MKE258-ai-tools-qa`
- Local source directory: `D:\Admin\Documents\我的AI自动工具\ai-tools-qa-source`
- Production URL: `https://tools.aitoolsguide.top/`
- Cloudflare Worker: `ai-tools-qa`

## Source Of Truth

Use this repository as the source of truth for all future work.

Standard workflow:

1. Edit source locally.
2. Run checks.
3. Commit changes.
4. Push to GitHub.
5. Deploy to Cloudflare only after checks pass.

Do not directly overwrite the live Worker without updating this repository.

## Commands

```powershell
npm run sync:data
npm run validate:data
npm run validate:html
npm run check
npm run deploy:dry
npx wrangler deploy
```

## Runtime Requirements

- Cloudflare Worker
- Wrangler
- Workers AI binding: `AI`
- D1 binding: `DB`
- Secret: `DEEPSEEK_API_KEY`
- Secret: `SERPER_API_KEY`
- Secret: `GITHUB_CLIENT_ID`
- Secret: `GITHUB_CLIENT_SECRET`
- Secret: `ADMIN_TOKEN`

Do not commit secret values.

## Endpoints To Preserve

- `/ask`: AI streaming reply endpoint.
- `/image`: image generation endpoint.
- `/hot`: hot news endpoint.
- `/health`: health check endpoint.
- `/api/auth/me`, `/api/auth/github/login`, `/api/auth/github/callback`, `/api/auth/logout`: account/session endpoints.
- `/api/favorites`: server-side favorites endpoint.
- `/api/recommend`: tool recommendation endpoint.
- `/api/events`: click/question analytics event endpoint.
- `/api/admin/stats`: read-only analytics endpoint protected by `ADMIN_TOKEN`.

Any UI optimization must preserve existing frontend calls to `/ask`, `/image`, and `/hot`.

## Current Production State

- Current deployed version: `9b2d277b-9cbe-4d53-b993-016392875f68`
- Verified rollback version: `6be1890a-7675-4e48-ba42-9dd2c3e541bf`
- Previous deployed version: `6be1890a-7675-4e48-ba42-9dd2c3e541bf`
- Backup commit: `4a2a141`

## Completed Work

- Rebuilt a maintainable source project from the live site.
- Preserved existing page content and frontend behavior.
- Preserved `/ask`, `/image`, and `/hot`.
- Added task-based tool selection.
- Added price, access status, audience, and official site metadata to tool cards.
- Moved hot news below the primary tool discovery workflow.
- Backed up source to GitHub.
- Added `data/tools.json` as a separate tool data source.
- Added `/admin` as a safe offline tool-data editor.
- Added `npm run sync:data` to sync `data/tools.json` into `public/index.html`.
- Added `npm run validate:data` to validate tool metadata and catch unsynced homepage data before build/deploy.
- Added `npm run validate:html` to catch invalid inline scripts, old Worker domains, and injected Cloudflare beacon remnants before build/deploy.
- Added `npm run smoke:worker` to exercise built Worker routes and content types without deploying.
- Added `npm run deploy:dry` to run all local gates plus Wrangler dry-run without deploying.
- Deployed admin/data source update and verified `/admin`, `/data/tools.json`, `/ask`, `/hot`, and `/image`.
- Added SEO tool detail pages under `/tools/:slug`.
- Added `/sitemap.xml` and `/robots.txt`.
- Verified `/tools/chatgpt`, `/tools/kimi`, `/sitemap.xml`, `/ask`, `/hot`, and `/image`.
- Fixed tool card action button overlap so `官网` and `详情` no longer cover the audience/best-for label.
- Removed the duplicate orange audience/best-for line from tool cards; the audience now appears once as a compact pill.
- Removed all metadata pills from tool cards; price, access, and audience data remain available in tool details/data.
- Improved `/admin` offline maintenance with current-category search, data validation summary, safer JSON import errors, and escaped list rendering.
- Improved homepage and admin accessibility with visible focus states, clearer labels, keyboard-operable cards, and larger mobile touch targets.
- Refined the homepage visual system into a clearer tool-workbench style and improved the tool detail modal information hierarchy.

## Safety Rules

- Before deploy, record current Cloudflare Worker version ID.
- After deploy, verify:
  - homepage returns `200`
  - `/ask` returns `text/event-stream`
  - `/hot` returns JSON
  - `/image` returns `image/png`
- Roll back immediately if any key endpoint fails.

## Notes

- The original Cloudflare source structure could not be exported directly, so this repository is a reconstructed maintainable source.
- The previous issue was caused by replacing the Worker with a static-only version. Avoid that pattern.
- Future optimization should be incremental and preserve old behavior by default.
- The admin page intentionally exports JSON instead of writing production data directly. Add authentication plus KV/D1 before enabling live writes.
- Account sessions store only SHA-256 session hashes in D1; never persist raw session tokens.
- Event writes are restricted to a fixed whitelist to keep analytics data clean.
- Anonymous analytics attribution uses a browser-local `ait_visitor_id`; logged-in users continue to be attributed by `user_id`.
- Admin stats support `?range=today|7d|30d|all`; the dashboard defaults to `7d`.
- Admin dashboard CSV export is client-side only and uses the already loaded stats payload.
- AI recommendation result actions use `source=recommendation` in analytics payloads and are surfaced in admin stats.
- Admin stats include recommendation-source action totals and tool rankings for `source=recommendation` events.
- Recommendation result impressions use `recommendation_impression`; recommendation CTR only includes rows with a non-empty `recommendationId` to avoid mixing older action-only events into CTR.
- Tool detail pages are conversion decision pages with quick fit information, fit/mismatch guidance, trial steps, related tools, and `source=tool_detail` analytics for ask/official-click CTAs.
- Admin stats separately surface `source=tool_detail` ask-tool and official-click rankings so detail-page SEO conversion can be monitored.
- Tool detail page views use `tool_detail_view`; admin stats combine detail views, detail ask clicks, and detail official clicks into detail-page conversion-rate rankings.
- Homepage first screen now uses a visible decision-workbench hero with AI selection, task filtering, search, and proof chips; tool detail pages use the same light decision-page visual language.
