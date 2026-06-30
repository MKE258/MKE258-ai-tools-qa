import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
const toolsJson = await readFile(new URL("../data/tools.json", import.meta.url), "utf8");

const worker = `const HTML = ${JSON.stringify(html)};
const ADMIN_HTML = ${JSON.stringify(adminHtml)};
const TOOLS_JSON = ${JSON.stringify(toolsJson)};
const TOOLS_DATA = JSON.parse(TOOLS_JSON);
const ALLOWED_EVENT_TYPES = new Set(["tool_click", "official_click", "ask_tool", "question", "recommend", "favorite_add", "favorite_remove", "quiz_open", "search"]);

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

function toolSlug(name) {
  const ascii = String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || encodeURIComponent(name);
}

function renderToolPage(found, url) {
  const { category, tool } = found;
  const related = category.tools
    .filter((item) => item.name !== tool.name)
    .slice(0, 6);
  const canonical = url.origin + "/tools/" + toolSlug(tool.name);
  const title = tool.name + " 使用指南 - AI工具教程助手";
  const description = tool.desc || (tool.name + " 工具介绍、适合人群、价格和替代工具。");
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
    ':root{--bg:#f6f7f9;--panel:#fff;--text:#172033;--muted:#667085;--line:#d8dde7;--accent:#c96a2a}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:"Microsoft YaHei",system-ui,sans-serif;line-height:1.7}' +
    'main{width:min(980px,calc(100% - 28px));margin:0 auto;padding:28px 0 42px}' +
    'a{color:inherit;text-decoration:none}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px}' +
    '.back,.btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:9px 12px}.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}' +
    '.hero,.section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:14px}' +
    'h1{margin:0 0 8px;font-size:34px;line-height:1.2}.cat{color:var(--accent);font-weight:700}.desc{color:var(--muted);font-size:16px}' +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.meta{border:1px solid var(--line);border-radius:10px;padding:12px;background:#fafafa}.meta b{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:7px}.chip{background:#eef2f7;border-radius:999px;padding:5px 9px;color:#475467;font-size:13px}' +
    '.related{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid var(--line);border-radius:10px;background:#fff;padding:12px}.card p{margin:4px 0 0;color:var(--muted);font-size:13px}' +
    '@media(max-width:720px){h1{font-size:28px}.grid,.related{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}' +
    '</style></head><body><main>' +
    '<div class="top"><a class="back" href="/">← 返回工具导航</a><a class="btn primary" href="' + escapeHtml(tool.url || "/") + '" target="_blank" rel="noopener noreferrer">去官网</a></div>' +
    '<section class="hero"><div class="cat">' + escapeHtml(category.icon + " " + category.name) + '</div>' +
    '<h1>' + escapeHtml(tool.name) + '</h1><div class="desc">' + escapeHtml(description) + '</div>' +
    '<div class="grid">' +
    '<div class="meta"><b>价格</b>' + escapeHtml(tool.price || "查看官网") + '</div>' +
    '<div class="meta"><b>适合人群</b>' + escapeHtml(tool.audience || "通用用户") + '</div>' +
    '<div class="meta"><b>访问状态</b>' + escapeHtml((tool.filters || []).includes("国内直连") ? "国内直连" : "视地区而定") + '</div>' +
    '</div></section>' +
    '<section class="section"><h2>适合用来做什么</h2><p>' + escapeHtml(tool.q || (tool.name + " 怎么用")) + '</p><div class="chips">' +
    (tool.tags || []).concat(tool.filters || []).map((tag) => '<span class="chip">' + escapeHtml(tag) + '</span>').join('') +
    '</div></section>' +
    '<section class="section"><h2>使用建议</h2><p>点击首页工具卡片可以直接向 AI 提问。价格、额度和可访问性变化较快，正式使用前建议以官网信息为准。</p></section>' +
    '<section class="section"><h2>同类工具</h2><div class="related">' +
    related.map((item) => '<a class="card" href="/tools/' + toolSlug(item.name) + '"><strong>' + escapeHtml(item.name) + '</strong><p>' + escapeHtml(item.desc || "") + '</p></a>').join('') +
    '</div></section>' +
    '</main></body></html>';
}

function renderSitemap(url) {
  const now = new Date().toISOString();
  const urls = [
    url.origin + "/",
    url.origin + "/admin",
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
  if (!toolName || !toolSlugValue) {
    return Response.json({ error: "缺少工具名称" }, { status: 400, headers: corsHeaders() });
  }

  if (request.method === "POST") {
    await env.DB.prepare("INSERT OR REPLACE INTO favorites (user_id, tool_slug, tool_name) VALUES (?, ?, ?)")
      .bind(user.id, toolSlugValue, toolName)
      .run();
    await recordEvent(env, user.id, "favorite_add", { tool_slug: toolSlugValue, tool_name: toolName });
    return Response.json({ ok: true }, { headers: corsHeaders() });
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND tool_slug = ?")
      .bind(user.id, toolSlugValue)
      .run();
    await recordEvent(env, user.id, "favorite_remove", { tool_slug: toolSlugValue, tool_name: toolName });
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
      reason: buildRecommendReason(text, item.tool)
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
    reason: "通用能力强，适合作为默认入门工具"
  }));

  const user = await getCurrentUser(request, env);
  const result = { items: fallback };
  if (env.DB) {
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO recommendation_sessions (id, user_id, input_json, result_json) VALUES (?, ?, ?, ?)")
      .bind(id, user?.id || null, JSON.stringify(input), JSON.stringify(result).slice(0, 8000))
      .run();
    await recordEvent(env, user?.id || null, "recommend", { recommendation_id: id, input });
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

  const [topTools, eventTypes, totals, funnel, favoriteTools, searchTerms, toolClicks, askTools, officialClicks, recentEvents] = await Promise.all([
    env.DB.prepare(
      "SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE tool_slug IS NOT NULL GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20"
    ).all(),
    env.DB.prepare("SELECT type, COUNT(*) AS count FROM events GROUP BY type ORDER BY count DESC").all(),
    env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM favorites) AS favorites, (SELECT COUNT(*) FROM recommendation_sessions) AS recommendations, (SELECT COUNT(*) FROM events) AS events"
    ).first(),
    env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM events WHERE type = 'search') AS searches, (SELECT COUNT(*) FROM recommendation_sessions) AS recommendations, (SELECT COUNT(*) FROM events WHERE type = 'tool_click') AS tool_clicks, (SELECT COUNT(*) FROM events WHERE type = 'ask_tool') AS ask_tools, (SELECT COUNT(*) FROM events WHERE type = 'favorite_add') AS favorite_adds, (SELECT COUNT(*) FROM events WHERE type = 'official_click') AS official_clicks"
    ).first(),
    env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM favorites GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20").all(),
    env.DB.prepare(
      "SELECT json_extract(payload_json, '$.keyword') AS keyword, COUNT(*) AS count FROM events WHERE type = 'search' AND json_extract(payload_json, '$.keyword') IS NOT NULL GROUP BY keyword ORDER BY count DESC LIMIT 20"
    ).all(),
    env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'tool_click' AND tool_slug IS NOT NULL GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20").all(),
    env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'ask_tool' AND tool_slug IS NOT NULL GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20").all(),
    env.DB.prepare("SELECT tool_slug AS slug, tool_name AS name, COUNT(*) AS count FROM events WHERE type = 'official_click' AND tool_slug IS NOT NULL GROUP BY tool_slug, tool_name ORDER BY count DESC LIMIT 20").all(),
    env.DB.prepare("SELECT type, tool_slug AS slug, tool_name AS name, created_at FROM events ORDER BY created_at DESC LIMIT 30").all()
  ]);

  return Response.json({
    totals: totals || { users: 0, favorites: 0, recommendations: 0, events: 0 },
    funnel: buildFunnel(funnel || {}),
    topTools: topTools.results || [],
    eventTypes: eventTypes.results || [],
    favoriteTools: favoriteTools.results || [],
    searchTerms: searchTerms.results || [],
    toolClicks: toolClicks.results || [],
    askTools: askTools.results || [],
    officialClicks: officialClicks.results || [],
    recentEvents: recentEvents.results || []
  }, { headers: corsHeaders() });
}

function buildFunnel(row) {
  const searches = Number(row.searches || 0);
  const recommendations = Number(row.recommendations || 0);
  const intent = searches + recommendations;
  const toolClicks = Number(row.tool_clicks || 0);
  const askTools = Number(row.ask_tools || 0);
  const favoriteAdds = Number(row.favorite_adds || 0);
  const officialClicks = Number(row.official_clicks || 0);
  return [
    { key: "intent", label: "需求表达", count: intent, note: "搜索 + AI 选工具提交" },
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
