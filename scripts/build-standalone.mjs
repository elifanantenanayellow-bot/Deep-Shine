// Builds the demo into ONE self-contained .html file that runs from file://
// on any computer — no server, no install, no internet. Everything (React,
// charts, animations, styles, fonts fallback) is inlined.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = resolve(root, ".standalone-tmp");
const outDir = resolve(root, "dist");
mkdirSync(tmp, { recursive: true });
mkdirSync(outDir, { recursive: true });

console.log("1/4  Bundling application…");
await build({
  entryPoints: [resolve(root, "standalone/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  platform: "browser",
  legalComments: "none",
  outfile: resolve(tmp, "app.js"),
  loader: { ".css": "empty" }, // Tailwind is compiled separately below
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_APP_URL": '""',
  },
  alias: {
    "next/link": resolve(root, "standalone/shims/next-link.tsx"),
    "next/navigation": resolve(root, "standalone/shims/next-navigation.ts"),
  },
  tsconfig: resolve(root, "tsconfig.json"),
  logLevel: "warning",
});

console.log("2/4  Compiling styles…");
execSync(
  `npx tailwindcss -i ${resolve(root, "src/app/globals.css")} -o ${resolve(tmp, "app.css")} --minify`,
  { cwd: root, stdio: "pipe" },
);

console.log("3/4  Inlining into a single file…");
const js = readFileSync(resolve(tmp, "app.js"), "utf8");
const css = readFileSync(resolve(tmp, "app.css"), "utf8");

// Inline SVG favicon as a data URI so the tab icon works offline too.
const favicon =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="42" font-family="sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">DS</text></svg>`,
  ).toString("base64");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Deep-Shine — Centre Médical Antananarivo</title>
<meta name="description" content="Clinic management demo — appointments, reception, billing, patient records." />
<link rel="icon" href="${favicon}" />
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<noscript style="display:block;padding:2rem;font-family:system-ui,sans-serif;text-align:center">
  This demo needs JavaScript enabled.
</noscript>
<script>${js}</script>
</body>
</html>
`;

const outFile = resolve(outDir, "deep-shine-demo.html");
writeFileSync(outFile, html, "utf8");
rmSync(tmp, { recursive: true, force: true });

const kb = Math.round(statSync(outFile).size / 1024);
console.log(`4/4  Done → dist/deep-shine-demo.html (${kb} KB)`);
console.log("     Open it by double-clicking. Works offline, no server needed.");
