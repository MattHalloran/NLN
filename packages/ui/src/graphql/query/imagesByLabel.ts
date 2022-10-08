import { gql } from 'graphql-tag';
import { imageFields } from 'graphql/fragment/imageFields';

export const imagesByLabelQuery = gql`
    ${imageFields}
    query imagesByLabel($input: ImagesByLabelInput!) {
        imagesByLabel(input: $input) {
            ...imageFields
        }
    }
`