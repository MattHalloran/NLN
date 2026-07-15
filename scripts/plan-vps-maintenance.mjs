import { verifyMaintenancePrerequisites } from "./lib/maintenance-prerequisites.mjs";
import {
    canonicalJson,
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    sha256Bytes,
} from "./lib/phase10-safe-io.mjs";
if (process.argv.includes("--help")) {
    console.log(
        "Usage: plan-vps-maintenance.mjs --inventory FILE --actions ID[,ID] --output FILE [--policy FILE] [--now ISO]\nEffect: fixture-only dry-run planning; performs no maintenance.",
    );
    process.exit(0);
}
const o = parseOptions(process.argv.slice(2));
const fail = (m) => {
    console.error(`Maintenance plan rejected: ${m}`);
    process.exit(1);
};
if (!o.inventory || !o.output) fail("--inventory and --output are required");
let policy, inv;
try {
    policy = readJson(
        o.policy ?? "config/vps-health-maintenance-policy.json",
        "maintenance policy",
    );
    inv = readJson(o.inventory, "maintenance inventory");
} catch (error) {
    fail(error instanceof ContractError ? error.message : "invalid maintenance input");
}
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
const planHash = sha256Bytes(canonicalJson(base)),
    plan = { ...base, planHash };
try {
    publishJsonNoOverwrite(o.output, plan);
} catch (error) {
    fail(error.message);
}
console.log(`Maintenance dry-run plan created: ${planHash}`);
