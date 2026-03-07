export enum TournamentStatus {
  SETUP = 'SETUP',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED'
}

export enum StageType {
  RR = 'RR', // Round Robin
  SE = 'SE', // Single Elimination
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
  stageNumber: number; // 1, 2, 3...
  round: number; // For sorting/display grouping
  participantAId: string | null; // null if TBD in bracket
  participantBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  isCompleted: boolean;
  group?: string; // For Round Robin stage grouping
  nextMatchId?: string; // For bracket progression
  nextMatchSlot?: 'A' | 'B'; // Which slot in the next match
  label?: string; // e.g., "Final", "3rd vs 4th"
  isFinal?: boolean; // To display larger
}

export interface Tournament {
  id: string;
  name: string;
  title: string;
  urlSlug: string;
  description: string;
  participantCount: number;
  qualifiesByGroup: number;
  eliminationType: EliminationType;
  status: TournamentStatus;
  participants: Participant[];
  matches: Match[];
  createdAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
}