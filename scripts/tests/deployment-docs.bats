#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

DOC_PATH="$BATS_TEST_DIRNAME/../../DEPLOYMENT.md"
RUNBOOK_PATH="$BATS_TEST_DIRNAME/../../docs/release-runbook.md"
MIGRATION_RISK_PATH="$BATS_TEST_DIRNAME/../../docs/MIGRATION_RISK.md"
REDIS_RUNTIME_STATE_PATH="$BATS_TEST_DIRNAME/../../docs/redis-runtime-state.md"
DEPLOYMENT_SLO_PATH="$BATS_TEST_DIRNAME/../../docs/deployment-slo.md"
VPS_MAINTENANCE_PATH="$BATS_TEST_DIRNAME/../../docs/vps-maintenance.md"

@test "deployment docs make deploy-production the routine production path" {
    grep -q '`deploy-production.sh` is the only routine production deployment entry point' "${DOC_PATH}"
    grep -q "./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod" "${DOC_PATH}"
    grep -q "./scripts/deploy-production.sh -v <VERSION> -e .env-prod" "${DOC_PATH}"
}

@test "deployment docs label manual build and ssh deploy as advanced-only" {
    grep -q "Advanced Manual Recovery / Debugging" "${DOC_PATH}"
    grep -q 'Routine production deployments should use `deploy-production.sh`, not manual build plus SSH deploy' "${DOC_PATH}"
    grep -q "Manual paths are more error-prone" "${DOC_PATH}"
}

@test "release runbook names prepare and deploy-production as the normal path" {
    grep -q "./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod" "${RUNBOOK_PATH}"
    grep -q "./scripts/deploy-production.sh -v <VERSION> -e .env-prod" "${RUNBOOK_PATH}"
    grep -q '`deploy-production.sh` is the routine production entry point' "${RUNBOOK_PATH}"
}

@test "release runbook keeps mutation scripts in advanced recovery paths" {
    grep -q "Do not use .* direct \`deploy.sh\`, \`rollback.sh\`, or \`restore-runtime-state.sh --execute\` as the normal deployment path" "${RUNBOOK_PATH}"
    grep -q "remote \`./scripts/deploy.sh\`" "${RUNBOOK_PATH}"
    grep -q "\`./scripts/rollback.sh\`" "${RUNBOOK_PATH}"
    grep -q "\`./scripts/restore-runtime-state.sh --execute\`" "${RUNBOOK_PATH}"
    grep -q "Forbidden Unless Separately Approved" "${RUNBOOK_PATH}"
}

@test "release runbook lists release stop conditions and rollback choices" {
    grep -q "Stop Conditions" "${RUNBOOK_PATH}"
    grep -q "readiness or validation fails" "${RUNBOOK_PATH}"
    grep -q "App-only non-database recovery" "${RUNBOOK_PATH}"
    grep -q "Full runtime-state restore from the current deploy slot" "${RUNBOOK_PATH}"
    grep -q "Older-version rollback" "${RUNBOOK_PATH}"
    grep -q "Emergency dump salvage" "${RUNBOOK_PATH}"
}

@test "migration risk doc classifies destructive migrations and required evidence" {
    grep -q "Safe additive" "${MIGRATION_RISK_PATH}"
    grep -q "Backfill" "${MIGRATION_RISK_PATH}"
    grep -q "Expand/contract" "${MIGRATION_RISK_PATH}"
    grep -q "Destructive" "${MIGRATION_RISK_PATH}"
    grep -q "deploy-safe: allow-destructive-migration" "${MIGRATION_RISK_PATH}"
    grep -q "restored-backup migration rehearsal receipt" "${MIGRATION_RISK_PATH}"
    grep -q "rollback implications" "${MIGRATION_RISK_PATH}"
    grep -q "MIGRATION_RISK.md" "${RUNBOOK_PATH}"
}

@test "redis runtime-state doc classifies backup semantics" {
    grep -q "operationally important but recoverable" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "Bull queues" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "Rate limiting" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "Distributed locks" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "Cache" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "best-effort-file-copy" "${REDIS_RUNTIME_STATE_PATH}"
    grep -q "PostgreSQL is the data of record" "${RUNBOOK_PATH}"
}

@test "deployment SLO doc names timing receipts and budgets" {
    grep -q "RPO for routine deploy" "${DEPLOYMENT_SLO_PATH}"
    grep -q "App-only recovery RTO" "${DEPLOYMENT_SLO_PATH}"
    grep -q "Full database rollback RTO" "${DEPLOYMENT_SLO_PATH}"
    grep -q "Routine deploy downtime" "${DEPLOYMENT_SLO_PATH}"
    grep -q "deploy-downtime.receipt" "${DEPLOYMENT_SLO_PATH}"
    grep -q "deployment-slo.md" "${RUNBOOK_PATH}"
}

@test "VPS maintenance doc keeps healthcheck read-only and remediation manual" {
    grep -q "vps-healthcheck.sh -e .env-prod" "${VPS_MAINTENANCE_PATH}"
    grep -q "read-only" "${VPS_MAINTENANCE_PATH}"
    grep -q "must not silently clean up disk, prune Docker resources, update packages, restart services, restore data, or delete files" "${VPS_MAINTENANCE_PATH}"
    grep -q "at least \`15%\`" "${VPS_MAINTENANCE_PATH}"
    grep -q "at least \`5 GB\`" "${VPS_MAINTENANCE_PATH}"
    grep -q "vps-maintenance.md" "${RUNBOOK_PATH}"
}

@test "scheduled restore drill workflow uses fixture data only" {
    workflow="$BATS_TEST_DIRNAME/../../.github/workflows/restore-drill.yml"
    grep -q "schedule:" "${workflow}"
    grep -q "workflow_dispatch:" "${workflow}"
    grep -q "Create synthetic runtime-state backup" "${workflow}"
    grep -q "./scripts/restore-drill.sh --backup /tmp/nln-fixture-backup" "${workflow}"
    grep -q "restore-drill-receipts" "${workflow}"
    ! grep -q ".env-prod" "${workflow}" || grep -q 'cat >"$backup_dir/.env-prod"' "${workflow}"
    grep -q "restore-drill.yml" "${DEPLOYMENT_SLO_PATH}"
    grep -q "Scheduled deploy rehearsal and restore drill workflows are green" "${RUNBOOK_PATH}"
}
