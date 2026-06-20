import { execFileSync } from "node:child_process";
import * as dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT_DB = "5433";
const DEFAULT_E2E_PORT_REDIS = "6379";

const removeContainer = (name: string) => {
  try {
    execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  } catch {
    // The container may already be gone if the web server shell trap ran.
  }
};

export default async function globalTeardown() {
  if (process.env.E2E_TEARDOWN_REMOVE_SERVICES !== "true") {
    return;
  }

  const dbContainer =
    process.env.E2E_DB_CONTAINER ?? `nln_e2e_db_${process.env.PORT_DB ?? DEFAULT_PORT_DB}`;
  const redisContainer =
    process.env.E2E_REDIS_CONTAINER ??
    `nln_e2e_redis_${process.env.PORT_REDIS ?? DEFAULT_E2E_PORT_REDIS}`;

  removeContainer(dbContainer);
  removeContainer(redisContainer);
}
