import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { verifyMaintenancePrerequisites } from "./lib/maintenance-prerequisites.mjs";
if (process.argv.includes("--help")) {
    console.log(
        "Usage: plan-vps-maintenance.mjs --inventory FILE --actions ID[,ID] --output FILE [--policy FILE] [--now ISO]\nEffect: fixture-only dry-run planning; performs no maintenance.",
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
const fail = (m) => {
    console.error(`Maintenance plan rejected: ${m}`);
    process.exit(1);
};
if (!o.inventory || !o.output) fail("--inventory and --output are required");
if (fs.existsSync(o.output)) fail("output already exists");
const read = (p) => {
    const s = fs.lstatSync(p);
    if (!s.isFile() || s.isSymbolicLink()) fail(`${p} must be a regular file`);
    return JSON.parse(fs.readFileSync(p, "utf8"));
};
const policy = read(o.policy ?? "config/vps-health-maintenance-policy.json"),
    inv = read(o.inventory);
if (
    policy.productionIntegrationEnabled !== false ||
    policy.maintenance.deploymentIntegrationEnabled !== false
)
    fail("production/deployment integration enabled");
if (
    inv.fixture !== true ||
    inv.production !== false ||
    typeof inv.hostFingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(inv.hostFingerprint)
)
    fail("fixture inventory or host fingerprint invalid");
if (!Array.isArray(inv.actions)) fail("inventory actions missing");
const selected = (o.actions ?? "").split(",").filter(Boolean),
    seen = new Set(),
    actions = [];
for (const id of selected) {
    if (seen.has(id)) fail(`duplicate action ${id}`);
    seen.add(id);
    const item = inv.actions.find((x) => x.id === id);
    if (!item) fail(`unknown action ${id}`);
    if (
        typeof item.commandClass !== "string" ||
        typeof item.reason !== "string" ||
        item.reason.length < 8
    )
        fail(`incomplete action ${id}`);
    if (item.cleanupClass && policy.protectedCleanupClasses.includes(item.cleanupClass))
        fail(`action ${id} targets protected ${item.cleanupClass}`);
    if (item.destructive === true && !item.recoveryProcedure)
        fail(`destructive action ${id} lacks recovery procedure`);
    actions.push({
        id: item.id,
        commandClass: item.commandClass,
        reason: item.reason,
        destructive: item.destructive === true,
        cleanupClass: item.cleanupClass ?? null,
        expectedReclaimedBytes: item.expectedReclaimedBytes ?? 0,
        expectedDowntimeSeconds: item.expectedDowntimeSeconds ?? 0,
        recoveryProcedure: item.recoveryProcedure ?? null,
    });
}
if (actions.length === 0) fail("at least one explicit action is required");
const base = {
    schemaVersion: 1,
    receiptType: "vps-maintenance-plan",
    status: "planned",
    fixture: true,
    productionMutation: false,
    createdAt: o.now ?? new Date().toISOString(),
    hostFingerprint: inv.hostFingerprint,
    prerequisites: verifyMaintenancePrerequisites(inv.prerequisites, {
        now: new Date(o.now ?? Date.now()),
        maximumAgeSeconds: policy.thresholds.maximumBackupAgeSeconds,
    }),
    actions,
};
const planHash = crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex"),
    plan = { ...base, planHash };
fs.mkdirSync(path.dirname(o.output), { recursive: true, mode: 0o700 });
fs.writeFileSync(o.output, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(`Maintenance dry-run plan created: ${planHash}`);
