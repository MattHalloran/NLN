import { gql } from 'graphql-tag';
import { discountFields, plantFields, skuFields } from 'graphql/fragment';

export const skusQuery = gql`
    ${skuFields}
    ${plantFields}
    ${discountFields}
    query SkusQuery(input: SkusInput!) {
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
`