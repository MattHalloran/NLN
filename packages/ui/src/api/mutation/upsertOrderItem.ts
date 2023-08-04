import { orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const upsertOrderItemMutation = gql`
    ${orderItemFields}
    mutation upsertOrderItem($input: UpsertOrderItemInput!) {
        upsertOrderItem(input: $input) {
            ...orderItemFields
        }
    }
`;
