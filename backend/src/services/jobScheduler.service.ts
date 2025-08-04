import * as cron from "node-cron";
import settings from "../core/config/settings";
import UserReminderJob from "../jobs/userReminder.job";

class JobSchedulerService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  public static initializeJobs(): void {
    console.log("🔧 Initializing scheduled jobs...");

    if (!settings.reminders.enabled) {
      console.log("⏸️ Reminder jobs are disabled in configuration");
      return;
    }

    this.scheduleUserReminderJob();
    console.log(`✅ ${this.jobs.size} scheduled job(s) initialized`);
  }

  /**
   * Schedule the user reminder job
   */
  private static scheduleUserReminderJob(): void {
    const cronSchedule = settings.reminders.cronSchedule;
    let isRunning = false;

    if (!cron.validate(cronSchedule)) {
      console.error(`❌ Invalid CRON schedule: ${cronSchedule}`);
      return;
    }

    const job = cron.schedule(cronSchedule, async () => {
      if (isRunning) {
        console.log("⏭️ Skipping user reminder job - previous execution still running");
        return;
      }

      isRunning = true;
      try {
        console.log("⏰ Running scheduled user reminder job...");
        const result = await UserReminderJob.checkInactiveUsers(settings.reminders.maxRetries);

        if (result.success) {
          console.log("✅ Scheduled reminder job completed successfully:", result.stats);
        } else {
          console.error("❌ Scheduled reminder job failed:", result.errors);
        }
      } catch (error) {
        console.error("❌ Scheduled reminder job error:", error);
      } finally {
        isRunning = false;
      }
    }, {
      timezone: "UTC",
    });

    this.jobs.set("userReminder", job);
    console.log(`📅 User reminder job scheduled with CRON: ${cronSchedule} (UTC)`);
  }

  /**
   * Start all jobs
   */
  public static startAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`▶️ Started job: ${name}`);
    });
  }

  /**
   * Stop all jobs
   */
  public static stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏸️ Stopped job: ${name}`);
    });
  }

  /**
   * Get job status
   */
  public static getJobStatus(): Array<{ name: string; isRunning: boolean; schedule: string }> {
    const status: Array<{ name: string; isRunning: boolean; schedule: string }> = [];

    this.jobs.forEach((job, name) => {
      status.push({
        name,
        isRunning: job.getStatus() === "scheduled",
        schedule: name === "userReminder" ? settings.reminders.cronSchedule : "unknown",
      });
    });

    return status;
  }

  /**
   * Manually trigger user reminder job (for testing)
   */
  public static async triggerUserReminderJob(): Promise<any> {
    console.log("🔧 Manually triggering user reminder job...");
    return UserReminderJob.triggerManual();
  }

  /**
   * Get next run times for all jobs
   */
  public static getNextRunTimes(): Array<{ name: string; nextRun: string }> {
    // node-cron doesn't provide built-in next run time calculation
    // For now, we'll return the schedule pattern
    return Array.from(this.jobs.keys()).map(name => ({
      name,
      nextRun: `Next run based on schedule: ${name === "userReminder" ? settings.reminders.cronSchedule : "unknown"}`,
    }));
  }

  /**
   * Graceful shutdown of all jobs
   */
  public static shutdown(): void {
    console.log("🛑 Shutting down job scheduler...");
    this.stopAllJobs();
    this.jobs.clear();
    console.log("✅ Job scheduler shutdown complete");
  }
}

export default JobSchedulerService; 