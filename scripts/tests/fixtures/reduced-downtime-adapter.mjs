#!/usr/bin/env node
import fs from "node:fs";
const [op, payloadText] = process.argv.slice(2),
    payload = JSON.parse(payloadText ?? "{}");
const statePath = process.env.REDUCED_DOWNTIME_FIXTURE_STATE;
if (!statePath) process.exit(2);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
state.log ??= [];
state.log.push({ op, payload });
const failure = state.failOperation === op;
if (failure) {
    fs.writeFileSync(statePath, JSON.stringify(state));
    console.error("redacted fixture failure");
    process.exit(1);
}
let result = { status: "success" };
if (op === "inspect-protected-state")
    result = { services: state.services, writeSentinel: state.writeSentinel };
if (op === "preflight")
    result = {
        status: "success",
        completed: state.omitPreflight
            ? payload.checks.filter((x) => x !== state.omitPreflight)
            : payload.checks,
    };
if (op === "public-probe") {
    const unavailable = (state.unavailableProbes ?? 0) > 0;
    if (unavailable) state.unavailableProbes -= 1;
    result = { available: !unavailable };
}
if (op === "activate" && state.outageOnActivate && payload.service === "server")
    state.unavailableProbes = state.outageOnActivate;
if (op === "activate" && state.mutateProtectedState) {
    state.services.db.containerId = "changed";
}
if (op === "app-rollback") {
    state.unavailableProbes = 0;
    result = { status: "success" };
}
fs.writeFileSync(statePath, JSON.stringify(state));
process.stdout.write(JSON.stringify(result));
