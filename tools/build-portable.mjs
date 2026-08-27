import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(toolsDir, "..");
const outputPath = path.resolve(appDir, "..", "bayan-keyboard.html");
let html = await fs.readFile(path.join(appDir, "index.html"), "utf8");

function referencePattern(tag, attribute, reference) {
  const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<${tag}([^>]*?)${attribute}="${escaped}(?:\\?[^\"]*)?"([^>]*)>(?:<\\/${tag}>)?`);
}

async function inlineStyle(reference, compact = false) {
  let css = (await fs.readFile(path.join(appDir, reference), "utf8")).replace(/<\/style/gi, "<\\/style");
  if (compact) css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/;}/g, "}").trim();
  html = html.replace(referencePattern("link", "href", reference), `<style data-portable-source="${reference}">\n${css}\n</style>`);
}

async function inlineScript(reference) {
  const js = (await fs.readFile(path.join(appDir, reference), "utf8")).replace(/<\/script/gi, "<\\/script");
  html = html.replace(referencePattern("script", "src", reference), `<script data-portable-source="${reference}">\n${js}\n</script>`);
}

await inlineStyle("score/qboard-score.css");
await inlineStyle("theme/qboard-quan.css", true);
for (const reference of [
  "language/qboard-languages.js",
  "musics/qboard-music-packs.js",
  "vendor/vexflow-4.2.5.js",
  "score/qboard-score-core.js",
  "score/qboard-score-print.js",
  "score/qboard-score.js"
]) await inlineScript(reference);

html = html.replace("</head>", "  <!-- VexFlow 4.2.5 is bundled under the MIT license; see the split build's vendor/VEXFLOW-LICENSE.txt. -->\n</head>");
await fs.writeFile(outputPath, html, "utf8");
console.log(`Portable Q-board written to ${outputPath}`);
