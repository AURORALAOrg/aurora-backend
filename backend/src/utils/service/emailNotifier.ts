import ZohoMailer from "./nodeMailer";

class EmailNotifier {
  public static async sendAccountActivationEmail(email: string, link: string) {
    const message = `Welcome to AURORA. Click on this to activate your account: ${link}`;
    const subject = "Activate your account";

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  /**
   * Send 7-day gentle reminder
   */
  public static async sendGentleReminderEmail(email: string, userName: string) {
    const subject = "We miss you! Come back and practice your English skills";
    const message = `Hi ${userName},\n\nWe noticed you haven't been active on AURORA for a week. Your English learning journey is important to us!\n\nCome back and continue improving your language skills with our interactive exercises and games.\n\nStart practicing: ${process.env.AURORA_WEB_APP_BASE_URL}\n\nBest regards,\nThe AURORA Team`;

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  /**
   * Send 14-day re-engagement reminder
   */
  public static async sendReEngagementEmail(email: string, userName: string) {
    const subject = "Don't let your English skills get rusty!";
    const message = `Hello ${userName},\n\nIt's been two weeks since your last visit to AURORA. Consistent practice is key to language mastery!\n\nWe have new exercises and challenges waiting for you. Just 10 minutes a day can make a huge difference in your English proficiency.\n\nResume your learning: ${process.env.AURORA_WEB_APP_BASE_URL}\n\nKeep learning,\nThe AURORA Team`;

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  /**
   * Send 30-day special offer reminder
   */
  public static async sendSpecialOfferEmail(email: string, userName: string) {
    const subject = "Special learning resources waiting for you";
    const message = `Dear ${userName},\n\nWe've missed you on AURORA! It's been a month since your last session.\n\nTo welcome you back, we've prepared special learning resources and new content just for you. Don't let your progress slip away!\n\nExplore new content: ${process.env.AURORA_WEB_APP_BASE_URL}\n\nYour learning journey matters to us.\n\nWarm regards,\nThe AURORA Team`;

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  /**
   * Send 60-day final reminder
   */
  public static async sendFinalReminderEmail(email: string, userName: string) {
    const subject = "Don't lose your progress - continue your English journey";
    const message = `Hi ${userName},\n\nIt's been two months since we last saw you on AURORA. We understand life gets busy, but we don't want you to lose the progress you've made!\n\nYour account and learning history are still here, waiting for you to continue where you left off.\n\nContinue your journey: ${process.env.AURORA_WEB_APP_BASE_URL}\n\nWe believe in your potential!\n\nThe AURORA Team`;

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }
}

export default EmailNotifier;
