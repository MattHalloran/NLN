import { gql } from "graphql-tag";
import { customerSessionFields } from "graphql/fragment";

export const updateCustomerMutation = gql`
    ${customerSessionFields}
    mutation updateCustomer($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) {
            ...customerSessionFields
        }
    }
`;
