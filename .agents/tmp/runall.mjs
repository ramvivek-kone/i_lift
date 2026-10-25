// node .agents/tmp/runall.mjs <log> <json array of arg arrays>: runs node commands in sequence, logs everything.
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
const ROOT = "c:/Users/k64163939/Develop/mrl-elevator-anatomy";
const [log, json] = process.argv.slice(2);
const out = `${ROOT}/.agents/${log}`;
writeFileSync(out, "");
process.env.CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
import { readFileSync } from "node:fs";
for (const args of JSON.parse(readFileSync(`${ROOT}/.agents/tmp/${json}`, "utf8"))) {
  appendFileSync(out, `== node ${args.join(" ")}\n`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, env: process.env });
  appendFileSync(out, (r.stdout || "").slice(-6000) + (r.stderr ? "\nERR:\n" + r.stderr.slice(-4000) : "") + `\n[status ${r.status}]\n`);
}
appendFileSync(out, "ALL DONE\n");
