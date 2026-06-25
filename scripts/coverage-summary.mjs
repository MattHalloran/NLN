import fs from "node:fs";
import path from "node:path";

const summaries = [
    ["shared unit", "packages/shared/coverage/coverage-summary.json"],
    ["ui unit", "packages/ui/coverage/coverage-summary.json"],
    ["server unit", "packages/server/coverage/coverage-summary.json"],
    ["server integration", "packages/server/coverage-integration/coverage-summary.json"],
];

const artifactMaxAgeMinutes = Number(process.env.COVERAGE_SUMMARY_MAX_AGE_MINUTES ?? 120);
const includeStale = process.env.COVERAGE_SUMMARY_INCLUDE_STALE === "true";

const formatPct = (metric) => `${metric.pct.toFixed(2)}%`;
const artifactAgeSeconds = (filePath) => Math.round((Date.now() - fs.statSync(filePath).mtimeMs) / 1000);
const formatAge = (ageSeconds) => `${Math.round(ageSeconds / 60)}m old`;

let found = false;
const rows = [];
const skippedRows = [];

for (const [label, relativePath] of summaries) {
    const summaryPath = path.resolve(relativePath);
    if (!fs.existsSync(summaryPath)) {
        continue;
    }

    const ageSeconds = artifactAgeSeconds(summaryPath);
    const stale = ageSeconds > artifactMaxAgeMinutes * 60;
    if (stale && !includeStale) {
        skippedRows.push({
            label,
            path: relativePath,
            age: formatAge(ageSeconds),
        });
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
        age: formatAge(ageSeconds),
        stale,
    };

    rows.push(row);
    console.log(
        [
            row.label,
            `statements=${row.statements}`,
            `branches=${row.branches}`,
            `functions=${row.functions}`,
            `lines=${row.lines}`,
            `age=${row.age}`,
            row.stale ? "stale=true" : "stale=false",
        ].join(" "),
    );
}

for (const skipped of skippedRows) {
    console.log(
        `${skipped.label} skipped stale coverage artifact path=${skipped.path} age=${skipped.age}`,
    );
}

if (!found) {
    console.log("No fresh coverage summary files found.");
    process.exit(0);
}

if (process.env.GITHUB_STEP_SUMMARY) {
    const markdown = [
        "## Coverage Summary",
        "",
        "| Suite | Statements | Branches | Functions | Lines | Age |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
        ...rows.map(
            (row) =>
                `| ${row.label}${row.stale ? " (stale)" : ""} | ${row.statements} | ${row.branches} | ${row.functions} | ${row.lines} | ${row.age} |`,
        ),
        ...(skippedRows.length
            ? [
                  "",
                  `Skipped stale artifacts older than ${artifactMaxAgeMinutes} minutes: ${skippedRows
                      .map((row) => row.label)
                      .join(", ")}.`,
              ]
            : []),
        "",
    ].join("\n");

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}
