import { plantFields, skuFields } from "api/fragment";
import { gql } from "graphql-tag";

export const updatePlantMutation = gql`
    ${plantFields}
    ${skuFields}
    mutation updatePlant($input: PlantInput!) {
        updatePlant(input: $input) {
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
