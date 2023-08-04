/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { LoginInput, AccountStatus, OrderStatus, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: login
// ====================================================

export interface login_login_roles_role {
  __typename: "Role";
  title: string;
  description: string | null;
}

export interface login_login_roles {
  __typename: "CustomerRole";
  role: login_login_roles_role;
}

export interface login_login_cart_address {
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

export interface login_login_cart_customer {
  __typename: "Customer";
  id: string;
}

export interface login_login_cart_items_sku_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface login_login_cart_items_sku_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface login_login_cart_items_sku_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: login_login_cart_items_sku_plant_images_image_files[] | null;
}

export interface login_login_cart_items_sku_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: login_login_cart_items_sku_plant_images_image;
}

export interface login_login_cart_items_sku_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: login_login_cart_items_sku_plant_traits[] | null;
  images: login_login_cart_items_sku_plant_images[] | null;
}

export interface login_login_cart_items_sku_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface login_login_cart_items_sku_discounts {
  __typename: "SkuDiscount";
  discount: login_login_cart_items_sku_discounts_discount;
}

export interface login_login_cart_items_sku {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  plant: login_login_cart_items_sku_plant;
  discounts: login_login_cart_items_sku_discounts[] | null;
}

export interface login_login_cart_items {
  __typename: "OrderItem";
  id: string;
  quantity: number;
  sku: login_login_cart_items_sku;
}

export interface login_login_cart {
  __typename: "Order";
  id: string;
  status: OrderStatus;
  specialInstructions: string | null;
  desiredDeliveryDate: any | null;
  expectedDeliveryDate: any | null;
  isDelivery: boolean | null;
  address: login_login_cart_address | null;
  customer: login_login_cart_customer;
  items: login_login_cart_items[];
}

export interface login_login {
  __typename: "Customer";
  id: string;
  emailVerified: boolean;
  accountApproved: boolean;
  status: AccountStatus;
  theme: string;
  roles: login_login_roles[];
  cart: login_login_cart | null;
}

export interface login {
  login: login_login;
}

export interface loginVariables {
  input: LoginInput;
}
