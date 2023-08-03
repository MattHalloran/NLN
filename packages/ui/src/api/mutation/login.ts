import { customerSessionFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const loginMutation = gql`
    ${customerSessionFields}
    ${orderFields}
    ${orderItemFields}
    mutation login($input: LoginInput!) {
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
`;
