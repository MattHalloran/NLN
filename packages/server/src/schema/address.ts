import { gql } from 'apollo-server-express';
import { CODE } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'address';

export const typeDef = gql`
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
`

export const resolvers = {
    Query: {
        addresses: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].findMany((new PrismaSelect(info).value));
        }
    },
    Mutation: {
        addAddress: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or adding to your own
            if(!req.isAdmin && (req.businessId !== input.businessId)) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].create((new PrismaSelect(info).value), { data: { ...input } })
        },
        updateAddress: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            const curr = await prisma[_model].findUnique({ where: { id: input.id } });
            if (!req.isAdmin && req.businessId !== curr.businessId) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value)
            })
        },
        deleteAddresses: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            const specified = await prisma[_model].findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const businessIds = [...new Set(specified.map((s: any) => s.businessId))];
            if (!req.isAdmin && (businessIds.length > 1 || req.businessId !== businessIds[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].deleteMany({ where: { id: { in: input.ids } } });
        }
    }
}