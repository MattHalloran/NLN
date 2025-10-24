import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";

const router = Router();

/**
 * GET /api/rest/v1/dashboard/stats
 * Get dashboard statistics (admin only)
 */
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const { prisma, isAdmin } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        // Get all customers
        const customers = await prisma.customer.findMany({
            select: {
                id: true,
                accountApproved: true,
            },
        });

        const totalCustomers = customers.length;
        const approvedCustomers = customers.filter((c: any) => c.accountApproved).length;

        // For now, return zeros for orders and products since those are archived
        // In the future, these would query the actual models
        const pendingOrders = 0;
        const totalProducts = 0;
        const totalSkus = 0;

        return res.json({
            totalCustomers,
            approvedCustomers,
            pendingOrders,
            totalProducts,
            totalSkus,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get dashboard stats error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get dashboard stats" });
    }
});

export default router;
