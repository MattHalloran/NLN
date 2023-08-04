import { customerContactFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const customersQuery = gql`
    ${customerContactFields}
    ${orderFields}
    ${orderItemFields}
    query customers {
        customers {
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
