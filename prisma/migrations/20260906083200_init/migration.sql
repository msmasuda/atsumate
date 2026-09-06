-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNING', 'CONFIRMED', 'IN_PROGRESS', 'SETTLING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ATTENDING', 'UNDECIDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "VoteStatus" AS ENUM ('ATTENDING', 'CONDITIONAL', 'DECLINED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('UNPAID', 'REPORTED_PAID', 'CONFIRMED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "oidcSubject" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "inviteTokenHash" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNING',
    "eventDate" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDateOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "isDecided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "guestTokenHash" TEXT NOT NULL,
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'UNDECIDED',
    "isKeyPerson" BOOLEAN NOT NULL DEFAULT false,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "dietaryRequirements" TEXT,
    "splitWeightBasis" INTEGER NOT NULL DEFAULT 1000,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateVote" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "VoteStatus" NOT NULL,
    "conditionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DateVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedById" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "allocatedAmount" INTEGER NOT NULL,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementRun" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "SettlementRunStatus" NOT NULL DEFAULT 'DRAFT',
    "calculationPolicy" JSONB NOT NULL,
    "totalExpense" INTEGER NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "settlementRunId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'UNPAID',
    "reportedPaidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_oidcSubject_key" ON "User"("oidcSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_publicSlug_key" ON "Event"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_inviteTokenHash_key" ON "Event"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "Event_organizerId_status_idx" ON "Event"("organizerId", "status");

-- CreateIndex
CREATE INDEX "EventDateOption_eventId_isDecided_idx" ON "EventDateOption"("eventId", "isDecided");

-- CreateIndex
CREATE UNIQUE INDEX "EventDateOption_eventId_startAt_key" ON "EventDateOption"("eventId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_guestTokenHash_key" ON "Participant"("guestTokenHash");

-- CreateIndex
CREATE INDEX "Participant_eventId_attendance_idx" ON "Participant"("eventId", "attendance");

-- CreateIndex
CREATE INDEX "DateVote_participantId_idx" ON "DateVote"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DateVote_optionId_participantId_key" ON "DateVote"("optionId", "participantId");

-- CreateIndex
CREATE INDEX "Expense_eventId_status_idx" ON "Expense"("eventId", "status");

-- CreateIndex
CREATE INDEX "ExpenseSplit_participantId_idx" ON "ExpenseSplit"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_participantId_key" ON "ExpenseSplit"("expenseId", "participantId");

-- CreateIndex
CREATE INDEX "SettlementRun_eventId_status_idx" ON "SettlementRun"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRun_eventId_version_key" ON "SettlementRun"("eventId", "version");

-- CreateIndex
CREATE INDEX "Settlement_settlementRunId_status_idx" ON "Settlement"("settlementRunId", "status");

-- CreateIndex
CREATE INDEX "Settlement_fromId_idx" ON "Settlement"("fromId");

-- CreateIndex
CREATE INDEX "Settlement_toId_idx" ON "Settlement"("toId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDateOption" ADD CONSTRAINT "EventDateOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "EventDateOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRun" ADD CONSTRAINT "SettlementRun_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_settlementRunId_fkey" FOREIGN KEY ("settlementRunId") REFERENCES "SettlementRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
