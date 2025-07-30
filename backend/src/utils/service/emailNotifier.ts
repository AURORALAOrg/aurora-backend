import ZohoMailer from "./nodeMailer";

interface ReminderEmailData {
  email: string;
  firstName?: string;
  reminderType: '7-day' | '14-day' | '30-day' | '60-day';
  daysSinceActivity: number;
}

class EmailNotifier {
  public static async sendAccountActivationEmail(email: string, link: string) {
    const message = `Welcome to AURORA. Click on this to activate your account: ${link}`;
    const subject = "Activate your account";

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  private static getReminderEmailContent(data: ReminderEmailData): { subject: string; message: string } {
    const { firstName, reminderType, daysSinceActivity } = data;
    const name = firstName ? firstName : "there";

    switch (reminderType) {
      case '7-day':
        return {
          subject: "We miss you! Come back to AURORA",
          message: `Hi ${name},

We noticed you haven't been active on AURORA for ${daysSinceActivity} days. We miss you!

Log back in and continue your progress: ${process.env.AURORA_WEB_APP_BASE_URL}

Keep learning!
The AURORA Team`
        };

      case '14-day':
        return {
          subject: "Don't lose your progress - Continue your journey",
          message: `Hi ${name},

It's been ${daysSinceActivity} days since we last saw you on AURORA. We hope you're doing well!

Pick up where you left off: ${process.env.AURORA_WEB_APP_BASE_URL}

We believe in your potential!
The AURORA Team`
        };

      case '30-day':
        return {
          subject: "Special learning resources waiting for you",
          message: `Hi ${name},

We haven't seen you on AURORA for ${daysSinceActivity} days, and we want to help you get back on track!

Your skills are waiting to be unlocked: ${process.env.AURORA_WEB_APP_BASE_URL}

Let's restart your journey together!
The AURORA Team`
        };

      case '60-day':
        return {
          subject: "Your journey awaits - Final reminder",
          message: `Hi ${name},

It's been ${daysSinceActivity} days since you last visited AURORA. We truly miss having you as part of our learning community.

This is our final reminder, but we want you to know that your account and progress are still here waiting for you. 


Give AURORA one more try: ${process.env.AURORA_WEB_APP_BASE_URL}


Wishing you success in all your endeavors,
The AURORA Team`
        };

      default:
        throw new Error(`Unknown reminder type: ${reminderType}`);
    }
  }

  public static async sendReminderEmail(data: ReminderEmailData) {
    try {
      const { subject, message } = this.getReminderEmailContent(data);
      const mailer = new ZohoMailer();

      await mailer.sendTextEmail(data.email, subject, message);
      console.log(`📨 ${data.reminderType} reminder sent to ${data.email}`);
    } catch (error) {
      console.error(`❌ Failed to send ${data.reminderType} reminder to ${data.email}:`, error);
      throw error;
    }
  }

  public static async sendReminderEmails(reminders: ReminderEmailData[], maxRetries: number = 2, retryIntervalHours: number = 24) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>
    };

    for (const reminder of reminders) {
      let attempts = 0;
      let success = false;

      while (attempts <= maxRetries && !success) {
        try {
          if (attempts > 0) {
            console.log(`🔄 Retry attempt ${attempts} for ${reminder.email}`);
            // In a real scenario, you'd want to implement actual delay
            // For now, we'll just log the retry attempt
          }

          await this.sendReminderEmail(reminder);
          results.success++;
          success = true;
        } catch (error) {
          attempts++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (attempts > maxRetries) {
            results.failed++;
            results.errors.push({
              email: reminder.email,
              error: errorMessage
            });
            console.error(`❌ Failed to send reminder to ${reminder.email} after ${maxRetries} retries`);
          }
        }
      }
    }

    return results;
  }
}

export default EmailNotifier;