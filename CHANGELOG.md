# Changelog

## 2026-05-27

- Rebuilt maintainable source for Cloudflare Worker `ai-tools-qa`.
- Preserved existing page content and frontend behavior.
- Preserved `/ask`, `/image`, and `/hot` endpoints.
- Added task-based tool entry panel.
- Added tool card metadata for price, access status, audience, and official site.
- Moved hot news lower in the tool directory so tool selection is the primary first-screen workflow.
- Verified production deployment:
  - Current version: `8acf718e-ab0e-4cab-82e9-0388321abe60`
  - Rollback version: `140e229d-d034-4304-923b-aa9c609bdcef`
- Fixed tool card layout follow-ups and removed duplicate card metadata pills.
- Improved `/admin` offline maintenance with tool search, validation summary, safer import errors, and escaped list output.
- Improved homepage and admin accessibility with visible focus states, clearer labels, keyboard-operable cards, and larger mobile touch targets.
- Refined the homepage visual system into a clearer tool-workbench style and improved the tool detail modal information hierarchy.
- Added `npm run validate:data` and wired it into `npm run check` to catch invalid or unsynced tool data before deployment.
- Added `npm run validate:html`, removed the captured Cloudflare Insights beacon, and wired HTML checks into `npm run check`.
- Added `npm run smoke:worker` and wired it into `npm run check` to verify built Worker routes before deployment.
- Added `npm run deploy:dry` to combine local gates and Wrangler dry-run before any real deployment.

## Unreleased

- Added D1 schema for real users, sessions, server-side favorites, recommendation sessions, and click/question events.
- Added GitHub OAuth account endpoints, server-side favorites API, recommendation API, and analytics event API.
- Added `/ask` question event logging when D1 is configured.
- Added local and remote D1 migration scripts.
- Hardened backend APIs with hashed sessions, event type allowlist, basic D1 rate limiting, input trimming, and a protected read-only stats endpoint.
- Connected homepage conversion flow to backend APIs: real login entry, server-side tool favorites, recommendation results, and tool/search/official-click analytics events.
- Removed the first-visit changelog popup and added primary plus mobile "let AI choose a tool" entry points.
- Expanded `/api/admin/stats` and added a protected read-only analytics dashboard tab to `/admin`.
- Added `tool_click` tracking for direct tool-card activation and surfaced tool-card click rankings in the admin dashboard.
- Added an event-count conversion funnel to the admin analytics dashboard.
- Added browser visitor IDs and a unique user/visitor conversion funnel to the admin analytics dashboard.
- Added date-range filtering to the admin analytics dashboard and stats API.
- Added CSV export for the loaded admin analytics dashboard data.
- Added recommendation-source attribution for AI recommendation result actions.
- Added recommendation-source tool rankings to the admin analytics dashboard.
