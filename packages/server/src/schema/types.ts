export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
  Upload: any;
};

export enum AccountStatus {
  Deleted = 'Deleted',
  HardLock = 'HardLock',
  SoftLock = 'SoftLock',
  Unlocked = 'Unlocked'
}

export type AddCustomerRoleInput = {
  id: Scalars['ID'];
  roleId: Scalars['ID'];
};

export type AddImageResponse = {
  __typename?: 'AddImageResponse';
  hash?: Maybe<Scalars['String']>;
  height?: Maybe<Scalars['Int']>;
  src?: Maybe<Scalars['String']>;
  success: Scalars['Boolean'];
  width?: Maybe<Scalars['Int']>;
};

export type AddImagesInput = {
  alts?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  descriptions?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  files: Array<Scalars['Upload']>;
  labels?: InputMaybe<Array<Scalars['String']>>;
};

export type Address = {
  __typename?: 'Address';
  administrativeArea: Scalars['String'];
  business: Business;
  country: Scalars['String'];
  id: Scalars['ID'];
  locality: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  orders: Array<Order>;
  postalCode: Scalars['String'];
  premise?: Maybe<Scalars['String']>;
  subAdministrativeArea?: Maybe<Scalars['String']>;
  tag?: Maybe<Scalars['String']>;
  throughfare: Scalars['String'];
};

export type AddressInput = {
  administrativeArea: Scalars['String'];
  businessId: Scalars['ID'];
  country: Scalars['String'];
  deliveryInstructions?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  locality: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  postalCode: Scalars['String'];
  premise?: InputMaybe<Scalars['String']>;
  subAdministrativeArea?: InputMaybe<Scalars['String']>;
  tag?: InputMaybe<Scalars['String']>;
  throughfare: Scalars['String'];
};

export type Business = {
  __typename?: 'Business';
  addresses: Array<Address>;
  discounts: Array<Discount>;
  emails: Array<Email>;
  employees: Array<Customer>;
  id: Scalars['ID'];
  name: Scalars['String'];
  phones: Array<Phone>;
  subscribedToNewsletters: Scalars['Boolean'];
};

export type BusinessInput = {
  discountIds?: InputMaybe<Array<Scalars['ID']>>;
  employeeIds?: InputMaybe<Array<Scalars['ID']>>;
  id?: InputMaybe<Scalars['ID']>;
  name: Scalars['String'];
  subscribedToNewsletters?: InputMaybe<Scalars['Boolean']>;
};

export type ChangeCustomerStatusInput = {
  id: Scalars['ID'];
  status: AccountStatus;
};

export type Count = {
  __typename?: 'Count';
  count?: Maybe<Scalars['Int']>;
};

export type Customer = {
  __typename?: 'Customer';
  accountApproved: Scalars['Boolean'];
  business?: Maybe<Business>;
  cart?: Maybe<Order>;
  emailVerified: Scalars['Boolean'];
  emails: Array<Email>;
  feedback: Array<Feedback>;
  firstName: Scalars['String'];
  id: Scalars['ID'];
  lastName: Scalars['String'];
  orders: Array<Order>;
  phones: Array<Phone>;
  pronouns: Scalars['String'];
  roles: Array<CustomerRole>;
  status: AccountStatus;
  theme: Scalars['String'];
};

export type CustomerInput = {
  accountApproved?: InputMaybe<Scalars['Boolean']>;
  business?: InputMaybe<BusinessInput>;
  emails?: InputMaybe<Array<EmailInput>>;
  firstName?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  isAdmin?: InputMaybe<Scalars['Boolean']>;
  lastName?: InputMaybe<Scalars['String']>;
  phones?: InputMaybe<Array<PhoneInput>>;
  pronouns?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<AccountStatus>;
  theme?: InputMaybe<Scalars['String']>;
};

export type CustomerRole = {
  __typename?: 'CustomerRole';
  customer: Customer;
  role: Role;
};

export type DeleteCustomerInput = {
  id: Scalars['ID'];
  password?: InputMaybe<Scalars['String']>;
};

export type DeleteImagesByLabelInput = {
  labels: Array<Scalars['String']>;
};

export type DeleteImagesInput = {
  hashes: Array<Scalars['String']>;
};

