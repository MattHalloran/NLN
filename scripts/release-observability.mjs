#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ContractError, parseOptions, publishJsonNoOverwrite, readJson } from "./lib/phase10-safe-io.mjs";

const [command, ...argv] = process.argv.slice(2);
const metricFields = ["durationMilliseconds", "userVisibleDowntimeMilliseconds", "measuredDowntimeMilliseconds", "archiveBytes", "backupDurationMilliseconds", "restoreDurationMilliseconds", "rollbackDurationMilliseconds"];
const percentile = (values, p) => values.length ? [...values].sort((a,b)=>a-b)[Math.min(values.length-1, Math.ceil(values.length*p)-1)] : null;
try {
    if (command !== "summarize") throw new ContractError("Usage: release-observability.mjs summarize --directory DIR --output FILE [--alerts FILE] [--now ISO]", 2);
    const o = parseOptions(argv); if (!o.directory || !o.output) throw new ContractError("--directory and --output are required", 2);
    const now = new Date(o.now ?? Date.now()); if (!Number.isFinite(now.getTime())) throw new ContractError("--now is invalid");
    const receipts = [];
    for (const name of fs.readdirSync(o.directory)) { const file = path.join(o.directory,name); try { const value=readJson(file); if (value.schemaVersion===1 && value.receiptType) receipts.push({file:path.resolve(file),value}); } catch {} }
    const counts = { fixture: 0, local: 0, production: 0, unknown: 0 }, statuses = {}, metrics = Object.fromEntries(metricFields.map(k=>[k,[]]));
    for (const {value} of receipts) { const scope=value.scope ?? (value.fixture===true?"fixture":"unknown"); counts[scope]=(counts[scope]??0)+1; const status=value.status??"unknown";statuses[status]=(statuses[status]??0)+1; for(const field of metricFields)if(Number.isFinite(value[field]))metrics[field].push(value[field]); }
    const alerts=[]; const add=(category,severity,message,evidence=[],releaseId=null,scope="fixture")=>alerts.push({schemaVersion:1,eventType:"release-alert",eventId:crypto.createHash("sha256").update(`${category}:${message}:${evidence.join(",")}`).digest("hex"),severity,scope,category,observedAt:now.toISOString(),releaseId,evidence,owner:"release-operator",message});
    const backups=receipts.filter(x=>x.value.receiptType==="runtime-state-backup-qualification"&&x.value.status==="success");
    if(!backups.length)add("stale-backup","critical","No qualified backup evidence was discovered."); else { const newest=Math.max(...backups.map(x=>Date.parse(x.value.finishedAt)));if(now.getTime()-newest>86400000)add("stale-backup","critical","The newest qualified backup exceeds the 24-hour fixture threshold.",backups.map(x=>x.file)); }
    const restores=receipts.filter(x=>["runtime-state-application-restore-verification","restore-drill"].includes(x.value.receiptType));if(!restores.length)add("restore-overdue","warning","No application restore verification evidence was discovered.");
    const remotes=receipts.filter(x=>x.value.receiptType==="runtime-state-remote-download-verification");if(!remotes.length)add("missing-remote-verification","warning","No remote download verification evidence was discovered.");
    const resilience=receipts.filter(x=>x.value.receiptType==="runtime-state-resilience-qualification");if(!resilience.length)add("missing-resilience-evidence","warning","Remote publication is not evidence of 3-2-1 resilience qualification.");
    const failures=receipts.filter(x=>["failed","failure","blocked"].includes(x.value.status));if(failures.length>=3)add("repeated-failure","critical",`${failures.length} failed or blocked operations were discovered.`,failures.map(x=>x.file));
    for(const x of receipts){const d=x.value.measuredDowntimeMilliseconds??x.value.userVisibleDowntimeMilliseconds;if(Number.isFinite(d)&&d>60000)add("downtime-slo","warning",`Observed downtime ${d}ms exceeds the 60000ms policy limit.`,[x.file],x.value.release?.releaseId??null,x.value.scope??"fixture");}
    const summary={schemaVersion:1,summaryType:"release-observability-summary",generatedAt:now.toISOString(),sourceDirectory:path.resolve(o.directory),samples:receipts.length,scopeCounts:counts,statusCounts:statuses,metrics:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,{samples:v.length,minimum:v.length?Math.min(...v):null,median:percentile(v,.5),p95:percentile(v,.95),maximum:v.length?Math.max(...v):null}])),alerts:{total:alerts.length,critical:alerts.filter(x=>x.severity==="critical").length,warning:alerts.filter(x=>x.severity==="warning").length}};
    publishJsonNoOverwrite(o.output,summary);if(o.alerts)publishJsonNoOverwrite(o.alerts,{schemaVersion:1,eventType:"release-alert-batch",generatedAt:now.toISOString(),events:alerts});
    console.log(`Release summary: ${receipts.length} samples (${counts.production} production, ${counts.fixture} fixture); ${alerts.length} alerts`);
} catch(error){console.error(`Release observability rejected: ${error.message}`);process.exit(error.exitCode??1);}
