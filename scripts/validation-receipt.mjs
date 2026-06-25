import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(".validation");
const outputPath = path.join(outputDir, "latest-receipt.md");
const artifactMaxAgeMinutes = Number(process.env.VALIDATION_ARTIFACT_MAX_AGE_MINUTES ?? 120);

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

const fileAgeSeconds = (relativePath) => {
    const filePath = path.resolve(relativePath);
    if (!fs.existsSync(filePath)) return null;
    return Math.round((Date.now() - fs.statSync(filePath).mtimeMs) / 1000);
};

const coverageSummaries = [
    ["shared unit", "packages/shared/coverage/coverage-summary.json"],
    ["ui unit", "packages/ui/coverage/coverage-summary.json"],
    ["server unit", "packages/server/coverage/coverage-summary.json"],
    ["server integration", "packages/server/coverage-integration/coverage-summary.json"],
];

const unitCoverageArtifacts = coverageSummaries
    .filter(([label]) => !label.includes("integration"))
    .map(([, relativePath]) => relativePath);

const allCoverageArtifacts = coverageSummaries.map(([, relativePath]) => relativePath);

const playwrightResults = [
    ["public e2e", "test-results/public.json"],
    ["visual e2e", "test-results/visual.json"],
    ["admin e2e", "test-results/admin.json"],
    ["accessibility e2e", "test-results/accessibility.json"],
    ["pwa", "test-results/pwa.json"],
    ["production e2e", "test-results/production.json"],
    ["smoke e2e", "test-results/smoke.json"],
];

const lighthouseArtifacts = [
    ["Lighthouse assertion results", ".lighthouseci/assertion-results.json"],
];

const validationCommand =
    process.env.VALIDATION_COMMAND || process.env.DEPLOY_VALIDATE_CMD || "not provided";

const expectedArtifactsByCommand = [
    {
        pattern: /ci validate job/i,
        artifacts: [...unitCoverageArtifacts, "test-results/pwa.json"],
    },
    {
        pattern: /validate:release|validate:full|validate:trusted|validate:ci/i,
        artifacts: [...allCoverageArtifacts, "test-results/pwa.json"],
    },
    {
        pattern: /validate:release|validate:full|validate:trusted|ci e2e job/i,
        artifacts: [
            "test-results/public.json",
            "test-results/visual.json",
            "test-results/admin.json",
            "test-results/accessibility.json",
            "test-results/production.json",
        ],
    },
    {
        pattern: /validate:release|ci validate job/i,
        artifacts: lighthouseArtifacts.map(([, relativePath]) => relativePath),
    },
    {
        pattern: /ci integration job/i,
        artifacts: ["packages/server/coverage-integration/coverage-summary.json"],
    },
];

const requiredArtifacts = [
    ...new Set(
        expectedArtifactsByCommand.flatMap(({ pattern, artifacts }) =>
            pattern.test(validationCommand) ? artifacts : [],
        ),
    ),
];

const artifactProblems = requiredArtifacts.flatMap((relativePath) => {
    const ageSeconds = fileAgeSeconds(relativePath);
    if (ageSeconds === null) {
        return [`missing required artifact: ${relativePath}`];
    }
    if (ageSeconds > artifactMaxAgeMinutes * 60) {
        return [
            `stale required artifact: ${relativePath} is ${Math.round(ageSeconds / 60)} minutes old`,
        ];
    }
    return [];
});

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

const lighthouseRows = lighthouseArtifacts.map(
    ([label, relativePath]) => `| ${label} | ${relativePath} | ${fileFreshness(relativePath)} |`,
);

const lines = [
    "# Validation Receipt",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Commit: ${commandOutput("git", ["rev-parse", "HEAD"])}`,
    `Branch: ${commandOutput("git", ["branch", "--show-current"])}`,
    `Worktree: ${commandOutput("git", ["status", "--short"]) || "clean"}`,
    `Validation command: ${validationCommand}`,
    `CI run: ${process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : "local"}`,
    `CI job: ${process.env.GITHUB_JOB || "local"}`,
    `Artifact freshness limit: ${artifactMaxAgeMinutes} minutes`,
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
    "## Lighthouse",
    "",
    "| Artifact | Result File | Artifact Freshness |",
    "| --- | --- | --- |",
    ...lighthouseRows,
    "",
    "## Artifact Check",
    "",
    ...(requiredArtifacts.length
        ? artifactProblems.length
            ? artifactProblems.map((problem) => `- ${problem}`)
            : ["All required artifacts for the declared validation command are present and fresh."]
        : ["No required artifact set matched the declared validation command."]),
    "",
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Validation receipt written to ${outputPath}`);

if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

if (artifactProblems.length > 0) {
    console.error(artifactProblems.join("\n"));
    process.exit(1);
}
