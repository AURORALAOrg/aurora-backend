import UserService from "./user.service";

interface InactiveUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  lastActivityAt: Date | null;
  lastReminderSent: Date | null;
  createdAt: Date;
}

interface ReminderCandidate extends InactiveUser {
  daysSinceActivity: number;
  daysSinceLastReminder: number;
  reminderType: '7-day' | '14-day' | '30-day' | '60-day';
}

class NotificationService {
  /**
   * Calculate days between two dates
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get the last activity date (lastActivityAt or createdAt if never active)
   */
  private static getLastActivityDate(user: InactiveUser): Date {
    return user.lastActivityAt || user.createdAt;
  }

  /**
   * Determine which reminder type should be sent based on inactivity period
   */
  private static determineReminderType(daysSinceActivity: number): '7-day' | '14-day' | '30-day' | '60-day' | null {
    if (daysSinceActivity >= 60) return '60-day';
    if (daysSinceActivity >= 30) return '30-day';
    if (daysSinceActivity >= 14) return '14-day';
    if (daysSinceActivity >= 7) return '7-day';
    return null;
  }

  /**
   * Check if enough time has passed since last reminder to send a new one
   */
  private static shouldSendReminder(daysSinceLastReminder: number, reminderType: string): boolean {
    // Minimum days between reminders based on type
    const minimumIntervals = {
      '7-day': 7,
      '14-day': 7,
      '30-day': 14,
      '60-day': 30,
    };

    const minimumInterval = minimumIntervals[reminderType as keyof typeof minimumIntervals] || 7;
    return daysSinceLastReminder >= minimumInterval;
  }

  /**
   * Find users who are candidates for receiving reminders
   */
  public static async findReminderCandidates(): Promise<ReminderCandidate[]> {
    try {
      // Get users inactive for at least 7 days
      const inactiveUsers = await UserService.findInactiveUsers(7);
      const candidates: ReminderCandidate[] = [];
      const now = new Date();

      for (const user of inactiveUsers) {
        const lastActivityDate = this.getLastActivityDate(user);
        const daysSinceActivity = this.daysBetween(lastActivityDate, now);
        const daysSinceLastReminder = user.lastReminderSent
          ? this.daysBetween(user.lastReminderSent, now)
          : Infinity;

        const reminderType = this.determineReminderType(daysSinceActivity);

        if (reminderType && this.shouldSendReminder(daysSinceLastReminder, reminderType)) {
          candidates.push({
            ...user,
            daysSinceActivity,
            daysSinceLastReminder,
            reminderType,
          });
        }
      }

      return candidates;
    } catch (error) {
      console.error("Failed to find reminder candidates:", error);
      throw error;
    }
  }

  /**
   * Get reminder statistics for logging
   */
  public static async getReminderStats(): Promise<{
    totalInactive: number;
    candidatesFound: number;
    breakdown: Record<string, number>;
  }> {
    try {
      const inactiveUsers = await UserService.findInactiveUsers(7);
      const candidates = await this.findReminderCandidates();

      const breakdown = candidates.reduce((acc, candidate) => {
        acc[candidate.reminderType] = (acc[candidate.reminderType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalInactive: inactiveUsers.length,
        candidatesFound: candidates.length,
        breakdown,
      };
    } catch (error) {
      console.error("Failed to get reminder stats:", error);
      throw error;
    }
  }
}

export default NotificationService; 