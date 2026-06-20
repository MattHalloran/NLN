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
const rows = [];

for (const [label, relativePath] of summaries) {
    const summaryPath = path.resolve(relativePath);
    if (!fs.existsSync(summaryPath)) {
        continue;
    }

    found = true;
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    const { total } = summary;

    const row = {
        label,
        statements: formatPct(total.statements),
        branches: formatPct(total.branches),
        functions: formatPct(total.functions),
        lines: formatPct(total.lines),
    };

    rows.push(row);
    console.log(
        [
            row.label,
            `statements=${row.statements}`,
            `branches=${row.branches}`,
            `functions=${row.functions}`,
            `lines=${row.lines}`,
        ].join(" "),
    );
}

if (!found) {
    console.log("No coverage summary files found.");
    process.exit(0);
}

if (process.env.GITHUB_STEP_SUMMARY) {
    const markdown = [
        "## Coverage Summary",
        "",
        "| Suite | Statements | Branches | Functions | Lines |",
        "| --- | ---: | ---: | ---: | ---: |",
        ...rows.map(
            (row) =>
                `| ${row.label} | ${row.statements} | ${row.branches} | ${row.functions} | ${row.lines} |`,
        ),
        "",
    ].join("\n");

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}
