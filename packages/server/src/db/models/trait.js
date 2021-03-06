import { gql } from 'apollo-server-express';
import { db } from '../db';
import { TABLES } from '../tables';

export const typeDef = gql`
    type Trait {
        id: ID!
        name: String!
        value: String!
        plants: [Plant!]!
    }

    extend type Query {
        traitNames: [String!]!
        traitValues(name: String!): [String!]!
    }
`

export const resolvers = {
    Query: {
        traitNames: async () => {
            return await db(TABLES.Trait).select('name');
        },
        traitValues: async (_, args) => {
            return await db(TABLES.Trait).select('value').where('name', args.name)
        }
    },
}