export type DeleteManyInput = {
  ids: Array<Scalars['ID']>;
};

export type DeleteOneInput = {
  id: Scalars['ID'];
};

export type Discount = {
  __typename?: 'Discount';
  businesses: Array<Business>;
  comment?: Maybe<Scalars['String']>;
  discount: Scalars['Float'];
  id: Scalars['ID'];
  skus: Array<Sku>;
  terms?: Maybe<Scalars['String']>;
  title: Scalars['String'];
};

export type DiscountInput = {
  businessIds?: InputMaybe<Array<Scalars['ID']>>;
  comment?: InputMaybe<Scalars['String']>;
  discount: Scalars['Float'];
  id?: InputMaybe<Scalars['ID']>;
  skuIds?: InputMaybe<Array<Scalars['ID']>>;
  terms?: InputMaybe<Scalars['String']>;
  title: Scalars['String'];
};

export type Email = {
  __typename?: 'Email';
  business?: Maybe<Business>;
  customer?: Maybe<Customer>;
  emailAddress: Scalars['String'];
  id: Scalars['ID'];
  receivesDeliveryUpdates: Scalars['Boolean'];
};

export type EmailInput = {
  businessId?: InputMaybe<Scalars['ID']>;
  customerId?: InputMaybe<Scalars['ID']>;
  emailAddress: Scalars['String'];
  id?: InputMaybe<Scalars['ID']>;
  receivesDeliveryUpdates?: InputMaybe<Scalars['Boolean']>;
};

export type Feedback = {
  __typename?: 'Feedback';
  customer?: Maybe<Customer>;
  id: Scalars['ID'];
  text: Scalars['String'];
};

export type FeedbackInput = {
  customerId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  text: Scalars['String'];
};

export type FindByIdInput = {
  id: Scalars['ID'];
};

export type Image = {
  __typename?: 'Image';
  alt?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  files?: Maybe<Array<ImageFile>>;
  hash: Scalars['String'];
};

export type ImageFile = {
  __typename?: 'ImageFile';
  hash: Scalars['String'];
  height: Scalars['Int'];
  src: Scalars['String'];
  width: Scalars['Int'];
};

export enum ImageSize {
  L = 'L',
  M = 'M',
  Ml = 'ML',
  S = 'S',
  Xl = 'XL',
  Xs = 'XS',
  Xxl = 'XXL',
  Xxs = 'XXS'
}

export type ImageUpdate = {
  alt?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  hash: Scalars['String'];
};

export type ImagesByLabelInput = {
  label: Scalars['String'];
};

export type LoginInput = {
  email?: InputMaybe<Scalars['String']>;
  password?: InputMaybe<Scalars['String']>;
  verificationCode?: InputMaybe<Scalars['String']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addAddress: Address;
  addBusiness: Business;
  addCustomer: Customer;
  addCustomerRole: Customer;
  addDiscount: Discount;
  addEmail: Email;
  addFeedback: Feedback;
  addImages: Array<AddImageResponse>;
  addPhone: Phone;
  addPlant: Plant;
  addRole: Role;
  addSku: Sku;
  cancelOrder?: Maybe<OrderStatus>;
  changeCustomerStatus?: Maybe<Scalars['Boolean']>;
  deleteAddresses: Count;
  deleteBusinesses: Count;
  deleteCustomer?: Maybe<Scalars['Boolean']>;
  deleteDiscounts: Count;
  deleteEmails: Count;
  deleteFeedbacks: Count;
  deleteImages: Count;
  deleteImagesByLabel: Count;
  deleteOrderItems: Count;
  deleteOrders: Count;
  deletePhones: Count;
  deletePlants: Count;
  deleteRoles: Count;
  deleteSkus: Count;
  login: Customer;
  logout?: Maybe<Scalars['Boolean']>;
  removeCustomerRole?: Maybe<Scalars['Boolean']>;
  requestPasswordChange?: Maybe<Scalars['Boolean']>;
  resetPassword: Customer;
  signUp: Customer;
  submitOrder?: Maybe<Scalars['Boolean']>;
  updateAddress: Address;
  updateBusiness: Business;
  updateCustomer: Customer;
  updateDiscount: Discount;
  updateEmail: Email;
  updateImages: Scalars['Boolean'];
  updateOrder: Order;
  updatePhone: Phone;
  updatePlant: Plant;
  updateRole: Role;
  updateSku: Sku;
  uploadAvailability?: Maybe<Scalars['Boolean']>;
  upsertOrderItem: Order;
  writeAssets?: Maybe<Scalars['Boolean']>;
};


