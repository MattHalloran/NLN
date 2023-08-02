import { CODE, PLANT_SORT_OPTIONS, SKU_STATUS } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { DeleteManyInput, PlantInput, PlantsInput } from "./types";

export const typeDef = gql`

    input PlantTraitInput {
        name: String!
        value: String!
    }

    input PlantImageInput {
        hash: String!
        isDisplay: Boolean
    }

    input PlantInput {
        id: ID
        latinName: String!
        traits: [PlantTraitInput]!
        images: [PlantImageInput!]
        skus: [SkuInput!]
    }

    input PlantsInput {
        ids: [ID!]
        sortBy: SkuSortBy
        searchString: String
        active: Boolean
        onlyInStock: Boolean
    }

    type PlantImage {
        index: Int!
        isDisplay: Boolean!
        image: Image!
    }

    type Plant {
        id: ID!
        latinName: String!
        featured: Boolean!
        traits: [PlantTrait!]
        images: [PlantImage!]
        skus: [Sku!]
    }

    extend type Query {
        plants(input: PlantsInput!): [Plant!]!
    }

    extend type Mutation {
        addPlant(input: PlantInput!): Plant!
        updatePlant(input: PlantInput!): Plant!
        deletePlants(input: DeleteManyInput!): Count!
    }
`;

const SORT_TO_QUERY = {
    [PLANT_SORT_OPTIONS.AZ]: { latinName: "asc" },
    [PLANT_SORT_OPTIONS.ZA]: { latinName: "desc" },
    [PLANT_SORT_OPTIONS.Newest]: { created_at: "desc" },
    [PLANT_SORT_OPTIONS.Oldest]: { created_at: "asc" },
};

export const resolvers = {
    Query: {
        plants: async (_parent: undefined, { input }: IWrap<PlantsInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            let idQuery;
            if (Array.isArray(input.ids)) { idQuery = { id: { in: input.ids } }; }
            // Determine sort order
            let sortQuery;
            if (input.sortBy) sortQuery = SORT_TO_QUERY[input.sortBy];
            // If search string provided, match by latinName or trait name
            let searchQuery;
            if (input.searchString && input.searchString.length > 0) searchQuery = {
                OR: [
                    { latinName: { contains: input.searchString.trim(), mode: "insensitive" } },
                    { traits: { some: { value: { contains: input.searchString.trim(), mode: "insensitive" } } } },
                ],
            };
            // Toggle for showing active/inactive plants (whether the plant has any SKUs available to order)
            // Only admins can view inactive plants
            let activeQuery;
            const activeQueryBase = { skus: { some: { status: SKU_STATUS.Active } } };
            if (input.active === true) activeQuery = activeQueryBase;
            else if (input.active === false && req.isAdmin) activeQuery = { NOT: activeQueryBase };
            // Toggle for showing/hiding plants that have no SKUs with any availability
            const onlyInStock = {
                skus: {
                    ...(input.onlyInStock === true ? { some: { availability: { gt: 0 } } } : {}),
                    every: { status: "Active" },
                },
            };
            return await prisma.plant.findMany({
                where: {
                    ...idQuery,
                    ...searchQuery,
                    ...activeQuery,
                    ...onlyInStock,
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value),
            });
        },
    },
    Mutation: {
        // Inserting plants is different than other inserts, because the fields are dynamic.
        // Because of this, the add must be done manually
        // NOTE: images must be uploaded first
        addPlant: async (_parent: undefined, { input }: IWrap<PlantInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // TODO handle images
            // Create plant object
            const plant = await prisma.plant.create({ data: { id: input.id, latinName: input.latinName }, ...(new PrismaSelect(info).value) });
            // Create trait objects
            for (const { name, value } of (input.traits || [])) {
                await prisma.plant_trait.create({ data: { plantId: plant.id, name, value } });
            }
            // Create images
            if (Array.isArray(input.images)) {
                for (let i = 0; i < input.length; i++) {
                    await prisma.plant_images.create({
                        data: {
                            plantId: plant.id,
                            hash: input.images[i].hash,
                            isDisplay: input.images[i].isDisplay ?? false,
                            index: i,
                        },
                    });
                }
            }
            return await prisma.plant.findUnique({
                where: { id: plant.id },
                ...(new PrismaSelect(info).value),
            });
        },
        // NOTE: Images must be uploaded separately
        updatePlant: async (_parent: undefined, { input }: IWrap<PlantInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // Update images
            await prisma.plant_images.deleteMany({ where: { plantId: input.id } });
            if (Array.isArray(input.images)) {
                const rowUniques: { plantId: string, hash: string }[] = [];
                // Upsert passed in images
                for (let i = 0; i < input.images.length; i++) {
                    const curr = input.images[i];
                    const rowData = { plantId: input.id, hash: curr.hash, index: i, isDisplay: curr.isDisplay ?? false };
                    const rowId = { plantId: input.id, hash: curr.hash };
                    rowUniques.push(rowId);
                    await prisma.plant_images.upsert({
                        where: { plant_images_plantid_hash_unique: rowId },
                        update: rowData,
                        create: rowData,
                    });
                }
                // Delete images not passed in
                await prisma.plant_images.deleteMany({
                    where: {
                        AND: [
                            { plantId: { in: rowUniques.map(r => r.plantId) } },
                            { NOT: { hash: { in: rowUniques.map(r => r.hash) } } },
                        ],
                    },
                });
            }
            // Update traits
            await prisma.plant_trait.deleteMany({ where: { plantId: input.id } });
            for (const { name, value } of (input.traits || [])) {
                const updateData = { plantId: input.id, name, value };
                await prisma.plant_trait.upsert({
                    where: { plant_trait_plantid_name_unique: { plantId: input.id, name } },
                    update: updateData,
                    create: updateData,
                });
            }
            // Update SKUs
            if (input.skus) {
                const currSkus = await prisma.sku.findMany({ where: { plantId: input.id } });
                const deletedSkus = currSkus.map((s) => s.sku).filter((s) => !input.skus.some((sku: any) => sku.sku === s));
                await prisma.sku.deleteMany({ where: { sku: { in: deletedSkus } } });
                for (const sku of input.skus) {
                    await prisma.sku.upsert({
                        where: { sku: sku.sku },
                        update: sku,
                        create: { plantId: input.id, ...sku },
                    });
                }
            }
            // Update latin name
            return await prisma.plant.update({
                where: { id: input.id },
                data: { latinName: input.latinName },
                ...(new PrismaSelect(info).value),
            });
        },
        deletePlants: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // TODO handle images
            return await prisma.plant.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
