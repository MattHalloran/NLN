import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(".validation");
const outputPath = path.join(outputDir, "latest-receipt.md");

const readJson = (relativePath) => {
    const filePath = path.resolve(relativePath);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const commandOutput = (command, args) => {
    try {
        return execFileSync(command, args, { encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
};

const fileFreshness = (relativePath) => {
    const filePath = path.resolve(relativePath);
    if (!fs.existsSync(filePath)) return "missing";

    const stats = fs.statSync(filePath);
    const ageSeconds = Math.round((Date.now() - stats.mtimeMs) / 1000);
    return `${stats.mtime.toISOString()} (${ageSeconds}s old)`;
};

const coverageSummaries = [
    ["shared unit", "packages/shared/coverage/coverage-summary.json"],
    ["ui unit", "packages/ui/coverage/coverage-summary.json"],
    ["server unit", "packages/server/coverage/coverage-summary.json"],
    ["server integration", "packages/server/coverage-integration/coverage-summary.json"],
];

const playwrightResults = [
    ["admin e2e", "test-results/admin.json"],
    ["pwa", "test-results/pwa.json"],
    ["smoke e2e", "test-results/smoke.json"],
];

const formatMetric = (metric) => `${metric.pct.toFixed(2)}%`;

const coverageRows = coverageSummaries.flatMap(([label, relativePath]) => {
    const summary = readJson(relativePath);
    if (!summary?.total) return [];

    const { total } = summary;
    return [
        `| ${label} | ${formatMetric(total.statements)} | ${formatMetric(total.branches)} | ${formatMetric(total.functions)} | ${formatMetric(total.lines)} | ${fileFreshness(relativePath)} |`,
    ];
});

const countPlaywright = (suite) => {
    let total = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;

    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
            total += 1;
            if (test.status !== "expected") {
                failed += 1;
            }
            if (test.status === "skipped") {
                skipped += 1;
            }
            if (test.status === "expected" && (test.results?.length ?? 0) > 1) {
                flaky += 1;
            }
        }
    }

    for (const childSuite of suite.suites ?? []) {
        const child = countPlaywright(childSuite);
        total += child.total;
        failed += child.failed;
        skipped += child.skipped;
        flaky += child.flaky;
    }

    return { total, failed, skipped, flaky };
};

const playwrightRows = playwrightResults.flatMap(([label, relativePath]) => {
    const result = readJson(relativePath);
    if (!result) return [];

    const counts = countPlaywright(result);
    return [
        `| ${label} | ${counts.total} | ${counts.failed} | ${counts.flaky} | ${counts.skipped} | ${relativePath} | ${fileFreshness(relativePath)} |`,
    ];
});

const lines = [
    "# Validation Receipt",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Commit: ${commandOutput("git", ["rev-parse", "HEAD"])}`,
    `Branch: ${commandOutput("git", ["branch", "--show-current"])}`,
    `Worktree: ${commandOutput("git", ["status", "--short"]) || "clean"}`,
    `Validation command: ${process.env.VALIDATION_COMMAND || process.env.DEPLOY_VALIDATE_CMD || "not provided"}`,
    `CI run: ${process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : "local"}`,
    `CI job: ${process.env.GITHUB_JOB || "local"}`,
    "",
    "## Coverage",
    "",
    "| Suite | Statements | Branches | Functions | Lines | Artifact Freshness |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...(coverageRows.length ? coverageRows : ["| no coverage summaries found | | | | | |"]),
    "",
    "## Playwright",
    "",
    "| Suite | Tests | Failed | Flaky | Skipped | Result File | Artifact Freshness |",
    "| --- | ---: | ---: | ---: | ---: | --- | --- |",
    ...(playwrightRows.length ? playwrightRows : ["| no Playwright results found | | | | | | |"]),
    "",
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Validation receipt written to ${outputPath}`);

if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}