export type MutationAddAddressArgs = {
  input: AddressInput;
};


export type MutationAddBusinessArgs = {
  input: BusinessInput;
};


export type MutationAddCustomerArgs = {
  input: CustomerInput;
};


export type MutationAddCustomerRoleArgs = {
  input: AddCustomerRoleInput;
};


export type MutationAddDiscountArgs = {
  input: DiscountInput;
};


export type MutationAddEmailArgs = {
  input: EmailInput;
};


export type MutationAddFeedbackArgs = {
  input: FeedbackInput;
};


export type MutationAddImagesArgs = {
  input: AddImagesInput;
};


export type MutationAddPhoneArgs = {
  input: PhoneInput;
};


export type MutationAddPlantArgs = {
  input: PlantInput;
};


export type MutationAddRoleArgs = {
  input: RoleInput;
};


export type MutationAddSkuArgs = {
  input: SkuInput;
};


export type MutationCancelOrderArgs = {
  input: FindByIdInput;
};


export type MutationChangeCustomerStatusArgs = {
  input: ChangeCustomerStatusInput;
};


export type MutationDeleteAddressesArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteBusinessesArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteCustomerArgs = {
  input: DeleteCustomerInput;
};


export type MutationDeleteDiscountsArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteEmailsArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteFeedbacksArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteImagesArgs = {
  input: DeleteImagesInput;
};


export type MutationDeleteImagesByLabelArgs = {
  input: DeleteImagesByLabelInput;
};


export type MutationDeleteOrderItemsArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteOrdersArgs = {
  input: DeleteManyInput;
};


export type MutationDeletePhonesArgs = {
  input: DeleteManyInput;
};


export type MutationDeletePlantsArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteRolesArgs = {
  input: DeleteManyInput;
};


