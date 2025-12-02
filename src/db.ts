import { Pool, QueryResult } from "pg";
import log from "./log";

// Shared PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://tgbots:tgbots@localhost:5432/tgbots",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let isConnected = false;

// Connect to PostgreSQL and initialize schema
export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    // Test connection
    await pool.query("SELECT NOW()");
    isConnected = true;
    log.info("PostgreSQL > Connected");

    // Initialize schema
    await initializeSchema();
  } catch (err) {
    log.error("PostgreSQL > Connection failed", err);
    throw err;
  }
}

// Initialize database schema
async function initializeSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        display_name VARCHAR(100),
        biography TEXT,
        birth_date DATE,
        gender VARCHAR(20),
        looking_for_gender VARCHAR(20),
        archetype_result VARCHAR(50),
        mbti_result VARCHAR(10),
        profile_images TEXT[],
        completion_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        liked_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, liked_user_id)
      )
    `);

    // Ignored table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ignored (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        ignored_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ignored_user_id)
      )
    `);

    // Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGSERIAL PRIMARY KEY,
        reporter_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        reported_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_likes_liked_user_id ON likes(liked_user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ignored_user_id ON ignored(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ignored_ignored_user_id ON ignored(ignored_user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id)
    `);

    await client.query("COMMIT");
    log.info("PostgreSQL > Schema initialized");
  } catch (err) {
    await client.query("ROLLBACK");
    log.error("PostgreSQL > Schema initialization failed", err);
    throw err;
  } finally {
    client.release();
  }
}

// Helper to execute queries
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return await pool.query(text, params);
}

// Helper to get a client from the pool (for transactions)
export async function getClient() {
  return await pool.connect();
}

// Close the pool (for graceful shutdown)
export async function closeDB(): Promise<void> {
  await pool.end();
  isConnected = false;
  log.info("PostgreSQL > Connection closed");
}

// Export the pool for advanced usage
export default pool;

