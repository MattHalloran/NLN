import { gql } from 'apollo-server-express';
import bcrypt from 'bcrypt';
import { ACCOUNT_STATUS, CODE, COOKIE } from '@shared/consts';
import { CustomError, validateArgs } from '../error';
import { generateToken } from '../auth';
import { customerNotifyAdmin, sendResetPasswordLink, sendVerificationLink } from '../worker/email/queue';
import { HASHING_ROUNDS } from '../consts';
import { PrismaSelect } from '@paljs/plugins';
import { customerFromEmail, getCart, getCustomerSelect, upsertCustomer } from '../db/models/customer';
import { logInSchema, passwordSchema, requestPasswordChangeSchema, signUpSchema } from '@shared/validation';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'customer';
const LOGIN_ATTEMPTS_TO_SOFT_LOCKOUT = 3;
const SOFT_LOCKOUT_DURATION = 15 * 60 * 1000;
const REQUEST_PASSWORD_RESET_DURATION = 2 * 24 * 3600 * 1000;
const LOGIN_ATTEMPTS_TO_HARD_LOCKOUT = 10;

export const typeDef = gql`
    enum AccountStatus {
        Deleted
        Unlocked
        SoftLock
        HardLock
    }

    input CustomerInput {
        id: ID
        firstName: String
        lastName: String
        pronouns: String
        emails: [EmailInput!]
        phones: [PhoneInput!]
        business: BusinessInput
        theme: String
        status: AccountStatus
        accountApproved: Boolean
    }

    input LoginInput {
        email: String
        password: String,
        verificationCode: String
    }

    input SignUpInput {
        firstName: String!
        lastName: String!
        pronouns: String
        business: String!
        email: String!
        phone: String!
        accountApproved: Boolean!
        theme: String!
        marketingEmails: Boolean!
        password: String!
    }

    input UpdateCustomerInput {
        input: CustomerInput!
        currentPassword: String!
        newPassword: String
    }

    input DeleteCustomerInput {
        id: ID!
        password: String
    }

    input RequestPasswordChangeInput {
        email: String!
    }

    input ResetPasswordInput {
        id: ID!
        code: String!
        newPassword: String!
    }

    input ChangeCustomerStatusInput {
        id: ID!
        status: AccountStatus!
    }

    input AddCustomerRoleInput {
        id: ID!
        roleId: ID!
    }

    input RemoveCustomerRoleInput {
        id: ID!
        roleId: ID!
    }

    type Customer {
        id: ID!
        firstName: String!
        lastName: String!
        fullName: String
        pronouns: String!
        emails: [Email!]!
        phones: [Phone!]!
        business: Business
        theme: String!
        accountApproved: Boolean!
        emailVerified: Boolean!
        status: AccountStatus!
        cart: Order
        orders: [Order!]!
        roles: [CustomerRole!]!
        feedback: [Feedback!]!
    }

    extend type Query {
        customers: [Customer!]!
        profile: Customer!
    }

    extend type Mutation {
        login(input: LoginInput!): Customer!
        logout: Boolean
        signUp(input: SignUpInput!): Customer!
        addCustomer(input: CustomerInput!): Customer!
        updateCustomer(input: UpdateCustomerInput!): Customer!
        deleteCustomer(input: DeleteCustomerInput!): Boolean
        requestPasswordChange(input: RequestPasswordChangeInput!): Boolean
        resetPassword(input: ResetPasswordInput!): Customer!
        changeCustomerStatus(input: ChangeCustomerStatusInput!): Boolean
        addCustomerRole(input: AddCustomerRoleInput!): Customer!
        removeCustomerRole(input: RemoveCustomerRoleInput!): Count!
    }
`

