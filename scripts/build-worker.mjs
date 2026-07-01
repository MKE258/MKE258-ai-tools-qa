import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
const toolsJson = await readFile(new URL("../data/tools.json", import.meta.url), "utf8");

const worker = `const HTML = ${JSON.stringify(html)};
const ADMIN_HTML = ${JSON.stringify(adminHtml)};
const TOOLS_JSON = ${JSON.stringify(toolsJson)};
const TOOLS_DATA = JSON.parse(TOOLS_JSON);
const ALLOWED_EVENT_TYPES = new Set(["tool_click", "official_click", "ask_tool", "question", "recommend", "favorite_add", "favorite_remove", "quiz_open", "search", "recommendation_impression", "tool_detail_view", "hero_variant_view", "home_cta_click"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, version: "source-2026-05-27" }, { headers: corsHeaders() });
    }

    if (url.pathname === "/admin") {
      return new Response(ADMIN_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname === "/data/tools.json") {
      return new Response(TOOLS_JSON, {
        headers: {
          ...corsHeaders(),
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname === "/api/auth/me") {
      return handleAuthMe(request, env);
    }

    if (url.pathname === "/api/auth/logout") {
      return handleLogout(request, env);
    }

    if (url.pathname === "/api/auth/github/login") {
      return handleGithubLogin(url, env);
    }

    if (url.pathname === "/api/auth/github/callback") {
      return handleGithubCallback(url, env);
    }

    if (url.pathname === "/api/favorites") {
      return handleFavorites(request, env);
    }

    if (url.pathname === "/api/recommend") {
      return handleRecommend(request, env);
    }

    if (url.pathname === "/api/events") {
      return handleEvent(request, env);
    }

    if (url.pathname === "/api/admin/stats") {
      return handleAdminStats(request, env);
    }

    if (url.pathname === "/robots.txt") {
      return new Response(renderRobots(url), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=3600"
        }
      });
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response(renderSitemap(url), {
        headers: {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=3600"
        }
      });
    }

    if (url.pathname.startsWith("/topics/")) {
      return handleTopicPage(url);
    }

    if (url.pathname.startsWith("/tools/")) {
      return handleToolDetail(url);
    }

    if (url.pathname === "/ask") {
      return handleAsk(request, env);
    }

    if (url.pathname === "/image") {
      return handleImage(request, env);
    }

    if (url.pathname === "/hot") {
      return handleHot(url);
    }

    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=120",
        "x-ai-tools-version": "source-2026-05-27"
      }
    });
  }
};

function handleToolDetail(url) {
  const slug = decodeURIComponent(url.pathname.replace(/^\\/tools\\//, "").replace(/\\/$/, ""));
  const found = findToolBySlug(slug);
  if (!found) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(renderToolPage(found, url), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600",
      "x-ai-tools-version": "source-2026-05-27"
    }
  });
}

function allTools() {
  return TOOLS_DATA.categories.flatMap((category) =>
    category.tools.map((tool) => ({ category, tool }))
  );
}

function findToolBySlug(slug) {
  const normalized = String(slug || "").toLowerCase();
  return allTools().find(({ tool }) =>
    toolSlug(tool.name) === normalized ||
    tool.name.toLowerCase() === normalized ||
    encodeURIComponent(tool.name) === slug
  );
}

const TOPICS = [
  {
    slug: "free-ai-tools",
    title: "免费 AI 工具推荐",
    description: "优先整理可免费开始试用的 AI 工具，适合学生、新手和低预算用户。",
    keywords: ["免费"],
    audience: "学生、新手、低预算用户",
    prompt: "我想找免费 AI 工具，请按写作、画图、视频、办公和编程场景推荐。"
  },
  {
    slug: "china-accessible-ai-tools",
    title: "国内可用 AI 工具推荐",
    description: "筛选更适合中国大陆用户访问和上手的 AI 工具，减少注册和访问试错。",
    keywords: ["国内直连"],
    audience: "中国大陆用户、职场团队",
    prompt: "我在中国大陆使用，请推荐国内可用、上手稳定的 AI 工具。"
  },
  {
    slug: "ai-writing-tools",
    title: "AI 写作和 PPT 工具推荐",
    description: "面向文章、营销文案、汇报材料和演示文稿的 AI 工具清单。",
    keywords: ["写作", "PPT", "文案", "演示", "办公"],
    audience: "内容创作者、运营、职场人",
    prompt: "我想写文章、做 PPT 或写营销文案，请推荐合适的 AI 工具。"
  },
  {
    slug: "ai-video-tools",
    title: "AI 视频工具推荐",
    description: "整理图生视频、文生视频、短视频剪辑和数字人相关 AI 工具。",
    keywords: ["视频", "剪辑", "数字人"],
    audience: "短视频创作者、营销团队、设计师",
    prompt: "我想做 AI 视频、短视频剪辑或数字人，请推荐合适工具。"
  },
  {
    slug: "chatgpt-alternatives",
    title: "ChatGPT 替代工具推荐",
    description: "从对话、长文档、联网搜索和国内访问角度对比 ChatGPT 替代选择。",
    keywords: ["对话", "搜索", "长文档", "国内直连"],
    audience: "需要多模型备选的 AI 用户",
    prompt: "我想找 ChatGPT 替代品，请按中文能力、联网搜索、长文档和访问方式推荐。"
  }
];

function findTopic(slug) {
  const normalized = String(slug || "").toLowerCase();
  return TOPICS.find((topic) => topic.slug === normalized);
}

function toolSlug(name) {
  const ascii = String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || encodeURIComponent(name);
}

function topicTools(topic) {
  const terms = topic.keywords.map((item) => String(item).toLowerCase());
  const matched = allTools()
    .map(({ category, tool }) => {
      const haystack = [category.name, tool.name, tool.desc, tool.q, tool.price, tool.audience, ...(tool.tags || []), ...(tool.filters || [])].join(" ").toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { category, tool, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, "zh-CN"));
  return matched.length ? matched.slice(0, 18) : allTools().slice(0, 12);
}

function handleTopicPage(url) {
  const slug = decodeURIComponent(url.pathname.replace(/^\\/topics\\//, "").replace(/\\/$/, ""));
  const topic = findTopic(slug);
  if (!topic) return new Response("Not found", { status: 404 });
  return new Response(renderTopicPage(topic, url), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600",
      "x-ai-tools-version": "source-2026-05-27"
    }
  });
}

function toolAccessStatus(tool) {
  const filters = tool.filters || [];
  if (filters.includes("国内直连")) return "国内直连";
  return "视地区和账号而定";
}

function buildToolQualityReport() {
  const rows = allTools().map(({ category, tool }) => {
    const tags = tool.tags || [];
    const filters = tool.filters || [];
    const checks = [
      { ok: Boolean(tool.name), label: "缺工具名称" },
      { ok: String(tool.desc || "").trim().length >= 32, label: "描述少于 32 字" },
      { ok: String(tool.q || "").trim().length >= 10, label: "提问语句太短" },
      { ok: String(tool.url || "").startsWith("http://") || String(tool.url || "").startsWith("https://"), label: "缺有效官网链接" },
      { ok: Boolean(tool.price), label: "缺价格信息" },
      { ok: String(tool.audience || "").trim().length >= 4, label: "适合人群太泛" },
      { ok: tags.length >= 2, label: "标签少于 2 个" },
      { ok: filters.length >= 2, label: "筛选条件少于 2 个" }
    ];
    const passed = checks.filter((item) => item.ok).length;
    const score = Math.round(passed / checks.length * 100);
    const missing = checks.filter((item) => !item.ok).map((item) => item.label);
    return {
      slug: toolSlug(tool.name),
      name: tool.name,
      category: category.name,
      score,
      status: score >= 90 ? "优秀" : score >= 75 ? "可用" : "需补充",
      missing
    };
  }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "zh-CN"));
  return {
    summary: {
      total: rows.length,
      excellent: rows.filter((item) => item.score >= 90).length,
      good: rows.filter((item) => item.score >= 75 && item.score < 90).length,
      needsWork: rows.filter((item) => item.score < 75).length
    },
    items: rows.slice(0, 30)
  };
}

function toolFitList(tool, category) {
  const items = [];
  if (tool.audience) items.push("适合" + tool.audience);
  if (tool.price) items.push("预算接受" + tool.price + "的用户");
  if ((tool.filters || []).includes("国内直连")) items.push("需要国内直连访问的人");
  if ((tool.tags || []).length) items.push("关注" + tool.tags.slice(0, 2).join("、") + "场景的人");
  if (!items.length) items.push("正在寻找" + category.name + "工具的人");
  return items.slice(0, 4);
}

function toolMismatchList(tool) {
  const items = [];
  if (!String(tool.price || "").includes("免费")) items.push("只想长期免费使用的人，建议先看同类免费工具");
  if (!(tool.filters || []).includes("国内直连")) items.push("必须稳定国内直连访问的人，需要先确认官网可用性");
  if ((tool.tags || []).includes("开发者")) items.push("完全不想接触配置或技术概念的新手，可能需要更简单的替代工具");
  if (!items.length) items.push("需求和" + (tool.audience || "目标用户") + "差异很大的人，建议先对比同类工具");
  return items.slice(0, 3);
}

function renderToolPage(found, url) {
  const { category, tool } = found;
  const related = category.tools
    .filter((item) => item.name !== tool.name)
    .slice(0, 6);
  const canonical = url.origin + "/tools/" + toolSlug(tool.name);
  const title = tool.name + " 使用指南 - AI工具教程助手";
  const description = tool.desc || (tool.name + " 工具介绍、适合人群、价格和替代工具。");
  const askQuestion = tool.q || (tool.name + " 怎么用，适合哪些场景？");
  const askHref = "/?tool=" + encodeURIComponent(tool.name) + "&q=" + encodeURIComponent(askQuestion);
  const officialUrl = tool.url || "/";
  const accessStatus = toolAccessStatus(tool);
  const fitList = toolFitList(tool, category);
  const mismatchList = toolMismatchList(tool);
  const allChips = (tool.tags || []).concat(tool.filters || []);
  const escapedName = escapeHtml(tool.name);
  const escapedSlug = escapeHtml(toolSlug(tool.name));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: category.name,
    description,
    url: tool.url || canonical,
    offers: {
      "@type": "Offer",
      price: tool.price || "查看官网",
      priceCurrency: "USD"
    }
  };

  return '<!doctype html><html lang="zh-CN"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(title) + '</title>' +
    '<meta name="description" content="' + escapeHtml(description) + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<script type="application/ld+json">' + JSON.stringify(jsonLd).replace(/</g, "\\\\u003c") + '</script>' +
    '<style>' +
    ':root{--bg:#f6f7f9;--panel:#fff;--text:#172033;--muted:#667085;--line:#d8dde7;--soft:#f1f5f9;--accent:#c96a2a;--accent-strong:#a84f16;--accent-bg:rgba(201,106,42,.09);--accent2:#0f766e;--focus:#2563eb;--shadow:0 18px 48px rgba(15,23,42,.08)}' +
    '*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#fff 0,#f8fafc 280px),linear-gradient(90deg,rgba(23,32,51,.035) 1px,transparent 1px),linear-gradient(180deg,rgba(23,32,51,.03) 1px,transparent 1px),var(--bg);background-size:auto,44px 44px,44px 44px,auto;color:var(--text);font-family:"Microsoft YaHei",system-ui,sans-serif;line-height:1.7}' +
    'main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}a{color:inherit;text-decoration:none}a:focus-visible,button:focus-visible{outline:3px solid rgba(37,99,235,.35);outline-offset:3px}' +
    '.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px}.back,.btn{min-height:44px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 14px;display:inline-flex;align-items:center;justify-content:center;font-weight:800}.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 12px 28px rgba(201,106,42,.22)}.btn.primary:hover{background:var(--accent-strong);border-color:var(--accent-strong)}.btn.secondary{background:#fff;color:var(--accent)}' +
    '.hero{background:linear-gradient(135deg,#fff 0,#f8fafc 58%,#fff7ed 100%);border:1px solid var(--line);border-radius:16px;padding:30px;margin-bottom:16px;display:grid;grid-template-columns:1fr 320px;gap:24px;box-shadow:var(--shadow);position:relative;overflow:hidden}.hero:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,var(--accent),var(--accent2),var(--focus))}.eyebrow{display:inline-flex;color:var(--accent);font-weight:850;margin-bottom:10px;background:var(--accent-bg);border:1px solid rgba(201,106,42,.18);border-radius:999px;padding:5px 10px;font-size:13px}.hero h1{margin:0 0 10px;font-size:42px;line-height:1.14;letter-spacing:0}.desc{color:var(--muted);font-size:17px;max-width:720px}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.side-panel{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.82);padding:17px}.side-panel h2{font-size:18px;margin:0 0 10px}.quick-list{display:grid;gap:8px}.quick-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e6eaf1;padding:9px 0}.quick-row:last-child{border-bottom:0}.quick-row b{color:var(--muted);font-size:13px}.quick-row span{text-align:right;font-weight:800}' +
    '.layout{display:grid;grid-template-columns:1fr 320px;gap:16px}.section{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:14px;box-shadow:0 10px 30px rgba(15,23,42,.04)}.section h2{margin:0 0 12px;font-size:22px;line-height:1.3}.section p{margin:0;color:var(--muted)}.decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.decision-box{border:1px solid var(--line);border-radius:12px;background:#fff;padding:15px}.decision-box strong{display:block;margin-bottom:8px}.decision-box ul,.steps{margin:0;padding-left:20px;color:#475467}.decision-box li,.steps li{margin:5px 0}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.chip{background:#eef2f7;border-radius:999px;padding:6px 10px;color:#475467;font-size:13px}.sticky{position:sticky;top:16px}.related{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.card{border:1px solid var(--line);border-radius:12px;background:#fff;padding:14px;min-height:96px}.card:hover{border-color:var(--accent);box-shadow:0 10px 24px rgba(15,23,42,.08)}.card p{margin:4px 0 0;color:var(--muted);font-size:13px}.note{font-size:13px;color:var(--muted);margin-top:12px}' +
    '@media(max-width:860px){main{width:min(100% - 28px,680px)}.hero,.layout{grid-template-columns:1fr}.hero{padding:22px}.hero h1{font-size:30px}.decision-grid,.related{grid-template-columns:1fr}.top{align-items:stretch;flex-direction:column}.top .btn,.top .back{width:100%}.sticky{position:static}}' +
    '</style></head><body><main>' +
    '<div class="top"><a class="back" href="/">返回工具导航</a><a class="btn secondary" href="/?tool=' + encodeURIComponent(tool.name) + '">在首页查看</a></div>' +
    '<section class="hero"><div><div class="eyebrow">' + escapeHtml(category.icon + " " + category.name) + '</div>' +
    '<h1>' + escapedName + '</h1><div class="desc">' + escapeHtml(description) + '</div>' +
    '<div class="hero-actions"><a class="btn primary" href="' + escapeHtml(askHref) + '" onclick="trackDetailEvent(\\'ask_tool\\')">问 AI 怎么用</a><a class="btn secondary" href="' + escapeHtml(officialUrl) + '" target="_blank" rel="noopener noreferrer" onclick="trackDetailEvent(\\'official_click\\')">去官网</a></div></div>' +
    '<aside class="side-panel" aria-label="工具关键信息"><h2>快速判断</h2><div class="quick-list">' +
    '<div class="quick-row"><b>价格</b><span>' + escapeHtml(tool.price || "查看官网") + '</span></div>' +
    '<div class="quick-row"><b>适合人群</b><span>' + escapeHtml(tool.audience || "通用用户") + '</span></div>' +
    '<div class="quick-row"><b>访问状态</b><span>' + escapeHtml(accessStatus) + '</span></div>' +
    '</div><div class="note">价格、额度和访问状态变化较快，正式使用前以官网为准。</div></aside></section>' +
    '<div class="layout"><div>' +
    '<section class="section"><h2>这个工具适合谁</h2><div class="decision-grid"><div class="decision-box"><strong>更适合</strong><ul>' +
    fitList.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
    '</ul></div><div class="decision-box"><strong>可能不适合</strong><ul>' +
    mismatchList.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
    '</ul></div></div><div class="chips">' +
    allChips.map((tag) => '<span class="chip">' + escapeHtml(tag) + '</span>').join('') +
    '</div></section>' +
    '<section class="section"><h2>推荐先这样试</h2><ol class="steps"><li>先用这个问题测试：' + escapeHtml(askQuestion) + '</li><li>如果输出质量合适，再去官网确认价格、额度和账号要求。</li><li>如果不匹配，继续对比下面的同类工具。</li></ol></section>' +
    '<section class="section"><h2>同类工具</h2><div class="related">' +
    related.map((item) => '<a class="card" href="/tools/' + toolSlug(item.name) + '"><strong>' + escapeHtml(item.name) + '</strong><p>' + escapeHtml(item.desc || "") + '</p></a>').join('') +
    '</div></section></div>' +
    '<aside class="side-panel sticky"><h2>下一步</h2><p>不确定是否适合时，先让 AI 按你的场景解释用法，再决定是否去官网注册。</p><div class="hero-actions"><a class="btn primary" href="' + escapeHtml(askHref) + '" onclick="trackDetailEvent(\\'ask_tool\\')">问 AI 怎么用</a><a class="btn secondary" href="/?tool=' + encodeURIComponent(tool.name) + '">查看首页卡片</a></div></aside></div>' +
    '</main>' +
    '<script>function detailVisitorId(){try{var id=localStorage.getItem("ait_visitor_id");if(!id){id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2));localStorage.setItem("ait_visitor_id",id)}return id}catch(e){return ""}}function trackDetailEvent(type){try{fetch("/api/events",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:type,visitorId:detailVisitorId(),toolName:"' + escapedName + '",toolSlug:"' + escapedSlug + '",source:"tool_detail"})})}catch(e){}}trackDetailEvent("tool_detail_view");</script>' +
    '</body></html>';
}

function renderTopicPage(topic, url) {
  const items = topicTools(topic);
  const canonical = url.origin + "/topics/" + topic.slug;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.title,
    description: topic.description,
    url: canonical
  };
  const cards = items.map(({ category, tool }) => {
    const askHref = "/?tool=" + encodeURIComponent(tool.name) + "&q=" + encodeURIComponent(tool.q || (tool.name + " 怎么用"));
    return '<article class="tool-card">' +
      '<div class="tool-meta">' + escapeHtml(category.icon + " " + category.name) + '</div>' +
      '<h2><a href="/tools/' + toolSlug(tool.name) + '">' + escapeHtml(tool.name) + '</a></h2>' +
      '<p>' + escapeHtml(tool.desc || "") + '</p>' +
      '<div class="chips">' +
      (tool.price ? '<span>' + escapeHtml(tool.price) + '</span>' : '') +
      (tool.audience ? '<span>适合' + escapeHtml(tool.audience) + '</span>' : '') +
      (tool.filters || []).slice(0, 2).map((tag) => '<span>' + escapeHtml(tag) + '</span>').join('') +
      '</div>' +
      '<div class="actions"><a class="primary" href="' + escapeHtml(askHref) + '">问 AI 怎么用</a><a href="/tools/' + toolSlug(tool.name) + '">看详情</a></div>' +
      '</article>';
  }).join('');
  const topicLinks = TOPICS.filter((item) => item.slug !== topic.slug)
    .map((item) => '<a href="/topics/' + item.slug + '">' + escapeHtml(item.title) + '</a>').join('');

  return '<!doctype html><html lang="zh-CN"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(topic.title) + ' - AI工具教程助手</title>' +
    '<meta name="description" content="' + escapeHtml(topic.description) + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<script type="application/ld+json">' + JSON.stringify(jsonLd).replace(/</g, "\\\\u003c") + '</script>' +
    '<style>' +
    ':root{--bg:#f6f7f9;--panel:#fff;--text:#172033;--muted:#667085;--line:#d8dde7;--accent:#c96a2a;--accent-strong:#a84f16;--accent-bg:rgba(201,106,42,.09);--shadow:0 18px 48px rgba(15,23,42,.08)}' +
    '*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#fff 0,#f8fafc 300px),var(--bg);color:var(--text);font-family:"Microsoft YaHei",system-ui,sans-serif;line-height:1.7}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid rgba(37,99,235,.35);outline-offset:3px}main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}.back,.top a{min-height:44px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 14px;display:inline-flex;align-items:center;font-weight:800}.hero{border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,#fff 0,#f8fafc 58%,#fff7ed 100%);padding:30px;margin-bottom:16px;box-shadow:var(--shadow);position:relative;overflow:hidden}.hero:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,var(--accent),#0f766e,#2563eb)}.kicker{display:inline-flex;color:var(--accent);font-weight:850;background:var(--accent-bg);border:1px solid rgba(201,106,42,.18);border-radius:999px;padding:5px 10px;font-size:13px}.hero h1{font-size:42px;line-height:1.14;margin:12px 0 10px}.hero p{font-size:17px;color:var(--muted);max-width:760px}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.btn{min-height:44px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 14px;font-weight:800}.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn.primary:hover{background:var(--accent-strong)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.tool-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:230px}.tool-card:hover{border-color:var(--accent);box-shadow:0 12px 28px rgba(15,23,42,.08)}.tool-meta{color:var(--accent);font-size:13px;font-weight:850}.tool-card h2{font-size:18px;line-height:1.3;margin:0}.tool-card p{margin:0;color:var(--muted);font-size:14px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}.chips span{border:1px solid var(--line);background:#f8fafc;border-radius:999px;color:#475467;font-size:12px;padding:4px 8px}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions a{min-height:40px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-weight:800;font-size:13px}.actions .primary{background:var(--accent);border-color:var(--accent);color:#fff}.related{margin-top:18px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:16px}.related h2{font-size:18px;margin:0 0 10px}.related-links{display:flex;flex-wrap:wrap;gap:8px}.related-links a{border:1px solid var(--line);border-radius:999px;padding:7px 10px;color:var(--muted)}@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.hero h1{font-size:32px}}@media(max-width:620px){main{width:min(100% - 28px,680px)}.grid{grid-template-columns:1fr}.top{align-items:stretch;flex-direction:column}.back,.top a{justify-content:center}.hero{padding:22px}.hero h1{font-size:28px}.tool-card{min-height:0}}' +
    '</style></head><body><main>' +
    '<div class="top"><a class="back" href="/">返回首页</a><a href="/sitemap.xml">站点地图</a></div>' +
    '<section class="hero"><div class="kicker">AI 工具专题</div><h1>' + escapeHtml(topic.title) + '</h1><p>' + escapeHtml(topic.description) + '</p>' +
    '<div class="hero-actions"><a class="btn primary" href="/?q=' + encodeURIComponent(topic.prompt) + '">让 AI 按我的场景推荐</a><a class="btn" href="/">回到工具导航</a></div></section>' +
    '<section class="grid">' + cards + '</section>' +
    '<section class="related"><h2>继续浏览专题</h2><div class="related-links">' + topicLinks + '</div></section>' +
    '</main></body></html>';
}

function renderSitemap(url) {
  const now = new Date().toISOString();
  const urls = [
    url.origin + "/",
    url.origin + "/admin",
    ...TOPICS.map((topic) => url.origin + "/topics/" + topic.slug),
    ...allTools().map(({ tool }) => url.origin + "/tools/" + toolSlug(tool.name))
  ];
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((loc) => '<url><loc>' + escapeXml(loc) + '</loc><lastmod>' + now + '</lastmod></url>').join('') +
    '</urlset>';
}

function renderRobots(url) {
  return 'User-agent: *\\nAllow: /\\nSitemap: ' + url.origin + '/sitemap.xml\\n';
}

async function handleAsk(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "请用 POST 提交问题" }, { status: 405, headers: corsHeaders() });
  }

  const limited = await checkRateLimit(request, env, "ask", 20, 60);
  if (limited) return limited;

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const question = String(body.question || "").trim().slice(0, 6000);
  if (!question) {
    return Response.json({ error: "问题不能为空" }, { status: 400, headers: corsHeaders() });
  }

  const currentUser = await getCurrentUser(request, env);
  await recordEvent(env, currentUser?.id || null, "question", {
    question: question.slice(0, 1000),
    has_history: Array.isArray(body.history) && body.history.length > 0
  });

  if (!env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500, headers: corsHeaders() });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const messages = [
    {
      role: "system",
      content: "你是 AI工具教程助手。用简洁中文回答，重点帮助用户选择、比较和使用 AI 工具。给具体步骤、适用场景、注意事项。不要编造实时价格或不可核实信息。"
    },
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) })),
    { role: "user", content: question.slice(0, 6000) }
  ];

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + env.DEEPSEEK_API_KEY
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.45,
      max_tokens: 1600,
      stream: true
    })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return Response.json(
      { error: text || "AI 服务暂时不可用" },
      { status: upstream.status || 502, headers: corsHeaders() }
    );
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders(),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no"
    }
  });
}

async function handleImage(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "请用 POST 提交提示词" }, { status: 405, headers: corsHeaders() });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return Response.json({ error: "提示词不能为空" }, { status: 400, headers: corsHeaders() });
  }

  if (!env.AI) {
    return Response.json({ error: "Workers AI binding 未配置" }, { status: 500, headers: corsHeaders() });
  }

  try {
    const result = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt: prompt.slice(0, 1800)
    });

    if (result instanceof Response) {
      const headers = new Headers(result.headers);
      headers.set("content-type", headers.get("content-type") || "image/png");
      headers.set("cache-control", "no-store");
      return new Response(result.body, { status: result.status, headers });
    }

    if (result instanceof ReadableStream || result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
      return new Response(result, {
        headers: {
          ...corsHeaders(),
          "content-type": "image/png",
          "cache-control": "no-store"
        }
      });
    }

    if (result?.image) {
      return new Response(base64ToBytes(result.image), {
        headers: {
          ...corsHeaders(),
          "content-type": "image/png",
          "cache-control": "no-store"
        }
      });
    }
  } catch (error) {
    return Response.json({ error: "图片生成失败" }, { status: 502, headers: corsHeaders() });
  }

  return Response.json({ error: "图片生成服务返回了未知格式" }, { status: 502, headers: corsHeaders() });
}

async function handleHot(url) {
  const tab = url.searchParams.get("tab") || "36kr";
  const feedUrl = tab === "ithome"
    ? "https://www.ithome.com/rss/"
    : "https://36kr.com/feed";

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 ai-tools-qa"
      },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    const xml = await res.text();
    const items = parseRss(xml).slice(0, 20);
    return Response.json({ items }, {
      headers: {
        ...corsHeaders(),
        "cache-control": "public, max-age=300"
      }
    });
  } catch {
    return Response.json({ items: [] }, { headers: corsHeaders() });
  }
}

function parseRss(xml) {
  const items = [];
  const itemPattern = /<item[\\s\\S]*?<\\/item>/gi;
  const matches = xml.match(itemPattern) || [];
  for (const item of matches) {
    const title = decodeXml(firstTag(item, "title"));
    const url = decodeXml(firstTag(item, "link"));
    if (title && url) items.push({ title, url, heat: "" });
  }
  return items;
}

function firstTag(xml, tag) {
  const match = xml.match(new RegExp("<" + tag + "[^>]*>([\\\\s\\\\S]*?)<\\\\/" + tag + ">", "i"));
  if (!match) return "";
  return match[1].replace(/^<!\\[CDATA\\[/, "").replace(/\\]\\]>$/, "").trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

async function handleAuthMe(request, env) {
  const user = await getCurrentUser(request, env);
  return Response.json({ user }, { headers: corsHeaders() });
}

async function handleLogout(request, env) {
  const sessionToken = parseCookies(request.headers.get("cookie")).ait_session;
  if (env.DB && sessionToken) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await hashToken(sessionToken)).run();
  }
  return Response.json(
    { ok: true },
    { headers: { ...corsHeaders(), "set-cookie": "ait_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax" } }
  );
}

function handleGithubLogin(url, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return Response.json({ error: "GITHUB_CLIENT_ID 未配置" }, { status: 500, headers: corsHeaders() });
  }

  const redirectUri = url.origin + "/api/auth/github/callback";
  const next = safeNextPath(url.searchParams.get("next") || "/");
  const state = btoa(JSON.stringify({ next, nonce: crypto.randomUUID() })).replace(/=+$/, "");
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "read:user user:email");
  authUrl.searchParams.set("state", state);
  return Response.redirect(authUrl.toString(), 302);
}

async function handleGithubCallback(url, env) {
  if (!env.DB) {
    return Response.json({ error: "DB binding 未配置" }, { status: 500, headers: corsHeaders() });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return Response.json({ error: "GitHub OAuth secret 未配置" }, { status: 500, headers: corsHeaders() });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return Response.json({ error: "缺少 GitHub code" }, { status: 400, headers: corsHeaders() });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: url.origin + "/api/auth/github/callback"
    })
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    return Response.json({ error: "GitHub 登录失败" }, { status: 502, headers: corsHeaders() });
  }

  const ghUserRes = await fetch("https://api.github.com/user", {
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": "Bearer " + tokenData.access_token,
      "user-agent": "ai-tools-qa"
    }
  });
  const ghUser = await ghUserRes.json().catch(() => ({}));
  if (!ghUserRes.ok || !ghUser.id) {
    return Response.json({ error: "获取 GitHub 用户失败" }, { status: 502, headers: corsHeaders() });
  }

  const userId = "github:" + ghUser.id;
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO users (id, provider, provider_user_id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(provider, provider_user_id) DO UPDATE SET email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at"
  ).bind(userId, "github", String(ghUser.id), ghUser.email || "", ghUser.name || ghUser.login || "", ghUser.avatar_url || "", now, now).run();

  const sessionToken = crypto.randomUUID() + "." + crypto.randomUUID();
  const sessionId = await hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run();

  const state = decodeState(url.searchParams.get("state"));
  const next = safeNextPath(state?.next || "/");
  return new Response(null, {
    status: 302,
    headers: {
      "location": next,
      "set-cookie": "ait_session=" + sessionToken + "; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax"
    }
  });
}

async function handleFavorites(request, env) {
  if (!env.DB) {
    return Response.json({ error: "DB binding 未配置" }, { status: 500, headers: corsHeaders() });
  }
  const limited = await checkRateLimit(request, env, "favorites", 60, 60);
  if (limited) return limited;
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  if (request.method === "GET") {
    const rows = await env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
      .bind(user.id)
      .all();
    return Response.json({ items: rows.results || [] }, { headers: corsHeaders() });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const toolName = String(body.toolName || body.name || "").trim().slice(0, 120);
  const toolSlugValue = String(body.toolSlug || body.slug || toolSlug(toolName)).trim().slice(0, 160);
  const source = limitText(body.source, 80);
  const recommendationId = limitText(body.recommendationId, 120);
  if (!toolName || !toolSlugValue) {
    return Response.json({ error: "缺少工具名称" }, { status: 400, headers: corsHeaders() });
  }

  if (request.method === "POST") {
    await env.DB.prepare("INSERT OR REPLACE INTO favorites (user_id, tool_slug, tool_name) VALUES (?, ?, ?)")
      .bind(user.id, toolSlugValue, toolName)
      .run();
    await recordEvent(env, user.id, "favorite_add", { tool_slug: toolSlugValue, tool_name: toolName, source, recommendationId });
    return Response.json({ ok: true }, { headers: corsHeaders() });
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND tool_slug = ?")
      .bind(user.id, toolSlugValue)
      .run();
    await recordEvent(env, user.id, "favorite_remove", { tool_slug: toolSlugValue, tool_name: toolName, source });
    return Response.json({ ok: true }, { headers: corsHeaders() });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
}

async function handleRecommend(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "请用 POST 获取推荐" }, { status: 405, headers: corsHeaders() });
  }
  const limited = await checkRateLimit(request, env, "recommend", 30, 60);
  if (limited) return limited;

  let body = {};
  try { body = await request.json(); } catch {}
  const input = {
    goal: limitText(body.goal, 300),
    role: limitText(body.role, 120),
    budget: limitText(body.budget, 80),
    platform: limitText(body.platform, 80),
    input: limitText(body.input, 600),
    variant: limitText(body.variant, 80),
    visitorId: limitText(body.visitorId, 120),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 12).map((tag) => limitText(tag, 60)).filter(Boolean) : []
  };
  const text = [
    input.goal,
    input.role,
    input.budget,
    input.platform,
    input.input,
    ...input.tags
  ].filter(Boolean).join(" ").toLowerCase();

  const scored = allTools()
    .map(({ category, tool }) => {
      const haystack = [category.name, tool.name, tool.desc, tool.q, tool.price, tool.audience, ...(tool.tags || []), ...(tool.filters || [])].join(" ").toLowerCase();
      const score = scoreTool(text, haystack, tool);
      return { category: category.name, icon: category.icon, tool, slug: toolSlug(tool.name), score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => ({
      name: item.tool.name,
      slug: item.slug,
      category: item.category,
      icon: item.icon,
      desc: item.tool.desc,
      url: item.tool.url,
      price: item.tool.price,
      audience: item.tool.audience,
      reason: buildRecommendReason(text, item.tool),
      bestFor: buildRecommendBestFor(text, item.tool, item.category),
      caution: buildRecommendCaution(text, item.tool),
      nextStep: buildRecommendNextStep(item.tool),
      match: Math.min(99, Math.max(62, Math.round(item.score * 11 + 58)))
    }));

  const fallback = scored.length ? scored : allTools().slice(0, 6).map(({ category, tool }) => ({
    name: tool.name,
    slug: toolSlug(tool.name),
    category: category.name,
    icon: category.icon,
    desc: tool.desc,
    url: tool.url,
    price: tool.price,
    audience: tool.audience,
    reason: "通用能力强，适合作为默认入门工具",
    bestFor: buildRecommendBestFor(text, tool, category.name),
    caution: buildRecommendCaution(text, tool),
    nextStep: buildRecommendNextStep(tool),
    match: 68
  }));

  const user = await getCurrentUser(request, env);
  const result = { items: fallback };
  if (env.DB) {
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO recommendation_sessions (id, user_id, input_json, result_json) VALUES (?, ?, ?, ?)")
      .bind(id, user?.id || null, JSON.stringify(input), JSON.stringify(result).slice(0, 8000))
      .run();
    await recordEvent(env, user?.id || null, "recommend", { recommendation_id: id, visitorId: input.visitorId, variant: input.variant, input });
    result.id = id;
  }

  return Response.json(result, { headers: corsHeaders() });
}

async function handleEvent(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "请用 POST 上报事件" }, { status: 405, headers: corsHeaders() });
  }
  const limited = await checkRateLimit(request, env, "events", 120, 60);
  if (limited) return limited;
  let body = {};
  try { body = await request.json(); } catch {}
  const type = String(body.type || "").trim();
  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return Response.json({ error: "不支持的事件类型" }, { status: 400, headers: corsHeaders() });
  }
  if (!env.DB) {
    return Response.json({ error: "DB binding 未配置" }, { status: 500, headers: corsHeaders() });
  }
  const user = await getCurrentUser(request, env);
  await recordEvent(env, user?.id || null, type, body);
  return Response.json({ ok: true }, { headers: corsHeaders() });
}

async function handleAdminStats(request, env) {
  if (!env.DB) {
    return Response.json({ error: "DB binding 未配置" }, { status: 500, headers: corsHeaders() });
  }
  if (!env.ADMIN_TOKEN || request.headers.get("authorization") !== "Bearer " + env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
  }

  const range = adminStatsRange(new URL(request.url));
  const eventWhere = range.since ? " WHERE created_at >= ?" : "";
  const eventAnd = range.since ? " AND created_at >= ?" : "";
  const favoriteWhere = range.since ? " WHERE created_at >= ?" : "";
  const recommendationWhere = range.since ? " WHERE created_at >= ?" : "";
  const userWhere = range.since ? " WHERE created_at >= ?" : "";
  const bind = (statement, params = []) => params.length ? statement.bind(...params) : statement;

  const [topTools, eventTypes, totals, funnel, uniqueFunnel, favoriteTools, searchTerms, toolClicks, askTools, officialClicks, recommendationActions, recommendationTools, recommendationCtr, detailAskTools, detailOfficialClicks, detailConversion, homeCtaActions, heroVariantStats, recentEvents] = await Promise.all([
    bind(env.DB.prepare(
      "SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"
    ), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT type, COUNT(*) AS count FROM events" + eventWhere + " GROUP BY type ORDER BY count DESC"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM users" + userWhere + ") AS users, (SELECT COUNT(*) FROM favorites" + favoriteWhere + ") AS favorites, (SELECT COUNT(*) FROM recommendation_sessions" + recommendationWhere + ") AS recommendations, (SELECT COUNT(*) FROM events" + eventWhere + ") AS events"
    ), range.since ? [range.since, range.since, range.since, range.since] : []).first(),
    bind(env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM events WHERE type = 'search'" + eventAnd + ") AS searches, (SELECT COUNT(*) FROM events WHERE type = 'quiz_open'" + eventAnd + ") AS quiz_opens, (SELECT COUNT(*) FROM recommendation_sessions" + recommendationWhere + ") AS recommendations, (SELECT COUNT(*) FROM events WHERE type = 'tool_click'" + eventAnd + ") AS tool_clicks, (SELECT COUNT(*) FROM events WHERE type = 'ask_tool'" + eventAnd + ") AS ask_tools, (SELECT COUNT(*) FROM events WHERE type = 'favorite_add'" + eventAnd + ") AS favorite_adds, (SELECT COUNT(*) FROM events WHERE type = 'official_click'" + eventAnd + ") AS official_clicks"
    ), range.since ? [range.since, range.since, range.since, range.since, range.since, range.since, range.since] : []).first(),
    bind(env.DB.prepare(
      "SELECT (SELECT COUNT(DISTINCT COALESCE(user_id, json_extract(payload_json, '$.visitorId'))) FROM events WHERE type IN ('search', 'quiz_open', 'recommend') AND COALESCE(user_id, json_extract(payload_json, '$.visitorId')) IS NOT NULL" + eventAnd + ") AS intent, (SELECT COUNT(DISTINCT COALESCE(user_id, json_extract(payload_json, '$.visitorId'))) FROM events WHERE type = 'tool_click' AND COALESCE(user_id, json_extract(payload_json, '$.visitorId')) IS NOT NULL" + eventAnd + ") AS tool_clicks, (SELECT COUNT(DISTINCT COALESCE(user_id, json_extract(payload_json, '$.visitorId'))) FROM events WHERE type = 'ask_tool' AND COALESCE(user_id, json_extract(payload_json, '$.visitorId')) IS NOT NULL" + eventAnd + ") AS ask_tools, (SELECT COUNT(DISTINCT COALESCE(user_id, json_extract(payload_json, '$.visitorId'))) FROM events WHERE type = 'favorite_add' AND COALESCE(user_id, json_extract(payload_json, '$.visitorId')) IS NOT NULL" + eventAnd + ") AS favorite_adds, (SELECT COUNT(DISTINCT COALESCE(user_id, json_extract(payload_json, '$.visitorId'))) FROM events WHERE type = 'official_click' AND COALESCE(user_id, json_extract(payload_json, '$.visitorId')) IS NOT NULL" + eventAnd + ") AS official_clicks"
    ), range.since ? [range.since, range.since, range.since, range.since, range.since] : []).first(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM favorites" + (range.since ? " WHERE created_at >= ?" : "") + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare(
      "SELECT json_extract(payload_json, '$.keyword') AS keyword, COUNT(*) AS count FROM events WHERE type = 'search' AND json_extract(payload_json, '$.keyword') IS NOT NULL" + eventAnd + " GROUP BY keyword ORDER BY count DESC LIMIT 20"
    ), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'tool_click' AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'ask_tool' AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'official_click' AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT type, COUNT(*) AS count FROM events WHERE json_extract(payload_json, '$.source') = 'recommendation' AND type IN ('ask_tool', 'official_click', 'favorite_add')" + eventAnd + " GROUP BY type ORDER BY count DESC"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE json_extract(payload_json, '$.source') = 'recommendation' AND type IN ('ask_tool', 'official_click', 'favorite_add') AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, SUM(CASE WHEN type = 'recommendation_impression' THEN 1 ELSE 0 END) AS impressions, SUM(CASE WHEN type IN ('ask_tool', 'official_click', 'favorite_add') THEN 1 ELSE 0 END) AS actions FROM events WHERE tool_slug IS NOT NULL AND json_extract(payload_json, '$.recommendationId') IS NOT NULL AND json_extract(payload_json, '$.recommendationId') != '' AND (type = 'recommendation_impression' OR (json_extract(payload_json, '$.source') = 'recommendation' AND type IN ('ask_tool', 'official_click', 'favorite_add')))" + eventAnd + " GROUP BY tool_slug, tool_name HAVING impressions > 0 ORDER BY actions * 1.0 / impressions DESC, actions DESC, impressions DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'ask_tool' AND json_extract(payload_json, '$.source') = 'tool_detail' AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'official_click' AND json_extract(payload_json, '$.source') = 'tool_detail' AND tool_slug IS NOT NULL" + eventAnd + " GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, SUM(CASE WHEN type = 'tool_detail_view' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN type = 'ask_tool' THEN 1 ELSE 0 END) AS asks, SUM(CASE WHEN type = 'official_click' THEN 1 ELSE 0 END) AS official_clicks FROM events WHERE tool_slug IS NOT NULL AND json_extract(payload_json, '$.source') = 'tool_detail' AND type IN ('tool_detail_view', 'ask_tool', 'official_click')" + eventAnd + " GROUP BY tool_slug, tool_name HAVING views > 0 ORDER BY (asks + official_clicks) * 1.0 / views DESC, asks + official_clicks DESC, views DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT COALESCE(json_extract(payload_json, '$.target'), 'unknown') AS target, COALESCE(json_extract(payload_json, '$.variant'), 'unknown') AS variant, COUNT(*) AS count FROM events WHERE type = 'home_cta_click'" + eventAnd + " GROUP BY target, variant ORDER BY count DESC LIMIT 20"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT COALESCE(json_extract(payload_json, '$.variant'), 'unknown') AS variant, SUM(CASE WHEN type = 'hero_variant_view' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN type = 'home_cta_click' THEN 1 ELSE 0 END) AS cta_clicks, SUM(CASE WHEN type = 'recommend' THEN 1 ELSE 0 END) AS recommendations FROM events WHERE type IN ('hero_variant_view', 'home_cta_click', 'recommend')" + eventAnd + " GROUP BY variant ORDER BY views DESC, cta_clicks DESC"), range.since ? [range.since] : []).all(),
    bind(env.DB.prepare("SELECT type, tool_slug AS slug, tool_name AS name, created_at FROM events" + eventWhere + " ORDER BY created_at DESC LIMIT 30"), range.since ? [range.since] : []).all()
  ]);

  return Response.json({
    range,
    totals: totals || { users: 0, favorites: 0, recommendations: 0, events: 0 },
    funnel: buildFunnel(funnel || {}),
    uniqueFunnel: buildUniqueFunnel(uniqueFunnel || {}),
    topTools: topTools.results || [],
    eventTypes: eventTypes.results || [],
    favoriteTools: favoriteTools.results || [],
    searchTerms: searchTerms.results || [],
    toolClicks: toolClicks.results || [],
    askTools: askTools.results || [],
    officialClicks: officialClicks.results || [],
    recommendationActions: recommendationActions.results || [],
    recommendationTools: recommendationTools.results || [],
    recommendationCtr: (recommendationCtr.results || []).map((item) => ({ ...item, rate: Number(item.impressions || 0) ? Number(item.actions || 0) / Number(item.impressions || 0) : 0 })),
    detailAskTools: detailAskTools.results || [],
    detailOfficialClicks: detailOfficialClicks.results || [],
    detailConversion: (detailConversion.results || []).map((item) => ({
      ...item,
      askRate: Number(item.views || 0) ? Number(item.asks || 0) / Number(item.views || 0) : 0,
      officialRate: Number(item.views || 0) ? Number(item.official_clicks || 0) / Number(item.views || 0) : 0
    })),
    homeCtaActions: homeCtaActions.results || [],
    heroVariantStats: (heroVariantStats.results || []).map((item) => ({
      ...item,
      ctaRate: Number(item.views || 0) ? Number(item.cta_clicks || 0) / Number(item.views || 0) : 0,
      recommendRate: Number(item.views || 0) ? Number(item.recommendations || 0) / Number(item.views || 0) : 0
    })),
    toolQuality: buildToolQualityReport(),
    recentEvents: recentEvents.results || []
  }, { headers: corsHeaders() });
}

function adminStatsRange(url) {
  const key = url.searchParams.get("range") || "7d";
  const now = Date.now();
  const ranges = {
    today: { label: "最近 24 小时", days: 1 },
    "7d": { label: "最近 7 天", days: 7 },
    "30d": { label: "最近 30 天", days: 30 },
    all: { label: "全部时间", days: 0 }
  };
  const selected = ranges[key] ? key : "7d";
  const config = ranges[selected];
  return {
    key: selected,
    label: config.label,
    since: config.days ? new Date(now - config.days * 24 * 60 * 60 * 1000).toISOString() : null
  };
}

function buildFunnel(row) {
  const searches = Number(row.searches || 0);
  const quizOpens = Number(row.quiz_opens || 0);
  const recommendations = Number(row.recommendations || 0);
  const intent = searches + quizOpens + recommendations;
  const toolClicks = Number(row.tool_clicks || 0);
  const askTools = Number(row.ask_tools || 0);
  const favoriteAdds = Number(row.favorite_adds || 0);
  const officialClicks = Number(row.official_clicks || 0);
  return [
    { key: "intent", label: "需求表达", count: intent, note: "搜索 + 打开 AI 选工具 + 推荐提交" },
    { key: "recommend", label: "AI 推荐提交", count: recommendations, previous: quizOpens || intent },
    { key: "tool_click", label: "工具卡点击", count: toolClicks, previous: intent },
    { key: "ask_tool", label: "问 AI 怎么用", count: askTools, previous: toolClicks },
    { key: "favorite_add", label: "加入收藏", count: favoriteAdds, previous: toolClicks },
    { key: "official_click", label: "点击官网", count: officialClicks, previous: toolClicks }
  ];
}

function buildUniqueFunnel(row) {
  const intent = Number(row.intent || 0);
  const toolClicks = Number(row.tool_clicks || 0);
  const askTools = Number(row.ask_tools || 0);
  const favoriteAdds = Number(row.favorite_adds || 0);
  const officialClicks = Number(row.official_clicks || 0);
  return [
    { key: "intent", label: "需求表达", count: intent, note: "搜索或 AI 选工具，按 user_id / visitorId 去重" },
    { key: "tool_click", label: "工具卡点击", count: toolClicks, previous: intent },
    { key: "ask_tool", label: "问 AI 怎么用", count: askTools, previous: toolClicks },
    { key: "favorite_add", label: "加入收藏", count: favoriteAdds, previous: toolClicks },
    { key: "official_click", label: "点击官网", count: officialClicks, previous: toolClicks }
  ];
}

function scoreTool(text, haystack, tool) {
  if (!text.trim()) return 1;
  const terms = text.split(/\\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 2;
  }
  if (/免费|新手|学生/.test(text) && /免费/.test(tool.price + " " + (tool.filters || []).join(" "))) score += 3;
  if (/写作|文章|文案|ppt|演示/.test(text) && /写作|PPT|文案|演示|办公/.test(haystack)) score += 4;
  if (/画图|图片|设计|海报/.test(text) && /画图|设计|图片|创意/.test(haystack)) score += 4;
  if (/视频|剪辑|数字人/.test(text) && /视频|剪辑|数字人/.test(haystack)) score += 4;
  if (/编程|代码|开发/.test(text) && /编程|代码|开发/.test(haystack)) score += 4;
  return score;
}

function buildRecommendReason(text, tool) {
  if (/免费|新手|学生/.test(text) && /免费/.test(tool.price || "")) return "有免费入口，适合低成本试用";
  if (tool.audience) return "适合" + tool.audience + "，和你的需求匹配";
  return "和你的使用场景匹配度较高";
}

function buildRecommendBestFor(text, tool, categoryName) {
  if (/写作|文案|ppt|演示/.test(text)) return "适合先完成内容草稿、结构梳理和可交付稿件";
  if (/视频|剪辑|数字人/.test(text)) return "适合先做样片、分镜或短视频素材验证";
  if (/编程|代码|开发/.test(text)) return "适合在真实项目里做代码理解、补全和重构";
  if (/搜索|资料|调研/.test(text)) return "适合先做资料检索、来源确认和结论整理";
  if (tool.audience) return "适合" + tool.audience + "的高频任务";
  return "适合" + categoryName + "相关的入门和日常任务";
}

function buildRecommendCaution(text, tool) {
  if (/国内|中国大陆|直连/.test(text) && !(tool.filters || []).includes("国内直连")) return "如果必须国内直连，注册或访问前先确认官网可用性";
  if (/免费|学生|低预算/.test(text) && !String(tool.price || "").includes("免费")) return "预算敏感时先确认试用额度和付费门槛";
  if ((tool.tags || []).includes("开发者") && /新手|小白|不会代码/.test(text)) return "功能强但可能需要一点配置或技术理解";
  return "价格、额度和模型能力会变化，正式使用前以官网为准";
}

function buildRecommendNextStep(tool) {
  const q = tool.q || (tool.name + " 怎么用，适合哪些场景？");
  return "先问：" + q;
}

async function getCurrentUser(request, env) {
  if (!env.DB) return null;
  const sessionToken = parseCookies(request.headers.get("cookie")).ait_session;
  if (!sessionToken) return null;
  const sessionId = await hashToken(sessionToken);
  const row = await env.DB.prepare(
    "SELECT users.id, users.email, users.name, users.avatar_url, users.provider FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > ?"
  ).bind(sessionId, new Date().toISOString()).first();
  return row || null;
}

async function requireUser(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return Response.json({ error: "请先登录" }, { status: 401, headers: corsHeaders() });
  }
  return user;
}

async function recordEvent(env, userId, type, payload) {
  if (!env.DB) return;
  if (!ALLOWED_EVENT_TYPES.has(type)) return;
  const toolName = limitText(payload?.toolName || payload?.tool_name || "", 120);
  const toolSlugValue = limitText(payload?.toolSlug || payload?.tool_slug || (toolName ? toolSlug(toolName) : ""), 160);
  await env.DB.prepare("INSERT INTO events (id, user_id, type, tool_slug, tool_name, payload_json) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId || null, String(type).slice(0, 80), toolSlugValue || null, toolName || null, JSON.stringify(trimPayload(payload || {})).slice(0, 4000))
    .run();
}

async function checkRateLimit(request, env, bucket, limit, windowSeconds) {
  if (!env.DB) return null;
  const key = bucket + ":" + clientKey(request);
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  const row = await env.DB.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").bind(key).first();
  if (!row || Number(row.reset_at) <= now) {
    await env.DB.prepare("INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?)").bind(key, 1, resetAt).run();
    return null;
  }
  if (Number(row.count) >= limit) {
    return Response.json({ error: "请求太频繁，请稍后再试" }, {
      status: 429,
      headers: { ...corsHeaders(), "retry-after": String(Math.max(1, Number(row.reset_at) - now)) }
    });
  }
  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return null;
}

function clientKey(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "anonymous";
}

function limitText(value, max) {
  return String(value || "").trim().slice(0, max);
}

function trimPayload(payload) {
  const clean = {};
  for (const [key, value] of Object.entries(payload || {}).slice(0, 20)) {
    if (typeof value === "string") clean[key] = value.slice(0, 600);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) clean[key] = value;
    else if (Array.isArray(value)) clean[key] = value.slice(0, 20).map((item) => typeof item === "string" ? item.slice(0, 120) : item);
    else if (value && typeof value === "object") clean[key] = "[object]";
  }
  return clean;
}

async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseCookies(header) {
  return Object.fromEntries(String(header || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function safeNextPath(value) {
  const next = String(value || "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function decodeState(value) {
  if (!value) return null;
  try {
    const padded = value + "=".repeat((4 - value.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  };
}
`;

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/worker.js", import.meta.url), worker);

console.log("Built dist/worker.js");
