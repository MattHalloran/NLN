import { CODE, TASK_STATUS } from "@local/shared";
import { gql } from "apollo-server-express";
import { Context } from "../context";
import { CustomError } from "../error";
import { RecursivePartial } from "../types";

export const typeDef = gql`
    enum TaskStatus {
        Unknown
        Failed
        Active
        Completed
    }

    type Task {
        id: ID!
        taskId: Int!
        name: String!
        status: TaskStatus!
        description: String
        result: String
        resultCode: Int
    }

    extend type Query {
        tasks(ids: [ID!], status: TaskStatus): [Task!]!
    }
`;

export const resolvers = {
    TaskStatus: TASK_STATUS,
    Query: {
        tasks: async (_parent: undefined, { status }: any, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.queue_task.findMany({
                where: { status },
            });
        },
    },
};
