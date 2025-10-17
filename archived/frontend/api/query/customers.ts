import { customerContactFields } from "api/fragment";
// ARCHIVED: orderFields, orderItemFields - orders functionality moved to external system
import { gql } from "graphql-tag";

export const customersQuery = gql`
    ${customerContactFields}
    query customers {
        customers {
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
