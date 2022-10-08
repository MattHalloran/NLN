/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { AccountStatus, OrderStatus, SkuStatus } from "./globalTypes";

// ====================================================
// GraphQL query operation: customers
// ====================================================

export interface customers_customers_emails {
  __typename: "Email";
  id: string;
  emailAddress: string;
  receivesDeliveryUpdates: boolean;
}

export interface customers_customers_phones {
  __typename: "Phone";
  id: string;
  number: string;
  receivesDeliveryUpdates: boolean;
}

export interface customers_customers_business {
  __typename: "Business";
  id: string;
  name: string;
}

export interface customers_customers_orders_address {
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

export interface customers_customers_orders_customer {
  __typename: "Customer";
  id: string;
}

export interface customers_customers_orders_items_sku_plant_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface customers_customers_orders_items_sku_plant_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface customers_customers_orders_items_sku_plant_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: customers_customers_orders_items_sku_plant_images_image_files[] | null;
}

export interface customers_customers_orders_items_sku_plant_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: customers_customers_orders_items_sku_plant_images_image;
}

export interface customers_customers_orders_items_sku_plant {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: customers_customers_orders_items_sku_plant_traits[] | null;
  images: customers_customers_orders_items_sku_plant_images[] | null;
}

export interface customers_customers_orders_items_sku_discounts_discount {
  __typename: "Discount";
  id: string;
  discount: number;
  title: string;
  comment: string | null;
  terms: string | null;
}

export interface customers_customers_orders_items_sku_discounts {
  __typename: "SkuDiscount";
  discount: customers_customers_orders_items_sku_discounts_discount;
}

export interface customers_customers_orders_items_sku {
  __typename: "Sku";
  id: string;
  sku: string;
  isDiscountable: boolean;
  size: string | null;
  note: string | null;
  availability: number;
  price: string | null;
  status: SkuStatus;
  plant: customers_customers_orders_items_sku_plant;
  discounts: customers_customers_orders_items_sku_discounts[] | null;
}

export interface customers_customers_orders_items {
  __typename: "OrderItem";
  id: string;
  quantity: number;
  sku: customers_customers_orders_items_sku;
}

export interface customers_customers_orders {
  __typename: "Order";
  id: string;
  status: OrderStatus;
  specialInstructions: string | null;
  desiredDeliveryDate: any | null;
  expectedDeliveryDate: any | null;
  isDelivery: boolean | null;
  address: customers_customers_orders_address | null;
  customer: customers_customers_orders_customer;
  items: customers_customers_orders_items[];
}

export interface customers_customers_roles_role {
  __typename: "Role";
  title: string;
}

export interface customers_customers_roles {
  __typename: "CustomerRole";
  role: customers_customers_roles_role;
}

export interface customers_customers {
  __typename: "Customer";
  id: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  pronouns: string;
  emails: customers_customers_emails[];
  phones: customers_customers_phones[];
  business: customers_customers_business | null;
  status: AccountStatus;
  accountApproved: boolean;
  orders: customers_customers_orders[];
  roles: customers_customers_roles[];
}

export interface customers {
  customers: customers_customers[];
}
