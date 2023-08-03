import { discountFields, plantFields, skuFields } from "api/fragment";
import { gql } from "graphql-tag";

export const skusQuery = gql`
    ${skuFields}
    ${plantFields}
    ${discountFields}
    query skus($input: SkusInput!) {
        skus(input: $input) {
            ...skuFields
            discounts {
                discount {
                    ...discountFields
                }
            }
            plant {
                ...plantFields
            }
        }
    }
`;
