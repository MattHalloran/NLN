#!/usr/bin/env node
import fs from "node:fs";
const command = process.argv[2],
    statePath = process.env.MIGRATION_STUB_STATE,
    log = process.env.MIGRATION_STUB_LOG;
const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
if (log) fs.appendFileSync(log, `${command} ${JSON.stringify(input)}\n`);
let state = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (process.env.MIGRATION_STUB_FAIL === command) {
    console.error("Injected migration adapter failure (details redacted)");
    process.exit(1);
}
if (command === "inspect") console.log(JSON.stringify(state));
else if (command === "acquire-lock")
    console.log(JSON.stringify({ acquired: process.env.MIGRATION_STUB_LOCKED !== "1" }));
else if (command === "apply") {
    state.appliedMigrations = input.migrations;
    fs.writeFileSync(statePath, JSON.stringify(state));
    console.log(JSON.stringify({ applied: true }));
} else if (command === "release-lock") console.log(JSON.stringify({ released: true }));
else process.exit(2);
