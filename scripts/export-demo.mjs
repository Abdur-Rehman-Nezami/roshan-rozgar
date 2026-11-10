import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const dist = new URL("../apps/web/dist/", import.meta.url);
let html = (await readFile(new URL("index.html", dist), "utf8")).replace(
  "<head>",
  '<head><meta name="rr-standalone" content="true">',
);
for (const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const path = match[1].replace(/^\//, "");
  const js = await readFile(new URL(path, dist), "utf8");
  html = html.replace(
    match[0],
    () => `<script type="module">${js.replaceAll("</script", "<\\/script")}</script>`,
  );
}
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const css = await readFile(new URL(match[1].replace(/^\//, ""), dist), "utf8");
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
await writeFile(new URL("roshan-rozgar-demo.html", root), html);
console.info(
  "Created roshan-rozgar-demo.html — open directly in a browser; no server or database needed for the explicitly labelled simulation.",
);
