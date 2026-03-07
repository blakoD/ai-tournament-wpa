/// <reference types="node" />

import { randomUUID } from "crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async (): Promise<void> => {
  const tournamentId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany();
    await tx.participant.deleteMany();
    await tx.tournament.deleteMany();

    await tx.tournament.create({
      data: {
        id: tournamentId,
        name: "Demo Cup",
        title: "2026 Demo Championship",
        urlSlug: "demo-cup-2026",
        description: "Seeded sample tournament data for API development.",
        participantCount: 4,
        qualifiesByGroup: 2,
        eliminationType: "SINGLE_ELIMINATION",
        status: "STARTED",
        startedAt: new Date(),
        participants: {
          create: [
            {
              id: randomUUID(),
              name: "Player 1",
              groupName: "A"
            },
            {
              id: randomUUID(),
              name: "Player 2",
              groupName: "A"
            },
            {
              id: randomUUID(),
              name: "Player 3",
              groupName: "B"
            },
            {
              id: randomUUID(),
              name: "Player 4",
              groupName: "B"
            }
          ]
        },
        matches: {
          create: [
            {
              id: randomUUID(),
              stage: "RR",
              stageNumber: 1,
              round: 1,
              isCompleted: false,
              groupName: "A"
            },
            {
              id: randomUUID(),
              stage: "RR",
              stageNumber: 1,
              round: 1,
              isCompleted: false,
              groupName: "B"
            }
          ]
        }
      }
    });
  });

  console.log(`Seeded tournament id: ${tournamentId}`);
};

// main()
//   .catch((error) => {
//     console.log("Error seeding database:", error);
//     console.error(error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
