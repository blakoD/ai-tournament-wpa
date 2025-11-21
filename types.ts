export enum TournamentStatus {
  SETUP = 'SETUP',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED'
}

export enum StageType {
  RR1 = 'RR1', // Round Robin 1
  SE = 'SE',   // Single Elimination
  RR2 = 'RR2'  // Round Robin 2
}

export enum EliminationType {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  ROUND_ROBIN_2 = 'ROUND_ROBIN_2'
}

export interface Participant {
  id: string;
  name: string;
  group: string; // 'A', 'B', etc. Default 'A'
  // Stats for RR1 (or current stage accumulation)
  wins: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number; // Current calculated rank within group
  globalRank?: number; // Rank across all participants
  manualRankAdjustment: number; // For tie-breakers overridden manually
  isQualified: boolean;
  isDropped: boolean; // If replaced
  originalId?: string; // If this participant replaced someone, who was it?
}

export interface Match {
  id: string;
  tournamentId: string;
  stage: StageType;
  round: number; // For sorting/display grouping
  participantAId: string | null; // null if TBD in bracket
  participantBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  isCompleted: boolean;
  nextMatchId?: string; // For bracket progression
  nextMatchSlot?: 'A' | 'B'; // Which slot in the next match
}

export interface Tournament {
  id: string;
  name: string;
  title: string;
  urlSlug: string;
  description: string;
  participantCount: 8 | 12 | 16;
  qualificationCount: number;
  eliminationType: EliminationType;
  status: TournamentStatus;
  participants: Participant[];
  matches: Match[];
  createdAt: number;
}