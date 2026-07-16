import { Router, Request, Response } from "express";
import { CODE, REST_CHILD_PATHS } from "@local/shared";
import type { Prisma } from "@prisma/client";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";
import { createRateLimiters, type RateLimiters } from "../middleware/rateLimiter.js";

type NewsletterRouterLimiters = Pick<RateLimiters, "newsletterSubscribeLimiter">;

export type NewsletterRouterOptions = {
    limiters?: NewsletterRouterLimiters;
};

const getQueryString = (value: Request["query"][string]): string | undefined =>
    typeof value === "string" ? value : undefined;

type NewsletterStatusCount = {
    status: string;
    _count: number;
};

type NewsletterVariantCount = {
    variant_id: string | null;
    _count: number;
};

type NewsletterSubscriberCsvRow = {
    email: string;
    variant_id: string | null;
    source: string;
    status: string;
    created_at: Date | string;
};

export function normalizeNewsletterEmail(email: string): string {
    return email.toLowerCase().trim();
}

export function isValidNewsletterEmail(email: string): boolean {
    if (email.length === 0 || email.length > 254 || /\s/.test(email)) {
        return false;
    }
    const at = email.indexOf("@");
    if (at <= 0 || at !== email.lastIndexOf("@")) {
        return false;
    }
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.length > 64 || domain.length === 0 || domain.length > 253) {
        return false;
    }
    const dot = domain.lastIndexOf(".");
    return dot > 0 && dot < domain.length - 1;
}

export function buildNewsletterStatusCounts(
    stats: NewsletterStatusCount[]
): Record<string, number> {
    return stats.reduce<Record<string, number>>((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
    }, {});
}

export function buildNewsletterWhereFilter(params: {
    status?: string;
    variantId?: string;
    search?: string;
}): Prisma.newsletter_subscriptionWhereInput {
    const where: Prisma.newsletter_subscriptionWhereInput = {};
    if (params.status) {
        where.status = params.status;
    }
    if (params.variantId) {
        where.variant_id = params.variantId;
    }
    if (params.search) {
        where.email = {
            contains: params.search,
            mode: "insensitive",
        };
    }
    return where;
}

export function buildNewsletterStatsResponse(params: {
    statusCounts: NewsletterStatusCount[];
    variantCounts: NewsletterVariantCount[];
    recentSignups: number;
    signupsThisMonth: number;
}) {
    return {
        byStatus: buildNewsletterStatusCounts(params.statusCounts),
        byVariant: params.variantCounts.map((variant) => ({
            variantId: variant.variant_id,
            count: variant._count,
        })),
        recentActivity: {
            last7Days: params.recentSignups,
            last30Days: params.signupsThisMonth,
        },
    };
}

