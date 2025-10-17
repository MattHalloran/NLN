import { customerContactFields } from "api/fragment";
// ARCHIVED: orderFields, orderItemFields - orders functionality moved to external system
import { gql } from "graphql-tag";

export const addCustomerMutation = gql`
    ${customerContactFields}
    mutation addCustomer($input: CustomerInput!) {
        addCustomer(input: $input) {
            ...customerContactFields
            status
            accountApproved
            roles {
                role {
                    title
                }
            }
        }
    }
`;
