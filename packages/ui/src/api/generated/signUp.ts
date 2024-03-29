/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { SignUpInput, AccountStatus, OrderStatus, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: signUp
// ====================================================

export interface signUp_signUp_roles_role {
  __typename: "Role";
  title: string;
  description: string | null;
}

export interface signUp_signUp_roles {
  __typename: "CustomerRole";
  role: signUp_signUp_roles_role;
}

export interface signUp_signUp_cart_address {
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

export interface signUp_signUp_cart_customer {
  __typename: "Customer";
  id: string;
}

export interface signUp_signUp_cart_items_sku_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface signUp_signUp_cart_items_sku_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface signUp_signUp_cart_items_sku_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: signUp_signUp_cart_items_sku_plant_images_image_files[] | null;
}

export interface signUp_signUp_cart_items_sku_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: signUp_signUp_cart_items_sku_plant_images_image;
}

export interface signUp_signUp_cart_items_sku_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: signUp_signUp_cart_items_sku_plant_traits[] | null;
  images: signUp_signUp_cart_items_sku_plant_images[] | null;
}

export interface signUp_signUp_cart_items_sku_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface signUp_signUp_cart_items_sku_discounts {
  __typename: "SkuDiscount";
  discount: signUp_signUp_cart_items_sku_discounts_discount;
}

export interface signUp_signUp_cart_items_sku {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  plant: signUp_signUp_cart_items_sku_plant;
  discounts: signUp_signUp_cart_items_sku_discounts[] | null;
}

export interface signUp_signUp_cart_items {
  __typename: "OrderItem";
  id: string;
  quantity: number;
  sku: signUp_signUp_cart_items_sku;
}

export interface signUp_signUp_cart {
  __typename: "Order";
  id: string;
  status: OrderStatus;
  specialInstructions: string | null;
  desiredDeliveryDate: any | null;
  expectedDeliveryDate: any | null;
  isDelivery: boolean | null;
  address: signUp_signUp_cart_address | null;
  customer: signUp_signUp_cart_customer;
  items: signUp_signUp_cart_items[];
}

export interface signUp_signUp {
  __typename: "Customer";
  id: string;
  emailVerified: boolean;
  accountApproved: boolean;
  status: AccountStatus;
  theme: string;
  roles: signUp_signUp_roles[];
  cart: signUp_signUp_cart | null;
}

export interface signUp {
  signUp: signUp_signUp;
}

export interface signUpVariables {
  input: SignUpInput;
}
