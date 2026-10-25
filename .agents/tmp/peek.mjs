import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const kit = "C:/Users/k64163939/.kiro/skills/anatomy/kit/";
let out = "";
for (const f of readdirSync(kit).filter((f) => f.endsWith(".mjs"))) {
  const lines = readFileSync(kit + f, "utf8").split("\n");
  lines.forEach((l, i) => {
    if (/function plateHtml|function pageHtml/.test(l)) out += `${f}:${i + 1}\n` + lines.slice(i, i + 45).join("\n") + "\n----\n";
  });
}
const css = readFileSync("C:/Users/k64163939/.kiro/skills/anatomy/examples/raptor-engine/raptor.css", "utf8").split("\n");
out += css.slice(230, 268).join("\n");
writeFileSync("c:/Users/k64163939/Develop/mrl-elevator-anatomy/.agents/o2.txt", out);
