import { gql } from 'graphql-tag';

export const changeCustomerStatusMutation = gql`
    mutation changeCustomerStatus($input: ChangeCustomerStatusInput!) {
        changeCustomerStatus(input: $input)
    }
`