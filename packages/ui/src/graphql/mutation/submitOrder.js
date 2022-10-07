import { gql } from 'graphql-tag';

export const submitOrderMutation = gql`
    mutation submitOrder(input: FindByIdInput!) {
        submitOrder(input: $input)
    }
`