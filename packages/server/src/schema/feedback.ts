import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";

import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context.js";
import { CustomError } from "../error.js";
import { IWrap, RecursivePartial } from "../types.js";
import { Count, DeleteManyInput, FeedbackInput } from "./types.js";

export const typeDef = /* GraphQL */ `
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
`;

export const resolvers = {
    Query: {
        feedbacks: async (_parent: undefined, _data: IWrap<undefined>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.feedback.findMany((new PrismaSelect(info).value));
        },
    },
    Mutation: {
        addFeedback: async (_parent: undefined, { input }: IWrap<FeedbackInput>, { prisma }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            return await prisma.feedback.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        deleteFeedbacks: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<Count | null> => {
            // Must be admin, or deleting your own
            const specified = await prisma.feedback.findMany({ where: { id: { in: input.ids } } });
            if (!specified) throw new CustomError(CODE.ErrorUnknown);
            const customer_ids = [...new Set(specified.map((s) => s.customerId))];
            if (!req.isAdmin && (customer_ids.length > 1 || req.customerId !== customer_ids[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma.feedback.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
