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
connectDB();

// Start scheduled jobs
UserReminderJob.startScheduledJob();

server.listen(port, () => {
  console.log(
    `🚀🚀🚀 Aurora's server is running at http://localhost:${port} 🚀🚀🚀`
  );
  console.log("📅 Scheduled jobs initialized");
});
