import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";

import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context.js";
import { CustomError } from "../error.js";
import { IWrap, RecursivePartial } from "../types.js";
import { Address, AddressInput, Count, DeleteManyInput } from "./types.js";

export const typeDef = /* GraphQL */ `
    input AddressInput {
        id: ID
        tag: String
        name: String
        country: String!
        administrativeArea: String!
        subAdministrativeArea: String
        locality: String!
        postalCode: String!
        throughfare: String!
        premise: String
        deliveryInstructions: String
        businessId: ID!
    }

    type Address {
        id: ID!
        tag: String
        name: String
        country: String!
        administrativeArea: String!
        subAdministrativeArea: String
        locality: String!
        postalCode: String!
        throughfare: String!
        premise: String
        business: Business!
        orders: [Order!]!
    }

    extend type Query {
        addresses: [Address!]!
    }

    extend type Mutation {
        addAddress(input: AddressInput!): Address!
        updateAddress(input: AddressInput!): Address!
        deleteAddresses(input: DeleteManyInput!): Count!
    }
`;

export const resolvers = {
    Query: {
        addresses: async (_parent: undefined, _input: undefined, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Address>[]> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.address.findMany((new PrismaSelect(info).value));
        },
    },
    Mutation: {
        addAddress: async (_parent: undefined, { input }: IWrap<AddressInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Address>> => {
            // Must be admin, or adding to your own
            if (!req.isAdmin && (req.businessId !== input.businessId)) throw new CustomError(CODE.Unauthorized);
            return await prisma.address.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        updateAddress: async (_parent: undefined, { input }: IWrap<AddressInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Address>> => {
            // Must be admin, or updating your own
            const curr = await prisma.address.findUnique({ where: { id: input.id as string } });
            if (!curr) throw new CustomError(CODE.NotFound);
            if (!req.isAdmin && req.businessId !== curr.businessId) throw new CustomError(CODE.Unauthorized);
            return await prisma.address.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value),
            });
        },
        deleteAddresses: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<Count> => {
            // Must be admin, or deleting your own
            const specified = await prisma.address.findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const businessIds = [...new Set(specified.map((s) => s.businessId))];
            if (!req.isAdmin && (businessIds.length > 1 || req.businessId !== businessIds[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma.address.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
