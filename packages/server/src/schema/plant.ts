import { CODE, PLANT_SORT_OPTIONS, SKU_STATUS } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { Count, DeleteManyInput, PlantInput, PlantsInput } from "./types";

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
} as const;

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
            const showActive = input.active === true || !req.isAdmin;
            // Query plants
            let plants = await prisma.plant.findMany({
                where: {
                    ...idQuery,
                    ...searchQuery,
                    ...(input.onlyInStock !== true && !showActive ? {} : {
                        skus: {
                            // ...(showActive ? { every: { status: SKU_STATUS.Active } } : {}), This would avoid the filtering later, but isn't ideal for AdminInventoryPage
                            some: {
                                ...(showActive ? { status: SKU_STATUS.Active } : {}),
                                ...(input.onlyInStock === true ? { availability: { gt: 0 } } : {}),
                            },
                        },
                    }),
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value),
            });
            // If showActive is true, filter out inactive SKUs
            if (showActive) {
                plants = plants.map((p: any) => {
                    return {
                        ...p,
                        skus: p.skus?.filter((s) => s.status === SKU_STATUS.Active) || [],
                    };
                });
            }
            return plants;
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
            for (const trait of (input.traits || [])) {
                if (!trait) continue;
                await prisma.plant_trait.create({ data: { plantId: plant.id, name: trait.name, value: trait.value } });
            }
            // Create images
            if (Array.isArray(input.images)) {
                for (let i = 0; i < input.images.length; i++) {
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
            console.log('update plant a', input)
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // Update images
            if (!input.id) throw new CustomError(CODE.InvalidArgs);
            console.log('update plant b')
            if (Array.isArray(input.images)) {
                const imgHashes = input.images.map((img) => img.hash);
                console.log('update plant c', imgHashes)
                // Delete images not passed in
                await prisma.plant_images.deleteMany({
                    where: {
                        AND: [
                            { plantId: input.id },
                            { NOT: { hash: { in: imgHashes } } },
                        ],
                    },
                });
                console.log('update plant d')
                // Upsert images passed in
                for (let i = 0; i < input.images.length; i++) {
                    const existingImage = await prisma.plant_images.findFirst({ where: { hash: input.images[i].hash } });
                    if (existingImage) {
                        console.log('update plant e', i, existingImage)
                        await prisma.plant_images.update({
                            where: { id: existingImage.id },
                            data: { isDisplay: input.images[i].isDisplay ?? false, index: i },
                        });
                    } else {
                        console.log('update plant f', {
                            plantId: input.id,
                            hash: input.images[i].hash,
                            isDisplay: input.images[i].isDisplay ?? false,
                            index: i
                        })
                        await prisma.plant_images.create({
                            data: {
                                plantId: input.id,
                                hash: input.images[i].hash,
                                isDisplay: input.images[i].isDisplay ?? false,
                                index: i
                            },
                        });
                    }
                }
            }
            console.log('update plant g')
            // Update traits
            const currentTraits = await prisma.plant_trait.findMany({ where: { plantId: input.id } });
            const inputTraits = input.traits || [];
            console.log('update plant h', currentTraits)
            const temp = await prisma.plant.findUnique({
                where: { id: input.id },
                select: {
                    id: true,
                    traits: {
                        select: {
                            name: true,
                            value: true
                        }
                    }
                }
            })
            console.log('update plant h1', temp)
            for (const trait of currentTraits) {
                if (!inputTraits.find(it => it && it.name === trait.name)) {
                    await prisma.plant_trait.delete({ where: { id: trait.id } });
                }
            }
            console.log('update plant i')
            for (const trait of inputTraits) {
                if (!trait) continue;
                // If trait already exists, update the value
                const existingTrait = currentTraits.find((t) => t.name === trait.name);
                console.log('update plant j', existingTrait)
                if (existingTrait) {
                    await prisma.plant_trait.update({ where: { id: existingTrait.id }, data: { value: trait.value } });
                    continue;
                }
                // Otherwise, create a new trait
                console.log('update plant k', { plantId: input.id, name: trait.name, value: trait.value })
                await prisma.plant_trait.create({ data: { plantId: input.id, name: trait.name, value: trait.value } });
            }
            // Update SKUs
            if (input.skus) {
                console.log('update plant l')
                const currSkus = await prisma.sku.findMany({ where: { plantId: input.id } });
                const deletedSkus = currSkus.map((s) => s.sku).filter((s) => !input.skus!.some((sku: any) => sku.sku === s));
                console.log('update plant m', currSkus, deletedSkus)
                await prisma.sku.deleteMany({ where: { sku: { in: deletedSkus } } });
                for (const sku of input.skus) {
                    console.log('update plant n', sku)
                    await prisma.sku.upsert({
                        where: { sku: sku.sku },
                        update: sku as any,
                        create: { ...(sku as any), plantId: input.id },
                    });
                }
            }
            console.log('update plant o')
            // Update latin name
            return await prisma.plant.update({
                where: { id: input.id },
                data: { latinName: input.latinName },
                ...(new PrismaSelect(info).value),
            });
        },
        deletePlants: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<Count | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // TODO handle images
            return await prisma.plant.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
