import { orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const upsertOrderItemMutation = gql`
    ${orderFields}
    ${orderItemFields}
    mutation upsertOrderItem($input: UpsertOrderItemInput!) {
        upsertOrderItem(input: $input) {
            ...orderFields
            items {
                ...orderItemFields
            }
        }
    }
`;
