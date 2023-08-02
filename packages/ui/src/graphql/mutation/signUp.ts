import { gql } from "graphql-tag";
import { customerSessionFields, orderFields, orderItemFields } from "graphql/fragment";

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
