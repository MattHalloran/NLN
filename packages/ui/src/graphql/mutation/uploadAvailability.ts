import { gql } from 'graphql-tag';

export const uploadAvailabilityMutation = gql`
    mutation uploadAvailability($input: UploadAvailabilityInput!) {
        uploadAvailability(input: $input)
    }
`