export type MutationDeleteSkusArgs = {
  input: DeleteManyInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRemoveCustomerRoleArgs = {
  input: RemoveCustomerRoleInput;
};


export type MutationRequestPasswordChangeArgs = {
  input: RequestPasswordChangeInput;
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationSubmitOrderArgs = {
  input: FindByIdInput;
};


export type MutationUpdateAddressArgs = {
  input: AddressInput;
};


export type MutationUpdateBusinessArgs = {
  input: BusinessInput;
};


export type MutationUpdateCustomerArgs = {
  input: UpdateCustomerInput;
};


export type MutationUpdateDiscountArgs = {
  input: DiscountInput;
};


export type MutationUpdateEmailArgs = {
  input: EmailInput;
};


export type MutationUpdateImagesArgs = {
  input: UpdateImagesInput;
};


export type MutationUpdateOrderArgs = {
  input?: InputMaybe<OrderInput>;
};


export type MutationUpdatePhoneArgs = {
  input: PhoneInput;
};


export type MutationUpdatePlantArgs = {
  input: PlantInput;
};


export type MutationUpdateRoleArgs = {
  input: RoleInput;
};


export type MutationUpdateSkuArgs = {
  input: SkuInput;
};


export type MutationUploadAvailabilityArgs = {
  file: Scalars['Upload'];
};


export type MutationUpsertOrderItemArgs = {
  input: UpsertOrderItemInput;
};


export type MutationWriteAssetsArgs = {
  files: Array<Scalars['Upload']>;
};

export type Order = {
  __typename?: 'Order';
  address?: Maybe<Address>;
  customer: Customer;
  desiredDeliveryDate?: Maybe<Scalars['Date']>;
  expectedDeliveryDate?: Maybe<Scalars['Date']>;
  id: Scalars['ID'];
  isDelivery?: Maybe<Scalars['Boolean']>;
  items: Array<OrderItem>;
  specialInstructions?: Maybe<Scalars['String']>;
  status: OrderStatus;
};

export type OrderInput = {
  desiredDeliveryDate?: InputMaybe<Scalars['Date']>;
  id?: InputMaybe<Scalars['ID']>;
  isDelivery?: InputMaybe<Scalars['Boolean']>;
  items?: InputMaybe<Array<OrderItemInput>>;
  specialInstructions?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<OrderStatus>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  id: Scalars['ID'];
  order: Order;
  quantity: Scalars['Int'];
  sku: Sku;
};

export type OrderItemInput = {
  id: Scalars['ID'];
  quantity?: InputMaybe<Scalars['Int']>;
};

export enum OrderStatus {
  Approved = 'Approved',
  CanceledByAdmin = 'CanceledByAdmin',
  CanceledByCustomer = 'CanceledByCustomer',
  Delivered = 'Delivered',
  Draft = 'Draft',
  InTransit = 'InTransit',
  Pending = 'Pending',
  PendingCancel = 'PendingCancel',
  Rejected = 'Rejected',
  Scheduled = 'Scheduled'
}

export type OrdersInput = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  searchString?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<OrderStatus>;
};

export type Phone = {
  __typename?: 'Phone';
  business?: Maybe<Business>;
  customer?: Maybe<Customer>;
  id: Scalars['ID'];
  number: Scalars['String'];
  receivesDeliveryUpdates: Scalars['Boolean'];
};

export type PhoneInput = {
  businessId?: InputMaybe<Scalars['ID']>;
  customerId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  number: Scalars['String'];
  receivesDeliveryUpdates?: InputMaybe<Scalars['Boolean']>;
};

export type Plant = {
  __typename?: 'Plant';
  featured: Scalars['Boolean'];
  id: Scalars['ID'];
  images?: Maybe<Array<PlantImage>>;
  latinName: Scalars['String'];
  skus?: Maybe<Array<Sku>>;
  traits?: Maybe<Array<PlantTrait>>;
};

export type PlantImage = {
  __typename?: 'PlantImage';
  image: Image;
  index: Scalars['Int'];
  isDisplay: Scalars['Boolean'];
};

export type PlantImageInput = {
  hash: Scalars['String'];
  isDisplay?: InputMaybe<Scalars['Boolean']>;
};

export type PlantInput = {
  id?: InputMaybe<Scalars['ID']>;
  images?: InputMaybe<Array<PlantImageInput>>;
  latinName: Scalars['String'];
  skus?: InputMaybe<Array<SkuInput>>;
  traits: Array<InputMaybe<PlantTraitInput>>;
};

export type PlantTrait = {
  __typename?: 'PlantTrait';
  id: Scalars['ID'];
  name: Scalars['String'];
  value: Scalars['String'];
};

export type PlantTraitInput = {
  name: Scalars['String'];
  value: Scalars['String'];
};

export type PlantsInput = {
  active?: InputMaybe<Scalars['Boolean']>;
  ids?: InputMaybe<Array<Scalars['ID']>>;
  onlyInStock?: InputMaybe<Scalars['Boolean']>;
  searchString?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<SkuSortBy>;
};

export type Query = {
  __typename?: 'Query';
  addresses: Array<Address>;
  businesses: Array<Business>;
  customers: Array<Customer>;
  discounts: Array<Discount>;
  emails: Array<Email>;
  feedbacks: Array<Feedback>;
  imagesByLabel: Array<Image>;
  orders: Array<Order>;
  phones: Array<Phone>;
  plants: Array<Plant>;
  profile: Customer;
  readAssets: Array<Maybe<Scalars['String']>>;
  roles: Array<Role>;
  skus: Array<Sku>;
  tasks: Array<Task>;
  traitNames: Array<Scalars['String']>;
  traitOptions: Array<TraitOptions>;
  traitValues: Array<Scalars['String']>;
};


export type QueryImagesByLabelArgs = {
  input: ImagesByLabelInput;
};


export type QueryOrdersArgs = {
  input: OrdersInput;
};


export type QueryPlantsArgs = {
  input: PlantsInput;
};


export type QueryReadAssetsArgs = {
  input: ReadAssetsInput;
};


export type QuerySkusArgs = {
  input: SkusInput;
};


export type QueryTasksArgs = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  status?: InputMaybe<TaskStatus>;
};


