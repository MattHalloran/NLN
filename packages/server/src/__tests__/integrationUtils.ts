import { PrismaClient } from "@prisma/client";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export const serverRoot = path.resolve(__dirname, "../..");

type StartedPostgresTestDatabase = {
    container: StartedPostgreSqlContainer;
    connectionString: string;
    prisma: PrismaClient;
};

export async function startPostgresTestDatabase(
    databaseName: string
): Promise<StartedPostgresTestDatabase> {
    const container = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase(databaseName)
        .withUsername("test_user")
        .withPassword("test_password")
        .withReuse(false)
        .start();

    const connectionString = container.getConnectionUri();

    process.env.DB_URL = connectionString;
    process.env.DATABASE_URL = connectionString;

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: connectionString,
            },
        },
    });

    await runPrismaMigrations(connectionString);
    await prisma.$connect();

    return {
        container,
        connectionString,
        prisma,
    };
}

export async function runPrismaMigrations(connectionString: string) {
    await execAsync(`DATABASE_URL="${connectionString}" npx prisma migrate deploy`, {
        cwd: serverRoot,
    });
}

export async function stopPostgresTestDatabase(
    prisma: PrismaClient | undefined,
    container: StartedPostgreSqlContainer | undefined
) {
    if (prisma) {
        await prisma.$disconnect();
    }

    if (container) {
        await container.stop();
    }
}

export async function truncatePublicTables(
    prisma: PrismaClient,
    excludedTables = ["_prisma_migrations"]
) {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
        if (excludedTables.includes(tablename)) {
            continue;
        }

        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
}

type TestProjectDir = {
    projectDir: string;
    dataDir: string;
    assetsPublicDir: string;
    cleanup: () => void;
};

export function createTestProjectDir(prefix: string): TestProjectDir {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
    const dataDir = path.join(projectDir, "packages/server/src/data");
    const assetsPublicDir = path.join(projectDir, "assets/public");

    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    fs.cpSync(path.join(serverRoot, "src/data"), dataDir, { recursive: true });

    const sourceAssetsPublicDir = path.resolve(serverRoot, "../../assets/public");
    if (fs.existsSync(sourceAssetsPublicDir)) {
        fs.mkdirSync(path.dirname(assetsPublicDir), { recursive: true });
        fs.cpSync(sourceAssetsPublicDir, assetsPublicDir, { recursive: true });
    } else {
        fs.mkdirSync(assetsPublicDir, { recursive: true });
    }

    return {
        projectDir,
        dataDir,
        assetsPublicDir,
        cleanup: () => fs.rmSync(projectDir, { recursive: true, force: true }),
    };
}