export const resolvers = {
    AccountStatus: ACCOUNT_STATUS,
    Query: {
        customers: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].findMany({
                orderBy: { fullName: 'asc', },
                ...(new PrismaSelect(info).value)
            });
        },
        profile: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Can only query your own profile
            const customerId = req.customerId;
            if (customerId === null || customerId === undefined) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].findUnique({ where: { id: customerId }, ...(new PrismaSelect(info).value) });
        }
    },
    Mutation: {
        login: async (_parent: undefined, { input }: IWrap<any>, { prisma, req, res }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            const prismaInfo = getCustomerSelect(info);
            // If username and password wasn't passed, then use the session cookie data to validate
            if (input.username === undefined && input.password === undefined) {
                if (req.roles && req.roles.length > 0) {
                    const cart = await getCart(prisma, info, req.customerId);
                    let userData = await prisma[_model].findUnique({ where: { id: req.customerId }, ...prismaInfo });
                    if (userData) {
                        if (cart) userData.cart = cart;
                        return userData;
                    }
                    res.clearCookie(COOKIE.Jwt);
                }
                throw new CustomError(CODE.BadCredentials);
            }
            // Validate input format
            const validateError = await validateArgs(logInSchema, input);
            if (validateError) return validateError;
            // Get customer
            let customer = await customerFromEmail(input.email, prisma);
            // Check for password in database, if doesn't exist, send a password reset link
            if (!customer.password) {
                // Generate new code
                const requestCode = bcrypt.genSaltSync(HASHING_ROUNDS).replace('/', '');
                // Store code and request time in customer row
                await prisma[_model].update({
                    where: { id: customer.id },
                    data: { resetPasswordCode: requestCode, lastResetPasswordReqestAttempt: new Date().toISOString() }
                })
                // Send new verification email
                sendResetPasswordLink(input.email, customer.id, requestCode);
                throw new CustomError(CODE.MustResetPassword);
            }
            // Validate verification code, if supplied
            if (input.verificationCode === customer.id && customer.emailVerified === false) {
                customer = await prisma[_model].update({
                    where: { id: customer.id },
                    data: { status: ACCOUNT_STATUS.Unlocked, emailVerified: true }
                })
            }
            // Reset login attempts after 15 minutes
            const unable_to_reset = [ACCOUNT_STATUS.HardLock, ACCOUNT_STATUS.Deleted];
            if (!unable_to_reset.includes(customer.status) && Date.now() - new Date(customer.lastLoginAttempt).getTime() > SOFT_LOCKOUT_DURATION) {
                customer = await prisma[_model].update({
                    where: { id: customer.id },
                    data: { loginAttempts: 0 }
                })
            }
            // Before validating password, let's check to make sure the account is unlocked
            const status_to_code = {
                [ACCOUNT_STATUS.Deleted]: CODE.NoCustomer,
                [ACCOUNT_STATUS.SoftLock]: CODE.SoftLockout,
                [ACCOUNT_STATUS.HardLock]: CODE.HardLockout
            }
            if (customer.status in status_to_code) throw new CustomError(status_to_code[customer.status]);
            // Now we can validate the password
            const validPassword = bcrypt.compareSync(input.password, customer.password);
            if (validPassword) {
                await generateToken(res, customer.id, customer.businessId);
                await prisma[_model].update({
                    where: { id: customer.id },
                    data: { 
                        loginAttempts: 0, 
                        lastLoginAttempt: new Date().toISOString(), 
                        resetPasswordCode: null, 
                        lastResetPasswordReqestAttempt: null 
                    },
                    ...prismaInfo
                })
                // Return cart, along with user data
                const cart = await getCart(prisma, info, customer.id);
                const userData = await prisma[_model].findUnique({ where: { id: customer.id }, ...prismaInfo });
                if (cart) userData.cart = cart;
                return userData;
            } else {
                let new_status = ACCOUNT_STATUS.Unlocked;
                let login_attempts = customer.loginAttempts + 1;
                if (login_attempts >= LOGIN_ATTEMPTS_TO_SOFT_LOCKOUT) {
                    new_status = ACCOUNT_STATUS.SoftLock;
                } else if (login_attempts > LOGIN_ATTEMPTS_TO_HARD_LOCKOUT) {
                    new_status = ACCOUNT_STATUS.HardLock;
                }
                await prisma[_model].update({
                    where: { id: customer.id },
                    data: { status: new_status, loginAttempts: login_attempts, lastLoginAttempt: new Date().toISOString() }
                })
                throw new CustomError(CODE.BadCredentials);
            }
        },
        logout: async (_parent: undefined, { input }: IWrap<any>, { prisma, req, res }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            res.clearCookie(COOKIE.Jwt);
            return true;
        },
        signUp: async (_parent: undefined, { input }: IWrap<any>, { prisma, req, res }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            const prismaInfo = getCustomerSelect(info);
            // Validate input format
            const validateError = await validateArgs(signUpSchema, input);
            if (validateError) return validateError;
            // Find customer role to give to new user
            const customerRole = await prisma.role.findUnique({ where: { title: 'Customer' } });
            if (!customerRole) throw new CustomError(CODE.ErrorUnknown);
            const customer = await upsertCustomer({
                prisma: prisma,
                info,
                data: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    pronouns: input.pronouns,
                    business: {name: input.business},
                    password: bcrypt.hashSync(input.password, HASHING_ROUNDS),
                    accountApproved: input.accountApproved,
                    theme: input.theme,
                    status: ACCOUNT_STATUS.Unlocked,
                    emails: [{ emailAddress: input.email }],
                    phones: [{ number: input.phone }],
                    roles: [customerRole]
                }
            })
            await generateToken(res, customer.id, customer.businessId);
            // Send verification email
            sendVerificationLink(input.email, customer.id, verificationCode);
            // Send email to business owner
            customerNotifyAdmin(`${input.firstName} ${input.lastName}`);
            // Return cart, along with user data
            const cart = await getCart(prisma, info, customer.id);
            const userData = await prisma[_model].findUnique({ where: { id: customer.id }, ...prismaInfo });
            if (cart) userData.cart = cart;
            return userData;
        },
        addCustomer: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin to add a customer directly
            if(!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            const prismaInfo = getCustomerSelect(info);
            // Find customer role to give to new user
            const customerRole = await prisma.role.findUnique({ where: { title: 'Customer' } });
            if (!customerRole) throw new CustomError(CODE.ErrorUnknown);
            const customer = await upsertCustomer({
                prisma: prisma,
                info,
                data: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    pronouns: input.pronouns,
                    business: input.business,
                    accountApproved: true,
                    theme: 'light',
                    status: ACCOUNT_STATUS.Unlocked,
                    emails: input.emails,
                    phones: input.phones,
                    roles: [customerRole]
                }
            });
            // Return cart, along with user data
            const cart = await getCart(prisma, info, customer.id);
            const userData = await prisma[_model].findUnique({ where: { id: customer.id }, ...prismaInfo });
            if (cart) userData.cart = cart;
            return userData;
        },
        updateCustomer: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            if(!req.isAdmin && (req.customerId !== input.id)) throw new CustomError(CODE.Unauthorized);
            // Check for correct password
            let customer = await prisma[_model].findUnique({ 
                where: { id: input.id },
                select: {
                    id: true,
                    password: true,
                    business: { select: { id: true } }
                }
            });
            if(!bcrypt.compareSync(input.currentPassword, customer.password)) throw new CustomError(CODE.BadCredentials);
            const user = await upsertCustomer({
                prisma: prisma,
                info,
                data: input
            })
            return user;
        },
        deleteCustomer: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            // Must be admin, or deleting your own
            if(!req.isAdmin && (req.customerId !== input.id)) throw new CustomError(CODE.Unauthorized);
            // Check for correct password
            let customer = await prisma[_model].findUnique({ 
                where: { id: input.id },
                select: {
                    id: true,
                    password: true
                }
            });
            if (!customer) throw new CustomError(CODE.ErrorUnknown);
            // If admin, make sure you are not deleting yourself
            if (req.isAdmin) {
                if (customer.id === req.customerId) throw new CustomError(CODE.CannotDeleteYourself);
            }
            // If not admin, make sure correct password is entered
            else if (!req.isAdmin) {
                if(!bcrypt.compareSync(input.password, customer.password)) throw new CustomError(CODE.BadCredentials);
            }
            // Delete account
            await prisma[_model].delete({ where: { id: customer.id } });
            return true;
        },
        requestPasswordChange: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            // Validate input format
            const validateError = await validateArgs(requestPasswordChangeSchema, input);
            if (validateError) return validateError;
            // Find customer in database
            const customer = await customerFromEmail(input.email, prisma);
            // Generate request code
            const requestCode = bcrypt.genSaltSync(HASHING_ROUNDS).replace('/', '');
            // Store code and request time in customer row
            await prisma[_model].update({
                where: { id: customer.id },
                data: { resetPasswordCode: requestCode, lastResetPasswordReqestAttempt: new Date().toISOString() }
            })
            // Send email with correct reset link
            sendResetPasswordLink(input.email, customer.id, requestCode);
            return true;
        },
        resetPassword: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Validate input format
            const validateError = await validateArgs(passwordSchema, input.newPassword);
            if (validateError) return validateError;
            // Find customer in database
            const customer = await prisma[_model].findUnique({ 
                where: { id: input.id },
                select: {
                    id: true,
                    resetPasswordCode: true,
                    lastResetPasswordReqestAttempt: true,
                    emails: { select: { emailAddress: true } }
                }
            });
            if (!customer) throw new CustomError(CODE.ErrorUnknown);
            // Verify request code and that request was made within 48 hours
            if (!customer.resetPasswordCode ||
                customer.resetPasswordCode !== input.code ||
                Date.now() - new Date(customer.lastResetPasswordReqestAttempt).getTime() > REQUEST_PASSWORD_RESET_DURATION) {
                // Generate new code
                const requestCode = bcrypt.genSaltSync(HASHING_ROUNDS).replace('/', '');
                // Store code and request time in customer row
                await prisma[_model].update({
                    where: { id: customer.id },
                    data: { resetPasswordCode: requestCode, lastResetPasswordReqestAttempt: new Date().toISOString() }
                })
                // Send new verification email
                for (const email of customer.emails) {
                    sendResetPasswordLink(email.emailAddress, customer.id, requestCode);
                }
                // Return error
                throw new CustomError(CODE.InvalidResetCode);
            } 
            // Remove request data from customer, and set new password
            await prisma[_model].update({
                where: { id: customer.id },
                data: { 
                    resetPasswordCode: null, 
                    lastResetPasswordReqestAttempt: null,
                    password: bcrypt.hashSync(input.newPassword, HASHING_ROUNDS)
                }
            })
            // Return customer data
            const prismaInfo = getCustomerSelect(info);
            const cart = await getCart(prisma, info, customer.id);
            const customerData = await prisma.customer.findUnique({ where: { id: customer.id }, ...prismaInfo });
            if (cart) customerData.cart = cart;
            return customerData;
        },
        changeCustomerStatus: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<boolean> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            await prisma[_model].update({
                where: { id: input.id },
                data: { status: input.status }
            })
            return true;
        },
        addCustomerRole: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            await prisma.customer_role.create({ data: { 
                customerId: input.id,
                roleId: input.roleId
            } })
            return await prisma[_model].findUnique({ where: { id: input.id }, ...(new PrismaSelect(info).value) });
        },
        removeCustomerRole: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.customer_role.delete({ where: { 
                customerId: input.id,
                roleId: input.roleId
            } })
        },
    }
}