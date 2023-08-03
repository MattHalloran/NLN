import { orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const updateOrderMutation = gql`
    ${orderFields}
    ${orderItemFields}
    mutation updateOrder($input: OrderInput!) {
        updateOrder(input: $input) {
            ...orderFields
            items {
                ...orderItemFields
            }
        }
    }
`;
