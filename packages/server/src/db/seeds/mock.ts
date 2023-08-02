import bcrypt from "bcrypt";
import { HASHING_ROUNDS } from "../../consts";
import { AccountStatus } from "../../schema/types";
import { PrismaType } from "../../types";

export async function seed(prisma: PrismaType) {
    console.info("🎭 Creating mock data...");

    // Find existing roles
    const customerRole = await prisma.role.findUnique({ where: { title: "Customer" } });
    const ownerRole = await prisma.role.findUnique({ where: { title: "Owner" } });
    if (!customerRole || !ownerRole) {
        throw new Error("Roles not found");
    }

    // Upsert user with owner role
    const fake1 = await prisma.customer.findFirst({
        where: {
            emails: {
                some: {
                    emailAddress: "notarealemail@afakesite.com",
                },
            },
        },
    });
    if (!fake1) {
        await prisma.customer.create({
            data: {
                firstName: "Elon",
                lastName: "Tusk🦏",
                password: bcrypt.hashSync("Elon", HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: AccountStatus.Unlocked,
                business: {
                    create: {
                        name: "SpaceX",
                    },
                },
                emails: {
                    create: [
                        { emailAddress: "notarealemail@afakesite.com", receivesDeliveryUpdates: false },
                        { emailAddress: "backupemailaddress@afakesite.com", receivesDeliveryUpdates: false },
                    ],
                },
                phones: {
                    create: [
                        { number: "15558675309", receivesDeliveryUpdates: false },
                        { number: "5555555555", receivesDeliveryUpdates: false },
                    ],
                },
                roles: {
                    create: [{
                        roleId: ownerRole.id,
                    }],
                },
            },
        });
    }

    // Create a few customers
    const fake2 = await prisma.customer.findFirst({
        where: {
            emails: {
                some: {
                    emailAddress: "itsjohncena@afakesite.com",
                },
            },
        },
    });
    if (!fake2) {
        await prisma.customer.create({
            data: {
                firstName: "John",
                lastName: "Cena",
                password: bcrypt.hashSync("John", HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: AccountStatus.Unlocked,
                business: {
                    create: {
                        name: "Rocket supplier A",
                    },
                },
                emails: {
                    create: [
                        { emailAddress: "itsjohncena@afakesite.com", receivesDeliveryUpdates: false },
                    ],
                },
                roles: {
                    create: [{
                        roleId: customerRole.id,
                    }],
                },
            },
        });
    }
    const fake3 = await prisma.customer.findFirst({
        where: {
            emails: {
                some: {
                    emailAddress: "spongebobmeboy@afakesite.com",
                },
            },
        },
    });
    if (!fake3) {
        await prisma.customer.create({
            data: {
                firstName: "Spongebob",
                lastName: "Customerpants",
                password: bcrypt.hashSync("Spongebob", HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: AccountStatus.Unlocked,
                business: {
                    create: {
                        name: "🤘🏻A Steel Company",
                    },
                },
                emails: {
                    create: [
                        { emailAddress: "spongebobmeboy@afakesite.com", receivesDeliveryUpdates: false },
                    ],
                },
                phones: {
                    create: [
                        { number: "15553214321", receivesDeliveryUpdates: false },
                        { number: "8762342222", receivesDeliveryUpdates: false },
                    ],
                },
                roles: {
                    create: [{
                        roleId: customerRole.id,
                    }],
                },
            },
        });
    }
    console.info("✅ Database mock complete.");
}
