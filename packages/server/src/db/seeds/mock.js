import { ACCOUNT_STATUS } from '@shared/conts';
import bcrypt from 'bcrypt';
import { HASHING_ROUNDS } from '../../consts';
import { db } from '../db';
import { PrismaType } from '../../types';
import pkg from '@prisma/client';

export async function seed() {
    console.info('🎭 Creating mock data...');

    // Find existing roles
    const customerRole = await prisma.role.findUnique({ where: { name: 'Customer' } });
    const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });
    if (!customerRole || !ownerRole) {
        throw new Error('Roles not found');
    }

    // Upsert user with owner role
    await prisma.customer.upsert({
        where: {
            email: {
                emailAddress: 'notarealemail@afakesite.com',
            }
        },
        update: {},
        create: {
            firstName: 'Elon',
            lastName: 'Tusk🦏',
            password: bcrypt.hashSync('Elon', HASHING_ROUNDS),
            accountApproved: true,
            emailVerified: true,
            status: ACCOUNT_STATUS.Unlocked,
            business: {
                create: {
                    name: 'SpaceX'
                }
            },
            emails: {
                create: [
                    { emailAddress: 'notarealemail@afakesite.com', receivesDeliveryUpdates: false },
                    { emailAddress: 'backupemailaddress@afakesite.com', receivesDeliveryUpdates: false },
                ]
            },
            phones: {
                create: [
                    { number: '15558675309', receivesDeliveryUpdates: false },
                    { number: '5555555555', receivesDeliveryUpdates: false }
                ],
            },
            roles: {
                create: [{
                    roleId: ownerRole.id
                }]
            }
        },
    })

    // Create a few customers
    await prisma.customer.upsert({
        where: {
            email: {
                emailAddress: 'itsjohncena@afakesite.com',
            }
        },
        update: {},
        create: {
            firstName: 'John',
            lastName: 'Cena',
            password: bcrypt.hashSync('John', HASHING_ROUNDS),
            accountApproved: true,
            emailVerified: true,
            status: ACCOUNT_STATUS.Unlocked,
            business: {
                create: {
                    name: 'Rocket supplier A'
                }
            },
            emails: {
                create: [
                    { emailAddress: 'itsjohncena@afakesite.com', receivesDeliveryUpdates: false },
                ]
            },
            roles: {
                create: [{
                    roleId: customerRole.id
                }]
            }
        },
    })
    await prisma.customer.upsert({
        where: {
            email: {
                emailAddress: 'spongebobmeboy@afakesite.com',
            }
        },
        update: {},
        create: {
            firstName: 'Spongebob',
            lastName: 'Customerpants',
            password: bcrypt.hashSync('Spongebob', HASHING_ROUNDS),
            accountApproved: true,
            emailVerified: true,
            status: ACCOUNT_STATUS.Unlocked,
            business: {
                create: {
                    name: '🤘🏻A Steel Company'
                }
            },
            emails: {
                create: [
                    { emailAddress: 'spongebobmeboy@afakesite.com', receivesDeliveryUpdates: false },
                ]
            },
            phones: {
                create: [
                    { number: '15553214321', receivesDeliveryUpdates: false },
                    { number: '8762342222', receivesDeliveryUpdates: false }
                ],
            },
            roles: {
                create: [{
                    roleId: customerRole.id
                }]
            }
        },
    })
    console.info(`✅ Database mock complete.`);
}