export function buildNewsletterSubscribersCsv(subscribers: NewsletterSubscriberCsvRow[]): string {
    const headers = ["Email", "Variant ID", "Source", "Status", "Subscribed At"];
    const rows = subscribers.map((subscriber) => [
        subscriber.email,
        subscriber.variant_id || "",
        subscriber.source,
        subscriber.status,
        new Date(subscriber.created_at).toISOString(),
    ]);

    return [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
}

export function createNewsletterRouter(options: NewsletterRouterOptions = {}): Router {
    const router = Router();
    const defaultLimiters = options.limiters ? undefined : createRateLimiters();
    const { newsletterSubscribeLimiter } = options.limiters ?? defaultLimiters!;

    /**
     * POST /api/rest/v1/newsletter/subscribe
     * Subscribe to newsletter (public endpoint)
     */
    router.post(
        REST_CHILD_PATHS.newsletter.subscribe,
        newsletterSubscribeLimiter,
        async (req: Request, res: Response) => {
            try {
                const {
                    email,
                    variantId,
                    source = "homepage",
                } = req.body as {
                    email?: unknown;
                    variantId?: string | null;
                    source?: string;
                };
                const { prisma } = req;

                // Validate email
                if (!email || typeof email !== "string") {
                    return res.status(400).json({ error: "Email is required" });
                }
                if (!prisma) {
                    return res.status(500).json({ error: "Database connection not available" });
                }

                // Normalize email (lowercase, trim)
                const normalizedEmail = normalizeNewsletterEmail(email);

                // Basic email format validation
                if (!isValidNewsletterEmail(normalizedEmail)) {
                    return res.status(400).json({ error: "Invalid email format" });
                }

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
            } catch (error) {
                logger.log(LogLevel.error, "Newsletter subscription error:", error);
                return res.status(500).json({ error: "Failed to subscribe" });
            }
        }
    );

    /**
     * GET /api/rest/v1/newsletter/subscribers
     * Get list of newsletter subscribers (admin only)
     */
    router.get(REST_CHILD_PATHS.newsletter.subscribers, async (req: Request, res: Response) => {
        try {
            const { isAdmin, prisma } = req;

            // Must be admin
            if (!isAdmin) {
                throw new CustomError(CODE.Unauthorized);
            }

            if (!prisma) {
                return res.status(500).json({ error: "Database connection not available" });
            }
            const page = getQueryString(req.query.page) ?? "1";
            const limit = getQueryString(req.query.limit) ?? "50";
            const status = getQueryString(req.query.status);
            const variantId = getQueryString(req.query.variantId);
            const search = getQueryString(req.query.search);

            const pageNum = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100 per page
            const skip = (pageNum - 1) * limitNum;

            const where = buildNewsletterWhereFilter({ status, variantId, search });

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

            const statusCounts = buildNewsletterStatusCounts(stats);

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
        } catch (error) {
            logger.log(LogLevel.error, "Get newsletter subscribers error:", error);
            if (error instanceof CustomError) {
                return res.status(401).json({ error: error.message, code: error.code });
            }
            return res.status(500).json({ error: "Failed to fetch subscribers" });
        }
    });

    /**
     * GET /api/rest/v1/newsletter/subscribers/export
     * Export newsletter subscribers as CSV (admin only)
     */
    router.get(
        REST_CHILD_PATHS.newsletter.subscribersExport,
        async (req: Request, res: Response) => {
            try {
                const { isAdmin, prisma } = req;

                // Must be admin
                if (!isAdmin) {
                    throw new CustomError(CODE.Unauthorized);
                }

                if (!prisma) {
                    return res.status(500).json({ error: "Database connection not available" });
                }
                const status = getQueryString(req.query.status);

                const where = buildNewsletterWhereFilter({ status });

                // Get all subscribers
                const subscribers = await prisma.newsletter_subscription.findMany({
                    where,
                    orderBy: { created_at: "desc" },
                });

                const csv = buildNewsletterSubscribersCsv(subscribers);

                // Set headers for CSV download
                res.setHeader("Content-Type", "text/csv");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv"`
                );

                return res.send(csv);
            } catch (error) {
                logger.log(LogLevel.error, "Export newsletter subscribers error:", error);
                if (error instanceof CustomError) {
                    return res.status(401).json({ error: error.message, code: error.code });
                }
                return res.status(500).json({ error: "Failed to export subscribers" });
            }
        }
    );

    /**
     * DELETE /api/rest/v1/newsletter/subscribers/:id
     * Delete or unsubscribe a newsletter subscriber (admin only)
     */
    router.delete(REST_CHILD_PATHS.newsletter.subscriber, async (req: Request, res: Response) => {
        try {
            const { isAdmin, prisma } = req;

            // Must be admin
            if (!isAdmin) {
                throw new CustomError(CODE.Unauthorized);
            }

            if (!prisma) {
                return res.status(500).json({ error: "Database connection not available" });
            }
            const { id } = req.params;
            const { action = "unsubscribe" } = req.body as { action?: "unsubscribe" | "delete" };

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

                logger.log(LogLevel.info, "Newsletter subscriber unsubscribed", {
                    id: subscriberId,
                });

                return res.json({
                    success: true,
                    message: "Subscriber unsubscribed",
                });
            }
        } catch (error) {
            logger.log(LogLevel.error, "Delete newsletter subscriber error:", error);
            if (error instanceof CustomError) {
                return res.status(401).json({ error: error.message, code: error.code });
            }
            return res.status(500).json({ error: "Failed to delete subscriber" });
        }
    });

    /**
     * GET /api/rest/v1/newsletter/stats
     * Get newsletter subscription statistics (admin only)
     */
    router.get(REST_CHILD_PATHS.newsletter.stats, async (req: Request, res: Response) => {
        try {
            const { isAdmin, prisma } = req;

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

            return res.json(
                buildNewsletterStatsResponse({
                    statusCounts,
                    variantCounts,
                    recentSignups,
                    signupsThisMonth,
                })
            );
        } catch (error) {
            logger.log(LogLevel.error, "Get newsletter stats error:", error);
            if (error instanceof CustomError) {
                return res.status(401).json({ error: error.message, code: error.code });
            }
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
    });

    return router;
}
