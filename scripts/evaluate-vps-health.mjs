import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
if (process.argv.includes("--help")) {
    console.log(
        "Usage: evaluate-vps-health.mjs --adapter FILE --output FILE [--policy FILE] [--now ISO]\nEffect: fixture/local read-only observation; production integration disabled.",
    );
    process.exit(0);
}
const a = process.argv.slice(2),
    o = {};
for (let i = 0; i < a.length; i += 2) {
    if (!a[i]?.startsWith("--") || !a[i + 1]) {
        console.error("Invalid arguments");
        process.exit(2);
    }
    o[a[i].slice(2)] = a[i + 1];
}
if (!o.adapter || !o.output) {
    console.error("--adapter and --output are required");
    process.exit(2);
}
const fail = (m) => {
        throw new Error(m);
    },
    read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
if (fs.existsSync(o.output)) {
    console.error("VPS health receipt already exists");
    process.exit(1);
}
const policy = read(o.policy ?? "config/vps-health-maintenance-policy.json");
if (policy.productionIntegrationEnabled !== false) fail("production integration enabled");
const adapter = path.resolve(o.adapter),
    st = fs.lstatSync(adapter);
if (!st.isFile() || st.isSymbolicLink()) fail("adapter must be a regular file");
let facts;
try {
    facts = JSON.parse(
        execFileSync(adapter, ["observe", JSON.stringify({ mode: "read-only" })], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30000,
        }),
    );
} catch {
    console.error("VPS health observation failed (adapter output redacted)");
    process.exit(1);
}
const forbidden = /password|passwd|secret|token|credential|private.?key|authorization/i;
const inspect = (v, p = "facts") => {
    if (Array.isArray(v)) v.forEach((x, i) => inspect(x, `${p}[${i}]`));
    else if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
            if (forbidden.test(k)) fail(`sensitive field rejected at ${p}.${k}`);
            inspect(x, `${p}.${k}`);
        }
    else if (
        typeof v === "string" &&
        /(-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|gh[pousr]_[A-Za-z0-9]{20,})/.test(
            v,
        )
    )
        fail(`sensitive value rejected at ${p}`);
};
inspect(facts);
const checks = [];
const add = (id, classification, observed, recommendation) =>
    checks.push({ id, classification, observed, recommendation });
const t = policy.thresholds,
    now = Date.parse(o.now ?? new Date().toISOString());
if (!Number.isInteger(now)) fail("invalid --now");
add(
    "docker-daemon",
    facts.docker?.reachable === true ? "informational" : "blocking",
    { reachable: facts.docker?.reachable === true },
    "Restore Docker daemon health during separately approved maintenance.",
);
for (const name of policy.requiredContainers) {
    const c = facts.containers?.[name];
    let sev = "informational";
    if (!c || c.running !== true || c.health !== "healthy") sev = "blocking";
    else if (c.restarts > t.maximumContainerRestarts) sev = "warning";
    add(
        `container-${name}`,
        sev,
        c ?? { missing: true },
        "Inspect container health and restart history; do not restart it from this gate.",
    );
}
for (const area of policy.requiredDiskAreas) {
    const d = facts.disks?.[area];
    const bad = !d || d.freeBytes < t.minimumFreeBytes || d.freeInodes < t.minimumFreeInodes;
    add(
        `capacity-${area}`,
        bad ? "blocking" : "informational",
        d ?? { missing: true },
        "Inventory capacity and schedule separately approved cleanup if needed.",
    );
}
add(
    "postgres",
    facts.postgres?.ready === true &&
        facts.postgres?.readQuery === true &&
        facts.postgres?.partialMigrations === false
        ? "informational"
        : "blocking",
    facts.postgres ?? { missing: true },
    "Investigate database readiness, connectivity, locks, or migration state without mutation.",
);
add(
    "redis",
    facts.redis?.ping === true && facts.redis?.persistenceError !== true
        ? "informational"
        : "blocking",
    facts.redis ?? { missing: true },
    "Investigate Redis connectivity or persistence separately.",
);
if ((facts.host?.recentOomEvents ?? 0) > 0)
    add(
        "recent-oom",
        "blocking",
        { count: facts.host.recentOomEvents },
        "Investigate memory pressure before deployment.",
    );
