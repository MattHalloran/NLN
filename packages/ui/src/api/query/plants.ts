import { plantFields, skuFields } from "api/fragment";
import { gql } from "graphql-tag";

export const plantsQuery = gql`
    ${plantFields}
    ${skuFields}
    query plants($input: PlantsInput!) {
        plants(input: $input) {
            ...plantFields
            skus {
                ...skuFields
                discounts {
                    discount {
                        id
                        discount
                        title
                        comment
                        terms
                    }
                }
            }
        }
    }
`;
