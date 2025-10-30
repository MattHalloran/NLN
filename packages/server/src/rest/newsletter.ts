import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";
import { newsletterSubscribeLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/**
 * POST /api/rest/v1/newsletter/subscribe
 * Subscribe to newsletter (public endpoint)
 */
router.post("/subscribe", newsletterSubscribeLimiter, async (req: Request, res: Response) => {
    try {
        const { email, variantId, source = "homepage" } = req.body;
        const { prisma } = req as any;

        // Validate email
        if (!email || typeof email !== "string") {
            return res.status(400).json({ error: "Email is required" });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Normalize email (lowercase, trim)
        const normalizedEmail = email.toLowerCase().trim();

        // Check if already subscribed
        const existing = await prisma.newsletter_subscription.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            // If they previously unsubscribed, reactivate
            if (existing.status === "unsubscribed") {
                await prisma.newsletter_subscription.update({
                    where: { email: normalizedEmail },
                    data: {
                        status: "active",
                        variant_id: variantId || existing.variant_id,
                    },
                });
                return res.json({
                    success: true,
                    message: "Welcome back! You've been resubscribed.",
                });
            }

            // Already subscribed
            return res.json({
                success: true,
                message: "You're already subscribed!",
            });
        }

        // Create new subscription
        await prisma.newsletter_subscription.create({
            data: {
                email: normalizedEmail,
                variant_id: variantId || null,
                source,
                status: "active",
            },
        });

        logger.log(LogLevel.info, "Newsletter subscription created", {
            email: normalizedEmail,
            variantId,
            source,
        });

        return res.json({
            success: true,
            message: "Thank you for subscribing!",
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Newsletter subscription error:", error);
        return res.status(500).json({ error: "Failed to subscribe" });
    }
});

/**
 * GET /api/rest/v1/newsletter/subscribers
 * Get list of newsletter subscribers (admin only)
 */
router.get("/subscribers", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }
        const { page = 1, limit = 50, status, variantId, search } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
        const skip = (pageNum - 1) * limitNum;

        // Build filter
        const where: any = {};
        if (status) {
            where.status = status;
        }
        if (variantId) {
            where.variant_id = variantId;
        }
        if (search) {
            where.email = {
                contains: search as string,
                mode: "insensitive",
            };
        }

        // Get subscribers with pagination
        const [subscribers, total] = await Promise.all([
            prisma.newsletter_subscription.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.newsletter_subscription.count({ where }),
        ]);

        // Get statistics
        const stats = await prisma.newsletter_subscription.groupBy({
            by: ["status"],
            _count: true,
        });

        const statusCounts = stats.reduce(
            (acc: any, stat: any) => {
                acc[stat.status] = stat._count;
                return acc;
            },
            {} as Record<string, number>,
        );

        return res.json({
            subscribers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
            stats: {
                total,
                byStatus: statusCounts,
            },
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get newsletter subscribers error:", error);
        return res.status(500).json({ error: "Failed to fetch subscribers" });
    }
});

/**
 * GET /api/rest/v1/newsletter/subscribers/export
 * Export newsletter subscribers as CSV (admin only)
 */
router.get("/subscribers/export", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }
        const { status } = req.query;

        // Build filter
        const where: any = {};
        if (status) {
            where.status = status;
        }

        // Get all subscribers
        const subscribers = await prisma.newsletter_subscription.findMany({
            where,
            orderBy: { created_at: "desc" },
        });

        // Build CSV
        const headers = ["Email", "Variant ID", "Source", "Status", "Subscribed At"];
        const rows = subscribers.map((sub: any) => [
            sub.email,
            sub.variant_id || "",
            sub.source,
            sub.status,
            new Date(sub.created_at).toISOString(),
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((row: string[]) =>
                row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
            ),
        ].join("\n");

        // Set headers for CSV download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv"`,
        );

        return res.send(csv);
    } catch (error: any) {
        logger.log(LogLevel.error, "Export newsletter subscribers error:", error);
        return res.status(500).json({ error: "Failed to export subscribers" });
    }
});

/**
 * DELETE /api/rest/v1/newsletter/subscribers/:id
 * Delete or unsubscribe a newsletter subscriber (admin only)
 */
router.delete("/subscribers/:id", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }
        const { id } = req.params;
        const { action = "unsubscribe" } = req.body; // "unsubscribe" or "delete"

        const subscriberId = parseInt(id, 10);
        if (isNaN(subscriberId)) {
            return res.status(400).json({ error: "Invalid subscriber ID" });
        }

        if (action === "delete") {
            // Permanently delete
            await prisma.newsletter_subscription.delete({
                where: { id: subscriberId },
            });

            logger.log(LogLevel.info, "Newsletter subscriber deleted", { id: subscriberId });

            return res.json({
                success: true,
                message: "Subscriber deleted",
            });
        } else {
            // Unsubscribe (soft delete)
            await prisma.newsletter_subscription.update({
                where: { id: subscriberId },
                data: { status: "unsubscribed" },
            });

            logger.log(LogLevel.info, "Newsletter subscriber unsubscribed", { id: subscriberId });

            return res.json({
                success: true,
                message: "Subscriber unsubscribed",
            });
        }
    } catch (error: any) {
        logger.log(LogLevel.error, "Delete newsletter subscriber error:", error);
        return res.status(500).json({ error: "Failed to delete subscriber" });
    }
});

/**
 * GET /api/rest/v1/newsletter/stats
 * Get newsletter subscription statistics (admin only)
 */
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        // Get total counts by status
        const statusCounts = await prisma.newsletter_subscription.groupBy({
            by: ["status"],
            _count: true,
        });

        // Get counts by variant
        const variantCounts = await prisma.newsletter_subscription.groupBy({
            by: ["variant_id"],
            _count: true,
            where: {
                status: "active",
            },
        });

        // Get recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSignups = await prisma.newsletter_subscription.count({
            where: {
                created_at: { gte: sevenDaysAgo },
                status: "active",
            },
        });

        // Get recent signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const signupsThisMonth = await prisma.newsletter_subscription.count({
            where: {
                created_at: { gte: thirtyDaysAgo },
                status: "active",
            },
        });

        return res.json({
            byStatus: statusCounts.reduce(
                (acc: any, stat: any) => {
                    acc[stat.status] = stat._count;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            byVariant: variantCounts.map((v: any) => ({
                variantId: v.variant_id,
                count: v._count,
            })),
            recentActivity: {
                last7Days: recentSignups,
                last30Days: signupsThisMonth,
            },
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get newsletter stats error:", error);
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
});

export default router;
