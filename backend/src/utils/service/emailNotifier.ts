import ZohoMailer from "./nodeMailer";

class EmailNotifier {
  public static async sendAccountActivationEmail(email: string, link: string) {
    const message = `Welcome to AURORA. Click on this to activate your account: ${link}`;
    const subject = "Activate your account";

    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  public static async sendMotivationalEmail(email: string, message: string) {
    const defaultMessage = "Keep up the great work! Stay motivated and continue to achieve your goals.";
    message = message || defaultMessage;
    const subject = "Keep up the great work!";
    
    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }
}

export default EmailNotifier;