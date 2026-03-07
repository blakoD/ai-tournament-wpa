import { Tournament, Participant, Match, StageType, EliminationType, Match as MatchType, TournamentStatus } from '../types';

// --- Helper: UUID ---
export const generateId = (): string => {
  return crypto.randomUUID();
};

// --- Round Robin Scheduler (Circle Method) ---
export const generateRoundRobinMatches = (
  tournamentId: string,
  participants: Participant[],
  stage: StageType,
  stageNumber: number
): Match[] => {
  // Group participants first
  const groups: Record<string, Participant[]> = {};
  participants.forEach(p => {
    const g = p.group || 'A';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  let allMatches: Match[] = [];

  Object.values(groups).forEach(groupParticipants => {
    let playerIds = groupParticipants.map(p => p.id);
    
    // If odd number of players, add a dummy player for "Bye"
    if (playerIds.length % 2 !== 0) {
      playerIds.push('BYE');
    }

    const n = playerIds.length;
    const rounds = n - 1;
    const half = n / 2;

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const p1 = playerIds[i];
        const p2 = playerIds[n - 1 - i];

        // Skip matches involving the "Bye" player
        if (p1 !== 'BYE' && p2 !== 'BYE') {
          allMatches.push({
            id: generateId(),
            tournamentId,
            stage,
            stageNumber,
            round: r + 1,
            participantAId: p1,
            participantBId: p2,
            scoreA: null,
            scoreB: null,
            winnerId: null,
            isCompleted: false,
            group: groupParticipants[0].group || 'A'
          });
        }
      }
      // Rotate
      playerIds.splice(1, 0, playerIds.pop()!);
    }
  });

  return allMatches;
};

// --- Standings Calculation ---
export const calculateStandings = (participants: Participant[], matches: Match[], stage?: StageType, stageNumber?: number): Participant[] => {
  const statsMap = new Map<string, Participant>();
  
  // If we are looking at a specific stage, we might need to override the group property
  // based on the matches in that stage.
  const stageGroups = new Map<string, string>();
  if (stage && stageNumber !== undefined) {
    matches.forEach(m => {
      if (m.stage === stage && m.stageNumber === stageNumber && m.group) {
        if (m.participantAId) stageGroups.set(m.participantAId, m.group);
        if (m.participantBId) stageGroups.set(m.participantBId, m.group);
      }
    });
  }

  participants.forEach(p => {
    statsMap.set(p.id, {
      ...p,
      group: stageGroups.get(p.id) || p.group, // Use stage-specific group if available
      wins: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  });

  const filteredMatches = matches.filter(m => {
    if (!m.isCompleted) return false;
    if (stage && m.stage !== stage) return false;
    if (stageNumber !== undefined && m.stageNumber !== stageNumber) return false;
    return true;
  });

  filteredMatches.forEach(m => {
    const pA = statsMap.get(m.participantAId!);
    const pB = statsMap.get(m.participantBId!);

    if (pA && pB) {
      pA.matchesPlayed += 1;
      pB.matchesPlayed += 1;

      pA.pointsFor += (m.scoreA || 0);
      pA.pointsAgainst += (m.scoreB || 0);
      
      pB.pointsFor += (m.scoreB || 0);
      pB.pointsAgainst += (m.scoreA || 0);

      if (m.winnerId === pA.id) pA.wins += 1;
      if (m.winnerId === pB.id) pB.wins += 1;
    }
  });

  const updatedParticipants = Array.from(statsMap.values());

  // Sort function: Wins > Diff > Points > Manual
  const sortFn = (a: Participant, b: Participant) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return (b.manualRankAdjustment || 0) - (a.manualRankAdjustment || 0);
  };

  // 1. Calculate Global Rank
  if(updatedParticipants.every((p: Participant) => !p.globalRank)) {
    const globalSorted = [...updatedParticipants].sort(sortFn);
    globalSorted.forEach((p, i) => {
      p.globalRank = i + 1;
    });
  }

  // 2. Sort for Group assignment/display (Group first, then Stats)
  updatedParticipants.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return sortFn(a, b);
  });

  // 3. Assign ranks PER GROUP
  const groupCounts: Record<string, number> = {};
  updatedParticipants.forEach(p => {
    const g = p.group || 'A';
    if (!groupCounts[g]) groupCounts[g] = 0;
    groupCounts[g]++;
    p.rank = groupCounts[g];
  });

  return updatedParticipants;
};

