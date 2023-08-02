import { gql } from "graphql-tag";
import { customerSessionFields, orderFields, orderItemFields } from "graphql/fragment";

export const resetPasswordMutation = gql`
    ${customerSessionFields}
    ${orderFields}
    ${orderItemFields}
    mutation resetPassword($input: ResetPasswordInput!) {
        resetPassword(input: $input) {
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
