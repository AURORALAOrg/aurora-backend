import { schedule } from "node-cron";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import EmailNotifier from "../utils/service/emailNotifier";

const HOURS = (n: number) => n * 60 * 60 * 1000;

export class DailyStreakJob {
  static async resetDailyCounters(): Promise<number> {
    const res = await prisma.user.updateMany({ data: { dailyXP: 0 } });
    return res.count; // how many rows were updated
  }

  static async resetBrokenStreaks(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - HOURS(26));
    const batchSize = 1000;
    let cursor: string | null = null;
    let total = 0;

    for (;;) {
      const users: Array<Pick<User, "id">> = await prisma.user.findMany({
        where: { lastActivityAt: { lt: cutoff }, currentStreak: { gt: 0 } },
        select: { id: true },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      });
      if (users.length === 0) break;

      await prisma.$transaction(
        users.map(({ id }) =>
          prisma.user.update({ where: { id }, data: { currentStreak: 0 } })
        )
      );

      total += users.length;
      cursor = users[users.length - 1].id;
    }
    return total;
  }

  static async sendMotivationEmails(now: Date): Promise<{ sent: number; failed: number; total: number }> {
    const inactiveSince = new Date(now.getTime() - HOURS(24));
    const users: Array<Pick<User, "id" | "email" | "firstName">> = await prisma.user.findMany({
      where: { lastActivityAt: { lt: inactiveSince }, isEmailVerified: true },
      select: { id: true, email: true, firstName: true },
    });

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      if (!u.email || !u.firstName) continue;
      try {
        await EmailNotifier.sendMotivationalEmail(u.email, undefined, u.firstName);
        sent++;
      } catch (e) {
        failed++;
        console.error("Motivational email failed", { userId: u.id, error: e });
      }
    }
    return { sent, failed, total: users.length };
  }

  static async runOnce(opts: { now?: Date; dryRun?: boolean } = {}) {
    const now = opts.now ?? new Date();
    const dry = !!opts.dryRun;

    const dailyCount = dry
      ? await prisma.user.count({ where: {} })
      : await this.resetDailyCounters();

    const streakWhere = { lastActivityAt: { lt: new Date(now.getTime() - HOURS(26)) }, currentStreak: { gt: 0 } };
    const brokeCount = dry
      ? await prisma.user.count({ where: streakWhere })
      : await this.resetBrokenStreaks(now);

    // motivational emails
    const emailWhere = { lastActivityAt: { lt: new Date(now.getTime() - HOURS(24)) }, isEmailVerified: true };
    const emailTotal = await prisma.user.count({ where: emailWhere });
    const emailResult = dry ? { sent: 0, failed: 0, total: emailTotal } : await this.sendMotivationEmails(now);

    return {
      now: now.toISOString(),
      dryRun: dry,
      resetDailyXP: dailyCount,
      resetBrokenStreaks: dry ? brokeCount : brokeCount,
      emails: dry ? { sent: 0, failed: 0, total: emailTotal } : emailResult,
    };
  }
}

schedule(
  process.env.DAILY_STREAK_CRON ?? "5 0 * * *",
  async () => {
    console.log("Starting daily CRON job");
    try {
      await DailyStreakJob.runOnce({ now: new Date(), dryRun: false });
    } catch (error: unknown) {
      console.error("CRON job error:", error);
    }
  },
  { timezone: process.env.CRON_TZ ?? "UTC" }
);

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
