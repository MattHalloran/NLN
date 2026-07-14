import fs from "node:fs";
import { readJson } from "./lib/phase10-safe-io.mjs";
const registry = readJson("config/command-registry.json");
const receipts = readJson("config/receipt-registry.json");
const lines = ["# Generated Operator Command and Evidence Reference", "", "> Authority: generated reference. Do not edit; regenerate with `node scripts/generate-operator-reference.mjs`.", "", `Registry: \`${registry.registryId}\``, "", "## Commands", "", "| Command | Availability | Effect | Default | Receipt | Safest next command |", "| --- | --- | --- | --- | --- | --- |"];
for (const item of registry.commands) lines.push(`| \`${item.command}\` | ${item.availability} | \`${item.effectClass}\` | ${item.defaultMode} | ${item.receiptType ? `\`${item.receiptType}\`` : "none"} | ${item.safestNextCommand} |`);
lines.push("", "## Receipt types", "", "| Receipt | Semantic verifier | Schema |", "| --- | --- | --- |");
for (const item of receipts.types) lines.push(`| \`${item.receiptType}\` | \`${item.semanticVerifier}\` | \`${item.schema}\` |`);
lines.push("", "Legacy evidence is never upgraded in assurance by a compatibility reader.", "");
const output = lines.join("\n");
const target = "docs/generated-operator-reference.md";
if (process.argv.includes("--check")) { if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) { console.error("Generated operator reference is stale"); process.exit(1); } }
else fs.writeFileSync(target, output);
