import { Router, Request, Response } from "express";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// GET all plants with optional filtering
router.get("/", async (req: Request, res: Response) => {
    try {
        const { 
            inStock, 
            category, 
            searchTerm,
            limit = 100,
            offset = 0 
        } = req.query;

        const where: any = {};
        
        if (inStock === "true") {
            where.skus = {
                some: {
                    availability: {
                        gt: 0
                    }
                }
            };
        }

        if (category) {
            where.traits = {
                has: category
            };
        }

        if (searchTerm) {
            where.OR = [
                { name: { contains: searchTerm as string, mode: "insensitive" } },
                { latinName: { contains: searchTerm as string, mode: "insensitive" } },
                { traits: { has: searchTerm as string } }
            ];
        }

        const plants = await prisma.plant.findMany({
            where,
            include: {
                skus: {
                    include: {
                        discounts: {
                            include: {
                                discount: true
                            }
                        }
                    }
                }
            },
            skip: Number(offset),
            take: Number(limit),
            orderBy: { latinName: "asc" }
        });

        // Set cache headers for GET requests
        res.set({
            "Cache-Control": "public, max-age=60", // 1 minute cache
            "X-Total-Count": String(await prisma.plant.count({ where }))
        });

        res.json(plants);
    } catch (error) {
        console.error("Error fetching plants:", error);
        res.status(500).json({ 
            error: "Failed to fetch plants",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
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
                                discount: true
                            }
                        }
                    }
                }
            }
        });

        if (!plant) {
            return res.status(404).json({ error: "Plant not found" });
        }

        // Set cache headers
        res.set({
            "Cache-Control": "public, max-age=300", // 5 minutes cache
            "ETag": `"plant-${plant.id}-${plant.updated_at?.getTime() || 0}"`
        });

        res.json(plant);
    } catch (error) {
        console.error("Error fetching plant:", error);
        res.status(500).json({ 
            error: "Failed to fetch plant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
        });
    }
});

export default router;