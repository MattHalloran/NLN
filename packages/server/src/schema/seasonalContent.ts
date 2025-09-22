import { readFileSync, writeFileSync } from "fs";
import { GraphQLError } from "graphql";
import { join } from "path";
import { Context } from "../context.js";
import { invalidateCache as invalidateLandingPageCache } from "./landingPageContent.js";

const dataPath = join(__dirname, "../data");

// TypeScript interfaces
interface SeasonalPlant {
    id: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
}

interface PlantTip {
    id: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder: number;
    isActive: boolean;
}

interface SeasonalContentData {
    plants: SeasonalPlant[];
    tips: PlantTip[];
}

// Helper functions to read/write JSON files
const readSeasonalPlants = (): SeasonalPlant[] => {
    try {
        const data = readFileSync(join(dataPath, "seasonal-plants.json"), "utf8");
        return JSON.parse(data).plants || [];
    } catch (error) {
        console.error("Error reading seasonal plants:", error);
        return [];
    }
};

const readPlantTips = (): PlantTip[] => {
    try {
        const data = readFileSync(join(dataPath, "plant-tips.json"), "utf8");
        return JSON.parse(data).tips || [];
    } catch (error) {
        console.error("Error reading plant tips:", error);
        return [];
    }
};

const writeSeasonalPlants = (plants: SeasonalPlant[]): void => {
    try {
        writeFileSync(
            join(dataPath, "seasonal-plants.json"),
            JSON.stringify({ plants }, null, 2),
            "utf8"
        );
    } catch (error) {
        console.error("Error writing seasonal plants:", error);
        throw new GraphQLError("Failed to save seasonal plants");
    }
};

const writePlantTips = (tips: PlantTip[]): void => {
    try {
        writeFileSync(
            join(dataPath, "plant-tips.json"),
            JSON.stringify({ tips }, null, 2),
            "utf8"
        );
    } catch (error) {
        console.error("Error writing plant tips:", error);
        throw new GraphQLError("Failed to save plant tips");
    }
};

export const typeDef = /* GraphQL */ `
    type SeasonalPlant {
        id: ID!
        name: String!
        description: String!
        season: String!
        careLevel: String!
        icon: String!
        displayOrder: Int!
        isActive: Boolean!
    }

    type PlantTip {
        id: ID!
        title: String!
        description: String!
        category: String!
        season: String!
        displayOrder: Int!
        isActive: Boolean!
    }

    type SeasonalContent {
        plants: [SeasonalPlant!]!
        tips: [PlantTip!]!
    }

    input SeasonalPlantInput {
        id: ID
        name: String!
        description: String!
        season: String!
        careLevel: String!
        icon: String!
        displayOrder: Int
        isActive: Boolean
    }

    input PlantTipInput {
        id: ID
        title: String!
        description: String!
        category: String!
        season: String!
        displayOrder: Int
        isActive: Boolean
    }

    type Query {
        seasonalContent(onlyActive: Boolean): SeasonalContent!
    }

    type Mutation {
        # Seasonal Plants
        upsertSeasonalPlant(input: SeasonalPlantInput!): SeasonalPlant!
        deleteSeasonalPlant(id: ID!): Boolean!
        reorderSeasonalPlants(ids: [ID!]!): [SeasonalPlant!]!
        
        # Plant Tips
        upsertPlantTip(input: PlantTipInput!): PlantTip!
        deletePlantTip(id: ID!): Boolean!
        reorderPlantTips(ids: [ID!]!): [PlantTip!]!
        
        # Bulk operations
        updateSeasonalContent(plants: [SeasonalPlantInput!]!, tips: [PlantTipInput!]!): SeasonalContent!
    }
`;

