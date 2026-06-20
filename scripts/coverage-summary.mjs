import fs from "node:fs";
import path from "node:path";

const summaries = [
    ["shared unit", "packages/shared/coverage/coverage-summary.json"],
    ["ui unit", "packages/ui/coverage/coverage-summary.json"],
    ["server unit", "packages/server/coverage/coverage-summary.json"],
    ["server integration", "packages/server/coverage-integration/coverage-summary.json"],
];

const formatPct = (metric) => `${metric.pct.toFixed(2)}%`;

let found = false;

for (const [label, relativePath] of summaries) {
    const summaryPath = path.resolve(relativePath);
    if (!fs.existsSync(summaryPath)) {
        continue;
    }

    found = true;
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    const { total } = summary;

    console.log(
        [
            label,
            `statements=${formatPct(total.statements)}`,
            `branches=${formatPct(total.branches)}`,
            `functions=${formatPct(total.functions)}`,
            `lines=${formatPct(total.lines)}`,
        ].join(" "),
    );
}

if (!found) {
    console.log("No coverage summary files found.");
}
