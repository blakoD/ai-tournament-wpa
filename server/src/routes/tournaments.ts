import type { FastifyInstance } from "fastify";
import type { Match as DbMatch, Participant as DbParticipant } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../db.js";

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const matchParamsSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
});

const participantInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  group: z.string().default("A"),
  wins: z.number().int().default(0),
  matchesPlayed: z.number().int().default(0),
  pointsFor: z.number().int().default(0),
  pointsAgainst: z.number().int().default(0),
  rank: z.number().int().default(0),
  globalRank: z.number().int().nullable().optional(),
  manualRankAdjustment: z.number().int().default(0),
  isQualified: z.boolean().default(false),
  isDropped: z.boolean().default(false),
  originalId: z.string().uuid().nullable().optional(),
});

const matchInputSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(["RR", "SE"]),
  stageNumber: z.number().int().positive(),
  round: z.number().int().positive(),
  participantAId: z.string().uuid().nullable(),
  participantBId: z.string().uuid().nullable(),
  scoreA: z.number().int().nullable(),
  scoreB: z.number().int().nullable(),
  winnerId: z.string().uuid().nullable(),
  isCompleted: z.boolean(),
  group: z.string().optional(),
  nextMatchId: z.string().uuid().optional(),
  nextMatchSlot: z.enum(["A", "B"]).optional(),
  label: z.string().optional(),
  isFinal: z.boolean().optional(),
});

const tournamentWriteSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  urlSlug: z.string().min(1),
  description: z.string().default(""),
  participantCount: z.number().int().min(2),
  qualifiesByGroup: z.number().int().min(1),
  eliminationType: z.enum(["SINGLE_ELIMINATION", "ROUND_ROBIN_2"]),
  status: z.enum(["SETUP", "STARTED", "COMPLETED"]).default("SETUP"),
  createdAt: z.number().int().positive().optional(),
  startedAt: z.number().int().positive().nullable().optional(),
  completedAt: z.number().int().positive().nullable().optional(),
  participants: z.array(participantInputSchema).default([]),
  matches: z.array(matchInputSchema).default([]),
});

const startTournamentBodySchema = z.object({
  participants: z.array(participantInputSchema),
  matches: z.array(matchInputSchema),
  startedAt: z.number().int().positive().optional(),
});

const matchResultBodySchema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
});

const swapParticipantBodySchema = z.object({
  slot: z.enum(["A", "B"]),
  newParticipantId: z.string().uuid(),
});

type TournamentWithRelations = {
  id: string;
  name: string;
  title: string;
  urlSlug: string;
  description: string;
  participantCount: number;
  qualifiesByGroup: number;
  eliminationType: "SINGLE_ELIMINATION" | "ROUND_ROBIN_2";
  status: "SETUP" | "STARTED" | "COMPLETED";
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  participants: DbParticipant[];
  matches: DbMatch[];
};

const toOptionalDate = (timestamp: number | undefined): Date | undefined => {
  if (timestamp === undefined) {
    return undefined;
  }
  return new Date(timestamp);
};

const toNullableDate = (timestamp: number | null | undefined): Date | null | undefined => {
  if (timestamp === undefined) {
    return undefined;
  }
  if (timestamp === null) {
    return null;
  }
  return new Date(timestamp);
};

const mapTournament = (tournament: TournamentWithRelations) => ({
  id: tournament.id,
  name: tournament.name,
  title: tournament.title,
  urlSlug: tournament.urlSlug,
  description: tournament.description,
  participantCount: tournament.participantCount,
  qualifiesByGroup: tournament.qualifiesByGroup,
  eliminationType: tournament.eliminationType,
  status: tournament.status,
  createdAt: tournament.createdAt.getTime(),
  startedAt: tournament.startedAt?.getTime(),
  completedAt: tournament.completedAt?.getTime(),
  participants: tournament.participants.map((participant: DbParticipant) => ({
    id: participant.id,
    name: participant.name,
    group: participant.groupName,
    wins: participant.wins,
    matchesPlayed: participant.matchesPlayed,
    pointsFor: participant.pointsFor,
    pointsAgainst: participant.pointsAgainst,
    rank: participant.rank,
    globalRank: participant.globalRank ?? undefined,
    manualRankAdjustment: participant.manualRankAdjustment,
    isQualified: participant.isQualified,
    isDropped: participant.isDropped,
    originalId: participant.originalId ?? undefined,
  })),
  matches: tournament.matches.map((match: DbMatch) => ({
    id: match.id,
    tournamentId: match.tournamentId,
    stage: match.stage,
    stageNumber: match.stageNumber,
    round: match.round,
    participantAId: match.participantAId,
    participantBId: match.participantBId,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winnerId: match.winnerId,
    isCompleted: match.isCompleted,
    group: match.groupName ?? undefined,
    nextMatchId: match.nextMatchId ?? undefined,
    nextMatchSlot: (match.nextMatchSlot as "A" | "B" | null) ?? undefined,
    label: match.label ?? undefined,
    isFinal: match.isFinal ?? undefined,
  })),
});

