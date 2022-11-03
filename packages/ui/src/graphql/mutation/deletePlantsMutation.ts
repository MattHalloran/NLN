import { gql } from 'graphql-tag';

export const deletePlantsMutation = gql`
    mutation deletePlants($input: DeleteManyInput!) {
        deletePlants(input: $input) {
            count
        }
    }
`