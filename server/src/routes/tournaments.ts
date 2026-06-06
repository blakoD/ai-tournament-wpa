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
  groupSort: z.number().int().default(0).optional(),
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
  sortOrder: z.number().int().nullable().optional(),
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
  maxScore: z.number().int().min(1).default(16),
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

const listQuerySchema = z.object({
  mine: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

type TournamentWithRelations = {
  id: string;
  ownerId: string | null;
  ownerEmail: string | null;
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
  maxScore: number;
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
  ownerId: tournament.ownerId ?? undefined,
  ownerEmail: tournament.ownerEmail ?? undefined,
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
  maxScore: tournament.maxScore,
  participants: tournament.participants.map((participant: DbParticipant) => ({
    id: participant.id,
    name: participant.name,
    group: participant.groupName,
    groupSort: participant.groupSort,
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
    sortOrder: (match as DbMatch & { sortOrder?: number | null }).sortOrder ?? undefined,
  })),
});

const getHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getRequestContext = (request: { headers: Record<string, string | string[] | undefined> }) => {
  const userId = getHeaderValue(request.headers["x-user-id"]);
  const role = (getHeaderValue(request.headers["x-user-role"]) ?? "user").toLowerCase();

  return {
    userId,
    isAdmin: role === "admin",
  };
};

const canManageTournament = (
  context: { userId?: string; isAdmin: boolean },
  tournament: { ownerId: string | null; status: "SETUP" | "STARTED" | "COMPLETED" }
): boolean => {
  if (context.isAdmin) {
    return true;
  }

  if (!context.userId || tournament.ownerId !== context.userId) {
    return false;
  }

  return tournament.status !== "COMPLETED";
};

const getTournamentWithRelations = async (id: string): Promise<TournamentWithRelations | null> => {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: [{ groupName: "asc" }, { groupSort: "asc" }, { name: "asc" }],
      },
      matches: {
        orderBy: [{ stageNumber: "asc" }, { round: "asc" }],
      },
    },
  });

  return tournament as TournamentWithRelations | null;
};

