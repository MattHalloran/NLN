import { customerSessionFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

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
