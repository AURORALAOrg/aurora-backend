import ZohoMailer from "./nodeMailer";


class EmailNotifier {
  public static async sendAccountActivationEmail(email: string, link: string) {
    const message = `Welcome to AURORA. Click on this to activate your account: ${link}`;
    const subject = "Activate your account";
    const mailer = new ZohoMailer();
    await mailer.sendTextEmail(email, subject, message);
  }

  // Helper to escape HTML special characters
  private static escapeHtml(str: string): string {
    return str.replace(/[&<>'"/]/g, function (c) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
        '/': '&#x2F;'
      } as any)[c] || c;
    });
  }

  // Helper to validate badgeUrl (basic check for http/https and no javascript:)
  private static isSafeUrl(url: string): boolean {
    return /^https?:\/\//.test(url) && !/^javascript:/i.test(url);
  }

  public static async sendAchievementEmail(
    email: string,
    achievementName: string,
    achievementDescription: string,
    badgeUrl: string,
    xpBonus: number
  ) {
    const safeName = this.escapeHtml(achievementName);
    const safeDesc = this.escapeHtml(achievementDescription);
    const safeBadgeUrl = this.isSafeUrl(badgeUrl) ? badgeUrl : '';
    const subject = `🎉 You've earned a new achievement: ${safeName}!`;
    const message = `
      <div style="font-family:Arial,sans-serif;">
        <h2>Congratulations!</h2>
        <p>You've earned the <b>"${safeName}"</b> badge.</p>
        <p>${safeDesc}</p>
        ${safeBadgeUrl ? `<img src="${safeBadgeUrl}" alt="Badge" style="height:64px;">` : ''}
        <p><b>Bonus XP:</b> +${xpBonus}</p>
        <p>Keep up the amazing progress!</p>
      </div>
    `;
    const mailer = new ZohoMailer();
    await mailer.sendHtmlEmail(email, subject, message);
  }
}

export default EmailNotifier;