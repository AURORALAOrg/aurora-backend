-- Add activity tracking fields to User table
ALTER TABLE "User" 
  ADD COLUMN "lastLoginAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Performance index for inactivity look-ups
CREATE INDEX "user_lastActivityAt_idx" ON "User"("lastActivityAt");
CREATE INDEX "user_lastLoginAt_idx" ON "User"("lastLoginAt");

-- Create ReminderHistory table
CREATE TABLE "reminder_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_history_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "reminder_history_userId_idx" ON "reminder_history"("userId");
CREATE UNIQUE INDEX "reminder_history_userId_reminderType_key" ON "reminder_history"("userId", "reminderType");

-- Add foreign key constraint
ALTER TABLE "reminder_history" ADD CONSTRAINT "reminder_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;