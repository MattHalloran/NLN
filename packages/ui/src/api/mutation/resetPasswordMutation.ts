import { customerSessionFields } from "api/fragment";
// ARCHIVED: orderFields, orderItemFields - cart functionality moved to external system
import { gql } from "graphql-tag";

export const resetPasswordMutation = gql`
    ${customerSessionFields}
    mutation resetPassword($input: ResetPasswordInput!) {
        resetPassword(input: $input) {
            ...customerSessionFields
        }
    }
`;
