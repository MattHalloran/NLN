import { CODE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { DeleteManyInput, RoleInput } from "./types";

export const typeDef = gql`
    input RoleInput {
        id: ID
        title: String!
        description: String
        customerIds: [ID!]
    }

    type CustomerRole {
        customer: Customer!
        role: Role!
    }

    type Role {
        id: ID!
        title: String!
        description: String
        customers: [Customer!]!
    }

    extend type Query {
        roles: [Role!]!
    }

    extend type Mutation {
        addRole(input: RoleInput!): Role!
        updateRole(input: RoleInput!): Role!
        deleteRoles(input: DeleteManyInput!): Count!
    }
`;

export const resolvers = {
    Query: {
        roles: async (_parent: undefined, _data: IWrap<undefined>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.role.findMany((new PrismaSelect(info).value));
        },
    },
    Mutation: {
        addRole: async (_parent: undefined, { input }: IWrap<RoleInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.role.create({ data: { ...input }, ...(new PrismaSelect(info).value) });
        },
        updateRole: async (_parent: undefined, { input }: IWrap<RoleInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.role.update({
                where: { id: input.id || undefined },
                data: { ...input },
                ...(new PrismaSelect(info).value),
            });
        },
        deleteRoles: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.role.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
