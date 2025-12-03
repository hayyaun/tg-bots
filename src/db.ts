import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import log from "./log";

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma Client instance with adapter
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

let isConnected = false;

// Connect to PostgreSQL and ensure schema is up to date
export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test connection
      await prisma.$connect();
      isConnected = true;
      log.info("PostgreSQL > Connected via Prisma");

      // Ensure database schema is up to date
      // Note: In production, migrations should be run separately
      // This is just for development/testing
      return; // Success, exit retry loop
    } catch (err) {
      if (attempt === maxRetries) {
        log.error("PostgreSQL > Connection failed after all retries", err);
        throw err;
      }
      log.info(`PostgreSQL > Connection attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

// Close the Prisma connection (for graceful shutdown)
export async function closeDB(): Promise<void> {
  await prisma.$disconnect();
  isConnected = false;
  log.info("PostgreSQL > Connection closed");
}

// Export Prisma client for use throughout the application
export { prisma };
export default prisma;
