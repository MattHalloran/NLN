import { gql } from 'apollo-server-express';
import { CODE } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'feedback';

export const typeDef = gql`
    input FeedbackInput {
        id: ID
        text: String!
        customerId: ID
    }

    type Feedback {
        id: ID!
        text: String!
        customer: Customer
    }

    extend type Query {
        feedbacks: [Feedback!]!
    }

    extend type Mutation {
        addFeedback(input: FeedbackInput!): Feedback!
        deleteFeedbacks(input: DeleteManyInput!): Count!
    }
`

export const resolvers = {
    Query: {
        feedbacks: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].findMany((new PrismaSelect(info).value));
        }
    },
    Mutation: {
        addFeedback: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            return await prisma[_model].create((new PrismaSelect(info).value), { data: { ...input } })
        },
        deleteFeedbacks: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            const specified = await prisma[_model].findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const customer_ids = [...new Set(specified.map((s: any) => s.customerId))];
            if (!req.isAdmin && (customer_ids.length > 1 || req.customerId !== customer_ids[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].deleteMany({ where: { id: { in: input.ids } } });
        }
    }
}