else add("recent-oom", "informational", { count: 0 }, "No action required.");
add(
    "filesystem-errors",
    (facts.host?.filesystemErrors ?? 0) > 0 ? "blocking" : "informational",
    { count: facts.host?.filesystemErrors ?? 0 },
    "Investigate storage errors before deployment.",
);
const loadPerCpu = (facts.host?.load1 ?? Infinity) / (facts.host?.cpuCount ?? 1);
add(
    "host-load",
    loadPerCpu > t.maximumLoadPerCpu ? "warning" : "informational",
    { loadPerCpu },
    "Review sustained load before deployment.",
);
add(
    "failed-systemd-units",
    (facts.host?.failedSystemdUnits?.length ?? 0) > 0 ? "blocking" : "informational",
    { count: facts.host?.failedSystemdUnits?.length ?? 0 },
    "Resolve failed units in a maintenance window.",
);
add(
    "time-sync",
    facts.host?.timeSynchronized === true &&
        Math.abs(facts.host?.clockOffsetSeconds ?? Infinity) <= t.maximumClockOffsetSeconds
        ? "informational"
        : "blocking",
    {
        synchronized: facts.host?.timeSynchronized === true,
        offsetSeconds: facts.host?.clockOffsetSeconds ?? null,
    },
    "Repair time synchronization separately.",
);
add(
    "pending-reboot",
    facts.host?.pendingReboot === true ? "warning" : "informational",
    { pending: facts.host?.pendingReboot === true },
    "Schedule an explicit maintenance reboot; deployment will not perform it.",
);
const age = (x) => Math.floor((now - Date.parse(x)) / 1000);
const backupAge = age(facts.recovery?.qualifiedBackupAt);
add(
    "backup-freshness",
    Number.isFinite(backupAge) && backupAge >= 0 && backupAge <= t.maximumBackupAgeSeconds
        ? "informational"
        : "blocking",
    { ageSeconds: Number.isFinite(backupAge) ? backupAge : null },
    "Create and qualify a fresh backup separately.",
);
add(
    "remote-backup",
    facts.recovery?.remoteCopyQualified === true ? "informational" : "blocking",
    { qualified: facts.recovery?.remoteCopyQualified === true },
    "Restore independent encrypted backup publication health.",
);
const drillAge = age(facts.recovery?.restoreDrillAt);
add(
    "restore-drill",
    Number.isFinite(drillAge) && drillAge >= 0 && drillAge <= t.maximumRestoreDrillAgeSeconds
        ? "informational"
        : "warning",
    { ageSeconds: Number.isFinite(drillAge) ? drillAge : null },
    "Schedule a restore drill independently.",
);
add(
    "tls",
    (facts.network?.tlsDaysRemaining ?? -1) < t.minimumTlsDaysRemaining
        ? "blocking"
        : "informational",
    { daysRemaining: facts.network?.tlsDaysRemaining ?? null },
    "Renew and verify TLS separately.",
);
add(
    "public-endpoint",
    facts.network?.publicReachable === true ? "informational" : "blocking",
    { reachable: facts.network?.publicReachable === true },
    "Investigate routing without changing it from this gate.",
);
const packageAge = age(facts.packages?.metadataRefreshedAt);
add(
    "package-metadata",
    !Number.isFinite(packageAge) || packageAge > t.maximumPackageMetadataAgeSeconds
        ? "warning"
        : "informational",
    {
        ageSeconds: Number.isFinite(packageAge) ? packageAge : null,
        stale: !Number.isFinite(packageAge) || packageAge > t.maximumPackageMetadataAgeSeconds,
    },
    "Package information is observational; refresh only during maintenance.",
);
const counts = {
    blocking: checks.filter((x) => x.classification === "blocking").length,
    warning: checks.filter((x) => x.classification === "warning").length,
    informational: checks.filter((x) => x.classification === "informational").length,
};
const receipt = {
    schemaVersion: 1,
    receiptType: "vps-health-gate",
    status: counts.blocking ? "blocked" : "passed",
    observedAt: o.now ?? new Date().toISOString(),
    adapterMode: "read-only",
    policy: {
        id: policy.policyId,
        sha256: crypto
            .createHash("sha256")
            .update(fs.readFileSync(o.policy ?? "config/vps-health-maintenance-policy.json"))
            .digest("hex"),
    },
    factsSha256: crypto.createHash("sha256").update(JSON.stringify(facts)).digest("hex"),
    summary: counts,
    checks,
};
fs.mkdirSync(path.dirname(o.output), { recursive: true, mode: 0o700 });
fs.writeFileSync(o.output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(
    `VPS health gate ${receipt.status}: blocking=${counts.blocking} warning=${counts.warning}`,
);
if (counts.blocking) process.exit(1);
