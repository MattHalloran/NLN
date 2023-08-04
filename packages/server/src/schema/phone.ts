import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { DeleteManyInput, PhoneInput } from "./types";

export const typeDef = gql`
    input PhoneInput {
        id: ID
        number: String!
        receivesDeliveryUpdates: Boolean, 
        customerId: ID, 
        businessId: ID
    }

    type Phone {
        id: ID!
        number: String!
        receivesDeliveryUpdates: Boolean!
        customer: Customer
        business: Business
    }

    extend type Query {
        phones: [Phone!]!
    }

    extend type Mutation {
        addPhone(input: PhoneInput!): Phone!
        updatePhone(input: PhoneInput!): Phone!
        deletePhones(input: DeleteManyInput!): Count!
    }
`;

export const resolvers = {
    Query: {
        phones: async (_parent: undefined, _data: IWrap<undefined>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.phone.findMany((new PrismaSelect(info).value));
        },
    },
    Mutation: {
        addPhone: async (_parent: undefined, { input }: IWrap<PhoneInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or adding to your own
            if (!req.isAdmin || (req.businessId !== input.businessId)) throw new CustomError(CODE.Unauthorized);
            return await prisma.phone.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        updatePhone: async (_parent: undefined, { input }: IWrap<PhoneInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            const curr = await prisma.phone.findUnique({ where: input.id ? { id: input.id } : { number: input.number } });
            if (!curr) throw new CustomError(CODE.NotFound);
            if (req.businessId !== curr.businessId) throw new CustomError(CODE.Unauthorized);
            return await prisma.phone.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value),
            });
        },
        deletePhones: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            // TODO must leave one phone per customer
            const specified = await prisma.phone.findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const businessIds = [...new Set(specified.map((s) => s.businessId))];
            if (!req.isAdmin && (businessIds.length > 1 || req.businessId !== businessIds[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma.phone.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
