import { customerSessionFields } from "api/fragment";
// ARCHIVED: orderFields, orderItemFields - cart functionality moved to external system
import { gql } from "graphql-tag";

export const signUpMutation = gql`
    ${customerSessionFields}
    mutation signUp($input: SignUpInput!) {
    signUp(input: $input) {
            ...customerSessionFields
        }
    }
`;
