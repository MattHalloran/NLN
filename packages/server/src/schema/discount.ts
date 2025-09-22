import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";

import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context.js";
import { CustomError } from "../error.js";
import { IWrap, RecursivePartial } from "../types.js";
import { Count, DeleteManyInput, Discount, DiscountInput } from "./types.js";

export const typeDef = /* GraphQL */ `
    input DiscountInput {
        id: ID
        title: String!
        discount: Float!
        comment: String
        terms: String
        businessIds: [ID!]
        skuIds: [ID!]
    }

    type Discount {
        id: ID!
        discount: Float!
        title: String!
        comment: String
        terms: String
        businesses: [Business!]!
        skus: [Sku!]!
    }

    extend type Query {
        discounts: [Discount!]!
    }

    extend type Mutation {
        addDiscount(input: DiscountInput!): Discount!
        updateDiscount(input: DiscountInput!): Discount!
        deleteDiscounts(input: DeleteManyInput!): Count!
    }
`;

export const resolvers = {
    Query: {
        discounts: async (_parent: undefined, _input: undefined, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Discount>[]> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.discount.findMany((new PrismaSelect(info).value)) as any[];
        },
    },
    Mutation: {
        addDiscount: async (_parent: undefined, { input }: IWrap<DiscountInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.discount.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        updateDiscount: async (_parent: undefined, { input }: IWrap<DiscountInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.discount.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value),
            });
        },
        deleteDiscounts: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<Count | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.discount.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
