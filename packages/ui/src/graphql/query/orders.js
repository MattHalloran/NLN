import { gql } from 'graphql-tag';
import { orderFields, orderItemFields, customerContactFields } from 'graphql/fragment';

export const ordersQuery = gql`
    ${orderFields}
    ${orderItemFields}
    ${customerContactFields}
    query Orders(input: OrdersInput!) {
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
`