# Changelog

## 2026-05-27

- Rebuilt maintainable source for Cloudflare Worker `ai-tools-qa`.
- Preserved existing page content and frontend behavior.
- Preserved `/ask`, `/image`, and `/hot` endpoints.
- Added task-based tool entry panel.
- Added tool card metadata for price, access status, audience, and official site.
- Moved hot news lower in the tool directory so tool selection is the primary first-screen workflow.
- Verified production deployment:
  - Current version: `6da45154-2515-469b-aae4-4b3050a44194`
  - Rollback version: `ff550c9d-f24d-41fd-b85c-1d375be1759c`
- Fixed tool card layout follow-ups and removed duplicate card metadata pills.
- Improved `/admin` offline maintenance with tool search, validation summary, safer import errors, and escaped list output.
- Added `npm run validate:data` and wired it into `npm run check` to catch invalid or unsynced tool data before deployment.
- Added `npm run validate:html`, removed the captured Cloudflare Insights beacon, and wired HTML checks into `npm run check`.
- Added `npm run smoke:worker` and wired it into `npm run check` to verify built Worker routes before deployment.
- Added `npm run deploy:dry` to combine local gates and Wrangler dry-run before any real deployment.
