import { gql } from 'apollo-server-express';
import { CODE, PLANT_SORT_OPTIONS, SKU_STATUS } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'plant';

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
        plants(ids: [ID!], sortBy: SkuSortBy, searchString: String, active: Boolean, onlyInStock: Boolean): [Plant!]!
    }

    extend type Mutation {
        addPlant(input: PlantInput!): Plant!
        updatePlant(input: PlantInput!): Plant!
        deletePlants(input: DeleteManyInput!): Count!
    }
`

const SORT_TO_QUERY = {
    [PLANT_SORT_OPTIONS.AZ]: { latinName: 'asc', },
    [PLANT_SORT_OPTIONS.ZA]: { latinName: 'desc' },
    [PLANT_SORT_OPTIONS.Newest]: { created_at: 'desc' },
    [PLANT_SORT_OPTIONS.Oldest]: { created_at: 'asc' },
}

export const resolvers = {
    Query: {
        plants: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            let idQuery;
            if (Array.isArray(input.ids)) { idQuery = { id: { in: input.ids } } }
            // Determine sort order
            let sortQuery;
            if (input.sortBy !== undefined) sortQuery = SORT_TO_QUERY[input.sortBy];
            // If search string provided, match by latinName or trait name
            let searchQuery;
            if (input.searchString.length > 0) searchQuery = { OR: [
                { latinName: { contains: input.searchString.trim(), mode: 'insensitive' } },
                { traits: { some: { value: { contains: input.searchString.trim(), mode: 'insensitive' } } } }
            ] };
            // Toggle for showing active/inactive plants (whether the plant has any SKUs available to order)
            // Only admins can view inactive plants
            let activeQuery;
            let activeQueryBase = { skus: {  some: { status: SKU_STATUS.Active } } };
            if (input.active === true) activeQuery = activeQueryBase;
            else if (input.active === false && req.isAdmin) activeQuery = { NOT: activeQueryBase };
            // Toggle for showing/hiding plants that have no SKUs with any availability
            let onlyInStock;
            if (input.onlyInStock === true) onlyInStock = { skus: { some: { availability: { gt: 0 } } } };
            return await prisma[_model].findMany({ 
                where: { 
                    ...idQuery,
                    ...searchQuery,
                    ...activeQuery,
                    ...onlyInStock
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value)
            });
        },
    },
    Mutation: {
        // Inserting plants is different than other inserts, because the fields are dynamic.
        // Because of this, the add must be done manually
        // NOTE: images must be uploaded first
        addPlant: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // TODO handle images
            // Create plant object
            const plant = await prisma[_model].create((new PrismaSelect(info).value), { data: { id: input.id, latinName: input.latinName } });
            // Create trait objects
            for (const { name, value } of (input.traits || [])) {
                await prisma.plant_trait.create({ data: { plantId: plant.id, name, value } });
            }
            // Create images
            if (Array.isArray(input.images)) {
                for (let i = 0; i < input.length; i++) {
                    await prisma.plant_image.create({ data: {
                        plantId: plant.id,
                        hash: input.images[i].hash,
                        isDisplay: input.images[i].isDisplay ?? false,
                        index: i
                    }})
                }
            }
            return await prisma[_model].findUnique({ 
                where: { id: plant.id },
                ...(new PrismaSelect(info).value)
            });
        },
        // NOTE: Images must be uploaded separately
        updatePlant: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // Update images
            await prisma.plant_image.deleteMany({ where: { plantId: input.id } });
            if (Array.isArray(input.images)) {
                let rowIds = [];
                // Upsert passed in images
                for (let i = 0; i < input.images.length; i++) {
                    const curr = input.images[i];
                    const rowData = { plantId: input.id, hash: curr.hash, index: i, isDisplay: curr.isDisplay ?? false };
                    const rowId = { plantId: input.id, hash: curr.hash };
                    rowIds.push(rowId);
                    await prisma.plant_image.upsert({
                        where: { plant_images_plantid_hash_unique: rowId },
                        update: rowData,
                        create: rowData
                    })
                }
                // Delete images not passed in
                await prisma.plant_image.deleteMany({ 
                    where: {
                        AND: [
                            { plantId: { in: rowIds.map(r => r.plantId ) } },
                            { NOT: { hash: { in: rowIds.map(r => r.hash) } } }
                        ]
                    }
                })
            }
            // Update traits
            await prisma.plant_trait.deleteMany({ where: { plantId: input.id } });
            for (const { name, value } of (input.traits || [])) {
                const updateData = { plantId: input.id, name, value };
                await prisma.plant_trait.upsert({
                    where: { plant_trait_plantid_name_unique: { plantId: input.id, name }},
                    update: updateData,
                    create: updateData
                })
            }
            // Update SKUs
            if (input.skus) {
                const currSkus = await prisma.sku.findMany({ where: { plantId: input.id }});
                const deletedSkus = currSkus.map((s: any) => s.sku).filter((s: any) => !input.skus.some((sku: any) => sku.sku === s));
                await prisma.sku.deleteMany({ where: { sku: { in: deletedSkus } } });
                for (const sku of input.skus) {
                    await prisma.sku.upsert({
                        where: { sku: sku.sku},
                        update: sku,
                        create: { plantId: input.id, ...sku }
                    })
                }
            }
            // Update latin name
            return await prisma[_model].update({
                where: { id: input.id },
                data: { latinName: input.latinName },
                ...(new PrismaSelect(info).value)
            })
        },
        deletePlants: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // TODO handle images
            return await prisma[_model].deleteMany({ where: { id: { in: input.ids } } });
        },
    }
}