import bcrypt from 'bcrypt';
import { HASHING_ROUNDS } from '../../consts';
import { AccountStatus } from '../../schema/types';
import { PrismaType } from '../../types';

export async function init(prisma: PrismaType) {
    console.info('🌱 Starting database intial seed...');

    // Upsert roles
    const adminRole = await prisma.role.upsert({
        where: { title: 'Admin' },
        update: {},
        create: {
            title: 'Admin',
            description: 'This role grants access to everything. Only for developers'
        }
    });
    await prisma.role.upsert({
        where: { title: 'Owner' },
        update: {},
        create: {
            title: 'Owner',
            description: 'This role grants administrative access. This comes with the ability to \
            approve new customers, change customer information, modify inventory and \
            contact hours, and more.'
        }
    });
    await prisma.role.upsert({
        where: { title: 'Customer' },
        update: {},
        create: {
            title: 'Customer',
            description: 'This role allows a customer to order products',
        }
    });

    const admin = await prisma.customer.findFirst({
        where: {
            emails: {
                some: {
                    emailAddress: process.env.ADMIN_EMAIL
                },
            },
        }
    });
    if (!admin) {
        await prisma.customer.create({
            data: {
                firstName: 'admin',
                lastName: 'account',
                password: bcrypt.hashSync(process.env.ADMIN_PASSWORD!, HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: AccountStatus.Unlocked,
                business: {
                    create: {
                        name: 'Admin'
                    }
                },
                emails: {
                    create: [{
                        emailAddress: process.env.ADMIN_EMAIL!,
                        receivesDeliveryUpdates: false,
                    }]
                },
                roles: {
                    create: [{
                        roleId: adminRole.id
                    }]
                }
            }
        })
    }

    console.info(`✅ Database seeding complete.`);
}