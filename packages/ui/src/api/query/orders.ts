import { customerContactFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const ordersQuery = gql`
    ${orderFields}
    ${orderItemFields}
    ${customerContactFields}
    query orders($input: OrdersInput!) {
        orders(input: $input) {
            ...orderFields
            items {
                ...orderItemFields
            }
            customer {
                ...customerContactFields
            }
        }
    }
`;
