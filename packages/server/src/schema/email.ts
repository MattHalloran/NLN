import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { DeleteManyInput, EmailInput } from "./types";

export const typeDef = gql`
    input EmailInput {
        id: ID
        emailAddress: String!
        receivesDeliveryUpdates: Boolean
        customerId: ID
        businessId: ID
    }

    type Email {
        id: ID!
        emailAddress: String!
        receivesDeliveryUpdates: Boolean!
        customer: Customer
        business: Business
    }

    extend type Query {
        emails: [Email!]!
    }

    extend type Mutation {
        addEmail(input: EmailInput!): Email!
        updateEmail(input: EmailInput!): Email!
        deleteEmails(input: DeleteManyInput!): Count!
    }
`;

export const resolvers = {
    Query: {
        emails: async (_parent: undefined, _data: IWrap<undefined>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.email.findMany((new PrismaSelect(info).value));
        },
    },
    Mutation: {
        addEmail: async (_parent: undefined, { input }: IWrap<EmailInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or adding to your own
            if (!req.isAdmin || (req.businessId !== input.businessId)) throw new CustomError(CODE.Unauthorized);
            return await prisma.email.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        updateEmail: async (_parent: undefined, { input }: IWrap<EmailInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            const curr = await prisma.email.findUnique({ where: input.id ? { id: input.id } : { emailAddress: input.emailAddress } });
            if (!curr || req.businessId !== curr.businessId) throw new CustomError(CODE.Unauthorized);
            return await prisma.email.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value),
            });
        },
        deleteEmails: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            // TODO must keep at least one email per customer
            const specified = await prisma.email.findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const businessIds = [...new Set(specified.map((s) => s.businessId))];
            if (!req.isAdmin && (businessIds.length > 1 || req.businessId !== businessIds[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma.email.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
