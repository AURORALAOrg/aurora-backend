import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Create a connection pool
const shouldUseSSL = (process.env.DB_SSL || "false").toLowerCase() === "true";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
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
