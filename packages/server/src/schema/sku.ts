import { CODE, SKU_SORT_OPTIONS, SKU_STATUS } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { saveFile } from "../utils";
import { uploadAvailability } from "../worker/uploadAvailability/queue";
import { Count, DeleteManyInput, SkuInput, SkusInput } from "./types";

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

    input SkusInput {
        ids: [ID!]
        sortBy: SkuSortBy
        searchString: String
        onlyInStock: Boolean
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
        skus(input: SkusInput!): [Sku!]!
    }

    extend type Mutation {
        uploadAvailability(file: Upload!): Boolean
        addSku(input: SkuInput!): Sku!
        updateSku(input: SkuInput!): Sku!
        deleteSkus(input: DeleteManyInput!): Count!
    }
`;

const SORT_TO_QUERY = {
    [SKU_SORT_OPTIONS.AZ]: { plant: { latinName: "asc" } },
    [SKU_SORT_OPTIONS.ZA]: { plant: { latinName: "desc" } },
    [SKU_SORT_OPTIONS.PriceLowHigh]: { price: "asc" },
    [SKU_SORT_OPTIONS.PriceHighLow]: { price: "desc" },
    [SKU_SORT_OPTIONS.Newest]: { created_at: "desc" },
    [SKU_SORT_OPTIONS.Oldest]: { created_at: "asc" },
};

const toNumber = (str: string | null | undefined): number | null => {
    if (!str) return null;
    const num = parseFloat(str.replace(/[^\d.-]/g, ""));
    if (isNaN(num)) return null;
    return num;
}

export const resolvers = {
    SkuStatus: SKU_STATUS,
    SkuSortBy: SKU_SORT_OPTIONS,
    Query: {
        // Query all SKUs
        skus: async (_parent: undefined, { input }: IWrap<SkusInput>, { prisma }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            let idQuery;
            if (Array.isArray(input.ids)) idQuery = { id: { in: input.ids } };
            // Determine sort order
            let sortQuery;
            if (input.sortBy) sortQuery = SORT_TO_QUERY[input.sortBy];
            let searchQuery;
            if (input.searchString && input.searchString.length > 0) {
                searchQuery = {
                    OR: [
                        { plant: { latinName: { contains: input.searchString.trim(), mode: "insensitive" } } },
                        { plant: { traits: { some: { value: { contains: input.searchString.trim(), mode: "insensitive" } } } } },
                    ],
                };
            }
            let onlyInStockQuery;
            if (input.onlyInStock === true) onlyInStockQuery = { availability: { gt: 0 } };
            return await prisma.sku.findMany({
                where: {
                    ...idQuery,
                    ...searchQuery,
                    ...onlyInStockQuery,
                    status: "Active",
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value),
            });
        },
    },
    Mutation: {
        uploadAvailability: async (_parent: undefined, input: any): Promise<boolean> => {
            const { createReadStream, mimetype } = await input.file;
            const stream = createReadStream();
            const filename = `private/availability-${Date.now()}.xls`;
            const { success, filename: finalFileName } = await saveFile(stream, filename, mimetype, false, [".csv", ".xls", ".xlsx", "text/csv", "application/vnd.ms-excel", "application/csv", "text/x-csv", "application/x-csv", "text/comma-separated-values", "text/x-comma-separated-values"]);
            if (success) uploadAvailability(finalFileName);
            return success;
        },
        addSku: async (_parent: undefined, { input }: IWrap<SkuInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.create({
                data: {
                    ...input,
                    size: toNumber(input.size),
                    price: toNumber(input.price),
                },
                ...(new PrismaSelect(info).value)
            });
        },
        updateSku: async (_parent: undefined, { input }: IWrap<SkuInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.update({
                where: { id: input.id || undefined },
                data: {
                    ...input,
                    size: toNumber(input.size),
                    price: toNumber(input.price),
                },
                ...(new PrismaSelect(info).value),
            });
        },
        deleteSkus: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<Count | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.sku.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
