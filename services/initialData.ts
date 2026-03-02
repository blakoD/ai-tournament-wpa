import { saveTournament, getAllTournaments } from './storageService';
import { Tournament, TournamentStatus, EliminationType, StageType, Participant } from '../types';
import { generateId, generateRoundRobinMatches } from './tournamentLogic';

export const loadInitialData = () => {
  // Check if data exists
  const tournaments = getAllTournaments();
  if (tournaments.length > 0) return;

  console.log("Loading initial demo data...");

  const tId = generateId();
  const pCount = 8;
  
  // Create 8 participants split into 2 groups
  const participants: Participant[] = Array.from({ length: pCount }).map((_, i) => ({
    id: generateId(),
    name: `Player ${i + 1}`,
    group: i < 4 ? 'A' : 'B',
    wins: 0,
    matchesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    rank: 0,
    globalRank: 0,
    manualRankAdjustment: 0,
    isQualified: false,
    isDropped: false,
  }));

  // Generate matches for Stage 1 (Round Robin)
  const matches = generateRoundRobinMatches(tId, participants, StageType.RR, 1);

  const sampleTournament: Tournament = {
    id: tId,
    name: "Demo Cup",
    title: "2024 Demo Championship",
    urlSlug: "demo-cup-2024",
    description: "A sample tournament with 2 groups of 4 players to demonstrate the application features.",
    participantCount: pCount,
    qualifiesByGroup: 2, // Top 2 per group advance
    eliminationType: EliminationType.SINGLE_ELIMINATION,
    status: TournamentStatus.STARTED,
    participants,
    matches,
    createdAt: Date.now(),
    startedAt: Date.now()
  };

  saveTournament(sampleTournament);
};