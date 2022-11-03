import { gql } from 'apollo-server-express';
import { CODE } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';
import { Business, BusinessInput, Count, DeleteManyInput } from './types';

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
        businesses: async (_parent: undefined, _input: undefined, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Business>[]> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.business.findMany((new PrismaSelect(info).value));
        }
    },
    Mutation: {
        addBusiness: async (_parent: undefined, { input }: IWrap<BusinessInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Business>> => {
            // Must be admin
            if(!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.business.create({ data: { ...input }, ...(new PrismaSelect(info).value) })
        },
        updateBusiness: async (_parent: undefined, { input }: IWrap<BusinessInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<Business>> => {
            // Must be admin, or updating your own
            if(!req.isAdmin || (req.businessId !== input.id)) throw new CustomError(CODE.Unauthorized);
            return await prisma.business.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value)
            })
        },
        deleteBusinesses: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<Count> => {
            // Must be admin, or deleting your own
            if(!req.isAdmin || input.ids.length > 1 || req.businessId !== input.ids[0]) throw new CustomError(CODE.Unauthorized); 
            return await prisma.business.deleteMany({ where: { id: { in: input.ids } } });
        },
    }
}