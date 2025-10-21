import { Router, Request, Response } from "express";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// GET all plants with optional filtering
router.get("/", async (req: Request, res: Response) => {
    try {
        const { inStock, category, searchTerm, limit = 100, offset = 0 } = req.query;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-redundant-type-constituents
        const where: any = {};

        if (inStock === "true") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            where.skus = {
                some: {
                    availability: {
                        gt: 0,
                    },
                },
            };
        }

        if (category) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            where.traits = {
                has: category,
            };
        }

        if (searchTerm) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            where.OR = [
                { name: { contains: searchTerm as string, mode: "insensitive" } },
                { latinName: { contains: searchTerm as string, mode: "insensitive" } },
                { traits: { has: searchTerm as string } },
            ];
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const plants = await prisma.plant.findMany({
            where,
            include: {
                skus: {
                    include: {
                        discounts: {
                            include: {
                                discount: true,
                            },
                        },
                    },
                },
            },
            skip: Number(offset),
            take: Number(limit),
            orderBy: { latinName: "asc" },
        });

        // Set cache headers for GET requests
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const totalCount = await prisma.plant.count({ where });
        res.set({
            "Cache-Control": "public, max-age=60", // 1 minute cache
            "X-Total-Count": String(totalCount),
        });

        res.json(plants);
    } catch (error) {
        console.error("Error fetching plants:", error);
        res.status(500).json({
            error: "Failed to fetch plants",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// GET single plant by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const plant = await prisma.plant.findUnique({
            where: { id: req.params.id },
            include: {
                skus: {
                    include: {
                        discounts: {
                            include: {
                                discount: true,
                            },
                        },
                    },
                },
            },
        });

        if (!plant) {
            return res.status(404).json({ error: "Plant not found" });
        }

        // Set cache headers
        res.set({
            "Cache-Control": "public, max-age=300", // 5 minutes cache
            ETag: `"plant-${plant.id}-${plant.updated_at?.getTime() || 0}"`,
        });

        return res.json(plant);
    } catch (error) {
        console.error("Error fetching plant:", error);
        return res.status(500).json({
            error: "Failed to fetch plant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
