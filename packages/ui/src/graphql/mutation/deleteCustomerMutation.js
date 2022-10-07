import { gql } from 'graphql-tag';

export const deleteCustomerMutation = gql`
    mutation deleteCustomer(input: DeleteCustomerInput!) {
        deleteCustomer(input: $input)
    }
`