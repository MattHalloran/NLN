import { customerSessionFields } from "api/fragment";
import { gql } from "graphql-tag";

export const updateCustomerMutation = gql`
    ${customerSessionFields}
    mutation updateCustomer($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) {
            ...customerSessionFields
        }
    }
`;
