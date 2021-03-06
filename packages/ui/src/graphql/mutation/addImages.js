import { gql } from 'graphql-tag';

export const addImagesMutation = gql`
    mutation addImages(
        $files: [Upload!]!
        $alts: [String]
        $labels: [String!]!
    ) {
    addImages(
        files: $files
        alts: $alts
        labels: $labels
    ) {
        successfulFileNames
        failedFileNames
    }
}
`