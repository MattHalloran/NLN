import { gql } from 'apollo-server-express';
import { GraphQLResolveInfo, GraphQLScalarType } from "graphql";
import { GraphQLUpload } from 'graphql-upload';
import { readFiles, saveFiles } from '../utils';
import _ from 'lodash';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';

export const typeDef = gql`
    scalar Date
    scalar Upload

    # Return type for delete mutations,
    # which return the number of affected rows
    type Count {
        count: Int
    }
    # Return type for error messages
    type Response {
        code: Int
        message: String!
    }
    # Input for finding object by id
    input FindByIdInput {
        id: ID!
    }
    # Input for deleting one object
    input DeleteOneInput {
        id: ID!
    }
    # Input for deleting multiple objects
    input DeleteManyInput {
        ids: [ID!]!
    }

    input ReadAssetsInput {
        files: [String!]!
    }
    input WriteAssetsInput {
        files: [Upload!]!
    }
    # Base query. Must contain something,
    # which can be as simple as '_empty: String'
    type Query {
        # _empty: String
        readAssets(input: ReadAssetsInput!): [String]!
    }
    # Base mutation. Must contain something,
    # which can be as simple as '_empty: String'
    type Mutation {
        # _empty: String
        writeAssets(input: WriteAssetsInput!): Boolean
    }
`

export const resolvers = {
    Upload: GraphQLUpload,
    Date: new GraphQLScalarType({
        name: "Date",
        description: "Custom description for the date scalar",
        // Assumes data is either Unix timestamp or Date object
        parseValue(value) {
            return new Date(value).toISOString(); // value from the client
        },
        serialize(value) {
            return new Date(value).getTime(); // value sent to the client
        },
        parseLiteral(ast: any) {
            return new Date(ast).toDateString(); // ast value is always in string format
        }
    }),
    Query: {
        readAssets: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            return await readFiles(input.files);
        },
    },
    Mutation: {
        writeAssets: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            const data = await saveFiles(input.files);
            // Any failed writes will return null
            return !data.some(d => d === null)
        },
    }
}