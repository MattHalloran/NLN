/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PlantInput, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: updatePlant
// ====================================================

export interface updatePlant_updatePlant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface updatePlant_updatePlant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface updatePlant_updatePlant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: updatePlant_updatePlant_images_image_files[] | null;
}

export interface updatePlant_updatePlant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: updatePlant_updatePlant_images_image;
}

export interface updatePlant_updatePlant_skus_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface updatePlant_updatePlant_skus_discounts {
  __typename: "SkuDiscount";
  discount: updatePlant_updatePlant_skus_discounts_discount;
}

export interface updatePlant_updatePlant_skus {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  discounts: updatePlant_updatePlant_skus_discounts[] | null;
}

export interface updatePlant_updatePlant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: updatePlant_updatePlant_traits[] | null;
  images: updatePlant_updatePlant_images[] | null;
  skus: updatePlant_updatePlant_skus[] | null;
}

export interface updatePlant {
  updatePlant: updatePlant_updatePlant;
}

export interface updatePlantVariables {
  input: PlantInput;
}
