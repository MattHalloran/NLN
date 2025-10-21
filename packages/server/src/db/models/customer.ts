import { CODE } from "@local/shared";
import { PrismaClient } from "@prisma/client";
import { CustomError } from "../../error.js";

/**
 * Find a customer by email address
 */
export async function customerFromEmail(email: string, prisma: PrismaClient) {
    const emailRecord = await prisma.email.findUnique({
        where: { emailAddress: email },
        include: {
            customer: {
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!emailRecord?.customer) {
        throw new CustomError(CODE.NoCustomer);
    }

    return emailRecord.customer;
}

interface UpsertCustomerData {
    firstName: string;
    lastName: string;
    pronouns?: string;
    business?: { name: string };
    password?: string;
    accountApproved?: boolean;
    theme?: string;
    status?: string;
    emails: Array<{ emailAddress: string }>;
    phones?: Array<{ number: string }>;
    roles: Array<{ id: string; title: string }>;
}

interface UpsertCustomerParams {
    prisma: PrismaClient;
    info: unknown;
    data: UpsertCustomerData;
}

/**
 * Create or update a customer
 */
export async function upsertCustomer({ prisma, data }: UpsertCustomerParams) {
    // Check if customer already exists by email
    const existingEmail = await prisma.email.findUnique({
        where: { emailAddress: data.emails[0].emailAddress },
        include: { customer: true },
    });

    if (existingEmail?.customer) {
        throw new CustomError(CODE.EmailInUse);
    }

    // Create business if needed
    let businessId: string | undefined;
    if (data.business) {
        const business = await prisma.business.create({
            data: {
                name: data.business.name,
            },
        });
        businessId = business.id;
    }

    // Create customer
    const customer = await prisma.customer.create({
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            pronouns: data.pronouns,
            password: data.password,
            accountApproved: data.accountApproved ?? false,
            theme: data.theme ?? "light",
            status: data.status ?? "Unlocked",
            businessId,
            emails: {
                create: data.emails.map((e) => ({ emailAddress: e.emailAddress })),
            },
            phones: data.phones
                ? {
                      create: data.phones.map((p) => ({ number: p.number })),
                  }
                : undefined,
            roles: {
                create: data.roles.map((role) => ({
                    roleId: role.id,
                })),
            },
        },
        include: {
            business: true,
        },
    });

    return customer;
}
