import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { readFiles, saveFiles } from "../utils/index.js";
import { logger, LogLevel } from "../logger.js";
import { auditSecurityEvent, AuditEventType } from "../utils/auditLogger.js";

const router = Router();

/**
 * Whitelist of publicly accessible files
 * These files can be read without authentication (e.g., legal documents)
 */
const PUBLIC_READABLE_FILES = [
    "privacy.md",
    "terms.md",
    // Add other public documents here as needed
];

/**
 * POST /api/rest/v1/assets/read
 * Read asset files
 *
 * Security: Only whitelisted public files can be read without authentication.
 * This prevents unauthorized access to sensitive configuration or data files.
 */
router.post("/read", async (req: Request, res: Response) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: "Files array required" });
        }

        // Security check: Validate all requested files are in public whitelist
        const unauthorizedFiles = files.filter((file) => !PUBLIC_READABLE_FILES.includes(file));

        if (unauthorizedFiles.length > 0) {
            // Log security event for audit trail
            auditSecurityEvent(
                req,
                AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
                "Attempted to read non-whitelisted files",
                {
                    requestedFiles: files,
                    deniedFiles: unauthorizedFiles,
                    allowedFiles: PUBLIC_READABLE_FILES
                }
            );

            logger.log(LogLevel.warn, "🚫 Unauthorized file access attempt blocked", {
                ip: req.ip,
                requestedFiles: files,
                deniedFiles: unauthorizedFiles,
            });

            return res.status(403).json({
                error: "Access denied to requested files",
                deniedFiles: unauthorizedFiles,
                message: "Only whitelisted public documents can be accessed through this endpoint",
            });
        }

        const data = await readFiles(files);

        // Convert array response to object with filenames as keys
        const result: Record<string, string> = {};
        files.forEach((file, index) => {
            result[file] = data[index] ?? "";
        });

        return res.json(result);
    } catch (error: any) {
        logger.log(LogLevel.error, "Read assets error:", error);
        return res.status(500).json({ error: "Failed to read assets" });
    }
});

/**
 * POST /api/rest/v1/assets/write
 * Write asset files (admin only, multipart/form-data)
 */
router.post("/write", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        const multerFiles = (req as any).files || [];

        if (!multerFiles || multerFiles.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        // Convert multer files to GraphQL upload format expected by saveFiles
        const files = multerFiles.map((file: any) => ({
            createReadStream: () => {
                const { Readable } = require("stream");
                const stream = new Readable();
                stream.push(file.buffer);
                stream.push(null);
                return stream;
            },
            filename: file.originalname,
            mimetype: file.mimetype,
        }));

        const data = await saveFiles(files);

        // Any failed writes will return null
        const success = !data.some((d: any) => d === null);

        return res.json({ success });
    } catch (error: any) {
        logger.log(LogLevel.error, "Write assets error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to write assets" });
    }
});

export default router;
