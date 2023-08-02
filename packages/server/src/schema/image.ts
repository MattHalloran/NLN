import { CODE, IMAGE_SIZE } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { gql } from "apollo-server-express";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context";
import { CustomError } from "../error";
import { IWrap, RecursivePartial } from "../types";
import { deleteImage, saveImage } from "../utils";
import { DeleteImagesByLabelInput, DeleteImagesInput, ImagesByLabelInput, UpdateImagesInput } from "./types";

export const typeDef = gql`
    enum ImageSize {
        XXS
        XS
        S
        M
        ML
        L
        XL
        XXL
    }

    input ImageUpdate {
        hash: String!
        alt: String
        description: String
    }

    input AddImagesInput {
        files: [Upload!]!
        alts: [String]
        descriptions: [String]
        labels: [String!]
    }

    input UpdateImagesInput {
        data: [ImageUpdate!]!
        deleting: [String!]
        label: String
    }

    input DeleteImagesInput {
        hashes: [String!]!
    }

    input DeleteImagesByLabelInput {
        labels: [String!]!
    }

    input ImagesByLabelInput {
        label: String!
    }

    type AddImageResponse {
        success: Boolean!
        src: String
        hash: String
    }

    type ImageFile {
        hash: String!
        src: String!
        width: Int!
        height: Int!
    }

    type Image {
        hash: String!
        alt: String
        description: String
        files: [ImageFile!]
    }

    extend type Query {
        imagesByLabel(input: ImagesByLabelInput!): [Image!]!
    }

    extend type Mutation {
        addImages(input: AddImagesInput!): [AddImageResponse!]!
        updateImages(input: UpdateImagesInput!): Boolean!
        deleteImages(input: DeleteImagesInput!): Count!
        # Images with labels that are not in this request will be saved
        deleteImagesByLabel(input: DeleteImagesByLabelInput!): Count!
    }
`;

export const resolvers = {
    ImageSize: IMAGE_SIZE,
    Query: {
        imagesByLabel: async (_parent: undefined, { input }: IWrap<ImagesByLabelInput>, { prisma }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Get all images with label
            let images = await prisma.image.findMany({
                where: { image_labels: { some: { label: input.label } } },
                select: { hash: true, image_labels: { select: { label: true, index: true } } },
            });
            // Sort by position
            images = images.sort((a, b) => {
                const aIndex = a.image_labels.find((l) => l.label === input.label);
                const bIndex = b.image_labels.find((l) => l.label === input.label);
                return (aIndex?.index ?? 0) - (bIndex?.index ?? 0);
            });
            return await prisma.image.findMany({
                where: { hash: { in: images.map((i) => i.hash) } },
                ...(new PrismaSelect(info).value),
            });
        },
    },
    Mutation: {
        addImages: async (_parent: undefined, { input }: IWrap<any>, { req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // Check for valid arguments
            // If alts provided, must match length of files
            if (input.alts && input.alts.length !== input.files.length) throw new CustomError(CODE.InvalidArgs);
            const results: any[] = [];
            // Loop through every image passed in
            for (let i = 0; i < input.files.length; i++) {
                results.push(await saveImage({
                    file: input.files[i],
                    alt: input.alts ? input.alts[i] : undefined,
                    description: input.descriptions ? input.descriptions[i] : undefined,
                    labels: input.labels,
                    errorOnDuplicate: false,
                }));
            }
            return results;
        },
        updateImages: async (_parent: undefined, { input }: IWrap<UpdateImagesInput>, { prisma, req }: Context): Promise<boolean> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            // Loop through update data passed in
            for (let i = 0; i < input.data.length; i++) {
                const curr = input.data[i];
                if (input.label) {
                    // Update position in label
                    await prisma.image_labels.update({
                        where: { hash_label: { hash: curr.hash, label: input.label } },
                        data: { index: i },
                    });
                }
                // Update alt and description
                await prisma.image.update({
                    where: { hash: curr.hash },
                    data: {
                        alt: curr.alt,
                        description: curr.description,
                    },
                });
            }
            if (!input.deleting) return true;
            // Loop through delete data passed in
            for (const hash of input.deleting) {
                await deleteImage(hash);
            }
            return true;
        },
        deleteImages: async (_parent: undefined, { input }: IWrap<DeleteImagesInput>, { req }: Context): Promise<any> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            let count = 0;
            for (const hash of input.hashes) {
                if (await deleteImage(hash)) count++;
            }
            return count;
        },
        deleteImagesByLabel: async (_parent: undefined, { input }: IWrap<DeleteImagesByLabelInput>, { prisma, req }: Context): Promise<any> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            const imagesToDelete = await prisma.image.findMany({
                where: { image_labels: { every: { label: { in: input.labels } } } },
                select: {
                    hash: true,
                },
            });
            await prisma.image_labels.deleteMany({
                where: { label: { in: input.labels } },
            });
            let count = 0;
            for (const image of imagesToDelete) {
                if (await deleteImage(image.hash)) count++;
            }
            return count;
        },
    },
};
