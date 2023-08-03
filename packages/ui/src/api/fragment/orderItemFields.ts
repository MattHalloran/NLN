import { gql } from "graphql-tag";
import { discountFields } from "./discountFields";
import { plantFields } from "./plantFields";
import { skuFields } from "./skuFields";

export const orderItemFields = gql`
    ${skuFields}
    ${plantFields}
    ${discountFields}
    fragment orderItemFields on OrderItem {
        id
        quantity
        sku {
            ...skuFields
            plant {
                ...plantFields
            }
            discounts {
                discount {
                    ...discountFields
                }
            }
        }
    }
`;