const getTournamentWithRelations = async (id: string): Promise<TournamentWithRelations | null> => {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: [{ groupName: "asc" }, { name: "asc" }],
      },
      matches: {
        orderBy: [{ stageNumber: "asc" }, { round: "asc" }],
      },
    },
  });

  return tournament as TournamentWithRelations | null;
};

export const registerTournamentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/tournaments", async () => {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
    });

    return tournaments.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      title: tournament.title,
      urlSlug: tournament.urlSlug,
      description: tournament.description,
      participantCount: tournament.participantCount,
      qualifiesByGroup: tournament.qualifiesByGroup,
      eliminationType: tournament.eliminationType,
      status: tournament.status,
      createdAt: tournament.createdAt.getTime(),
      startedAt: tournament.startedAt?.getTime(),
      completedAt: tournament.completedAt?.getTime(),
    }));
  });

  app.post("/api/tournaments", async (request, reply) => {
    const parsedBody = tournamentWriteSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid tournament payload" });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const tournament = await tx.tournament.create({
          data: {
            name: parsedBody.data.name,
            title: parsedBody.data.title,
            urlSlug: parsedBody.data.urlSlug,
            description: parsedBody.data.description,
            participantCount: parsedBody.data.participantCount,
            qualifiesByGroup: parsedBody.data.qualifiesByGroup,
            eliminationType: parsedBody.data.eliminationType,
            status: parsedBody.data.status,
            createdAt: toOptionalDate(parsedBody.data.createdAt),
            startedAt: toNullableDate(parsedBody.data.startedAt),
            completedAt: toNullableDate(parsedBody.data.completedAt),
          },
        });

        if (parsedBody.data.participants.length > 0) {
          await tx.participant.createMany({
            data: parsedBody.data.participants.map((participant) => ({
              id: participant.id,
              tournamentId: tournament.id,
              name: participant.name,
              groupName: participant.group,
              wins: participant.wins,
              matchesPlayed: participant.matchesPlayed,
              pointsFor: participant.pointsFor,
              pointsAgainst: participant.pointsAgainst,
              rank: participant.rank,
              globalRank: participant.globalRank ?? null,
              manualRankAdjustment: participant.manualRankAdjustment,
              isQualified: participant.isQualified,
              isDropped: participant.isDropped,
              originalId: participant.originalId ?? null,
            })),
          });
        }

        if (parsedBody.data.matches.length > 0) {
          await tx.match.createMany({
            data: parsedBody.data.matches.map((match) => ({
              id: match.id,
              tournamentId: tournament.id,
              stage: match.stage,
              stageNumber: match.stageNumber,
              round: match.round,
              participantAId: match.participantAId,
              participantBId: match.participantBId,
              scoreA: match.scoreA,
              scoreB: match.scoreB,
              winnerId: match.winnerId,
              isCompleted: match.isCompleted,
              groupName: match.group,
              nextMatchId: match.nextMatchId,
              nextMatchSlot: match.nextMatchSlot,
              label: match.label,
              isFinal: match.isFinal,
            })),
          });
        }

        return tournament;
      });

      const tournament = await getTournamentWithRelations(created.id);
      if (!tournament) {
        return reply.code(500).send({ error: "Created tournament could not be loaded" });
      }

      return reply.code(201).send(mapTournament(tournament));
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2002") {
        return reply.code(409).send({ error: "Tournament slug already exists" });
      }
      throw error;
    }
  });

  app.get("/api/tournaments/:id", async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const tournament = await getTournamentWithRelations(parsedParams.data.id);

    if (!tournament) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    return mapTournament(tournament);
  });

  app.put("/api/tournaments/:id", async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const parsedBody = tournamentWriteSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid tournament payload" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id: parsedParams.data.id },
          data: {
            name: parsedBody.data.name,
            title: parsedBody.data.title,
            urlSlug: parsedBody.data.urlSlug,
            description: parsedBody.data.description,
            participantCount: parsedBody.data.participantCount,
            qualifiesByGroup: parsedBody.data.qualifiesByGroup,
            eliminationType: parsedBody.data.eliminationType,
            status: parsedBody.data.status,
            createdAt: toOptionalDate(parsedBody.data.createdAt),
            startedAt: toNullableDate(parsedBody.data.startedAt),
            completedAt: toNullableDate(parsedBody.data.completedAt),
          },
        });

        await tx.match.deleteMany({ where: { tournamentId: parsedParams.data.id } });
        await tx.participant.deleteMany({ where: { tournamentId: parsedParams.data.id } });

        if (parsedBody.data.participants.length > 0) {
          await tx.participant.createMany({
            data: parsedBody.data.participants.map((participant) => ({
              id: participant.id,
              tournamentId: parsedParams.data.id,
              name: participant.name,
              groupName: participant.group,
              wins: participant.wins,
              matchesPlayed: participant.matchesPlayed,
              pointsFor: participant.pointsFor,
              pointsAgainst: participant.pointsAgainst,
              rank: participant.rank,
              globalRank: participant.globalRank ?? null,
              manualRankAdjustment: participant.manualRankAdjustment,
              isQualified: participant.isQualified,
              isDropped: participant.isDropped,
              originalId: participant.originalId ?? null,
            })),
          });
        }

        if (parsedBody.data.matches.length > 0) {
          await tx.match.createMany({
            data: parsedBody.data.matches.map((match) => ({
              id: match.id,
              tournamentId: parsedParams.data.id,
              stage: match.stage,
              stageNumber: match.stageNumber,
              round: match.round,
              participantAId: match.participantAId,
              participantBId: match.participantBId,
              scoreA: match.scoreA,
              scoreB: match.scoreB,
              winnerId: match.winnerId,
              isCompleted: match.isCompleted,
              groupName: match.group,
              nextMatchId: match.nextMatchId,
              nextMatchSlot: match.nextMatchSlot,
              label: match.label,
              isFinal: match.isFinal,
            })),
          });
        }
      });

      const tournament = await getTournamentWithRelations(parsedParams.data.id);
      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      return mapTournament(tournament);
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2025") {
        return reply.code(404).send({ error: "Tournament not found" });
      }
      if (prismaError.code === "P2002") {
        return reply.code(409).send({ error: "Tournament slug already exists" });
      }
      throw error;
    }
  });

  app.delete("/api/tournaments/:id", async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    try {
      await prisma.tournament.delete({ where: { id: parsedParams.data.id } });
      return reply.code(204).send();
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2025") {
        return reply.code(404).send({ error: "Tournament not found" });
      }
      throw error;
    }
  });

  app.post("/api/tournaments/:id/start", async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const parsedBody = startTournamentBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid start payload" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id: parsedParams.data.id },
          data: {
            status: "STARTED",
            startedAt: toOptionalDate(parsedBody.data.startedAt) ?? new Date(),
            completedAt: null,
          },
        });

        await tx.match.deleteMany({ where: { tournamentId: parsedParams.data.id } });
        await tx.participant.deleteMany({ where: { tournamentId: parsedParams.data.id } });

        await tx.participant.createMany({
          data: parsedBody.data.participants.map((participant) => ({
            id: participant.id,
            tournamentId: parsedParams.data.id,
            name: participant.name,
            groupName: participant.group,
            wins: participant.wins,
            matchesPlayed: participant.matchesPlayed,
            pointsFor: participant.pointsFor,
            pointsAgainst: participant.pointsAgainst,
            rank: participant.rank,
            globalRank: participant.globalRank ?? null,
            manualRankAdjustment: participant.manualRankAdjustment,
            isQualified: participant.isQualified,
            isDropped: participant.isDropped,
            originalId: participant.originalId ?? null,
          })),
        });

        await tx.match.createMany({
          data: parsedBody.data.matches.map((match) => ({
            id: match.id,
            tournamentId: parsedParams.data.id,
            stage: match.stage,
            stageNumber: match.stageNumber,
            round: match.round,
            participantAId: match.participantAId,
            participantBId: match.participantBId,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winnerId: match.winnerId,
            isCompleted: match.isCompleted,
            groupName: match.group,
            nextMatchId: match.nextMatchId,
            nextMatchSlot: match.nextMatchSlot,
            label: match.label,
            isFinal: match.isFinal,
          })),
        });
      });

      const tournament = await getTournamentWithRelations(parsedParams.data.id);
      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      return mapTournament(tournament);
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2025") {
        return reply.code(404).send({ error: "Tournament not found" });
      }
      throw error;
    }
  });

  app.post("/api/tournaments/:id/matches/:matchId/result", async (request, reply) => {
    const parsedParams = matchParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid path parameters" });
    }

    const parsedBody = matchResultBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid match result payload" });
    }

    if (parsedBody.data.scoreA === parsedBody.data.scoreB) {
      return reply.code(400).send({ error: "Draws are not allowed" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const match = await tx.match.findFirst({
          where: {
            id: parsedParams.data.matchId,
            tournamentId: parsedParams.data.id,
          },
          select: {
            id: true,
            stageNumber: true,
            participantAId: true,
            participantBId: true,
            nextMatchId: true,
            nextMatchSlot: true,
          },
        });

        if (!match || !match.participantAId || !match.participantBId) {
          throw new Error("MATCH_NOT_READY");
        }

        const winnerId = parsedBody.data.scoreA > parsedBody.data.scoreB ? match.participantAId : match.participantBId;

        await tx.match.update({
          where: { id: match.id },
          data: {
            scoreA: parsedBody.data.scoreA,
            scoreB: parsedBody.data.scoreB,
            winnerId,
            isCompleted: true,
          },
        });

        if (match.nextMatchId && match.nextMatchSlot) {
          await tx.match.update({
            where: { id: match.nextMatchId },
            data: match.nextMatchSlot === "A" ? { participantAId: winnerId } : { participantBId: winnerId },
          });
        }

      });

      const tournament = await getTournamentWithRelations(parsedParams.data.id);
      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      return mapTournament(tournament);
    } catch (error) {
      if (error instanceof Error && error.message === "MATCH_NOT_READY") {
        return reply.code(400).send({ error: "Match participants are not set" });
      }
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2025") {
        return reply.code(404).send({ error: "Tournament or match not found" });
      }
      throw error;
    }
  });

  app.post("/api/tournaments/:id/matches/:matchId/swap-participant", async (request, reply) => {
    const parsedParams = matchParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid path parameters" });
    }

    const parsedBody = swapParticipantBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid swap payload" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const targetMatch = await tx.match.findFirst({
          where: {
            id: parsedParams.data.matchId,
            tournamentId: parsedParams.data.id,
          },
        });

        if (!targetMatch) {
          throw new Error("TARGET_NOT_FOUND");
        }

        const participant = await tx.participant.findFirst({
          where: {
            id: parsedBody.data.newParticipantId,
            tournamentId: parsedParams.data.id,
          },
          select: { id: true },
        });

        if (!participant) {
          throw new Error("PARTICIPANT_NOT_FOUND");
        }

        const oldParticipantId = parsedBody.data.slot === "A" ? targetMatch.participantAId : targetMatch.participantBId;

        const sourceMatch = await tx.match.findFirst({
          where: {
            tournamentId: parsedParams.data.id,
            stageNumber: targetMatch.stageNumber,
            OR: [{ participantAId: parsedBody.data.newParticipantId }, { participantBId: parsedBody.data.newParticipantId }],
          },
        });

        if (sourceMatch && sourceMatch.id === targetMatch.id) {
          await tx.match.update({
            where: { id: targetMatch.id },
            data:
              parsedBody.data.slot === "A"
                ? {
                    participantAId: parsedBody.data.newParticipantId,
                    participantBId: oldParticipantId,
                  }
                : {
                    participantAId: oldParticipantId,
                    participantBId: parsedBody.data.newParticipantId,
                  },
          });
          return;
        }

        if (sourceMatch) {
          await tx.match.update({
            where: { id: sourceMatch.id },
            data: {
              participantAId:
                sourceMatch.participantAId === parsedBody.data.newParticipantId ? oldParticipantId : sourceMatch.participantAId,
              participantBId:
                sourceMatch.participantBId === parsedBody.data.newParticipantId ? oldParticipantId : sourceMatch.participantBId,
            },
          });
        }

        await tx.match.update({
          where: { id: targetMatch.id },
          data: parsedBody.data.slot === "A" ? { participantAId: parsedBody.data.newParticipantId } : { participantBId: parsedBody.data.newParticipantId },
        });
      });

      const tournament = await getTournamentWithRelations(parsedParams.data.id);
      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      return mapTournament(tournament);
    } catch (error) {
      if (error instanceof Error && error.message === "TARGET_NOT_FOUND") {
        return reply.code(404).send({ error: "Match not found" });
      }
      if (error instanceof Error && error.message === "PARTICIPANT_NOT_FOUND") {
        return reply.code(400).send({ error: "Participant not found in tournament" });
      }
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2025") {
        return reply.code(404).send({ error: "Tournament or match not found" });
      }
      throw error;
    }
  });
};
