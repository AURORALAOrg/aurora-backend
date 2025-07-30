import NotificationService from "../services/notification.service";
import EmailNotifier from "../utils/service/emailNotifier";
import UserService from "../services/user.service";

interface JobResult {
  success: boolean;
  stats: {
    candidatesFound: number;
    emailsSent: number;
    emailsFailed: number;
  };
  errors: Array<{ email: string; error: string }>;
  executionTime: number;
}

class UserReminderJob {
  /**
   * Main job function to check inactive users and send reminders
   */
  public static async checkInactiveUsers(maxRetries: number = 2): Promise<JobResult> {
    const startTime = Date.now();
    console.log("🔄 Starting user reminder job...");

    try {
      // Get reminder statistics for logging
      const stats = await NotificationService.getReminderStats();
      console.log("📊 Reminder Stats:", {
        totalInactive: stats.totalInactive,
        candidatesFound: stats.candidatesFound,
        breakdown: stats.breakdown,
      });

      // Find users who need reminders
      const candidates = await NotificationService.findReminderCandidates();

      if (candidates.length === 0) {
        console.log("✅ No users found requiring reminders");
        return {
          success: true,
          stats: {
            candidatesFound: 0,
            emailsSent: 0,
            emailsFailed: 0,
          },
          errors: [],
          executionTime: Date.now() - startTime,
        };
      }

      console.log(`📧 Sending reminders to ${candidates.length} users`);

      // Prepare email data
      const reminderEmails = candidates.map(candidate => ({
        email: candidate.email,
        firstName: candidate.firstName || undefined,
        reminderType: candidate.reminderType,
        daysSinceActivity: candidate.daysSinceActivity,
      }));

      // Send emails with retry logic
      const emailResults = await EmailNotifier.sendReminderEmails(reminderEmails, maxRetries);

      // Update lastReminderSent for successfully sent emails
      const successfulEmails = reminderEmails.slice(0, emailResults.success);
      await this.updateReminderSentTimestamps(successfulEmails.map(email =>
        candidates.find(c => c.email === email.email)!.id
      ));

      const executionTime = Date.now() - startTime;

      console.log("✅ User reminder job completed:", {
        candidatesFound: candidates.length,
        emailsSent: emailResults.success,
        emailsFailed: emailResults.failed,
        executionTimeMs: executionTime,
      });

      return {
        success: true,
        stats: {
          candidatesFound: candidates.length,
          emailsSent: emailResults.success,
          emailsFailed: emailResults.failed,
        },
        errors: emailResults.errors,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("❌ User reminder job failed:", error);

      return {
        success: false,
        stats: {
          candidatesFound: 0,
          emailsSent: 0,
          emailsFailed: 0,
        },
        errors: [{ email: "system", error: error instanceof Error ? error.message : "Unknown error" }],
        executionTime,
      };
    }
  }

  /**
   * Update lastReminderSent timestamp for users who received reminders
   */
  private static async updateReminderSentTimestamps(userIds: string[]): Promise<void> {
    try {
      const updatePromises = userIds.map(userId =>
        UserService.updateReminderSent(userId)
      );

      await Promise.all(updatePromises);
      console.log(`✅ Updated reminder timestamps for ${userIds.length} users`);
    } catch (error) {
      console.error("❌ Failed to update reminder timestamps:", error);
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  public static async triggerManual(): Promise<JobResult> {
    console.log("🔧 Manual trigger of user reminder job");
    return this.checkInactiveUsers();
  }

  /**
   * Get job health status
   */
  public static async getHealthStatus(): Promise<{
    isHealthy: boolean;
    lastRun?: Date;
    nextRun?: string;
  }> {
    try {
      await NotificationService.getReminderStats();

      return {
        isHealthy: true,
        lastRun: new Date(),
        nextRun: "Based on CRON schedule",
      };
    } catch (error) {
      return {
        isHealthy: false,
      };
    }
  }
}

export default UserReminderJob; 