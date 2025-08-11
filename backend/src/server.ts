import dotenv from "dotenv";
import path from "path";
import app from "./app";
import settings from "./core/config/settings";
import { connectDB } from "./db";
import JobSchedulerService from "./services/jobScheduler.service";

dotenv.config();

const server = app;
const port = settings.serverPort || 8000;

// Connect to database
connectDB();

// Initialize scheduled jobs
try {
  JobSchedulerService.initializeJobs();
  console.log("✅ Scheduled jobs initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize scheduled jobs:", error);
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);

  // Set a timeout for forced shutdown
  const forceShutdown = setTimeout(() => {
    console.log("Force shutdown after timeout");
    process.exit(1);
  }, 10000);

  try {
    await JobSchedulerService.shutdown();
    console.log("Jobs shut down successfully");
    clearTimeout(forceShutdown);
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    clearTimeout(forceShutdown);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(port, () => {
  console.log(`🚀🚀🚀 Aurora's server is running at http://localhost:${port} 🚀🚀🚀`);
});
