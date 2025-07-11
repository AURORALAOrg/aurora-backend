import cron from "node-cron";
import { DailyStreakJob } from "./dailyStreak";

// Daily at 00:05 UTC
cron.schedule("5 0 * * *", async () => {
  try {
    await DailyStreakJob.run();
    console.log("Daily streak job completed successfully");
  } catch (error) {
    console.error("Daily streak job failed:", error);
  }
});
