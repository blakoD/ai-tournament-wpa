import { saveTournament, getAllTournaments } from './storageService';
import { Tournament, TournamentStatus, EliminationType, StageType, Participant } from '../types';
import { generateId, generateRoundRobinMatches } from './tournamentLogic';

export const loadInitialData = () => {
  // Check if data exists
  const tournaments = getAllTournaments();
  if (tournaments.length > 0) return;

  console.log("Loading initial demo data...");

  const tId = generateId();
  const pCount = 12;
  
  // Create 8 participants split into 2 groups
  const participants: Participant[] = [
    'Mario Álvez - Gabriel',
    'Diego Macias - Pablo Picorel',
    'Fabricio Siutto - Alejandro Pais',
    'Esteban Cortes - Richard Da Silva',
    'Eduardo Viera - Richard Castaño',
    'Oscar Gahn - Gonzalo Villanueva',
    'Marcelo Sanchez - Daniel',
    'William Mockford - Ezequiel',
    'Diego Duarte - Hugo Duthil',
    'Martin Duarte - Antony',
    'Mauro Ferrari - Ricardo Zucklevicius',
    'Diego Costa - Ruben Da Rosa'
  ].map((name, i) => ({
    id: generateId(),
    name: `${name}`,
    group: i < 4 ? 'A' : (i < 8 ? 'B' : 'C'),
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
  const matches = generateRoundRobinMatches(tId, participants, StageType.RR1);

  const sampleTournament: Tournament = {
    id: tId,
    name: "CEVVEN - Campeonato Pelota Olimpica",
    title: "CEVVEN 2025",
    urlSlug: "cevven-202511",
    description: "",
    participantCount: pCount,
    qualificationCount: 8, // Top 4 advance
    eliminationType: EliminationType.SINGLE_ELIMINATION,
    status: TournamentStatus.STARTED,
    participants,
    matches,
    createdAt: Date.now(),
    startedAt: Date.now()
  };

  saveTournament(sampleTournament);
};