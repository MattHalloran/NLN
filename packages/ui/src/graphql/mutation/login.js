import { gql } from 'graphql-tag';
import { customerSessionFields, orderFields, orderItemFields } from 'graphql/fragment';

export const loginMutation = gql`
    ${customerSessionFields}
    ${orderFields}
    ${orderItemFields}
    mutation login(input: LoginInput!) {
        login(input: $input) {
            ...customerSessionFields
            cart {
                ...orderFields
                items {
                    ...orderItemFields
                }
            }
        }
    }
`