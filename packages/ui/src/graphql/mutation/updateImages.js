import { gql } from 'graphql-tag';

export const updateImagesMutation = gql`
    mutation updateImages(input: UpdateImagesInput!) {
        updateImages(input: $input)
    }
`