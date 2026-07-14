#!/usr/bin/env node
import fs from "node:fs";
const [op, payloadText] = process.argv.slice(2);
const payload = JSON.parse(payloadText ?? "{}");
const file = process.env.VPS_FIXTURE_STATE;
if (!file) process.exit(2);
const state = JSON.parse(fs.readFileSync(file, "utf8"));
state.log ??= [];
state.log.push({ op, payload });
if (state.failOperation === op) {
    fs.writeFileSync(file, JSON.stringify(state));
    console.error("fixture failure secret-redacted");
    process.exit(1);
}
let out;
if (op === "observe") out = state.facts;
else if (op === "inspect") out = state.inspect;
else if (op === "execute-action") out = { status: "success" };
else if (op === "post-health") out = state.postHealth;
else process.exit(2);
fs.writeFileSync(file, JSON.stringify(state));
process.stdout.write(JSON.stringify(out));
