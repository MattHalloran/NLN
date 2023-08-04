import { CODE, ORDER_STATUS, uuid } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";
import { GraphQLResolveInfo } from "graphql";
import { CustomError } from "../../error";
import { logger } from "../../logger";
import { PrismaType } from "../../types";
import { onlyPrimitives } from "../../utils/objectTools";

// Validates email address, and returns customer data
export async function customerFromEmail(email: string, prisma: PrismaType) {
    if (!email) throw new CustomError(CODE.BadCredentials);
    // Validate email address
    const emailRow = await prisma.email.findUnique({ where: { emailAddress: email } });
    if (!emailRow || !emailRow.customerId) throw new CustomError(CODE.BadCredentials);
    // Find customer
    const customer = await prisma.customer.findUnique({ where: { id: emailRow.customerId } });
    if (!customer) throw new CustomError(CODE.ErrorUnknown);
    return customer;
}

// 'cart' is not a field or relationship in the database,
// so it must be removed from the select
export function getCustomerSelect(info: GraphQLResolveInfo) {
    const prismaInfo = new PrismaSelect(info).value;
    delete prismaInfo.select.cart;
    return prismaInfo;
}

// 'cart' is not a field or relationship in the database,
// so it must be manually queried
export async function getCart(prisma: PrismaType, info: GraphQLResolveInfo, customerId: string) {
    const selectInfo = new PrismaSelect(info).value.select.cart;
    if (!selectInfo) return null;
    const results = await prisma.order.findMany({
        where: { customerId, status: ORDER_STATUS.Draft },
        ...selectInfo,
    });
    return results?.length > 0 ? results[0] : null;
}

/** Upsert a customer, with business, emails, phones, and roles */
export async function upsertCustomer({ prisma, info, data }: { prisma: PrismaType, info: GraphQLResolveInfo, data: any }) {
    const cleanedData: any = onlyPrimitives(data);

    // Check if any of the provided emails or phones are in use
    for (const email of (data.emails ?? [])) {
        const emailExists = await prisma.email.findUnique({ where: { emailAddress: email.emailAddress } });
        if (emailExists && emailExists.id !== email.id) throw new CustomError(CODE.EmailInUse);
    }
    for (const phone of (data.phones ?? [])) {
        const phoneExists = await prisma.phone.findUnique({ where: { number: phone.number } });
        if (phoneExists && phoneExists.id !== phone.id) throw new CustomError(CODE.PhoneInUse);
    }

    // Check if customer exists
    const customerExists = Boolean(data.id);
    const customerId = data.id ?? uuid();

    try {
        // Upsert the customer.
        // We need to create the customer first so that we can link related data to it
        let customer;
        if (!customerExists) {
            customer = await prisma.customer.create({ data: { ...cleanedData, id: customerId } });
        } else {
            customer = await prisma.customer.update({
                where: { id: customerId },
                data: cleanedData,
            });
        }

        // Create a transaction to ensure all operations succeed or fail together
        let transaction: any = [];

        // Upsert business
        if (data.business) {
            let upsertBusinessOperation;
            if (data.business.id) {
                upsertBusinessOperation = prisma.business.update({
                    where: { id: data.business.id },
                    data: {
                        ...data.business,
                        employees: { connect: { id: customerId } },
                    }
                });
            } else {
                upsertBusinessOperation = prisma.business.create({
                    data: {
                        ...data.business,
                        employees: { connect: { id: customerId } },
                    }
                });
            }
            transaction.push(upsertBusinessOperation);
        }

        // Upsert emails
        data.emails?.forEach(email => {
            let upsertEmailOperation;
            if (!email.id) {
                upsertEmailOperation = prisma.email.create({ data: { ...email, customerId: customerId } });
            } else {
                upsertEmailOperation = prisma.email.update({
                    where: { id: email.id },
                    data: email,
                });
            }
            transaction.push(upsertEmailOperation);
        });

        // Upsert phones
        data.phones?.forEach(phone => {
            let upsertPhoneOperation;
            if (!phone.id) {
                upsertPhoneOperation = prisma.phone.create({ data: { ...phone, customerId: customerId } });
            } else {
                upsertPhoneOperation = prisma.phone.update({
                    where: { id: phone.id },
                    data: phone,
                });
            }
            transaction.push(upsertPhoneOperation);
        });

        // Upsert customer roles
        data.roles?.forEach(role => {
            if (!role.id) return;
            const roleData = { customerId: customerId, roleId: role.id };
            let upsertRoleOperation = prisma.customer_roles.upsert({
                where: { customer_roles_customerid_roleid_unique: roleData },
                create: roleData,
                update: roleData,
            });
            transaction.push(upsertRoleOperation);
        });

        // Perform transaction
        await prisma.$transaction(transaction);
    } catch (error) {
        logger.error("Caught error upserting customer", { data, error });
        throw new CustomError(CODE.ErrorUnknown);
    }
    // Get GraphQL select info
    const prismaInfo = getCustomerSelect(info);
    const cart = await getCart(prisma, info, customerId);
    const customerData: any = await prisma.customer.findUnique({ where: { id: customerId }, ...prismaInfo });
    if (cart) customerData.cart = cart;
    return customerData;
}
