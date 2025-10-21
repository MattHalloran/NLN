/**
 * Database integration tests using Testcontainers
 *
 * Tests Prisma client operations against a real PostgreSQL database
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("Database Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let connectionString: string;

    beforeAll(async () => {
        // Start PostgreSQL container
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withDatabase("test_db")
            .withUsername("test_user")
            .withPassword("test_password")
            .start();

        connectionString = container.getConnectionUri();
        console.log("Test database started:", connectionString);

        // Set environment variable for Prisma
        process.env.DB_URL = connectionString;

        // Initialize Prisma client
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: connectionString,
                },
            },
        });

        // Run migrations
        try {
            await execAsync(`DATABASE_URL="${connectionString}" npx prisma migrate deploy`, {
                cwd: "/root/NLN/packages/server",
            });
            console.log("Database migrations applied");
        } catch (error: any) {
            console.error("Migration error:", error.message);
            throw error;
        }

        await prisma.$connect();
    }, 120000); // 2 minute timeout for container startup and migrations

    afterAll(async () => {
        await prisma.$disconnect();
        if (container) {
            await container.stop();
            console.log("Test database stopped");
        }
    });

    beforeEach(async () => {
        // Clean up database between tests
        const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
            SELECT tablename FROM pg_tables WHERE schemaname='public'
        `;

        for (const { tablename } of tablenames) {
            if (tablename !== "_prisma_migrations") {
                try {
                    await prisma.$executeRawUnsafe(
                        `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
                    );
                } catch (_error) {
                    console.log(`Could not truncate ${tablename}, but continuing...`);
                }
            }
        }
    });

    describe("Connection Tests", () => {
        it("should have a valid connection string", () => {
            expect(connectionString).toBeDefined();
            expect(connectionString).toContain("postgres://");
            expect(connectionString).toContain("test_user");
            expect(connectionString).toContain("test_db");
        });

        it("should be able to connect to database", async () => {
            const result = await prisma.$queryRaw`SELECT 1 as result`;
            expect(result).toBeDefined();
        });

        it("should be able to get container info", () => {
            const host = container.getHost();
            const port = container.getPort();

            expect(host).toBeDefined();
            expect(port).toBeGreaterThan(0);
        });
    });

    describe("Role Model Tests", () => {
        it("should create a role", async () => {
            const role = await prisma.role.create({
                data: {
                    title: "Admin",
                    description: "Administrator role",
                },
            });

            expect(role).toBeDefined();
            expect(role.id).toBeDefined();
            expect(role.title).toBe("Admin");
            expect(role.description).toBe("Administrator role");
        });

        it("should find a role by title", async () => {
            await prisma.role.create({
                data: {
                    title: "Customer",
                    description: "Customer role",
                },
            });

            const role = await prisma.role.findUnique({
                where: { title: "Customer" },
            });

            expect(role).toBeDefined();
            expect(role?.title).toBe("Customer");
        });

        it("should enforce unique constraint on title", async () => {
            await prisma.role.create({
                data: {
                    title: "TestRole",
                    description: "First role",
                },
            });

            await expect(
                prisma.role.create({
                    data: {
                        title: "TestRole",
                        description: "Duplicate role",
                    },
                })
            ).rejects.toThrow();
        });
    });

    describe("Business Model Tests", () => {
        it("should create a business", async () => {
            const business = await prisma.business.create({
                data: {
                    name: "Test Business",
                    subscribedToNewsletters: true,
                },
            });

            expect(business).toBeDefined();
            expect(business.id).toBeDefined();
            expect(business.name).toBe("Test Business");
            expect(business.subscribedToNewsletters).toBe(true);
        });

        it("should create a business with addresses", async () => {
            const business = await prisma.business.create({
                data: {
                    name: "Test Business with Address",
                    address: {
                        create: {
                            name: "Main Office",
                            country: "US",
                            administrativeArea: "CA",
                            locality: "San Francisco",
                            postalCode: "94102",
                            throughfare: "123 Market St",
                        },
                    },
                },
                include: {
                    address: true,
                },
            });

            expect(business.address).toBeDefined();
            expect(business.address.length).toBe(1);
            expect(business.address[0].name).toBe("Main Office");
            expect(business.address[0].locality).toBe("San Francisco");
        });
    });

    describe("Customer Model Tests", () => {
        let customerRole: any;

        beforeEach(async () => {
            customerRole = await prisma.role.create({
                data: {
                    title: "Customer",
                    description: "Customer role",
                },
            });
        });

        it("should create a customer", async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    pronouns: "he/him",
                    password: "hashedpassword123",
                    accountApproved: true,
                    emailVerified: false,
                    status: "Unlocked",
                },
            });

            expect(customer).toBeDefined();
            expect(customer.id).toBeDefined();
            expect(customer.firstName).toBe("John");
            expect(customer.lastName).toBe("Doe");
        });

        it("should create customer with email", async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "Jane",
                    lastName: "Smith",
                    emails: {
                        create: {
                            emailAddress: "jane@example.com",
                            receivesDeliveryUpdates: true,
                        },
                    },
                },
                include: {
                    emails: true,
                },
            });

            expect(customer.emails).toBeDefined();
            expect(customer.emails.length).toBe(1);
            expect(customer.emails[0].emailAddress).toBe("jane@example.com");
        });

        it("should create customer with roles", async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "Bob",
                    lastName: "Johnson",
                    roles: {
                        create: {
                            roleId: customerRole.id,
                        },
                    },
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            expect(customer.roles).toBeDefined();
            expect(customer.roles.length).toBe(1);
            expect(customer.roles[0].role.title).toBe("Customer");
        });

        it("should enforce unique email addresses", async () => {
            await prisma.customer.create({
                data: {
                    firstName: "User1",
                    lastName: "Test",
                    emails: {
                        create: {
                            emailAddress: "unique@example.com",
                        },
                    },
                },
            });

            await expect(
                prisma.customer.create({
                    data: {
                        firstName: "User2",
                        lastName: "Test",
                        emails: {
                            create: {
                                emailAddress: "unique@example.com",
                            },
                        },
                    },
                })
            ).rejects.toThrow();
        });
    });

    describe("Plant and SKU Model Tests", () => {
        it("should create a plant", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Rosa rubiginosa",
                    featured: true,
                },
            });

            expect(plant).toBeDefined();
            expect(plant.id).toBeDefined();
            expect(plant.latinName).toBe("Rosa rubiginosa");
            expect(plant.featured).toBe(true);
        });

        it("should create plant with SKU", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Lavandula angustifolia",
                    skus: {
                        create: {
                            sku: "LAV-001",
                            size: 5.0,
                            price: 12.99,
                            availability: 50,
                            status: "Active",
                        },
                    },
                },
                include: {
                    skus: true,
                },
            });

            expect(plant.skus).toBeDefined();
            expect(plant.skus.length).toBe(1);
            expect(plant.skus[0].sku).toBe("LAV-001");
            expect(plant.skus[0].price?.toString()).toBe("12.99");
        });

        it("should create plant with traits", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Salvia rosmarinus",
                    traits: {
                        create: [
                            { name: "sunlight", value: "Full Sun" },
                            { name: "water", value: "Moderate" },
                            { name: "height", value: "3-4 feet" },
                        ],
                    },
                },
                include: {
                    traits: true,
                },
            });

            expect(plant.traits).toBeDefined();
            expect(plant.traits.length).toBe(3);
            expect(plant.traits.find((t) => t.name === "sunlight")?.value).toBe("Full Sun");
        });

        it("should enforce unique SKU constraint", async () => {
            const plant1 = await prisma.plant.create({
                data: { latinName: "Plant 1" },
            });

            await prisma.sku.create({
                data: {
                    sku: "UNIQUE-SKU",
                    plantId: plant1.id,
                    price: 10.0,
                },
            });

            const plant2 = await prisma.plant.create({
                data: { latinName: "Plant 2" },
            });

            await expect(
                prisma.sku.create({
                    data: {
                        sku: "UNIQUE-SKU",
                        plantId: plant2.id,
                        price: 15.0,
                    },
                })
            ).rejects.toThrow();
        });
    });

    describe("Order Model Tests", () => {
        let customer: any;

        beforeEach(async () => {
            customer = await prisma.customer.create({
                data: {
                    firstName: "Order",
                    lastName: "Customer",
                },
            });
        });

        it("should create an order", async () => {
            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: "Draft",
                    isDelivery: true,
                },
            });

            expect(order).toBeDefined();
            expect(order.id).toBeDefined();
            expect(order.customerId).toBe(customer.id);
            expect(order.status).toBe("Draft");
        });

        it("should create order with items", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Test Plant for Order",
                    skus: {
                        create: {
                            sku: "ORDER-SKU-001",
                            price: 25.0,
                            availability: 10,
                        },
                    },
                },
                include: { skus: true },
            });

            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: "Draft",
                    items: {
                        create: {
                            skuId: plant.skus[0].id,
                            quantity: 3,
                        },
                    },
                },
                include: {
                    items: {
                        include: {
                            sku: {
                                include: {
                                    plant: true,
                                },
                            },
                        },
                    },
                },
            });

            expect(order.items).toBeDefined();
            expect(order.items.length).toBe(1);
            expect(order.items[0].quantity).toBe(3);
            expect(order.items[0].sku.plant.latinName).toBe("Test Plant for Order");
        });

        it("should cascade delete order items when order is deleted", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Cascade Test Plant",
                    skus: {
                        create: {
                            sku: "CASCADE-SKU",
                            price: 10.0,
                        },
                    },
                },
                include: { skus: true },
            });

            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    items: {
                        create: {
                            skuId: plant.skus[0].id,
                            quantity: 1,
                        },
                    },
                },
            });

            const orderItemsBefore = await prisma.order_item.findMany({
                where: { orderId: order.id },
            });
            expect(orderItemsBefore.length).toBe(1);

            await prisma.order.delete({
                where: { id: order.id },
            });

            const orderItemsAfter = await prisma.order_item.findMany({
                where: { orderId: order.id },
            });
            expect(orderItemsAfter.length).toBe(0);
        });
    });

    describe("Discount Model Tests", () => {
        it("should create a discount", async () => {
            const discount = await prisma.discount.create({
                data: {
                    discount: 0.15,
                    title: "15% Off",
                    comment: "Spring sale",
                    terms: "Valid until end of month",
                },
            });

            expect(discount).toBeDefined();
            expect(discount.id).toBeDefined();
            expect(discount.discount.toString()).toBe("0.15");
            expect(discount.title).toBe("15% Off");
        });

        it("should associate discount with SKU", async () => {
            const plant = await prisma.plant.create({
                data: {
                    latinName: "Discount Test Plant",
                    skus: {
                        create: {
                            sku: "DISCOUNT-SKU",
                            price: 50.0,
                            isDiscountable: true,
                        },
                    },
                },
                include: { skus: true },
            });

            const discount = await prisma.discount.create({
                data: {
                    discount: 0.2,
                    title: "20% Off",
                },
            });

            await prisma.sku_discounts.create({
                data: {
                    skuId: plant.skus[0].id,
                    discountId: discount.id,
                },
            });

            const skuWithDiscount = await prisma.sku.findUnique({
                where: { id: plant.skus[0].id },
                include: {
                    discounts: {
                        include: {
                            discount: true,
                        },
                    },
                },
            });

            expect(skuWithDiscount?.discounts).toBeDefined();
            expect(skuWithDiscount?.discounts.length).toBe(1);
            expect(skuWithDiscount?.discounts[0].discount.title).toBe("20% Off");
        });
    });

    describe("Complex Query Tests", () => {
        it("should perform complex join queries", async () => {
            // Create test data
            const role = await prisma.role.create({
                data: { title: "TestRole" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Complex",
                    lastName: "Query",
                    emails: {
                        create: {
                            emailAddress: "complex@example.com",
                        },
                    },
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            const plant = await prisma.plant.create({
                data: {
                    latinName: "Complex Query Plant",
                    skus: {
                        create: {
                            sku: "COMPLEX-001",
                            price: 30.0,
                        },
                    },
                },
                include: { skus: true },
            });

            await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: "Pending",
                    items: {
                        create: {
                            skuId: plant.skus[0].id,
                            quantity: 2,
                        },
                    },
                },
            });

            // Execute complex query
            const result = await prisma.customer.findUnique({
                where: { id: customer.id },
                include: {
                    emails: true,
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                    orders: {
                        include: {
                            items: {
                                include: {
                                    sku: {
                                        include: {
                                            plant: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            expect(result).toBeDefined();
            expect(result?.emails[0].emailAddress).toBe("complex@example.com");
            expect(result?.roles[0].role.title).toBe("TestRole");
            expect(result?.orders[0].items[0].sku.plant.latinName).toBe("Complex Query Plant");
        });
    });

    describe("Transaction Tests", () => {
        it("should rollback transaction on error", async () => {
            const _role = await prisma.role.create({
                data: { title: "TransactionRole" },
            });

            try {
                await prisma.$transaction(async (tx) => {
                    // This should succeed
                    await tx.customer.create({
                        data: {
                            firstName: "Transaction",
                            lastName: "Test",
                        },
                    });

                    // This should fail (duplicate role title)
                    await tx.role.create({
                        data: { title: "TransactionRole" },
                    });
                });
            } catch (_error) {
                // Expected to fail
            }

            // Verify customer was not created
            const customers = await prisma.customer.findMany({
                where: { firstName: "Transaction" },
            });
            expect(customers.length).toBe(0);
        });

        it("should commit successful transaction", async () => {
            await prisma.$transaction(async (tx) => {
                await tx.customer.create({
                    data: {
                        firstName: "Success",
                        lastName: "Transaction",
                    },
                });

                await tx.role.create({
                    data: { title: "SuccessRole" },
                });
            });

            const customer = await prisma.customer.findFirst({
                where: { firstName: "Success" },
            });
            const role = await prisma.role.findUnique({
                where: { title: "SuccessRole" },
            });

            expect(customer).toBeDefined();
            expect(role).toBeDefined();
        });
    });
});
