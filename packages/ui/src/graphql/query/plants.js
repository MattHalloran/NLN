import { gql } from 'graphql-tag';
import { plantFields, skuFields } from 'graphql/fragment';

export const plantsQuery = gql`
    ${plantFields}
    ${skuFields}
    query ActivePlantsQuery(input: PlantsInput!) {
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
`