import { customerSessionFields, orderFields, orderItemFields } from "api/fragment";
import { gql } from "graphql-tag";

export const signUpMutation = gql`
    ${customerSessionFields}
    ${orderFields}
    ${orderItemFields}
    mutation signUp($input: SignUpInput!) {
    signUp(input: $input) {
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
