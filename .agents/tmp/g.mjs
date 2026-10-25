// usage: node g.mjs <regex> <file-or-dir>... ; writes matches to stdout
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const [re, ...paths] = process.argv.slice(2);
const rx = new RegExp(re.replace(/~/g, "|"));
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => (n === "node_modules" ? [] : walk(join(p, n)))) : [p]);
for (const f of paths.flatMap(walk)) {
  if (!/\.(m?js|ts|md|css|json)$/.test(f)) continue;
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (rx.test(line)) console.log(`${f.replace(/.*anatomy[\\/]/, "")}:${i + 1}: ${line.trim().slice(0, 220)}`);
  });
}
