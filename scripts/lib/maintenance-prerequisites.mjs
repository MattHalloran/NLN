import { ContractError, assertFresh, readJson, sha256File } from "./phase10-safe-io.mjs";
import { readAndVerifyBackupQualification } from "./backup-qualification.mjs";

export function verifyMaintenancePrerequisites(references, { now = new Date(), maximumAgeSeconds = 86400 } = {}) {
    if (!references || typeof references !== "object" || Array.isArray(references)) throw new ContractError("maintenance prerequisite receipt references are required");
    const backup = readAndVerifyBackupQualification(references.qualifiedBackupReceipt, { maxAgeSeconds: maximumAgeSeconds, now });
    const verifySimple = (file, type, label) => {
        const value = readJson(file, label);
        if (value.schemaVersion !== 1 || value.receiptType !== type || value.status !== "success" || value.scope !== "fixture") throw new ContractError(`${label} is not exact successful fixture evidence`);
        assertFresh(value.finishedAt, maximumAgeSeconds, now);
        if (!/^[0-9a-f]{64}$/.test(value.policy?.sha256 ?? "") || !/^[0-9a-f]{64}$/.test(value.archive?.sha256 ?? "")) throw new ContractError(`${label} lacks policy or archive identity`);
        return { value, sha256: sha256File(file) };
    };
    const remote = verifySimple(references.remoteDownloadReceipt, "runtime-state-remote-download-verification", "remote download verification receipt");
    const restore = verifySimple(references.restoreReceipt, "runtime-state-application-restore-verification", "application restore verification receipt");
    if (backup.value.archive.sha256 !== remote.value.archive.sha256 || backup.value.archive.sha256 !== restore.value.archive.sha256) throw new ContractError("maintenance prerequisite receipts refer to different archives");
    return {
        qualifiedBackup: { path: references.qualifiedBackupReceipt, sha256: backup.sha256, receiptType: backup.value.receiptType, finishedAt: backup.value.finishedAt },
        remoteDownload: { path: references.remoteDownloadReceipt, sha256: remote.sha256, receiptType: remote.value.receiptType, finishedAt: remote.value.finishedAt },
        applicationRestore: { path: references.restoreReceipt, sha256: restore.sha256, receiptType: restore.value.receiptType, finishedAt: restore.value.finishedAt },
    };
}
