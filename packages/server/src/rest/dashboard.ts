import { CODE, REST_CHILD_PATHS } from "@local/shared";
import { Router, Request, Response } from "express";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";

const router = Router();

type DashboardCustomer = {
    accountApproved: boolean;
};

export function buildDashboardStats(customers: DashboardCustomer[]) {
    const totalCustomers = customers.length;
    const approvedCustomers = customers.filter((customer) => customer.accountApproved).length;

    return {
        totalCustomers,
        approvedCustomers,
        pendingOrders: 0,
        totalProducts: 0,
        totalSkus: 0,
    };
}

/**
 * GET /api/rest/v1/dashboard/stats
 * Get dashboard statistics (admin only)
 */
router.get(REST_CHILD_PATHS.dashboard.stats, async (req: Request, res: Response) => {
    try {
        const { prisma, isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }
        if (!prisma) {
            throw new Error("Prisma client unavailable on request");
        }

        // Get all customers
        const customers = await prisma.customer.findMany({
            select: {
                id: true,
                accountApproved: true,
            },
        });

        return res.json(buildDashboardStats(customers));
    } catch (error) {
        logger.log(LogLevel.error, "Get dashboard stats error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get dashboard stats" });
    }
});

export default router;
