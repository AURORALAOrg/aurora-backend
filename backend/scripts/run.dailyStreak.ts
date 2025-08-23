import "dotenv/config";
import { DailyStreakJob } from "../src/jobs/dailystreak.job";

(async () => {
  const dry = process.argv.includes("--dry");
  const arg = process.argv.find(a => a.startsWith("--date="));
  const now = arg ? new Date(arg.split("=")[1]) : new Date();
  const result = await DailyStreakJob.runOnce({ now, dryRun: dry });
  console.log(result);
})();
