import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import serverSettings from "../../core/config/settings";

class ZohoMailer {
  private transporter: Transporter;
  private fromAddress: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,   // 10 seconds
      socketTimeout: 10000,     // 10 seconds
      auth: {
        user: serverSettings.email.username,
        pass: serverSettings.email.password,
      },
    });
    this.fromAddress = serverSettings.email.fromAddress;

    this.initializeTransport();
  }

  private async initializeTransport() {
    try {
      await this.transporter.verify();
      console.log("✅ Connected to email server");
    } catch (error) {
      console.warn("❌ Unable to connect to email server:", error);
    }
  }

  public async sendTextEmail(email: string, subject: string, text: string) {
    try {
      const mailOptions = {
        from: this.fromAddress,
        to: email,
        subject: subject,
        text: text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📨 Text email sent to ${email}:, info.messageId`);
      return info;
    } catch (error) {
      console.error(`❌ Failed to send text email to ${email}:, error`);
      throw error;
    }
  }

  public async sendHtmlEmail(email: string, subject: string, html: string) {
    try {
      const mailOptions = {
        from: this.fromAddress,
        to: email,
        subject: subject,
        html: html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 HTML email sent to ${email}:, info.messageId`);
      return info;
    } catch (error) {
      console.error(`❌ Failed to send HTML email to ${email}:, error`);
      throw error;
    }
  }
}

export default ZohoMailer;
