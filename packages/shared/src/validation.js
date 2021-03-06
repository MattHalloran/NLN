import * as yup from 'yup';
import { DEFAULT_PRONOUNS, ORDER_STATUS, SKU_STATUS } from './modelConsts';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 50;
export const PHONE_REGEX = /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;


export const businessSchema = yup.object().shape({
    name: yup.string().max(128).required(),
    subscribedToNewsletters: yup.boolean().optional(),
    discountIds: yup.array().of(yup.string().required()).optional(),
    employeeIds: yup.array().of(yup.string().required()).optional(),
})

export const addressSchema = yup.object().shape({
    tag: yup.string().max(128).optional(),
    name: yup.string().max(128).optional(),
    country: yup.string().max(2).default('US').required(),
    administrativeArea: yup.string().max(64).required(),
    subAdministrativeArea: yup.string().max(64).optional(),
    locality: yup.string().max(64).required(),
    postalCode: yup.string().max(16).required(),
    throughfare: yup.string().max(256).required(),
    premise: yup.string().max(64).optional(),
    deliveryInstructions: yup.string().max(1024).optional(),
    businessId: yup.string().max(128).required(),
});

export const discountSchema = yup.object().shape({
    title: yup.string().max(128).required(),
    discount: yup.number().min(0).max(1).required(),
    comment: yup.string().max(1024).optional(),
    terms: yup.string().max(4096).optional(),
    businessIds: yup.array().of(yup.string().required()).optional(),
    skuIds: yup.array().of(yup.string().required()).optional(),
});

export const emailSchema = yup.object().shape({
    emailAddress: yup.string().max(128).required(),
    receivesDeliveryUpdates: yup.bool().default(true).optional(),
    userId: yup.string().optional(),
    businessId: yup.string().optional(),
});

export const feedbackSchema = yup.object().shape({
    text: yup.string().max(4096).required(),
    userId: yup.string().required(),
});

export const imageSchema = yup.object().shape({
    files: yup.array().of(yup.object().shape({
        src: yup.string().required(),
        alt: yup.string().max(256).optional(),
        description: yup.string().max(1024).optional(),
        labels: yup.array().of(yup.string().max(128).required()).required(),
    })).required(),
});

export const orderItemSchema = yup.object().shape({
    quantity: yup.number().integer().default(1).required(),
    skuId: yup.number().integer().required()
});

export const orderSchema = yup.object().shape({
    status: yup.mixed().oneOf(Object.values(ORDER_STATUS)).optional(),
    specialInstructions: yup.string().max(1024).optional(),
    desiredDeliveryDate: yup.date().optional(),
    isDelivery: yup.bool().required(),
    items: yup.array().of(orderItemSchema).required(),
});

export const phoneSchema = yup.object().shape({
    number: yup.string().max(10).required(),
    countryCode: yup.string().max(8).default('1').required(),
    extension: yup.string().max(8).optional(),
    receivesDeliveryUpdates: yup.bool().default(true).required(),
});

export const plantSchema = yup.object().shape({
    latinName: yup.string().max(256).required(),
    textData: yup.string().max(8192).optional(),
    imageData: yup.array().of(imageSchema).optional(),
});

export const roleSchema = yup.object().shape({
    title: yup.string().max(128).required(),
    description: yup.string().max(2048).optional(),
    userIds: yup.array().of(yup.string().required()).optional(),
});

export const skuSchema = yup.object().shape({
    sku: yup.string().max(32).required(),
    isDiscountable: yup.bool().default(true).optional(),
    size: yup.string().max(32).default('N/A').optional(),
    note: yup.string().max(2048).optional(),
    availability: yup.number().integer().default(0).optional(),
    price: yup.string().max(16).optional(),
    status: yup.mixed().oneOf(Object.values(SKU_STATUS)).default(SKU_STATUS.Active).optional(),
    plantId: yup.string().optional(),
    discountIds: yup.array().of(yup.string().required()).optional(),
});



// Schema for creating a new account
export const signUpSchema = yup.object().shape({
    firstName: yup.string().max(128).required(),
    lastName: yup.string().max(128).required(),
    pronouns: yup.string().max(128).default(DEFAULT_PRONOUNS[0]).optional(),
    business: yup.string().max(128).required(),
    email: yup.string().email().required(),
    phone: yup.string().matches(PHONE_REGEX).required(),
    existingCustomer: yup.boolean().required(),
    marketingEmails: yup.boolean().required(),
    password: yup.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).required(),
    passwordConfirmation: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match')
});

// Schema for updating a user profile
export const profileSchema = yup.object().shape({
    firstName: yup.string().max(128).required(),
    lastName: yup.string().max(128).required(),
    pronouns: yup.string().max(128).default(DEFAULT_PRONOUNS[0]).optional(),
    business: yup.string().max(128).required(),
    email: yup.string().email().required(),
    phone: yup.string().matches(PHONE_REGEX).required(),
    existingCustomer: yup.boolean().required(),
    currentPassword: yup.string().max(128).required(),
    newPassword: yup.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).optional(),
    newPasswordConfirmation: yup.string().oneOf([yup.ref('newPassword'), null], 'Passwords must match')
});

// Schema for logging in
export const logInSchema = yup.object().shape({
    email: yup.string().email().required(),
    password: yup.string().max(128).required()
})

// Schema for sending a password reset request
export const requestPasswordChangeSchema = yup.object().shape({
    email: yup.string().email().required()
})

// Schema for adding an employee to a business
export const employeeSchema = yup.object().shape({
    firstName: yup.string().max(128).required(),
    lastName: yup.string().max(128).required(),
    pronouns: yup.string().max(128).default(DEFAULT_PRONOUNS[0]).optional(),
    password: yup.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).required()
});