import bcrypt from "bcrypt";
import { HASHING_ROUNDS } from "../../consts";
import { logger, LogLevel } from "../../logger.js";
import { AccountStatus } from "../../schema/types";
import { PrismaType } from "../../types";

export async function init(prisma: PrismaType) {
    logger.log(LogLevel.info, "🌱 Starting database intial seed...");

    // // Make sure auto-increment fields have the correct starting value
    // // plant_trait
    // const maxId = await prisma.$executeRaw`SELECT MAX(id) FROM plant_trait`;
    // await prisma.$executeRaw`ALTER TABLE plant_trait AUTO_INCREMENT = ${maxId + 1}`;
    // // plant_images
    // const maxId2 = await prisma.$executeRaw`SELECT MAX(id) FROM plant_images`;
    // await prisma.$executeRaw`ALTER TABLE plant_images AUTO_INCREMENT = ${maxId2 + 1}`;
    // // queue_task
    // const maxId3 = await prisma.$executeRaw`SELECT MAX(id) FROM queue_task`;
    // await prisma.$executeRaw`ALTER TABLE queue_task AUTO_INCREMENT = ${maxId3 + 1}`;
    // // image_labels
    // const maxId4 = await prisma.$executeRaw`SELECT MAX(id) FROM image_labels`;
    // await prisma.$executeRaw`ALTER TABLE image_labels AUTO_INCREMENT = ${maxId4 + 1}`;

    // Upsert roles
    const adminRole = await prisma.role.upsert({
        where: { title: "Admin" },
        update: {},
        create: {
            title: "Admin",
            description: "This role grants access to everything. Only for developers",
        },
    });
    await prisma.role.upsert({
        where: { title: "Owner" },
        update: {},
        create: {
            title: "Owner",
            description:
                "This role grants administrative access. This comes with the ability to \
            approve new customers, change customer information, modify inventory and \
            contact hours, and more.",
        },
    });
    await prisma.role.upsert({
        where: { title: "Customer" },
        update: {},
        create: {
            title: "Customer",
            description: "This role allows a customer to order products",
        },
    });

    const admin = await prisma.customer.findFirst({
        where: {
            emails: {
                some: {
                    emailAddress: process.env.ADMIN_EMAIL,
                },
            },
        },
    });
    // Create admin account if it doesn't exist
    if (!admin) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
        }

        await prisma.customer.create({
            data: {
                firstName: "admin",
                lastName: "account",
                password: bcrypt.hashSync(adminPassword, HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: AccountStatus.Unlocked,
                business: {
                    create: {
                        name: "Admin",
                    },
                },
                emails: {
                    create: [
                        {
                            emailAddress: adminEmail,
                            receivesDeliveryUpdates: false,
                        },
                    ],
                },
                roles: {
                    create: [
                        {
                            roleId: adminRole.id,
                        },
                    ],
                },
            },
        });
    }
    // Ensure admin account is unlocked if it exists
    else {
        await prisma.customer.update({
            where: { id: admin.id },
            data: {
                emailVerified: true,
                loginAttempts: 0,
                status: AccountStatus.Unlocked,
            },
        });
    }

    logger.log(LogLevel.info, "✅ Database seeding complete.");
}
