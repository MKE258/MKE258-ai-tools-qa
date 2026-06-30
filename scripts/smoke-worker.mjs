const worker = (await import("../dist/worker.js?smoke=" + Date.now())).default;
const origin = "https://tools.aitoolsguide.top";
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input) => {
  const url = String(input?.url || input);
  if (url === "https://36kr.com/feed" || url === "https://www.ithome.com/rss/") {
    return new Response(
      '<?xml version="1.0"?><rss><channel><item><title><![CDATA[AI 工具更新]]></title><link>https://example.com/ai-tools</link></item></channel></rss>',
      { headers: { "content-type": "application/rss+xml" } }
    );
  }
  return originalFetch(input);
};

const checks = [
  { path: "/", status: 200, type: "text/html" },
  { path: "/admin", status: 200, type: "text/html" },
  { path: "/data/tools.json", status: 200, type: "application/json" },
  { path: "/tools/chatgpt", status: 200, type: "text/html", includes: "ChatGPT" },
  { path: "/tools/kimi", status: 200, type: "text/html", includes: "Kimi" },
  { path: "/tools/not-a-real-tool", status: 404 },
  { path: "/sitemap.xml", status: 200, type: "application/xml", includes: "/tools/chatgpt" },
  { path: "/robots.txt", status: 200, type: "text/plain", includes: "Sitemap:" },
  { path: "/health", status: 200, type: "application/json", includes: '"ok":true' },
  { path: "/hot?tab=kr36", status: 200, type: "application/json", includes: "AI 工具更新" },
  {
    path: "/ask",
    init: { method: "POST", body: JSON.stringify({ question: "" }), headers: { "content-type": "application/json" } },
    status: 400,
    type: "application/json",
    includes: "问题不能为空"
  },
  {
    path: "/api/recommend",
    init: { method: "POST", body: JSON.stringify({ goal: "写文章", budget: "免费" }), headers: { "content-type": "application/json" } },
    status: 200,
    type: "application/json",
    includes: '"items"'
  },
  { path: "/api/auth/me", status: 200, type: "application/json", includes: '"user":null' },
  {
    path: "/api/events",
    init: { method: "POST", body: JSON.stringify({ type: "bad_event" }), headers: { "content-type": "application/json" } },
    status: 400,
    type: "application/json",
    includes: "不支持的事件类型"
  },
  { path: "/api/admin/stats", status: 500, type: "application/json", includes: "DB binding 未配置" },
  {
    path: "/image",
    init: { method: "POST", body: JSON.stringify({ prompt: "" }), headers: { "content-type": "application/json" } },
    status: 400,
    type: "application/json",
    includes: "提示词不能为空"
  }
];

const failures = [];

try {
  for (const check of checks) {
    const request = new Request(origin + check.path, check.init);
    const response = await worker.fetch(request, {});
    const text = await response.text();
    const type = response.headers.get("content-type") || "";
    if (response.status !== check.status) {
      failures.push(`${check.path}: expected status ${check.status}, got ${response.status}`);
    }
    if (check.type && !type.includes(check.type)) {
      failures.push(`${check.path}: expected content-type containing ${check.type}, got ${type || "(none)"}`);
    }
    if (check.includes && !text.includes(check.includes)) {
      failures.push(`${check.path}: response did not include ${check.includes}`);
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}

if (failures.length) {
  console.error(`Worker smoke test failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke tested ${checks.length} Worker routes`);
