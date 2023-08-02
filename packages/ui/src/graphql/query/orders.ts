import { gql } from "graphql-tag";
import { customerContactFields, orderFields, orderItemFields } from "graphql/fragment";

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
