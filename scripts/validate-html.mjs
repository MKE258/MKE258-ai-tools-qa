import { readFile } from "node:fs/promises";

const files = ["public/index.html", "public/admin.html"];
const blockedSnippets = [
  "miao957897121.workers.dev",
  "static.cloudflareinsights.com/beacon.min.js"
];
const issues = [];

for (const file of files) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  for (const snippet of blockedSnippets) {
    if (html.includes(snippet)) issues.push(`${file}: contains blocked snippet ${snippet}`);
  }
  checkInlineScripts(file, html);
}

if (issues.length) {
  console.error(`HTML validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Validated HTML in ${files.length} files`);

function checkInlineScripts(file, html) {
  let index = 0;
  const scripts = html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    index++;
    const attrs = match[1] || "";
    const body = match[2] || "";
    if (/type=["']application\/ld\+json["']/i.test(attrs)) continue;
    try {
      Function(body);
    } catch (error) {
      issues.push(`${file}: inline script ${index} has invalid JavaScript (${error.message})`);
    }
  }
}
