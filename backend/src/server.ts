import dotenv from "dotenv";
import path from "path";
import app from "./app";
import settings from "./core/config/settings";
import { connectDB } from "./db";
import UserReminderJob from "./jobs/userReminder.job";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const server = app;
const port = settings.serverPort || 8000;

// Test the database connection before starting the server
const startServer = async () => {
  try {
    await connectDB();
    
    // Start scheduled jobs
    UserReminderJob.startScheduledJob();
    console.log("📅 Scheduled jobs initialized");
    
    server.listen(port, () => {
      console.log(
        `🚀🚀🚀 Aurora's server is running at http://localhost:${port} 🚀🚀🚀`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer().catch(console.error);
