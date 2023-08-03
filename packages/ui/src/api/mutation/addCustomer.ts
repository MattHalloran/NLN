import { customerContactFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const addCustomerMutation = gql`
    ${customerContactFields}
    ${orderFields}
    ${orderItemFields}
    mutation addCustomer($input: CustomerInput!) {
        addCustomer(input: $input) {
            ...customerContactFields
            status
            accountApproved
            orders {
                ...orderFields
                items {
                    ...orderItemFields
                }
            }
            roles {
                role {
                    title
                }
            }
        }
    }
`;
