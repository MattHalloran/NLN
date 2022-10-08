/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PlantsInput, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL query operation: plants
// ====================================================

export interface plants_plants_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface plants_plants_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface plants_plants_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: plants_plants_images_image_files[] | null;
}

export interface plants_plants_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: plants_plants_images_image;
}

export interface plants_plants_skus_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface plants_plants_skus_discounts {
  __typename: "SkuDiscount";
  discount: plants_plants_skus_discounts_discount;
}

export interface plants_plants_skus {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  discounts: plants_plants_skus_discounts[] | null;
}

export interface plants_plants {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: plants_plants_traits[] | null;
  images: plants_plants_images[] | null;
  skus: plants_plants_skus[] | null;
}

export interface plants {
  plants: plants_plants[];
}

export interface plantsVariables {
  input: PlantsInput;
}
