/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export enum AccountStatus {
  Deleted = "Deleted",
  HardLock = "HardLock",
  SoftLock = "SoftLock",
  Unlocked = "Unlocked",
}

export enum OrderStatus {
  Approved = "Approved",
  CanceledByAdmin = "CanceledByAdmin",
  CanceledByCustomer = "CanceledByCustomer",
  Delivered = "Delivered",
  Draft = "Draft",
  InTransit = "InTransit",
  Pending = "Pending",
  PendingCancel = "PendingCancel",
  Rejected = "Rejected",
  Scheduled = "Scheduled",
}

export enum SkuSortBy {
  AZ = "AZ",
  Featured = "Featured",
  Newest = "Newest",
  Oldest = "Oldest",
  PriceHighLow = "PriceHighLow",
  PriceLowHigh = "PriceLowHigh",
  ZA = "ZA",
}

export enum SkuStatus {
  Active = "Active",
  Deleted = "Deleted",
  Inactive = "Inactive",
}

export interface AddImagesInput {
  files: any[];
  alts?: (string | null)[] | null;
  descriptions?: (string | null)[] | null;
  labels?: string[] | null;
}

export interface BusinessInput {
  id?: string | null;
  name: string;
  subscribedToNewsletters?: boolean | null;
  discountIds?: string[] | null;
  employeeIds?: string[] | null;
}

export interface ChangeCustomerStatusInput {
  id: string;
  status: AccountStatus;
}

export interface CustomerInput {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  pronouns?: string | null;
  emails?: EmailInput[] | null;
  phones?: PhoneInput[] | null;
  business?: BusinessInput | null;
  theme?: string | null;
  status?: AccountStatus | null;
  accountApproved?: boolean | null;
}

export interface DeleteCustomerInput {
  id: string;
  password?: string | null;
}

export interface DeleteManyInput {
  ids: string[];
}

export interface EmailInput {
  id?: string | null;
  emailAddress: string;
  receivesDeliveryUpdates?: boolean | null;
  customerId?: string | null;
  businessId?: string | null;
}

export interface FindByIdInput {
  id: string;
}

export interface ImageUpdate {
  hash: string;
  alt?: string | null;
  description?: string | null;
}

export interface ImagesByLabelInput {
  label: string;
}

export interface LoginInput {
  email?: string | null;
  password?: string | null;
  verificationCode?: string | null;
}

export interface OrderInput {
  id?: string | null;
  status?: OrderStatus | null;
  specialInstructions?: string | null;
  desiredDeliveryDate?: any | null;
  isDelivery?: boolean | null;
  items?: OrderItemInput[] | null;
}

export interface OrderItemInput {
  id: string;
  quantity?: number | null;
}

export interface OrdersInput {
  ids?: string[] | null;
  status?: OrderStatus | null;
  searchString?: string | null;
}

export interface PhoneInput {
  id?: string | null;
  number: string;
  receivesDeliveryUpdates?: boolean | null;
  customerId?: string | null;
  businessID?: string | null;
}

export interface PlantImageInput {
  hash: string;
  isDisplay?: boolean | null;
}

export interface PlantInput {
  id?: string | null;
  latinName: string;
  traits: (PlantTraitInput | null)[];
  images?: PlantImageInput[] | null;
  skus?: SkuInput[] | null;
}

export interface PlantTraitInput {
  name: string;
  value: string;
}

export interface PlantsInput {
  ids?: string[] | null;
  sortBy?: SkuSortBy | null;
  searchString?: string | null;
  active?: boolean | null;
  onlyInStock?: boolean | null;
}

export interface ReadAssetsInput {
  files: string[];
}

export interface RequestPasswordChangeInput {
  email: string;
}

export interface ResetPasswordInput {
  id: string;
  code: string;
  newPassword: string;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  pronouns?: string | null;
  business: string;
  email: string;
  phone: string;
  accountApproved: boolean;
  theme: string;
  marketingEmails: boolean;
  password: string;
}

export interface SkuInput {
  id?: string | null;
  sku: string;
  isDiscountable?: boolean | null;
  size?: string | null;
  note?: string | null;
  availability?: number | null;
  price?: string | null;
  status?: SkuStatus | null;
  plantId?: string | null;
  discountIds?: string[] | null;
}

export interface SkusInput {
  ids?: string[] | null;
  sortBy?: SkuSortBy | null;
  searchString?: string | null;
  onlyInStock?: boolean | null;
}

export interface UpdateCustomerInput {
  input: CustomerInput;
  currentPassword: string;
  newPassword?: string | null;
}

export interface UpdateImagesInput {
  data: ImageUpdate[];
  deleting?: string[] | null;
  label?: string | null;
}

export interface UploadAvailabilityInput {
  file: any;
}

export interface UpsertOrderItemInput {
  quantity: number;
  orderId?: string | null;
  skuId: string;
}

export interface WriteAssetsInput {
  files: any[];
}

//==============================================================
// END Enums and Input Objects
//==============================================================
