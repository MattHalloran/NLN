import { imageFields } from "api/fragment/imageFields";
import { gql } from "graphql-tag";

export const imagesByLabelQuery = gql`
    ${imageFields}
    query imagesByLabel($input: ImagesByLabelInput!) {
        imagesByLabel(input: $input) {
            ...imageFields
        }
    }
`;
