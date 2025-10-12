import { customerSessionFields } from "api/fragment";
// ARCHIVED: orderFields, orderItemFields - cart functionality moved to external system
import { gql } from "graphql-tag";

export const loginMutation = gql`
    ${customerSessionFields}
    mutation login($input: LoginInput!) {
        login(input: $input) {
            ...customerSessionFields
        }
    }
`;
