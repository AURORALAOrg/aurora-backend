import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Create Prisma client instance
export const prisma = new PrismaClient();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// Test the database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("📦 Connected to the Supabase database successfully!");
    client.release();
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Exit the process if the connection fails
  }
};

export { pool, connectDB };