export const registerTournamentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/tournaments", async (request, reply) => {
    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "Invalid query parameters" });
    }

    const context = getRequestContext(request);

    if (parsedQuery.data.mine && !context.userId) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const tournaments = await prisma.tournament.findMany({
      where: parsedQuery.data.mine
        ? {
            ownerId: context.userId,
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: parsedQuery.data.limit,
    });

    return tournaments.map((tournament) => ({
      id: tournament.id,
      ownerId: tournament.ownerId ?? undefined,
      ownerEmail: tournament.ownerEmail ?? undefined,
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
    const context = getRequestContext(request);
    if (!context.userId) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const parsedBody = tournamentWriteSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid tournament payload" });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const tournament = await tx.tournament.create({
          data: {
            ownerId: context.userId,
            ownerEmail: getHeaderValue(request.headers["x-user-email"]) ?? null,
            name: parsedBody.data.name,
            title: parsedBody.data.title,
            urlSlug: parsedBody.data.urlSlug,
            description: parsedBody.data.description,
            participantCount: parsedBody.data.participantCount,
            qualifiesByGroup: parsedBody.data.qualifiesByGroup,
            eliminationType: parsedBody.data.eliminationType,
            status: parsedBody.data.status,
            maxScore: parsedBody.data.maxScore,
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
              groupSort: participant.groupSort ?? 0,
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
              sortOrder: match.sortOrder ?? null,
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
    const context = getRequestContext(request);
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const parsedBody = tournamentWriteSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid tournament payload" });
    }

    const existing = await prisma.tournament.findUnique({
      where: { id: parsedParams.data.id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    if (!canManageTournament(context, { ownerId: existing.ownerId, status: existing.status })) {
      return reply.code(403).send({ error: "You do not have permission to edit this tournament" });
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
            maxScore: parsedBody.data.maxScore,
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
              groupSort: participant.groupSort ?? 0,
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
              sortOrder: match.sortOrder ?? null,
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
    const context = getRequestContext(request);
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const existing = await prisma.tournament.findUnique({
      where: { id: parsedParams.data.id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    if (!canManageTournament(context, { ownerId: existing.ownerId, status: existing.status })) {
      return reply.code(403).send({ error: "You do not have permission to delete this tournament" });
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
    const context = getRequestContext(request);
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid tournament id" });
    }

    const parsedBody = startTournamentBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid start payload" });
    }

    const existing = await prisma.tournament.findUnique({
      where: { id: parsedParams.data.id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    if (!canManageTournament(context, { ownerId: existing.ownerId, status: existing.status })) {
      return reply.code(403).send({ error: "You do not have permission to start this tournament" });
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
            groupSort: participant.groupSort ?? 0,
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
    const context = getRequestContext(request);
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

    const existing = await prisma.tournament.findUnique({
      where: { id: parsedParams.data.id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    if (!canManageTournament(context, { ownerId: existing.ownerId, status: existing.status })) {
      return reply.code(403).send({ error: "You do not have permission to edit this tournament" });
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

        // Recalculate and persist participant standings
        const allParticipants = await tx.participant.findMany({
          where: { tournamentId: parsedParams.data.id },
        });

        const completedMatches = await tx.match.findMany({
          where: { tournamentId: parsedParams.data.id, isCompleted: true },
        });

        type ParticipantStats = {
          id: string;
          wins: number;
          matchesPlayed: number;
          pointsFor: number;
          pointsAgainst: number;
          group: string;
          manualRankAdjustment: number;
        };

        const statsMap = new Map<string, ParticipantStats>();
        for (const p of allParticipants) {
          statsMap.set(p.id, {
            id: p.id,
            wins: 0,
            matchesPlayed: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            group: p.groupName,
            manualRankAdjustment: p.manualRankAdjustment,
          });
        }

        for (const m of completedMatches) {
          const pA = m.participantAId ? statsMap.get(m.participantAId) : undefined;
          const pB = m.participantBId ? statsMap.get(m.participantBId) : undefined;
          if (pA && pB) {
            pA.matchesPlayed += 1;
            pB.matchesPlayed += 1;
            pA.pointsFor += m.scoreA ?? 0;
            pA.pointsAgainst += m.scoreB ?? 0;
            pB.pointsFor += m.scoreB ?? 0;
            pB.pointsAgainst += m.scoreA ?? 0;
            if (m.winnerId === pA.id) pA.wins += 1;
            if (m.winnerId === pB.id) pB.wins += 1;
          }
        }

        const sortFn = (a: ParticipantStats, b: ParticipantStats) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          const diffA = a.pointsFor - a.pointsAgainst;
          const diffB = b.pointsFor - b.pointsAgainst;
          if (diffB !== diffA) return diffB - diffA;
          if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
          return (b.manualRankAdjustment || 0) - (a.manualRankAdjustment || 0);
        };

        const allStats = Array.from(statsMap.values());

        // Assign globalRank
        const globalSorted = [...allStats].sort(sortFn);
        const globalRankMap = new Map<string, number>();
        globalSorted.forEach((p, i) => globalRankMap.set(p.id, i + 1));

        // Sort by group then stats, assign rank per group
        allStats.sort((a, b) => {
          if (a.group !== b.group) return a.group.localeCompare(b.group);
          return sortFn(a, b);
        });

        const groupCounts: Record<string, number> = {};
        const rankMap = new Map<string, number>();
        for (const p of allStats) {
          const g = p.group || "A";
          groupCounts[g] = (groupCounts[g] ?? 0) + 1;
          rankMap.set(p.id, groupCounts[g]);
        }

        await Promise.all(
          allStats.map((p) =>
            tx.participant.update({
              where: { id: p.id },
              data: {
                wins: p.wins,
                matchesPlayed: p.matchesPlayed,
                pointsFor: p.pointsFor,
                pointsAgainst: p.pointsAgainst,
                rank: rankMap.get(p.id) ?? 0,
                globalRank: globalRankMap.get(p.id) ?? null,
              },
            })
          )
        );

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
    const context = getRequestContext(request);
    const parsedParams = matchParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid path parameters" });
    }

    const parsedBody = swapParticipantBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid swap payload" });
    }

    const existing = await prisma.tournament.findUnique({
      where: { id: parsedParams.data.id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Tournament not found" });
    }

    if (!canManageTournament(context, { ownerId: existing.ownerId, status: existing.status })) {
      return reply.code(403).send({ error: "You do not have permission to edit this tournament" });
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
