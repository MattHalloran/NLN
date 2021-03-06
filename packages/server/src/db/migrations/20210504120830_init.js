import { THEME, ACCOUNT_STATUS, TRAIT_NAME, SKU_STATUS, IMAGE_EXTENSION, ORDER_STATUS, TASK_STATUS } from '@local/shared';
import { TABLES } from '../tables';

export async function up (knex) {
    console.log('IN MIGRATION FILEEEEEEEEEEEEE')
    await knex.schema.createTable(TABLES.Task, (table) => {
        table.increments();
        table.integer('taskId').notNullable();
        table.string('name', 256).notNullable();
        table.enu('status', Object.values(TASK_STATUS)).defaultTo(TASK_STATUS.Active).notNullable();
        table.string('description', 1024);
        table.string('result', 8192);
        table.integer('resultCode');
    });
    await knex.schema.createTable(TABLES.Business, (table) => {
        table.uuid('id').primary();
        table.string('name', 128).notNullable();
        table.boolean('subscribedToNewsletters').defaultTo(true).notNullable();
    });
    await knex.schema.createTable(TABLES.User, (table) => {
        table.uuid('id').primary();
        table.string('firstName', 128).notNullable();
        table.string('lastName', 128).notNullable();
        table.string('pronouns', 128).defaultTo('they/them').notNullable();
        table.string('theme').defaultTo(THEME.Light).notNullable();
        table.string('password', 256).notNullable();
        table.integer('loginAttempts').defaultTo(0).notNullable();
        table.timestamp('lastLoginAttempt').defaultTo(knex.fn.now()).notNullable();
        table.string('sessionToken', 1024);
        table.string('resetPasswordCode', 256);
        table.boolean('accountApproved').defaultTo(false).notNullable();
        table.boolean('emailVerified').defaultTo(false).notNullable();
        table.enu('status', Object.values(ACCOUNT_STATUS)).defaultTo(ACCOUNT_STATUS.WaitingEmailVerification).notNullable();
        table.uuid('businessId').references('id').inTable(TABLES.Business).onUpdate('CASCADE');
    });
    await knex.schema.createTable(TABLES.Discount, (table) => {
        table.uuid('id').primary();
        table.decimal('discount', 4, 4).defaultTo(0).notNullable();
        table.string('title', 128).defaultTo('').notNullable();
        table.string('comment', 1024);
        table.string('terms', 4096);
    });
    await knex.schema.createTable(TABLES.Feedback, (table) => {
        table.uuid('id').primary();
        table.string('text', 4096).notNullable();
        table.uuid('userId').references('id').inTable(TABLES.User).onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.Role, (table) => {
        table.uuid('id').primary();
        table.string('title', 128).notNullable().unique();
        table.string('description', 2048);
    });
    await knex.schema.createTable(TABLES.Address, (table) => {
        // tag - Optional tag associated with address (ex: 'Main address')
        // name - Optional name, sometimes required for internal mail delivery systems
        // country - ISO 3166 country code
        // administrative_area - State/Province/Region (ISO code when available [ex: NJ])
        // sub_administrative_area - County/District (currently unused)
        // locality - City/Town
        // postal_code - Postal/Zip code
        // throughfare - Street Address
        // premise - Apartment, Suite, P.O. box number, etc.
        table.increments();
        table.string('tag', 128);
        table.string('name', 128);
        table.string('country', 2).defaultTo('US').notNullable();
        table.string('administrativeArea', 64).notNullable();
        table.string('subAdministrativeArea', 64);
        table.string('locality', 64).notNullable();
        table.string('postalCode', 16).notNullable();
        table.string('throughfare', 256).notNullable();
        table.string('premise', 64);
        table.string('deliveryInstructions', 2048);
        table.uuid('businessId').references('id').inTable(TABLES.Business).onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.Email, (table) => {
        //TODO CONSTRAINT chk_keys check (user_id is not null or business_id is not null)
        table.increments();
        table.string('emailAddress', 128).notNullable().unique();
        table.boolean('receivesDeliveryUpdates').defaultTo(true).notNullable();
        table.uuid('userId').references('id').inTable(TABLES.User).onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('businessId').references('id').inTable(TABLES.Business).onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.Phone, (table) => {
        // Numbers should be stored without formatting
        //TODO CONSTRAINT chk_keys check (user_id is not null or business_id is not null),
        //TODO UNIQUE (number, country_code, extension)
        table.increments();
        table.string('number', 10).notNullable();
        table.string('countryCode', 8).defaultTo('1').notNullable();
        table.string('extension', 8);
        table.boolean('receivesDeliveryUpdates').defaultTo(true).notNullable();
        table.uuid('userId').references('id').inTable(TABLES.User).onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('businessId').references('id').inTable(TABLES.Business).onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.Image, (table) => {
        //TODO UNIQUE (foler, file_name, extension)
        table.increments();
        table.string('hash', 128).notNullable().unique();
        table.string('folder', 256).notNullable();
        table.string('fileName', 256).notNullable();
        table.enu('extension', Object.values(IMAGE_EXTENSION)).notNullable();
        table.string('alt', 256);
        table.string('description', 1024);
        table.integer('width').notNullable();
        table.integer('height').notNullable();
    });
    await knex.schema.createTable(TABLES.Trait, (table) => {
        //TODO UNIQUE (trait, value)
        table.increments();
        table.enu('name', Object.values(TRAIT_NAME)).notNullable();
        table.string('value', 512).notNullable();
    });
    await knex.schema.createTable(TABLES.Plant, (table) => {
        table.uuid('id').primary();
        table.string('latinName', 256).notNullable().unique();
        table.string('textData', 32768).defaultTo('{}').notNullable();
        table.string('imageData', 4096).defaultTo('{}').notNullable();
    });
    await knex.schema.createTable(TABLES.Sku, (table) => {
        table.uuid('id').primary();
        table.string('sku', 32).notNullable();
        table.boolean('isDiscountable').defaultTo(false).notNullable();
        table.string('size', 32).defaultTo('N/A').notNullable();
        table.string('note', 2048);
        table.integer('availability').defaultTo(0).notNullable();
        table.string('price', 16).defaultTo('N/A').notNullable();
        table.enu('status', Object.values(SKU_STATUS)).defaultTo(SKU_STATUS.Active).notNullable();
        table.uuid('plantId').references('id').inTable(TABLES.Plant).onUpdate('CASCADE').onDelete('CASCADE');
        table.timestamps(true, true);
    });
    await knex.schema.createTable(TABLES.Order, (table) => {
        table.uuid('id').primary();
        table.enu('status', Object.values(ORDER_STATUS)).defaultTo(ORDER_STATUS.Draft).notNullable();
        table.string('specialInstructions', 2048);
        table.timestamp('desiredDeliveryDate');
        table.timestamp('expectedDeliveryDate');
        table.boolean('isDelivery').defaultTo(true).notNullable();
        table.integer('addressId').references('id').inTable(TABLES.Address).onUpdate('CASCADE');
        table.uuid('userId').references('id').inTable(TABLES.User).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.OrderItem, (table) => {
        table.increments();
        table.integer('quantity').defaultTo(1).notNullable();
        table.uuid('orderId').references('id').inTable(TABLES.Order).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('skuId').references('id').inTable(TABLES.Sku).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.ImageLabels, (table) => {
        table.increments();
        table.string('hash').references('hash').inTable(TABLES.Image).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.string('label').notNullable();
    });
    await knex.schema.createTable(TABLES.BusinessDiscounts, (table) => {
        table.increments();
        table.uuid('businessId').references('id').inTable(TABLES.Business).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('discountId').references('id').inTable(TABLES.Discount).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.PlantTraits, (table) => {
        table.increments();
        table.uuid('plantId').references('id').inTable(TABLES.Plant).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.integer('TraitId').references('id').inTable(TABLES.Trait).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.SkuDiscounts, (table) => {
        table.increments();
        table.uuid('skuId').references('id').inTable(TABLES.Sku).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('discountId').references('id').inTable(TABLES.Discount).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
    await knex.schema.createTable(TABLES.UserRoles, (table) => {
        table.increments();
        table.uuid('userId').references('id').inTable(TABLES.User).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
        table.uuid('roleId').references('id').inTable(TABLES.Role).notNullable().onUpdate('CASCADE').onDelete('CASCADE');
    });
}

export async function down (knex) {
    await knex.schema.dropTableIfExists(TABLES.UserRoles);
    await knex.schema.dropTableIfExists(TABLES.SkuDiscounts);
    await knex.schema.dropTableIfExists(TABLES.PlantTraits);
    await knex.schema.dropTableIfExists(TABLES.BusinessDiscounts);
    await knex.schema.dropTableIfExists(TABLES.ImageLabels);
    await knex.schema.dropTableIfExists(TABLES.OrderItem);
    await knex.schema.dropTableIfExists(TABLES.Order);
    await knex.schema.dropTableIfExists(TABLES.Sku);
    await knex.schema.dropTableIfExists(TABLES.Plant);
    await knex.schema.dropTableIfExists(TABLES.Trait);
    await knex.schema.dropTableIfExists(TABLES.Image);
    await knex.schema.dropTableIfExists(TABLES.Phone);
    await knex.schema.dropTableIfExists(TABLES.Email);
    await knex.schema.dropTableIfExists(TABLES.Address);
    await knex.schema.dropTableIfExists(TABLES.Role);
    await knex.schema.dropTableIfExists(TABLES.Feedback);
    await knex.schema.dropTableIfExists(TABLES.Discount);
    await knex.schema.dropTableIfExists(TABLES.User);
    await knex.schema.dropTableIfExists(TABLES.Business);
    await knex.schema.dropTableIfExists(TABLES.Task);
}