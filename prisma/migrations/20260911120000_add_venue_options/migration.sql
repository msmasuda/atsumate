CREATE TABLE "VenueOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "courseTitle" TEXT,
    "pricePerPerson" INTEGER,
    "features" TEXT,
    "recommendation" TEXT,
    "isDecided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueVote" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueOption_eventId_isDecided_idx" ON "VenueOption"("eventId", "isDecided");
CREATE UNIQUE INDEX "VenueVote_venueId_participantId_key" ON "VenueVote"("venueId", "participantId");
CREATE INDEX "VenueVote_participantId_idx" ON "VenueVote"("participantId");

ALTER TABLE "VenueOption" ADD CONSTRAINT "VenueOption_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueVote" ADD CONSTRAINT "VenueVote_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "VenueOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueVote" ADD CONSTRAINT "VenueVote_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
