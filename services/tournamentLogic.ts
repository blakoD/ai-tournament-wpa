import { Tournament, Participant, Match, StageType, EliminationType, Match as MatchType } from '../types';

// --- Helper: UUID ---
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// --- Round Robin Scheduler (Circle Method) ---
export const generateRoundRobinMatches = (
  tournamentId: string,
  participants: Participant[],
  stage: StageType
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
    const n = groupParticipants.length;
    if (n < 2) return; // Need at least 2 to play

    const rounds = n - 1;
    const half = n / 2;
    const playerIds = groupParticipants.map(p => p.id);

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const p1 = playerIds[i];
        const p2 = playerIds[n - 1 - i];

        allMatches.push({
          id: generateId(),
          tournamentId,
          stage,
          round: r + 1,
          participantAId: p1,
          participantBId: p2,
          scoreA: null,
          scoreB: null,
          winnerId: null,
          isCompleted: false
        });
      }
      // Rotate
      playerIds.splice(1, 0, playerIds.pop()!);
    }
  });

  return allMatches;
};

// --- Standings Calculation ---
export const calculateStandings = (participants: Participant[], matches: Match[], stage: StageType): Participant[] => {
  const statsMap = new Map<string, Participant>();
  
  participants.forEach(p => {
    statsMap.set(p.id, {
      ...p,
      wins: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  });

  matches.filter(m => m.stage === stage && m.isCompleted).forEach(m => {
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

  // Sort function
  const sortFn = (a: Participant, b: Participant) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return (b.manualRankAdjustment || 0) - (a.manualRankAdjustment || 0);
  };

  // 1. Calculate Global Rank
  const globalSorted = [...updatedParticipants].sort(sortFn);
  globalSorted.forEach((p, i) => {
    p.globalRank = i + 1;
  });

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
  qualifiedParticipants: Participant[]
): Match[] => {
  // qualifiedParticipants expected to be sorted by Seed (rank 1 to N)
  const seeds = [...qualifiedParticipants];
  const count = seeds.length;
  
  // Calculate Rounds
  const rounds = Math.log2(count);
  if (!Number.isInteger(rounds)) {
    console.warn("Bracket generation currently supports power of 2 sizes better.");
  }

  // Generate Match IDs first so we can link them
  const matches: Match[] = [];

  // Helper to create specific match order for Visual Tree
  // Standard Seeds Order for 4: 1v4, 2v3
  // Standard Seeds Order for 8: 1v8, 4v5, 3v6, 2v7  <-- Visual order often: 1v8 (Top), 4v5 (Top-Mid), 2v7 (Bot), 3v6 (Bot-Mid)?
  // Actually, standard bracket visual top-down:
  // M1: 1 vs 8
  // M2: 4 vs 5
  // M3: 3 vs 6
  // M4: 2 vs 7
  // Winner M1 vs Winner M2 -> Semi 1
  // Winner M3 vs Winner M4 -> Semi 2
  
  let round1Indices: number[][] = [];

  if (count === 4) {
      // 1 vs 4, 2 vs 3
      round1Indices = [[0, 3], [1, 2]];
  } else if (count === 8) {
      // Visual Order: (1,8), (4,5), (3,6), (2,7)
      // Note: Indices are 0-based from sorted seeds
      round1Indices = [
          [0, 7], // 1 vs 8
          [3, 4], // 4 vs 5
          [2, 5], // 3 vs 6
          [1, 6]  // 2 vs 7
      ];
  } else if (count === 16) {
      // 1vs16, 8vs9, 5vs12, 4vs13, 6vs11, 3vs14, 7vs10, 2vs15
      round1Indices = [
          [0, 15], [7, 8],   // Q1
          [4, 11], [3, 12],  // Q2
          [5, 10], [2, 13],  // Q3
          [6, 9],  [1, 14]   // Q4
      ];
  } else {
      // Generic fold
      for(let i=0; i<count/2; i++) {
          round1Indices.push([i, count-1-i]);
      }
  }

  // Generate Round 1 Matches
  const r1Matches: Match[] = round1Indices.map(pair => ({
      id: generateId(),
      tournamentId,
      stage: StageType.SE,
      round: 1,
      participantAId: seeds[pair[0]].id,
      participantBId: seeds[pair[1]].id,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      isCompleted: false
  }));

  matches.push(...r1Matches);

  // Generate subsequent rounds
  let currentRoundMatches = r1Matches;
  let roundNum = 2;

  while (currentRoundMatches.length > 1) {
      const nextRoundMatches: Match[] = [];
      
      for (let i = 0; i < currentRoundMatches.length; i += 2) {
          const m1 = currentRoundMatches[i];
          const m2 = currentRoundMatches[i+1];
          
          const nextMatch: Match = {
              id: generateId(),
              tournamentId,
              stage: StageType.SE,
              round: roundNum,
              participantAId: null, // TBD
              participantBId: null, // TBD
              scoreA: null,
              scoreB: null,
              winnerId: null,
              isCompleted: false
          };
          
          // Link previous matches to this one
          // Mutating the objects already pushed to 'matches' array works because they are references?
          // Yes, but we need to find them in the 'matches' array or modify 'm1'/'m2' directly if they are the same refs.
          // They are.
          m1.nextMatchId = nextMatch.id;
          m1.nextMatchSlot = 'A';
          
          m2.nextMatchId = nextMatch.id;
          m2.nextMatchSlot = 'B';
          
          nextRoundMatches.push(nextMatch);
      }
      
      matches.push(...nextRoundMatches);
      currentRoundMatches = nextRoundMatches;
      roundNum++;
  }

  return matches;
};

// --- Advance Tournament ---
export const advanceToStep2 = (tournament: Tournament): Tournament => {
  // 1. Calculate standings (Ranked within groups)
  const standings = calculateStandings(tournament.participants, tournament.matches, StageType.RR1);
  
  // 2. Global Qualification Logic
  // We want exactly 'qualificationCount' players.
  // Sort purely by Global Rank (which is based on Wins > Diff > Points > Manual)
  // Ignore group boundaries for the cut-off to strictly respect the limit.
  
  const sortedByGlobal = [...standings].sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999));
  
  const limit = tournament.qualificationCount;
  const qualified = sortedByGlobal.slice(0, limit);
  const eliminated = sortedByGlobal.slice(limit);

  // Mark status in participant list
  const qualifiedIds = new Set(qualified.map(p => p.id));
  const newParticipants = standings.map(p => ({
      ...p,
      isQualified: qualifiedIds.has(p.id)
  }));

  let newMatches: Match[] = [];

  if (tournament.eliminationType === EliminationType.SINGLE_ELIMINATION) {
    // For bracket, we pass the qualified players sorted by rank 1..N
    // They are already sorted by global rank above.
    newMatches = generateBracket(tournament.id, qualified);
  } else {
    // RR2: One big group
    const rr2Participants = qualified.map(p => ({ ...p, group: 'Finals' }));
    newMatches = generateRoundRobinMatches(tournament.id, rr2Participants, StageType.RR2);
  }

  return {
    ...tournament,
    participants: newParticipants,
    matches: [...tournament.matches, ...newMatches],
  };
};