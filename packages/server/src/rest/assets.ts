import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { readFiles, saveFiles } from "../utils/index.js";
import { logger } from "../logger.js";

const router = Router();

/**
 * POST /api/rest/v1/assets/read
 * Read asset files
 */
router.post("/read", async (req: Request, res: Response) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: "Files array required" });
        }

        const data = await readFiles(files);

        // Convert array response to object with filenames as keys
        const result: Record<string, string> = {};
        files.forEach((file, index) => {
            result[file] = data[index] ?? "";
        });

        return res.json(result);
    } catch (error: any) {
        logger.error("Read assets error:", error);
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

        const files = (req as any).files || [];

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const data = await saveFiles(files);

        // Any failed writes will return null
        const success = !data.some((d: any) => d === null);

        return res.json({ success });
    } catch (error: any) {
        logger.error("Write assets error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to write assets" });
    }
});

export default router;
