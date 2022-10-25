CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL,
    "tag" VARCHAR(128),
    "name" VARCHAR(128),
    "country" VARCHAR(2) NOT NULL DEFAULT 'US',
    "administrativeArea" VARCHAR(64) NOT NULL,
    "subAdministrativeArea" VARCHAR(64),
    "locality" VARCHAR(64) NOT NULL,
    "postalCode" VARCHAR(16) NOT NULL,
    "throughfare" VARCHAR(256) NOT NULL,
    "premise" VARCHAR(64),
    "deliveryInstructions" VARCHAR(2048),
    "businessId" UUID,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "subscribedToNewsletters" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_discounts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "discountId" UUID NOT NULL,

    CONSTRAINT "business_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(128) NOT NULL,
    "lastName" VARCHAR(128) NOT NULL,
    "pronouns" VARCHAR(128) NOT NULL DEFAULT 'they/them',
    "theme" VARCHAR(255) NOT NULL DEFAULT 'light',
    "password" VARCHAR(256),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAttempt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionToken" VARCHAR(1024),
    "resetPasswordCode" VARCHAR(256),
    "lastResetPasswordReqestAttempt" TIMESTAMPTZ(6),
    "accountApproved" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Unlocked',
    "businessId" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_roles" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "customer_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount" (
    "id" UUID NOT NULL,
    "discount" DECIMAL(4,4) NOT NULL DEFAULT 0,
    "title" VARCHAR(128) NOT NULL DEFAULT '',
    "comment" VARCHAR(1024),
    "terms" VARCHAR(4096),

    CONSTRAINT "discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email" (
    "id" UUID NOT NULL,
    "emailAddress" VARCHAR(128) NOT NULL,
    "receivesDeliveryUpdates" BOOLEAN NOT NULL DEFAULT true,
    "customerId" UUID,
    "businessId" UUID,

    CONSTRAINT "email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "text" VARCHAR(4096) NOT NULL,
    "customerId" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "hash" VARCHAR(128) NOT NULL,
    "alt" VARCHAR(256),
    "description" VARCHAR(1024),
    "usedFor" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "image_file" (
    "hash" VARCHAR(128) NOT NULL,
    "src" VARCHAR(256) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "specialInstructions" VARCHAR(2048),
    "desiredDeliveryDate" TIMESTAMPTZ(6),
    "expectedDeliveryDate" TIMESTAMPTZ(6),
    "isDelivery" BOOLEAN NOT NULL DEFAULT true,
    "addressId" UUID,
    "customerId" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "orderId" UUID NOT NULL,
    "skuId" UUID NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone" (
    "id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "receivesDeliveryUpdates" BOOLEAN NOT NULL DEFAULT true,
    "customerId" UUID,
    "businessId" UUID,

    CONSTRAINT "phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant" (
    "id" UUID NOT NULL,
    "latinName" VARCHAR(256) NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_images" (
    "id" SERIAL NOT NULL,
    "plantId" UUID NOT NULL,
    "hash" VARCHAR(128) NOT NULL,
    "index" INTEGER NOT NULL,
    "isDisplay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plant_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_trait" (
    "id" SERIAL NOT NULL,
    "plantId" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "value" VARCHAR(512) NOT NULL,

    CONSTRAINT "plant_trait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_task" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "description" VARCHAR(1024),
    "result" VARCHAR(8192),
    "resultCode" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" VARCHAR(2048),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(32) NOT NULL,
    "isDiscountable" BOOLEAN NOT NULL DEFAULT false,
    "size" DECIMAL(8,2),
    "note" VARCHAR(2048),
    "availability" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(8,2),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "plantId" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_discounts" (
    "id" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "discountId" UUID NOT NULL,

    CONSTRAINT "sku_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_labels" (
    "id" SERIAL NOT NULL,
    "hash" VARCHAR(128) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "image_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_discounts_businessid_discountid_unique" ON "business_discounts"("businessId", "discountId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_resetpasswordcode_unique" ON "customer"("resetPasswordCode");

-- CreateIndex
CREATE UNIQUE INDEX "customer_roles_customerid_roleid_unique" ON "customer_roles"("customerId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "email_emailaddress_unique" ON "email"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "image_hash_unique" ON "image"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "image_file_src_unique" ON "image_file"("src");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_orderid_skuid_unique" ON "order_item"("orderId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_number_unique" ON "phone"("number");

-- CreateIndex
CREATE UNIQUE INDEX "plant_latinname_unique" ON "plant"("latinName");

-- CreateIndex
CREATE UNIQUE INDEX "plant_images_plantid_hash_unique" ON "plant_images"("plantId", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "plant_trait_plantid_name_unique" ON "plant_trait"("plantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_title_unique" ON "role"("title");

-- CreateIndex
CREATE UNIQUE INDEX "sku_sku_unique" ON "sku"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "sku_discounts_skuid_discountid_unique" ON "sku_discounts"("skuId", "discountId");

-- CreateIndex
CREATE UNIQUE INDEX "image_labels_hash_label_unique" ON "image_labels"("hash", "label");

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_businessid_foreign" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_discounts" ADD CONSTRAINT "business_discounts_businessid_foreign" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_discounts" ADD CONSTRAINT "business_discounts_discountid_foreign" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_businessid_foreign" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_roles" ADD CONSTRAINT "customer_roles_customerid_foreign" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_roles" ADD CONSTRAINT "customer_roles_roleid_foreign" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email" ADD CONSTRAINT "email_businessid_foreign" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email" ADD CONSTRAINT "email_customerid_foreign" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_customerid_foreign" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_file" ADD CONSTRAINT "image_file_hash_foreign" FOREIGN KEY ("hash") REFERENCES "image"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_addressid_foreign" FOREIGN KEY ("addressId") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customerid_foreign" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderid_foreign" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_skuid_foreign" FOREIGN KEY ("skuId") REFERENCES "sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone" ADD CONSTRAINT "phone_businessid_foreign" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone" ADD CONSTRAINT "phone_customerid_foreign" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_images" ADD CONSTRAINT "plant_images_hash_foreign" FOREIGN KEY ("hash") REFERENCES "image"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_images" ADD CONSTRAINT "plant_images_plantid_foreign" FOREIGN KEY ("plantId") REFERENCES "plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_trait" ADD CONSTRAINT "plant_trait_plantid_foreign" FOREIGN KEY ("plantId") REFERENCES "plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku" ADD CONSTRAINT "sku_plantid_foreign" FOREIGN KEY ("plantId") REFERENCES "plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_discounts" ADD CONSTRAINT "sku_discounts_discountid_foreign" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_discounts" ADD CONSTRAINT "sku_discounts_skuid_foreign" FOREIGN KEY ("skuId") REFERENCES "sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_labels" ADD CONSTRAINT "image_labels_hash_foreign" FOREIGN KEY ("hash") REFERENCES "image"("hash") ON DELETE CASCADE ON UPDATE CASCADE;
