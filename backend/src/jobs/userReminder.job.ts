import * as cron from "node-cron";
import NotificationService from "../services/notification.service";

class UserReminderJob {
  private static isRunning = false;

  /**
   * Check for inactive users and send reminders
   */
  public static async checkInactiveUsers(): Promise<void> {
    if (UserReminderJob.isRunning) {
      console.log("⏳ User reminder job already running, skipping...");
      return;
    }

    UserReminderJob.isRunning = true;
    const startTime = new Date();

    try {
      console.log(
        `🔄 Starting user reminder job at ${startTime.toISOString()}`
      );

      const results = await NotificationService.processInactiveUserReminders();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`✅ User reminder job completed in ${duration}ms`);
      console.log(
        `📈 Results: ${results.sent} emails sent, ${results.failed} failed, ${results.processed} users processed`
      );
    } catch (error) {
      console.error("❌ User reminder job failed:", error);
    } finally {
      UserReminderJob.isRunning = false;
    }
  }

  /**
   * Start the scheduled job
   */
  public static startScheduledJob(): void {
    try {
      const isDevelopment = process.env.SERVER_ENVIRONMENT === "DEVELOPMENT";

      if (isDevelopment) {
        // Run every hour in development for testing
        console.log(
          "🔧 Development mode: User reminder job scheduled every hour"
        );
        cron.schedule("0 * * * *", async () => {
          await UserReminderJob.checkInactiveUsers();
        });
      } else {
        // Run daily at 2 AM UTC in production
        console.log(
          "🚀 Production mode: User reminder job scheduled daily at 2 AM UTC"
        );
        cron.schedule("0 2 * * *", async () => {
          await UserReminderJob.checkInactiveUsers();
        });
      }
    } catch (error) {
      console.error("❌ Failed to schedule user reminder job:", error);
      throw error; // Re-throw to ensure the application knows about the failure
    }
  }

  /**
   * Run job immediately (for testing)
   */
  public static async runNow(): Promise<void> {
    console.log("🧪 Running user reminder job immediately...");
    await UserReminderJob.checkInactiveUsers();
  }
}

export default UserReminderJob;
