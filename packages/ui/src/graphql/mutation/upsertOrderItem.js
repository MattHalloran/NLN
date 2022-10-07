import { gql } from 'graphql-tag';
import { orderItemFields } from 'graphql/fragment';

export const upsertOrderItemMutation = gql`
    ${orderItemFields}
    mutation upsertOrderItem(input: UpsertOrderItemInput!) {
        upsertOrderItem(input: $input) {
            ...orderItemFields
        }
    }
`