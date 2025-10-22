import { Router, Response } from "express";
import { logger } from "../../logger.js";
import type { LandingPageVariant, LandingPageContent } from "../../types/landingPage.js";
import {
    readVariants,
    writeVariants,
    readVariantContent,
    writeVariantContent,
    deleteVariantContent,
    validateTrafficAllocation,
} from "./variantsService.js";
import { readLandingPageContent, writeLandingPageContent } from "./landingPageService.js";
import { invalidateCache } from "./landingPageCache.js";
import { AuthenticatedRequest, requireAdmin } from "./middlewares.js";

const router = Router();

// GET endpoint to retrieve all variants (admin only)
router.get("/", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        return res.json(variants);
    } catch (error) {
        logger.error("Error fetching variants:", error);
        return res.status(500).json({
            error: "Failed to fetch variants",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// GET endpoint to retrieve a specific variant (admin only)
router.get("/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        const variant = variants.find((v) => v.id === req.params.id);

        if (!variant) {
            return res.status(404).json({ error: "Variant not found" });
        }

        return res.json(variant);
    } catch (error) {
        logger.error("Error fetching variant:", error);
        return res.status(500).json({
            error: "Failed to fetch variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to create a new variant (admin only)
router.post("/", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, description, trafficAllocation, copyFromVariantId } = req.body as {
            name?: string;
            description?: string;
            trafficAllocation?: number;
            copyFromVariantId?: string;
        };

        if (!name) {
            return res.status(400).json({ error: "Variant name is required" });
        }

        const variants = readVariants();

        const newVariant: LandingPageVariant = {
            id: `variant-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name,
            description: description || "",
            status: "disabled",
            isOfficial: false,
            trafficAllocation: trafficAllocation || 0,
            metrics: {
                views: 0,
                conversions: 0,
                bounces: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Copy content from another variant or from official landing page
        let sourceContent: LandingPageContent | null = null;

        if (copyFromVariantId) {
            sourceContent = readVariantContent(copyFromVariantId);
            if (!sourceContent) {
                return res.status(404).json({ error: `Source variant ${copyFromVariantId} not found` });
            }
        } else {
            sourceContent = readLandingPageContent();
        }

        try {
            writeVariantContent(newVariant.id, sourceContent);
            logger.info(`Created variant content file for ${newVariant.id}`);
        } catch (error) {
            logger.error("Error creating variant content file:", error);
            return res.status(500).json({
                error: "Failed to create variant content file",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        variants.push(newVariant);
        writeVariants(variants);

        return res.status(201).json(newVariant);
    } catch (error) {
        logger.error("Error creating variant:", error);
        return res.status(500).json({
            error: "Failed to create variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update a variant (admin only)
router.put("/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const { name, description, status, trafficAllocation } = req.body;

        // Update the variant
        variants[variantIndex] = {
            ...variants[variantIndex],
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(status && { status }),
            ...(trafficAllocation !== undefined && { trafficAllocation }),
            updatedAt: new Date().toISOString(),
        };

        // Validate traffic allocation if status is being changed to enabled
        if (status === "enabled") {
            const tempVariants = [...variants];
            if (!validateTrafficAllocation(tempVariants)) {
                return res.status(400).json({
                    error: "Traffic allocation must sum to 100% for all enabled variants",
                });
            }
        }

        writeVariants(variants);
        await invalidateCache();

        return res.json(variants[variantIndex]);
    } catch (error) {
        logger.error("Error updating variant:", error);
        return res.status(500).json({
            error: "Failed to update variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// DELETE endpoint to delete a variant (admin only)
router.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const variant = variants[variantIndex];

        if (variant.isOfficial) {
            return res.status(400).json({ error: "Cannot delete the official variant" });
        }

        if (variant.status === "enabled") {
            return res
                .status(400)
                .json({ error: "Cannot delete an enabled variant. Disable it first." });
        }

        deleteVariantContent(req.params.id);
        variants.splice(variantIndex, 1);
        writeVariants(variants);

        return res.json({
            success: true,
            message: "Variant and content file deleted successfully",
        });
    } catch (error) {
        logger.error("Error deleting variant:", error);
        return res.status(500).json({
            error: "Failed to delete variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to promote a variant to official (admin only)
router.post("/:id/promote", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const variant = variants[variantIndex];
        const variantContent = readVariantContent(variant.id);

        if (!variantContent) {
            return res.status(404).json({ error: "Variant content not found" });
        }

        // Find and demote the current official variant
        const currentOfficialIndex = variants.findIndex((v) => v.isOfficial);
        if (currentOfficialIndex !== -1) {
            variants[currentOfficialIndex].isOfficial = false;
            variants[currentOfficialIndex].updatedAt = new Date().toISOString();
            logger.info(`Demoted variant ${variants[currentOfficialIndex].id} from official status`);
        }

        // Promote the new variant
        variants[variantIndex].isOfficial = true;
        variants[variantIndex].updatedAt = new Date().toISOString();

        // Copy variant content to the official landing page
        writeLandingPageContent(variantContent);
        logger.info(
            `Promoted variant ${variant.id} to official. Content copied to landing-page-content.json`,
        );

        writeVariants(variants);
        await invalidateCache();

        return res.json({
            success: true,
            message: "Variant promoted to official successfully",
            variant: variants[variantIndex],
        });
    } catch (error) {
        logger.error("Error promoting variant:", error);
        return res.status(500).json({
            error: "Failed to promote variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to track variant analytics events
router.post("/:id/track", async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { eventType } = req.body as {
            eventType?: "view" | "conversion" | "bounce";
        };

        if (!eventType) {
            return res.status(400).json({ error: "eventType is required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        // Increment the appropriate metric
        const metricKey =
            eventType === "view" ? "views" : eventType === "conversion" ? "conversions" : "bounces";
        variants[variantIndex].metrics[metricKey]++;
        variants[variantIndex].updatedAt = new Date().toISOString();

        writeVariants(variants);

        logger.info(`Tracked ${eventType} for variant ${req.params.id}`);

        return res.json({ success: true, metrics: variants[variantIndex].metrics });
    } catch (error) {
        logger.error("Error tracking variant event:", error);
        return res.status(500).json({
            error: "Failed to track variant event",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to toggle variant status (enable/disable) (admin only)
router.post("/:id/toggle", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        // Toggle status
        const newStatus = variants[variantIndex].status === "enabled" ? "disabled" : "enabled";
        variants[variantIndex].status = newStatus;
        variants[variantIndex].updatedAt = new Date().toISOString();

        // Validate traffic allocation if enabling
        if (newStatus === "enabled" && !validateTrafficAllocation(variants)) {
            return res.status(400).json({
                error: "Traffic allocation must sum to 100% for all enabled variants",
            });
        }

        writeVariants(variants);
        await invalidateCache();

        return res.json(variants[variantIndex]);
    } catch (error) {
        logger.error("Error toggling variant status:", error);
        return res.status(500).json({
            error: "Failed to toggle variant status",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
