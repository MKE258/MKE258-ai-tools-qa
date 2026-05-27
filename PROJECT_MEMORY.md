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
npm run check
npx wrangler deploy --dry-run
npx wrangler deploy
```

## Runtime Requirements

- Cloudflare Worker
- Wrangler
- Workers AI binding: `AI`
- Secret: `DEEPSEEK_API_KEY`
- Secret: `SERPER_API_KEY`

Do not commit secret values.

## Endpoints To Preserve

- `/ask`: AI streaming reply endpoint.
- `/image`: image generation endpoint.
- `/hot`: hot news endpoint.
- `/health`: health check endpoint.

Any UI optimization must preserve existing frontend calls to `/ask`, `/image`, and `/hot`.

## Current Production State

- Current deployed version: `00583233-f044-4320-ab7e-4d89a8ad5275`
- Verified rollback version: `ff550c9d-f24d-41fd-b85c-1d375be1759c`
- Backup commit: `92a4a9b2a693c7d58aeff1c971014a2902c8e4ee`

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
- Deployed admin/data source update and verified `/admin`, `/data/tools.json`, `/ask`, `/hot`, and `/image`.

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
