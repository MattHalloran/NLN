import { ACCOUNT_STATUS } from '@shared/consts';
import bcrypt from 'bcrypt';
import { HASHING_ROUNDS } from '../../consts';
import { PrismaType } from '../../types';
import pkg from '@prisma/client';
import { v4 as uuid } from 'uuid';

export async function init() {
    console.info('🌱 Starting database intial seed...');

    // Upsert roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'This role grants access to everything. Only for developers'
        }
    });
    await prisma.role.upsert({
        where: { name: 'Owner' },
        update: {},
        create: {
            name: 'Owner',
            description: 'This role grants administrative access. This comes with the ability to \
            approve new customers, change customer information, modify inventory and \
            contact hours, and more.'
        }
    });
    await prisma.role.upsert({
        where: { name: 'Customer' },
        update: {},
        create: {
            name: 'Customer',
            description: 'This role allows a customer to order products',
        }
    });

    await prisma.customer.upsert({
        where: {
            email: {
                emailAddress: process.env.ADMIN_EMAIL,
            }
        },
        update: {},
        create: {
            firstName: 'admin',
            lastName: 'account',
            password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, HASHING_ROUNDS),
            accountApproved: true,
            emailVerified: true,
            status: ACCOUNT_STATUS.Unlocked,
            business: {
                create: {
                    name: 'Admin'
                }
            },
            emails: {
                create: [{
                    emailAddress: process.env.ADMIN_EMAIL,
                    receivesDeliveryUpdates: false,
                    customerId: customer_admin_id
                }]
            },
            roles: {
                create: [{
                    roleId: adminRole.id
                }]
            }
        },
    })

    console.info(`✅ Database seeding complete.`);
}