import { ACCOUNT_STATUS } from '@local/shared';
import { TABLES } from '../tables';
import * as uuid from 'uuid';
const { v4: uuidv4 } = uuid;
import bcrypt from 'bcrypt';
import { HASHING_ROUNDS } from '../models/user';
import { db } from '../db';

export async function seed() {
    // // Truncate existing tables (delete all data)
    // await Object.values(TABLES).forEach(async t => {
    //     await knex.raw(`TRUNCATE TABLE "${t}" CASCADE`);
    // });
    console.info('Starting intial seed')

    // Determine if roles need to be added
    const curr_role_titles = (await db(TABLES.Role).select('title')).map(r => r.title);
    const role_data = [];
    if (!curr_role_titles.includes('Customer')) {
        console.info('Creating customer role')
        role_data.push({ id: uuidv4(), title: 'Customer', description: 'This role allows a user to order products' });
    }
    if (!curr_role_titles.includes('Admin')) {
        console.info('Creating admin role')
        role_data.push({
            id: uuidv4(), title: 'Admin', description: 'This role grants administrative access. This comes with the ability to \
        approve new customers, change customer information, modify inventory and \
        contact hours, and more.' });
    }
    // Insert roles
    if (role_data.length > 0) {
        await db(TABLES.Role).insert(role_data);
    }

    // Determine if admin needs to be added
    const role_admin_id = (await db(TABLES.Role).select('id').where('title', 'Admin').first()).id;
    const has_admin = (await db(TABLES.UserRoles).where('roleId', role_admin_id)).length > 0;
    if (!has_admin) {
        console.info('Creating admin account')
        // Insert admin
        const user_admin_id = (await db(TABLES.User).insert([
            {
                id: uuidv4(),
                firstName: 'admin',
                lastName: 'account',
                password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, HASHING_ROUNDS),
                accountApproved: true,
                emailVerified: true,
                status: ACCOUNT_STATUS.Unlocked
            }
        ]).returning('id'))[0];

        // Insert admin email
        await db(TABLES.Email).insert([
            {
                emailAddress: process.env.ADMIN_EMAIL,
                receivesDeliveryUpdates: false,
                userId: user_admin_id
            }
        ])

        // Associate the admin account with an admin role
        await db(TABLES.UserRoles).insert([
            {
                userId: user_admin_id,
                roleId: role_admin_id
            }
        ])
    }
}