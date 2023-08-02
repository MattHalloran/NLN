import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { IWrap, RecursivePartial } from "../types";

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
`;

export const resolvers = {
    Query: {
        traitNames: async (_parent: undefined, _input: undefined, { prisma }: Context): Promise<RecursivePartial<any> | null> => {
            const traits = await prisma.plant_trait.findMany({
                select: {
                    name: true,
                },
            });
            return traits.map((t) => t.name);
        },
        traitValues: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            const traits = await prisma.plant_trait.findMany({
                where: { name: input.name },
                select: {
                    value: true,
                },
            });
            return traits.map((t) => t.value);
        },
        // Returns all values previously entered for every trait
        traitOptions: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Query all data
            const trait_data = await prisma.plant_trait.findMany();
            // Combine data into object
            const options: { [x: string]: any } = {};
            for (const row of trait_data) {
                options[row.name] ? options[row.name].push(row.value) : options[row.name] = [row.value];
            }
            // Format object
            const trait_options: any[] = [];
            for (const [key, value] of Object.entries(options)) {
                trait_options.push({ name: key, values: [...new Set(value)] });
            }
            return trait_options;
        },
    },
};