export type QueryTraitValuesArgs = {
  input: TraitValuesInput;
};

export type ReadAssetsInput = {
  files: Array<Scalars['String']>;
};

export type RemoveCustomerRoleInput = {
  id: Scalars['ID'];
  roleId: Scalars['ID'];
};

export type RequestPasswordChangeInput = {
  email: Scalars['String'];
};

export type ResetPasswordInput = {
  code: Scalars['String'];
  id: Scalars['ID'];
  newPassword: Scalars['String'];
};

export type Response = {
  __typename?: 'Response';
  code?: Maybe<Scalars['Int']>;
  message: Scalars['String'];
};

export type Role = {
  __typename?: 'Role';
  customers: Array<Customer>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  title: Scalars['String'];
};

export type RoleInput = {
  customerIds?: InputMaybe<Array<Scalars['ID']>>;
  description?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  title: Scalars['String'];
};

export type SignUpInput = {
  accountApproved: Scalars['Boolean'];
  business: Scalars['String'];
  email: Scalars['String'];
  firstName: Scalars['String'];
  lastName: Scalars['String'];
  marketingEmails: Scalars['Boolean'];
  password: Scalars['String'];
  phone: Scalars['String'];
  pronouns?: InputMaybe<Scalars['String']>;
  theme: Scalars['String'];
};

export type Sku = {
  __typename?: 'Sku';
  availability: Scalars['Int'];
  discounts?: Maybe<Array<SkuDiscount>>;
  id: Scalars['ID'];
  isDiscountable: Scalars['Boolean'];
  note?: Maybe<Scalars['String']>;
  plant: Plant;
  price?: Maybe<Scalars['String']>;
  size?: Maybe<Scalars['String']>;
  sku: Scalars['String'];
  status: SkuStatus;
};

export type SkuDiscount = {
  __typename?: 'SkuDiscount';
  discount: Discount;
};

export type SkuInput = {
  availability?: InputMaybe<Scalars['Int']>;
  discountIds?: InputMaybe<Array<Scalars['ID']>>;
  id?: InputMaybe<Scalars['ID']>;
  isDiscountable?: InputMaybe<Scalars['Boolean']>;
  note?: InputMaybe<Scalars['String']>;
  plantId?: InputMaybe<Scalars['ID']>;
  price?: InputMaybe<Scalars['String']>;
  size?: InputMaybe<Scalars['String']>;
  sku: Scalars['String'];
  status?: InputMaybe<SkuStatus>;
};

export enum SkuSortBy {
  Az = 'AZ',
  Featured = 'Featured',
  Newest = 'Newest',
  Oldest = 'Oldest',
  PriceHighLow = 'PriceHighLow',
  PriceLowHigh = 'PriceLowHigh',
  Za = 'ZA'
}

export enum SkuStatus {
  Active = 'Active',
  Deleted = 'Deleted',
  Inactive = 'Inactive'
}

export type SkusInput = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  onlyInStock?: InputMaybe<Scalars['Boolean']>;
  searchString?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<SkuSortBy>;
};

export type Task = {
  __typename?: 'Task';
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  result?: Maybe<Scalars['String']>;
  resultCode?: Maybe<Scalars['Int']>;
  status: TaskStatus;
  taskId: Scalars['Int'];
};

export enum TaskStatus {
  Active = 'Active',
  Completed = 'Completed',
  Failed = 'Failed',
  Unknown = 'Unknown'
}

export type TraitOptions = {
  __typename?: 'TraitOptions';
  name: Scalars['String'];
  values: Array<Scalars['String']>;
};

export type TraitValuesInput = {
  name: Scalars['String'];
};

export type UpdateCustomerInput = {
  currentPassword?: InputMaybe<Scalars['String']>;
  input: CustomerInput;
  newPassword?: InputMaybe<Scalars['String']>;
};

export type UpdateImagesInput = {
  data: Array<ImageUpdate>;
  deleting?: InputMaybe<Array<Scalars['String']>>;
  label?: InputMaybe<Scalars['String']>;
};

export type UpsertOrderItemInput = {
  orderId?: InputMaybe<Scalars['ID']>;
  quantity: Scalars['Int'];
  skuId: Scalars['ID'];
};
