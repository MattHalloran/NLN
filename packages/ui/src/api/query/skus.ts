// ARCHIVED: skusQuery functionality moved to external system
// This file is only used by printAvailability which is also archived
// Export empty object to prevent module errors
export {};

// import { discountFields, plantFields, skuFields } from "api/fragment";
// import { gql } from "graphql-tag";

// export const skusQuery = gql`
//     ${skuFields}
//     ${plantFields}
//     ${discountFields}
//     query skus($input: SkusInput!) {
//         skus(input: $input) {
//             ...skuFields
//             discounts {
//                 discount {
//                     ...discountFields
//                 }
//             }
//             plant {
//                 ...plantFields
//             }
//         }
//     }
// `;
