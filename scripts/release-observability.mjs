#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";

const HELP =
    "Usage: release-observability.mjs summarize --directory DIR --output FILE [--alerts FILE] [--now ISO]";
const metricFields = [
    "durationMilliseconds",
    "userVisibleDowntimeMilliseconds",
    "measuredDowntimeMilliseconds",
    "archiveBytes",
    "backupDurationMilliseconds",
    "restoreDurationMilliseconds",
    "rollbackDurationMilliseconds",
];
const percentile = (values, p) =>
    values.length
        ? [...values].sort((a, b) => a - b)[
              Math.min(values.length - 1, Math.ceil(values.length * p) - 1)
          ]
        : null;
const sensitiveKey =
    /password|passwd|secret|token|credential|authorization|private.?key|connection.?string|database.?url|email|phone|user.?id|upload.?name/i;
const sensitiveValue =
    /(-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|gh[pousr]_[A-Za-z0-9]{20,}|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i;

function rejectSensitive(value, location = "receipt") {
    if (Array.isArray(value))
        return value.forEach((item, index) => rejectSensitive(item, `${location}[${index}]`));
    if (value && typeof value === "object")
        for (const [key, item] of Object.entries(value)) {
            if (sensitiveKey.test(key))
                throw new ContractError(`sensitive field rejected at ${location}.${key}`);
            rejectSensitive(item, `${location}.${key}`);
        }
    else if (typeof value === "string" && sensitiveValue.test(value))
        throw new ContractError(`sensitive value rejected at ${location}`);
}

try {
    const [command, ...argv] = process.argv.slice(2);
    if (command === "--help" || process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    if (command !== "summarize") throw new ContractError(HELP, 2);
    const o = parseOptions(argv);
    if (!o.directory || !o.output)
        throw new ContractError("--directory and --output are required", 2);
    const now = new Date(o.now ?? Date.now());
    if (!Number.isFinite(now.getTime())) throw new ContractError("--now is invalid");
    const directory = path.resolve(o.directory),
        directoryStat = fs.lstatSync(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())
        throw new ContractError("evidence directory must be a regular directory");
    const registry = readJson("config/receipt-registry.json", "receipt registry"),
        registered = new Map(registry.types.map((entry) => [entry.receiptType, entry]));
    const objectives = readJson(
        "config/deployment-operational-objectives.json",
        "operational objectives",
    );
    const receipts = [],
        ignored = [];
    for (const name of fs.readdirSync(directory).sort()) {
        const file = path.join(directory, name),
            stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink())
            throw new ContractError(`unsafe evidence object: ${name}`);
        let value;
        try {
            value = readJson(file, `evidence ${name}`, { ownerOnly: true });
        } catch (error) {
            throw new ContractError(`untrustworthy evidence history: ${error.message}`);
        }
        if (!value.receiptType) {
            ignored.push({ path: path.resolve(file), reason: "not-a-receipt" });
            continue;
        }
        const entry = registered.get(value.receiptType);
        if (!entry)
            throw new ContractError(
                `unregistered receipt in evidence history: ${value.receiptType}`,
            );
        verifyReceiptFile(file, { now, ownerOnly: true });
        rejectSensitive(value);
        receipts.push({
            file: path.resolve(file),
            value,
            assurance: entry.semanticVerifier.endsWith("-compatibility")
                ? "compatibility"
                : "canonical",
        });
    }
    const counts = { fixture: 0, local: 0, production: 0 },
        statuses = {},
        metrics = Object.fromEntries(metricFields.map((key) => [key, []]));
    for (const { value } of receipts) {
        if (!["fixture", "local", "production"].includes(value.scope)) continue;
        counts[value.scope] += 1;
        const status = value.status ?? "unknown";
        statuses[status] = (statuses[status] ?? 0) + 1;
        for (const field of metricFields) {
            const candidate = value[field] ?? value.result?.[field];
            if (Number.isFinite(candidate) && candidate >= 0) metrics[field].push(candidate);
        }
    }
    const alerts = [];
    const add = (category, severity, message, evidence = [], releaseId = null, scope = "fixture") =>
        alerts.push({
            schemaVersion: 1,
            eventType: "release-alert",
            eventId: crypto
                .createHash("sha256")
                .update(`${category}:${message}:${evidence.join(",")}`)
                .digest("hex"),
            severity,
            scope,
            category,
            observedAt: now.toISOString(),
            releaseId,
            evidence,
            owner: "release-operator",
            message,
        });
    const backups = receipts.filter(
        ({ value }) =>
            value.receiptType === "runtime-state-backup-qualification" &&
            value.status === "success",
    );
    if (!backups.length)
        add("stale-backup", "critical", "No qualified backup evidence was discovered.");
    else {
        const newest = Math.max(...backups.map(({ value }) => Date.parse(value.finishedAt)));
        if (now.getTime() - newest > objectives.freshnessSeconds.qualifiedBackup * 1000)
            add(
                "stale-backup",
                "critical",
                `The newest qualified backup exceeds the ${objectives.freshnessSeconds.qualifiedBackup}-second policy limit.`,
                backups.map(({ file }) => file),
            );
    }
    const restores = receipts.filter(
        ({ value }) =>
            [
                "release-local-verification",
                "runtime-state-application-restore-verification",
            ].includes(value.receiptType) && ["success", "passed"].includes(value.status),
    );
    if (!restores.length)
        add(
            "restore-overdue",
            "warning",
            "No successful application restore verification evidence was discovered.",
        );
    const remotes = receipts.filter(
        ({ value }) =>
            value.receiptType === "runtime-state-remote-download-verification" &&
            value.status === "success",
    );
    if (!remotes.length)
        add(
            "missing-remote-verification",
            "warning",
            "No remote download verification evidence was discovered.",
        );
    const resilience = receipts.filter(
        ({ value }) =>
            value.receiptType === "runtime-state-resilience-qualification" &&
            value.status === "success",
    );
    if (!resilience.length)
        add(
            "missing-resilience-evidence",
            "warning",
            "Remote publication is not evidence of 3-2-1 resilience qualification.",
        );
    const failedAttempts = receipts.filter(({ value }) =>
        ["failed", "failure", "blocked", "recovered"].includes(value.status),
    );
    if (failedAttempts.length >= 3)
        add(
            "repeated-failure",
            "critical",
            `${failedAttempts.length} failed, blocked, or recovered operations were discovered.`,
            failedAttempts.map(({ file }) => file),
        );
    for (const { file, value } of receipts) {
        const downtime =
            value.measuredDowntimeMilliseconds ??
            value.result?.measuredDowntimeMilliseconds ??
            value.userVisibleDowntimeMilliseconds;
        if (Number.isFinite(downtime) && downtime > objectives.routineDowntimeMilliseconds)
            add(
                "downtime-slo",
                "warning",
                `Observed downtime ${downtime}ms exceeds the ${objectives.routineDowntimeMilliseconds}ms policy limit.`,
                [file],
                value.release?.releaseId ?? null,
                value.scope,
            );
        const rollback =
            value.receiptType === "app-only-rollback"
                ? (value.durationMilliseconds ?? value.rollbackDurationMilliseconds)
                : null;
        if (
            Number.isFinite(rollback) &&
            rollback > objectives.recoveryTimeMilliseconds.applicationRollback
        )
            add(
                "rto-slo",
                "warning",
                `Observed app rollback ${rollback}ms exceeds the ${objectives.recoveryTimeMilliseconds.applicationRollback}ms policy limit.`,
                [file],
                value.release?.releaseId ?? null,
                value.scope,
            );
    }
    const summary = {
        schemaVersion: 1,
        summaryType: "release-observability-summary",
        generatedAt: now.toISOString(),
        sourceDirectory: directory,
        policy: {
            id: objectives.contractId,
            sha256: sha256File("config/deployment-operational-objectives.json"),
        },
        samples: receipts.length,
        ignored,
        assuranceCounts: {
            canonical: receipts.filter((item) => item.assurance === "canonical").length,
            compatibility: receipts.filter((item) => item.assurance === "compatibility").length,
        },
        scopeCounts: counts,
        statusCounts: statuses,
        outcomes: {
            successful: statuses.success ?? 0,
            recoveredFailures: statuses.recovered ?? 0,
            failedOrBlocked: failedAttempts.length,
        },
        metrics: Object.fromEntries(
            Object.entries(metrics).map(([key, values]) => [
                key,
                {
                    samples: values.length,
                    minimum: values.length ? Math.min(...values) : null,
                    median: percentile(values, 0.5),
                    p95: percentile(values, 0.95),
                    maximum: values.length ? Math.max(...values) : null,
                },
            ]),
        ),
        alerts: {
            total: alerts.length,
            critical: alerts.filter((item) => item.severity === "critical").length,
            warning: alerts.filter((item) => item.severity === "warning").length,
        },
    };
    publishJsonNoOverwrite(o.output, summary);
    if (o.alerts)
        publishJsonNoOverwrite(o.alerts, {
            schemaVersion: 1,
            eventType: "release-alert-batch",
            generatedAt: now.toISOString(),
            policySha256: summary.policy.sha256,
            events: alerts,
        });
    console.log(
        `Release summary: ${receipts.length} verified samples (${counts.production} production, ${counts.fixture} fixture); ${alerts.length} alerts`,
    );
} catch (error) {
    console.error(`Release observability rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
