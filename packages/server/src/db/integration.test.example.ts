/**
 * Example integration test using Testcontainers with Vitest
 *
 * This file demonstrates how to use Testcontainers with Vitest for integration tests.
 * Rename this file to remove the .example extension to enable it.
 *
 * Usage:
 * - Rename to integration.test.ts
 * - Run with: yarn test
 *
 * Note: This test will be slower as it spins up a real PostgreSQL container.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

describe("Database Integration Tests (Example)", () => {
    let container: StartedPostgreSqlContainer;
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
    }, 60000); // 60 second timeout for container startup

    afterAll(async () => {
        if (container) {
            await container.stop();
            console.log("Test database stopped");
        }
    });

    it("should have a valid connection string", () => {
        expect(connectionString).toBeDefined();
        expect(connectionString).toContain("postgresql://");
        expect(connectionString).toContain("test_user");
        expect(connectionString).toContain("test_db");
    });

    it("should be able to get container info", () => {
        const host = container.getHost();
        const port = container.getPort();

        expect(host).toBeDefined();
        expect(port).toBeGreaterThan(0);
    });
});
