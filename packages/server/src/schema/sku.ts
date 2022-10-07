import { gql } from 'apollo-server-express';
import { CODE, SKU_SORT_OPTIONS, SKU_STATUS } from '@shared/consts';
import { CustomError } from '../error';
import { saveFile } from '../utils';
import { uploadAvailability } from '../worker/uploadAvailability/queue';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

export const typeDef = gql`
    enum SkuStatus {
        Deleted
        Inactive
        Active
    }

    enum SkuSortBy {
        AZ
        ZA
        PriceLowHigh
        PriceHighLow
        Featured
        Newest
        Oldest
    }

    input SkuInput {
        id: ID
        sku: String!
        isDiscountable: Boolean
        size: String
        note: String
        availability: Int
        price: String
        status: SkuStatus
        plantId: ID
        discountIds: [ID!]
    }

    type SkuDiscount {
        discount: Discount!
    }

    type Sku {
        id: ID!
        sku: String!
        isDiscountable: Boolean!
        size: String
        note: String
        availability: Int!
        price: String
        status: SkuStatus!
        plant: Plant!
        discounts: [SkuDiscount!]
    }

    extend type Query {
        skus(ids: [ID!], sortBy: SkuSortBy, searchString: String, onlyInStock: Boolean): [Sku!]!
    }

    extend type Mutation {
        uploadAvailability(file: Upload!): Boolean
        addSku(input: SkuInput!): Sku!
        updateSku(input: SkuInput!): Sku!
        deleteSkus(input: DeleteManyInput!): Count!
    }
`

const SORT_TO_QUERY = {
    [SKU_SORT_OPTIONS.AZ]: { plant: { latinName: 'asc' } },
    [SKU_SORT_OPTIONS.ZA]: { plant: { latinName: 'desc' } },
    [SKU_SORT_OPTIONS.PriceLowHigh]: { price: 'asc' },
    [SKU_SORT_OPTIONS.PriceHighLow]: { price: 'desc' },
    [SKU_SORT_OPTIONS.Newest]: { created_at: 'desc' },
    [SKU_SORT_OPTIONS.Oldest]: { created_at: 'asc' },
}

export const resolvers = {
    SkuStatus: SKU_STATUS,
    SkuSortBy: SKU_SORT_OPTIONS,
    Query: {
        // Query all SKUs
        skus: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            let idQuery;
            if (Array.isArray(input.ids)) idQuery = { id: { in: input.ids } };
            // Determine sort order
            let sortQuery;
            if (input.sortBy !== undefined) sortQuery = SORT_TO_QUERY[input.sortBy];
            let searchQuery;
            if (input.searchString !== undefined && input.searchString.length > 0) {
                searchQuery = {
                    OR: [
                        { plant: { latinName: { contains: input.searchString.trim(), mode: 'insensitive' } } },
                        { plant: { traits: { some: { value: { contains: input.searchString.trim(), mode: 'insensitive' } } } } }
                    ]
                }
            }
            let onlyInStockQuery;
            if (!input.onlyInStock) onlyInStockQuery = { availability: { gt: 0 } };
            return await prisma.sku.findMany({
                where: {
                    ...idQuery,
                    ...searchQuery,
                    ...onlyInStockQuery
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value)
            });
        }
    },
    Mutation: {
        uploadAvailability: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            const { createReadStream, mimetype } = await input.file;
            const stream = createReadStream();
            const filename = `private/availability-${Date.now()}.xls`;
            const { success, filename: finalFileName } = await saveFile(stream, filename, mimetype, false, ['.csv', '.xls', '.xlsx', 'text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values']);
            if (success) uploadAvailability(finalFileName);
            return success;
        },
        addSku: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.create((new PrismaSelect(info).value), { data: { ...input } })
        },
        updateSku: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value)
            })
        },
        deleteSkus: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.deleteMany({ where: { id: { in: input.ids } } });
        }
    }
}