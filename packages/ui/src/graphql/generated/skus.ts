/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { SkusInput, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL query operation: skus
// ====================================================

export interface skus_skus_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface skus_skus_discounts {
  __typename: "SkuDiscount";
  discount: skus_skus_discounts_discount;
}

export interface skus_skus_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface skus_skus_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface skus_skus_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: skus_skus_plant_images_image_files[] | null;
}

export interface skus_skus_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: skus_skus_plant_images_image;
}

export interface skus_skus_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: skus_skus_plant_traits[] | null;
  images: skus_skus_plant_images[] | null;
}

export interface skus_skus {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  discounts: skus_skus_discounts[] | null;
  plant: skus_skus_plant;
}

export interface skus {
  skus: skus_skus[];
}

export interface skusVariables {
  input: SkusInput;
}
