import { readFile, writeFile } from "node:fs/promises";

const indexPath = new URL("../public/index.html", import.meta.url);
const dataPath = new URL("../data/tools.json", import.meta.url);

const html = await readFile(indexPath, "utf8");
const data = JSON.parse(await readFile(dataPath, "utf8"));

if (!Array.isArray(data.categories)) {
  throw new Error("data/tools.json must contain a categories array");
}

const start = html.indexOf("const CATS = [");
if (start < 0) throw new Error("Could not find CATS declaration");

const arrayStart = html.indexOf("[", start);
let depth = 0;
let end = -1;
let quote = null;
let escaped = false;

for (let i = arrayStart; i < html.length; i++) {
  const ch = html[i];
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

if (end < 0) throw new Error("Could not find end of CATS array");

const replacement = "const CATS = " + JSON.stringify(data.categories, null, 6);
const updated = html.slice(0, start) + replacement + html.slice(end);

await writeFile(indexPath, updated);

const total = data.categories.reduce((sum, category) => sum + category.tools.length, 0);
console.log(`Synced ${data.categories.length} categories and ${total} tools into public/index.html`);
