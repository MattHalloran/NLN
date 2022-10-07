import { gql } from 'apollo-server-express';
import { CODE } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'business';

export const typeDef = gql`
    input BusinessInput {
        id: ID
        name: String!
        subscribedToNewsletters: Boolean
        discountIds: [ID!]
        employeeIds: [ID!]
    }

    type Business {
        id: ID!
        name: String!
        subscribedToNewsletters: Boolean!
        addresses: [Address!]!
        phones: [Phone!]!
        emails: [Email!]!
        employees: [Customer!]!
        discounts: [Discount!]!
    }

    extend type Query {
        businesses: [Business!]!
    }

    extend type Mutation {
        addBusiness(input: BusinessInput!): Business!
        updateBusiness(input: BusinessInput!): Business!
        deleteBusinesses(input: DeleteManyInput!): Count!
    }
`

export const resolvers = {
    Query: {
        businesses: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].findMany((new PrismaSelect(info).value));
        }
    },
    Mutation: {
        addBusiness: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if(!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].create((new PrismaSelect(info).value), { data: { ...input } })
        },
        updateBusiness: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            if(!req.isAdmin || (req.businessId !== input.id)) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value)
            })
        },
        deleteBusinesses: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            if(!req.isAdmin || input.ids.length > 1 || req.businessId !== input.ids[0]) throw new CustomError(CODE.Unauthorized); 
            return await prisma[_model].deleteMany({ where: { id: { in: input.ids } } });
        },
    }
}