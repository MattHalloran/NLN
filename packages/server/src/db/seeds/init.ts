import bcrypt from "bcryptjs";
import { HASHING_ROUNDS } from "../../consts";
import { logger, LogLevel } from "../../logger.js";
import { AccountStatus } from "../../schema/types";
import { PrismaType } from "../../types";

export async function init(prisma: PrismaType) {
    logger.log(LogLevel.info, "🌱 Starting database intial seed...");

    // Make sure auto-increment sequences are synced with actual data (PostgreSQL)
    // This prevents "Unique constraint failed" errors when inserting new records
    logger.log(LogLevel.info, "🔧 Synchronizing database sequences...");
    await prisma.$executeRaw`SELECT setval('plant_trait_id_seq', COALESCE((SELECT MAX(id) FROM plant_trait), 0) + 1, false)`;
    await prisma.$executeRaw`SELECT setval('plant_images_id_seq', COALESCE((SELECT MAX(id) FROM plant_images), 0) + 1, false)`;
    await prisma.$executeRaw`SELECT setval('queue_task_id_seq', COALESCE((SELECT MAX(id) FROM queue_task), 0) + 1, false)`;
    await prisma.$executeRaw`SELECT setval('image_labels_id_seq', COALESCE((SELECT MAX(id) FROM image_labels), 0) + 1, false)`;
    logger.log(LogLevel.info, "✅ Sequences synchronized.");

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
