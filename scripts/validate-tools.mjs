import { readFile } from "node:fs/promises";

const dataPath = new URL("../data/tools.json", import.meta.url);
const indexPath = new URL("../public/index.html", import.meta.url);

const data = JSON.parse(await readFile(dataPath, "utf8"));
const html = await readFile(indexPath, "utf8");
const issues = [];

if (!Array.isArray(data.categories)) {
  fail("data/tools.json must contain a categories array");
}

const names = new Map();
let toolCount = 0;

data.categories.forEach((category, categoryIndex) => {
  const categoryLabel = category?.name || `category ${categoryIndex + 1}`;
  if (!category || typeof category !== "object") {
    issues.push(`${categoryLabel}: must be an object`);
    return;
  }
  if (!String(category.name || "").trim()) issues.push(`${categoryLabel}: missing name`);
  if (!Array.isArray(category.tools)) {
    issues.push(`${categoryLabel}: missing tools array`);
    return;
  }
  category.tools.forEach((tool, toolIndex) => {
    toolCount++;
    const toolLabel = tool?.name || `${categoryLabel} tool ${toolIndex + 1}`;
    if (!tool || typeof tool !== "object") {
      issues.push(`${toolLabel}: must be an object`);
      return;
    }
    for (const field of ["name", "q", "desc", "url", "price", "audience"]) {
      if (!String(tool[field] || "").trim()) issues.push(`${toolLabel}: missing ${field}`);
    }
    for (const field of ["tags", "filters"]) {
      if (!Array.isArray(tool[field])) issues.push(`${toolLabel}: ${field} must be an array`);
    }
    const key = String(tool.name || "").trim().toLowerCase();
    if (key) {
      if (names.has(key)) issues.push(`${tool.name}: duplicate name also used by ${names.get(key)}`);
      else names.set(key, tool.name);
    }
    if (tool.url) {
      try {
        const parsed = new URL(tool.url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          issues.push(`${toolLabel}: url must use http or https`);
        }
      } catch {
        issues.push(`${toolLabel}: invalid url`);
      }
    }
  });
});

const embeddedCategories = extractEmbeddedCategories(html);
if (embeddedCategories) {
  const source = JSON.stringify(data.categories);
  const embedded = JSON.stringify(embeddedCategories);
  if (source !== embedded) {
    issues.push("public/index.html CATS is not synced with data/tools.json; run npm run sync:data");
  }
} else {
  issues.push("public/index.html is missing the CATS declaration");
}

if (issues.length) {
  console.error(`Tool data validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Validated ${data.categories.length} categories and ${toolCount} tools`);

function extractEmbeddedCategories(htmlText) {
  const start = htmlText.indexOf("const CATS = [");
  if (start < 0) return null;

  const arrayStart = htmlText.indexOf("[", start);
  let depth = 0;
  let end = -1;
  let quote = null;
  let escaped = false;

  for (let i = arrayStart; i < htmlText.length; i++) {
    const ch = htmlText[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return null;
  return Function(`"use strict"; return (${htmlText.slice(arrayStart, end)});`)();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
