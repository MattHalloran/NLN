import { gql } from "graphql-tag";

export const addImagesMutation = gql`
    mutation addImages($input: AddImagesInput!) {
        addImages(input: $input) {
            success
            src
            hash
        }
    }
`;
