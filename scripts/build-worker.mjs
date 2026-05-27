import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

const worker = `const HTML = ${JSON.stringify(html)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, version: "source-2026-05-27" }, { headers: corsHeaders() });
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
