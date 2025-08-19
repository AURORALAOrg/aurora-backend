import "dotenv/config";


import app from "./app";
import settings from "./core/config/settings";
import { connectDB } from "./db";
import { prisma } from "./lib/prisma";



const server = app;
const port = settings.serverPort || 8000;



async function start() {
  try {
    await connectDB();

    // Gate scheduling in dev/test and avoid duplicates across processes
    if (process.env.ENABLE_JOBS !== 'false') {
      await import('./jobs/dailystreak.job');
    }

    const port = Number(settings.serverPort || process.env.PORT || 8000);
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();

// Centralize graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});