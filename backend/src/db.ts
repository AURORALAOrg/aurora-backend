import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Create Prisma client instance
export const prisma = new PrismaClient();

// Create a connection pool
const sslEnv = (process.env.DB_SSL || "false").toLowerCase();
const sslConfig =
  sslEnv === "true" || sslEnv === "require"
    ? {
        rejectUnauthorized:
          (process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true",
        ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") } : {}),
      }
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 5, // Reduced to avoid connection issues with Supabase
  idleTimeoutMillis: 30000, // Reduced to match Supabase's connection limits
  connectionTimeoutMillis: 10000, // Increased from 2000
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.warn('⚠️ Database pool error (non-fatal):', err.message);
});

// Test the database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("📦 Connected to the Supabase database successfully!");
    client.release();
  } catch (error) {
    console.error("❌ Database connection error:", error);
    // Don't exit the process, just log the error
    console.warn("⚠️ Server will continue running but database operations may fail");
  }
};

export { pool, connectDB };
