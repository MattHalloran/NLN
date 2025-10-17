/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { UpsertOrderItemInput, OrderStatus, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: upsertOrderItem
// ====================================================

export interface upsertOrderItem_upsertOrderItem_address {
  __typename: "Address";
  tag: string | null;
  name: string | null;
  country: string;
  administrativeArea: string;
  subAdministrativeArea: string | null;
  locality: string;
  postalCode: string;
  throughfare: string;
  premise: string | null;
}

export interface upsertOrderItem_upsertOrderItem_customer {
  __typename: "Customer";
  id: string;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: upsertOrderItem_upsertOrderItem_items_sku_plant_images_image_files[] | null;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: upsertOrderItem_upsertOrderItem_items_sku_plant_images_image;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: upsertOrderItem_upsertOrderItem_items_sku_plant_traits[] | null;
  images: upsertOrderItem_upsertOrderItem_items_sku_plant_images[] | null;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface upsertOrderItem_upsertOrderItem_items_sku_discounts {
  __typename: "SkuDiscount";
  discount: upsertOrderItem_upsertOrderItem_items_sku_discounts_discount;
}

export interface upsertOrderItem_upsertOrderItem_items_sku {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  plant: upsertOrderItem_upsertOrderItem_items_sku_plant;
  discounts: upsertOrderItem_upsertOrderItem_items_sku_discounts[] | null;
}

export interface upsertOrderItem_upsertOrderItem_items {
  __typename: "OrderItem";
  id: string;
  quantity: number;
  sku: upsertOrderItem_upsertOrderItem_items_sku;
}

export interface upsertOrderItem_upsertOrderItem {
  __typename: "Order";
  id: string;
  status: OrderStatus;
  specialInstructions: string | null;
  desiredDeliveryDate: any | null;
  expectedDeliveryDate: any | null;
  isDelivery: boolean | null;
  address: upsertOrderItem_upsertOrderItem_address | null;
  customer: upsertOrderItem_upsertOrderItem_customer;
  items: upsertOrderItem_upsertOrderItem_items[];
}

export interface upsertOrderItem {
  upsertOrderItem: upsertOrderItem_upsertOrderItem;
}

export interface upsertOrderItemVariables {
  input: UpsertOrderItemInput;
}
