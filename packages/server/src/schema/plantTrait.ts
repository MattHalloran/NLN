import { gql } from 'apollo-server-express';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

export const typeDef = gql`
    input TraitValuesInput {
        name: String!
    }

    type PlantTrait {
        id: ID!
        name: String!
        value: String!
    }

    type TraitOptions {
        name: String!
        values: [String!]!
    }

    extend type Query {
        traitNames: [String!]!
        traitValues(input: TraitValuesInput!): [String!]!
        traitOptions: [TraitOptions!]!
    }
`

export const resolvers = {
    Query: {
        traitNames: async (_parent: undefined, _input: undefined, { prisma }: Context): Promise<RecursivePartial<any> | null> => {
            const traits = await prisma.plant_trait.findMany({
                select: {
                    name: true
                }
            })
            return traits.map((t: any) => t.name);
        },
        traitValues: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            const traits = await prisma.plant_trait.findMany({
                where: { name: input.name },
                select: {
                    value: true
                }
            })
            return traits.map((t: any) => t.value);
        },
        // Returns all values previously entered for every trait
        traitOptions: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Query all data
            const trait_data = await prisma.plant_trait.findMany();
            // Combine data into object
            let options: { [x: string]: any } = {};
            for (const row of trait_data) {
                options[row.name] ? options[row.name].push(row.value) : options[row.name] = [row.value];
            }
            // Format object
            let trait_options = []
            for (const [key, value] of Object.entries(options)) {
                trait_options.push({ name: key, values: [...new Set(value)] });
            }
            return trait_options;
        }
    },
}