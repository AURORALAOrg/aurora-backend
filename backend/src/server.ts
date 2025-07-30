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
JobSchedulerService.initializeJobs();


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  JobSchedulerService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  JobSchedulerService.shutdown();
  process.exit(0);
});

server.listen(port, () => {
  console.log(`🚀🚀🚀 Aurora's server is running at http://localhost:${port} 🚀🚀🚀`);
});
