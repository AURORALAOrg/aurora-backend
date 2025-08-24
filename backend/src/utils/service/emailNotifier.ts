import ZohoMailer from "./nodeMailer";

class EmailNotifier {
  public static async sendAccountActivationEmail(email: string, link: string) {
    const message = `Welcome to AURORA. Click on this to activate your account: ${link}`;
    const subject = "Activate your account";

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  public static async sendMotivationalEmail(email: string, firstName?: string, message?: string) {
    const defaultMessage =
      `Hi ${firstName ?? "there"}, we noticed you missed a day of learning. ` +
      `Your streak is waiting for you! Answer a question today to get back on track and earn more XP.`;
    const body = message ?? defaultMessage;
    const subject = "Start Learning Now";

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, body);
  }
}

export default EmailNotifier;