import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
const toolsJson = await readFile(new URL("../data/tools.json", import.meta.url), "utf8");

const worker = `const HTML = ${JSON.stringify(html)};
const ADMIN_HTML = ${JSON.stringify(adminHtml)};
const TOOLS_JSON = ${JSON.stringify(toolsJson)};
const TOOLS_DATA = JSON.parse(TOOLS_JSON);

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

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const question = String(body.question || "").trim();
  if (!question) {
    return Response.json({ error: "问题不能为空" }, { status: 400, headers: corsHeaders() });
  }

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

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
`;

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/worker.js", import.meta.url), worker);

console.log("Built dist/worker.js");
