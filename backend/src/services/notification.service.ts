import { PrismaClient, Status } from "@prisma/client";
import EmailNotifier from "../utils/service/emailNotifier";

const prisma = new PrismaClient();

export interface InactiveUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;
  lastActivityAt: Date | null;
  daysSinceLastActivity: number;
}

export interface ReminderHistory {
  userId: string;
  reminderType: string;
  sentAt: Date;
}

class NotificationService {
  private static reminderHistory: Map<string, ReminderHistory[]> = new Map();

  public static async getInactiveUsers(
    daysSince: number
  ): Promise<InactiveUser[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSince);

    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        isEmailVerified: true,
        OR: [
          {
            lastActivityAt: {
              lt: cutoffDate,
            },
          },
          {
            lastActivityAt: null,
            lastLoginAt: {
              lt: cutoffDate,
            },
          },
          {
            lastActivityAt: null,
            lastLoginAt: null,
            createdAt: {
              lt: cutoffDate,
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        lastActivityAt: true,
        createdAt: true,
      },
    });

   
    return users.map((user: any) => {
      const lastActivity =
        user.lastActivityAt || user.lastLoginAt || user.createdAt;
      const daysSinceLastActivity = Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
    
      return {
        ...user,
        daysSinceLastActivity,
      };
    });
  }

  /**
   * Check if user has already received a specific reminder type
   */
  public static hasReceivedReminder(
    userId: string,
    reminderType: string
  ): boolean {
    const userHistory = this.reminderHistory.get(userId) || [];
    return userHistory.some((history) => history.reminderType === reminderType);
  }

  /**
   * Record that a reminder was sent
   */
  public static recordReminderSent(userId: string, reminderType: string): void {
    const userHistory = this.reminderHistory.get(userId) || [];
    userHistory.push({
      userId,
      reminderType,
      sentAt: new Date(),
    });
    this.reminderHistory.set(userId, userHistory);
  }

  /**
   * Send reminder email based on inactivity period
   */
  public static async sendReminderEmail(
    user: InactiveUser,
    reminderType: string
  ): Promise<boolean> {
    try {
      // Check if reminder already sent
      if (this.hasReceivedReminder(user.id, reminderType)) {
        console.log(
          `Reminder ${reminderType} already sent to user ${user.email}`
        );
        return false;
      }

      const userName = user.firstName || user.email.split("@")[0];

      switch (reminderType) {
        case "7-day":
          await EmailNotifier.sendGentleReminderEmail(user.email, userName);
          break;
        case "14-day":
          await EmailNotifier.sendReEngagementEmail(user.email, userName);
          break;
        case "30-day":
          await EmailNotifier.sendSpecialOfferEmail(user.email, userName);
          break;
        case "60-day":
          await EmailNotifier.sendFinalReminderEmail(user.email, userName);
          break;
        default:
          console.warn(`Unknown reminder type: ${reminderType}`);
          return false;
      }

      // Record that reminder was sent
      this.recordReminderSent(user.id, reminderType);
      console.log(`✅ Sent ${reminderType} reminder to ${user.email}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send ${reminderType} reminder to ${user.email}:`,
        error
      );
      return false;
    }
  }

  /**
   * Process reminders for all inactive users
   */
  public static async processInactiveUserReminders(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };

    try {
      // Get users for different inactivity periods
      const reminderConfigs = [
        { days: 7, type: "7-day" },
        { days: 14, type: "14-day" },
        { days: 30, type: "30-day" },
        { days: 60, type: "60-day" },
      ];

      for (const config of reminderConfigs) {
        const inactiveUsers = await this.getInactiveUsers(config.days);

        // Filter users who match exactly this inactivity period (not longer)
        const targetUsers = inactiveUsers.filter((user) => {
          const days = user.daysSinceLastActivity;
          return days >= config.days && days < config.days + 7; // 7-day window
        });

        console.log(
          `Found ${targetUsers.length} users for ${config.type} reminder`
        );

        for (const user of targetUsers) {
          results.processed++;
          const success = await this.sendReminderEmail(user, config.type);
          if (success) {
            results.sent++;
          } else {
            results.failed++;
          }

          // Add delay between emails to avoid overwhelming the email service
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `📊 Reminder job completed: ${results.sent} sent, ${results.failed} failed, ${results.processed} processed`
      );
      return results;
    } catch (error) {
      console.error("❌ Error processing inactive user reminders:", error);
      throw error;
    }
  }
}

export default NotificationService;
