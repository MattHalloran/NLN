/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL fragment: orderItemFields
// ====================================================

export interface orderItemFields_sku_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface orderItemFields_sku_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface orderItemFields_sku_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: orderItemFields_sku_plant_images_image_files[] | null;
}

export interface orderItemFields_sku_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: orderItemFields_sku_plant_images_image;
}

export interface orderItemFields_sku_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: orderItemFields_sku_plant_traits[] | null;
  images: orderItemFields_sku_plant_images[] | null;
}

export interface orderItemFields_sku_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface orderItemFields_sku_discounts {
  __typename: "SkuDiscount";
  discount: orderItemFields_sku_discounts_discount;
}

export interface orderItemFields_sku {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  plant: orderItemFields_sku_plant;
  discounts: orderItemFields_sku_discounts[] | null;
}

export interface orderItemFields {
  __typename: "OrderItem";
  id: string;
  quantity: number;
  sku: orderItemFields_sku;
}