// --- Bracket Generation (Single Elimination) ---
export const generateBracket = (
  tournamentId: string,
  qualifiedParticipants: Participant[],
  stageNumber: number,
  round: number = 1
): Match[] => {
  const seeds = [...qualifiedParticipants];
  const count = seeds.length;
  if (count === 0) return [];

  const matches: Match[] = [];
  // We pair participants: 1st vs Last, 2nd vs 2nd Last, etc.
  // This handles any even number of participants as requested.
  const numMatches = Math.floor(count / 2);
  
  for (let i = 0; i < numMatches; i++) {
    const pA = seeds[i];
    const pB = seeds[count - 1 - i];
    
    matches.push({
      id: generateId(),
      tournamentId,
      stage: StageType.SE,
      stageNumber,
      round: round,
      participantAId: pA.id,
      participantBId: pB.id,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      isCompleted: false
    });
  }

  return matches;
};

// --- Advance Tournament ---
export const startNextStage = (
  tournament: Tournament, 
  nextFormat: EliminationType, 
  qualifiedParticipantIds: string[],
  groupAssignments?: Record<string, string>,
  manualFinals?: Record<string, string>
): Tournament => {
  const qualified = tournament.participants.filter(p => qualifiedParticipantIds.includes(p.id));
  
  // Mark status in participant list
  const newParticipants = tournament.participants.map(p => ({
      ...p,
      isQualified: qualifiedParticipantIds.includes(p.id)
  }));

  let newMatches: Match[] = [];
  const lastMatch = tournament.matches[tournament.matches.length - 1];
  const currentStageType = lastMatch?.stage || StageType.RR;
  const currentStageNumber = lastMatch?.stageNumber || 1;
  const nextStageType = nextFormat === EliminationType.SINGLE_ELIMINATION ? StageType.SE : StageType.RR;

  // Logic: If current is Bracket and next is Bracket, show in same stage.
  // Otherwise, increment stageNumber.
  let nextStageNumber = currentStageNumber;
  if (!(currentStageType === StageType.SE && nextStageType === StageType.SE)) {
      nextStageNumber++;
  }

  if (nextFormat === EliminationType.SINGLE_ELIMINATION) {
    if (manualFinals && Object.keys(manualFinals).length > 0) {
        const finalIds = Object.entries(manualFinals).filter(([_, v]) => v === 'Final').map(([id]) => id);
        const thirdIds = Object.entries(manualFinals).filter(([_, v]) => v === '3rd vs 4th').map(([id]) => id);
        
        // Determine next round number for SE stage
        const seMatches = tournament.matches.filter(m => m.stage === StageType.SE && m.stageNumber === nextStageNumber);
        const nextRound = seMatches.length > 0 ? Math.max(...seMatches.map(m => m.round)) + 1 : 1;

        if (finalIds.length === 2) {
            newMatches.push({
                id: generateId(),
                tournamentId: tournament.id,
                stage: StageType.SE,
                stageNumber: nextStageNumber,
                round: nextRound,
                participantAId: finalIds[0],
                participantBId: finalIds[1],
                scoreA: null,
                scoreB: null,
                winnerId: null,
                isCompleted: false,
                label: 'Final',
                isFinal: true
            });
        }
        
        if (thirdIds.length === 2) {
            newMatches.push({
                id: generateId(),
                tournamentId: tournament.id,
                stage: StageType.SE,
                stageNumber: nextStageNumber,
                round: nextRound,
                participantAId: thirdIds[0],
                participantBId: thirdIds[1],
                scoreA: null,
                scoreB: null,
                winnerId: null,
                isCompleted: false,
                label: '3rd vs 4th',
                isFinal: false
            });
        }
    } else {
        // For bracket, we pass the qualified players sorted by global rank
        const standings = calculateStandings(qualified, tournament.matches);
        const sortedQualified = [...standings].sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999));
        
        // Determine next round number for SE stage
        const seMatches = tournament.matches.filter(m => m.stage === StageType.SE && m.stageNumber === nextStageNumber);
        const nextRound = seMatches.length > 0 ? Math.max(...seMatches.map(m => m.round)) + 1 : 1;
        
        newMatches = generateBracket(tournament.id, sortedQualified, nextStageNumber, nextRound);
    }
  } else {
    // RR: Use group assignments if provided
    const rrParticipants = qualified.map(p => ({ 
      ...p, 
      group: groupAssignments?.[p.id] || `Stage ${nextStageNumber}` 
    }));
    newMatches = generateRoundRobinMatches(tournament.id, rrParticipants, StageType.RR, nextStageNumber);
  }

  return {
    ...tournament,
    participants: newParticipants,
    matches: [...tournament.matches, ...newMatches],
    status: TournamentStatus.STARTED,
    completedAt: null,
    eliminationType: nextFormat // Update default for next stage
  };
};
