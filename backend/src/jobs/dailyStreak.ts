import { StreakService } from '../services/streak.service';
import prisma from "@prisma/client";


export class DailyStreakJob {
  static async run() {
    await StreakService.checkStreakBreaks();
    await this.resetDailyXP();
  }

  private static async resetDailyXP() {
    await prisma.user.updateMany({
      data: { dailyXP: 0 }
    });
  }
}