export const resolvers = {
    Query: {
        seasonalContent: (_: any, args: { onlyActive?: boolean }): SeasonalContentData => {
            let plants = readSeasonalPlants();
            let tips = readPlantTips();

            if (args.onlyActive) {
                plants = plants.filter(p => p.isActive);
                tips = tips.filter(t => t.isActive);
            }

            // Sort by display order
            plants.sort((a, b) => a.displayOrder - b.displayOrder);
            tips.sort((a, b) => a.displayOrder - b.displayOrder);

            return { plants, tips };
        },
    },
    Mutation: {
        upsertSeasonalPlant: async (
            _: any,
            { input }: { input: SeasonalPlantInput },
            context: Context
        ): Promise<SeasonalPlant> => {
            // Admin authorization check
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const plants = readSeasonalPlants();
            
            if (input.id) {
                // Update existing
                const index = plants.findIndex(p => p.id === input.id);
                if (index === -1) {
                    throw new GraphQLError("Plant not found");
                }
                plants[index] = {
                    ...plants[index],
                    ...input,
                    id: input.id,
                };
            } else {
                // Create new
                const newPlant: SeasonalPlant = {
                    id: `plant-${Date.now()}`,
                    name: input.name,
                    description: input.description,
                    season: input.season,
                    careLevel: input.careLevel,
                    icon: input.icon,
                    displayOrder: input.displayOrder ?? plants.length,
                    isActive: input.isActive ?? true,
                };
                plants.push(newPlant);
            }

            writeSeasonalPlants(plants);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return plants.find(p => p.id === input.id) || plants[plants.length - 1];
        },

        deleteSeasonalPlant: async (
            _: any,
            { id }: { id: string },
            context: Context
        ): Promise<boolean> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const plants = readSeasonalPlants();
            const filtered = plants.filter(p => p.id !== id);
            
            if (filtered.length === plants.length) {
                throw new GraphQLError("Plant not found");
            }

            writeSeasonalPlants(filtered);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return true;
        },

        reorderSeasonalPlants: async (
            _: any,
            { ids }: { ids: string[] },
            context: Context
        ): Promise<SeasonalPlant[]> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const plants = readSeasonalPlants();
            const reordered = ids.map((id, index) => {
                const plant = plants.find(p => p.id === id);
                if (!plant) throw new GraphQLError(`Plant ${id} not found`);
                return { ...plant, displayOrder: index };
            });

            writeSeasonalPlants(reordered);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return reordered;
        },

        upsertPlantTip: async (
            _: any,
            { input }: { input: PlantTipInput },
            context: Context
        ): Promise<PlantTip> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const tips = readPlantTips();
            
            if (input.id) {
                // Update existing
                const index = tips.findIndex(t => t.id === input.id);
                if (index === -1) {
                    throw new GraphQLError("Tip not found");
                }
                tips[index] = {
                    ...tips[index],
                    ...input,
                    id: input.id,
                };
            } else {
                // Create new
                const newTip: PlantTip = {
                    id: `tip-${Date.now()}`,
                    title: input.title,
                    description: input.description,
                    category: input.category,
                    season: input.season,
                    displayOrder: input.displayOrder ?? tips.length,
                    isActive: input.isActive ?? true,
                };
                tips.push(newTip);
            }

            writePlantTips(tips);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return tips.find(t => t.id === input.id) || tips[tips.length - 1];
        },

        deletePlantTip: async (
            _: any,
            { id }: { id: string },
            context: Context
        ): Promise<boolean> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const tips = readPlantTips();
            const filtered = tips.filter(t => t.id !== id);
            
            if (filtered.length === tips.length) {
                throw new GraphQLError("Tip not found");
            }

            writePlantTips(filtered);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return true;
        },

        reorderPlantTips: async (
            _: any,
            { ids }: { ids: string[] },
            context: Context
        ): Promise<PlantTip[]> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            const tips = readPlantTips();
            const reordered = ids.map((id, index) => {
                const tip = tips.find(t => t.id === id);
                if (!tip) throw new GraphQLError(`Tip ${id} not found`);
                return { ...tip, displayOrder: index };
            });

            writePlantTips(reordered);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();
            
            return reordered;
        },

        updateSeasonalContent: async (
            _: any,
            { plants, tips }: { plants: SeasonalPlantInput[], tips: PlantTipInput[] },
            context: Context
        ): Promise<SeasonalContentData> => {
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            // Process plants
            const processedPlants = plants.map((p, index) => ({
                id: p.id || `plant-${Date.now()}-${index}`,
                name: p.name,
                description: p.description,
                season: p.season,
                careLevel: p.careLevel,
                icon: p.icon,
                displayOrder: p.displayOrder ?? index,
                isActive: p.isActive ?? true,
            }));

            // Process tips
            const processedTips = tips.map((t, index) => ({
                id: t.id || `tip-${Date.now()}-${index}`,
                title: t.title,
                description: t.description,
                category: t.category,
                season: t.season,
                displayOrder: t.displayOrder ?? index,
                isActive: t.isActive ?? true,
            }));

            writeSeasonalPlants(processedPlants);
            writePlantTips(processedTips);
            
            // Invalidate landing page cache
            await invalidateLandingPageCache();

            return {
                plants: processedPlants,
                tips: processedTips,
            };
        },
    },
};

// Type definitions for input types
interface SeasonalPlantInput {
    id?: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder?: number;
    isActive?: boolean;
}

interface PlantTipInput {
    id?: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder?: number;
    isActive?: boolean;
}