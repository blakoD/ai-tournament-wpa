import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatchList } from '../useMatchList';
import { Match, Participant } from '../../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMatch = (overrides: Partial<Match> & { id: string }): Match => ({
  tournamentId: 't1',
  stage: 'RR1' as Match['stage'],
  stageNumber: 1,
  round: 1,
  participantAId: null,
  participantBId: null,
  scoreA: null,
  scoreB: null,
  winnerId: null,
  isCompleted: false,
  ...overrides,
});

const makeParticipant = (overrides: Partial<Participant> & { id: string }): Participant => ({
  name: overrides.id,
  group: 'A',
  wins: 0,
  matchesPlayed: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  rank: 1,
  manualRankAdjustment: 0,
  isQualified: false,
  isDropped: false,
  ...overrides,
});

const noParticipants: Participant[] = [];

// ---------------------------------------------------------------------------
// sortByRound  (via sortedMatches with sortMode === 'round')
// ---------------------------------------------------------------------------

describe('sortByRound', () => {
  it('orders matches by round ascending', () => {
    const matches = [
      makeMatch({ id: 'm3', round: 3 }),
      makeMatch({ id: 'm1', round: 1 }),
      makeMatch({ id: 'm2', round: 2 }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    act(() => { result.current.handleSortModeChange('round'); });

    const ids = result.current.sortedMatches.map(m => m.id);
    expect(ids).toEqual(['m1', 'm2', 'm3']);
  });

  it('within same round sorts by min(groupSort) then group name', () => {
    // Two groups A and B, each with 2 matches in round 1.
    // A0: groupSort-1 vs groupSort-2 → slot=1
    // B0: groupSort-1 vs groupSort-2 → slot=1
    // A1: groupSort-3 vs groupSort-4 → slot=3
    // B1: groupSort-3 vs groupSort-4 → slot=3
    const participants = [
      makeParticipant({ id: 'a1', group: 'A', groupSort: 1 }),
      makeParticipant({ id: 'a2', group: 'A', groupSort: 2 }),
      makeParticipant({ id: 'a3', group: 'A', groupSort: 3 }),
      makeParticipant({ id: 'a4', group: 'A', groupSort: 4 }),
      makeParticipant({ id: 'b1', group: 'B', groupSort: 1 }),
      makeParticipant({ id: 'b2', group: 'B', groupSort: 2 }),
      makeParticipant({ id: 'b3', group: 'B', groupSort: 3 }),
      makeParticipant({ id: 'b4', group: 'B', groupSort: 4 }),
    ];
    const matches = [
      makeMatch({ id: 'A1', round: 1, group: 'A', participantAId: 'a3', participantBId: 'a4' }), // slot=3
      makeMatch({ id: 'B0', round: 1, group: 'B', participantAId: 'b1', participantBId: 'b2' }), // slot=1
      makeMatch({ id: 'A0', round: 1, group: 'A', participantAId: 'a1', participantBId: 'a2' }), // slot=1
      makeMatch({ id: 'B1', round: 1, group: 'B', participantAId: 'b3', participantBId: 'b4' }), // slot=3
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants })
    );

    act(() => { result.current.handleSortModeChange('round'); });

    const ids = result.current.sortedMatches.map(m => m.id);
    // slot=1: A0 then B0 (A < B); slot=3: A1 then B1
    expect(ids).toEqual(['A0', 'B0', 'A1', 'B1']);
  });

  it('matches without a round default to round 1', () => {
    const matches = [
      makeMatch({ id: 'm2', round: 2 }),
      makeMatch({ id: 'm0' }), // round is 1 by default from makeMatch
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    act(() => { result.current.handleSortModeChange('round'); });

    const ids = result.current.sortedMatches.map(m => m.id);
    expect(ids[0]).toBe('m0');
    expect(ids[1]).toBe('m2');
  });

  it('12 players / 3 groups / 3 rounds — interleaves groups across rounds', () => {
    // 12 participants: Player 1-4 → Group A, Player 5-8 → Group B, Player 9-12 → Group C
    const participants: Participant[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeParticipant({ id: `p${i + 1}`, name: `Player A${i + 1}`, group: 'A', groupSort: i + 1 })),
      ...Array.from({ length: 4 }, (_, i) =>
        makeParticipant({ id: `p${i + 5}`, name: `Player B${i + 1}`, group: 'B', groupSort: i + 1 })),
      ...Array.from({ length: 4 }, (_, i) =>
        makeParticipant({ id: `p${i + 9}`, name: `Player C${i + 1}`, group: 'C', groupSort: i + 1 })),
    ];

    // Matches fed in group-by-group order. Within each (round, group) bucket 
    // Round-robin schedule per group of 4 (standard pairing):
    //   R1: 1v2, 3v4
    //   R2: 1v3, 2v4
    //   R3: 1v4, 2v3
    const matches: Match[] = [
      // --- Group C (p9–p12) ---
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 1, participantAId: 'p5', participantBId: 'p6' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 1, participantAId: 'p7', participantBId: 'p8' }),
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 1, participantAId: 'p3', participantBId: 'p4' }),
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 1, participantAId: 'p1', participantBId: 'p2' }),
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 1, participantAId: 'p11', participantBId: 'p12' }),
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 1, participantAId: 'p9',  participantBId: 'p10' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 2, participantAId: 'p10', participantBId: 'p12' }),
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 2, participantAId: 'p9',  participantBId: 'p11' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 2, participantAId: 'p5', participantBId: 'p7' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 2, participantAId: 'p6', participantBId: 'p8' }),
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 2, participantAId: 'p1', participantBId: 'p3' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 2, participantAId: 'p2', participantBId: 'p4' }),
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 3, participantAId: 'p9',  participantBId: 'p12' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'C', round: 3, participantAId: 'p10', participantBId: 'p11' }),
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 3, participantAId: 'p6', participantBId: 'p7' }),
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 3, participantAId: 'p2', participantBId: 'p3' }),
      makeMatch({ id: crypto.randomUUID(), group: 'A', round: 3, participantAId: 'p1', participantBId: 'p4' }), 
      makeMatch({ id: crypto.randomUUID(), group: 'B', round: 3, participantAId: 'p5', participantBId: 'p8' }), 
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants })
    );

    act(() => { result.current.handleSortModeChange('round'); });

    // Assert order by participant pairs — IDs are random so we check who plays whom
    const pairs = result.current.sortedMatches.map(m => [participants.find(p => p.id === m.participantAId)?.name, participants.find(p => p.id === m.participantBId)?.name, m.round]);
    expect(pairs).toEqual([
      // Round 1
      ['Player A1', 'Player A2', 1], ['Player B1', 'Player B2', 1], ['Player C1',  'Player C2', 1],
      ['Player A3', 'Player A4', 1], ['Player B3', 'Player B4', 1], ['Player C3', 'Player C4', 1],
      // Round 2
      ['Player A1', 'Player A3', 2], ['Player B1', 'Player B3', 2], ['Player C1',  'Player C3', 2],
      ['Player A2', 'Player A4', 2], ['Player B2', 'Player B4', 2], ['Player C2', 'Player C4', 2],
      // Round 3
      ['Player A1', 'Player A4', 3], ['Player B1', 'Player B4', 3], ['Player C1',  'Player C4', 3],
      ['Player A2', 'Player A3', 3], ['Player B2', 'Player B3', 3], ['Player C2', 'Player C3', 3],
    ]);
  });
});

// ---------------------------------------------------------------------------
// sortByGroup  (via sortedMatches with sortMode === 'group', the default)
// ---------------------------------------------------------------------------

describe('sortByGroup', () => {
  it('orders matches by group alphabetically then by round', () => {
    const matches = [
      makeMatch({ id: 'C1', group: 'C', round: 1 }),
      makeMatch({ id: 'A2', group: 'A', round: 2 }),
      makeMatch({ id: 'B1', group: 'B', round: 1 }),
      makeMatch({ id: 'A1', group: 'A', round: 1 }),
    ];

    // sortMode defaults to 'group'
    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    const ids = result.current.sortedMatches.map(m => m.id);
    expect(ids).toEqual(['A1', 'A2', 'B1', 'C1']);
  });

  it('matches with "Group X" prefix are normalised and sorted correctly', () => {
    const matches = [
      makeMatch({ id: 'grpB', group: 'Group B', round: 1 }),
      makeMatch({ id: 'grpA', group: 'Group A', round: 1 }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    const ids = result.current.sortedMatches.map(m => m.id);
    expect(ids).toEqual(['grpA', 'grpB']);
  });

  it('matches without a group sort after matches with a group', () => {
    const matches = [
      makeMatch({ id: 'noGroup', group: undefined, round: 1 }),
      makeMatch({ id: 'hasGroup', group: 'A', round: 1 }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    const ids = result.current.sortedMatches.map(m => m.id);
    expect(ids[0]).toBe('hasGroup');
    expect(ids[1]).toBe('noGroup');
  });
});

// ---------------------------------------------------------------------------
// groupedByRound
// ---------------------------------------------------------------------------

describe('groupedByRound', () => {
  it('buckets matches by their round number', () => {
    const matches = [
      makeMatch({ id: 'm1a', round: 1 }),
      makeMatch({ id: 'm1b', round: 1 }),
      makeMatch({ id: 'm2a', round: 2 }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(Object.keys(result.current.groupedByRound).map(Number)).toEqual(
      expect.arrayContaining([1, 2])
    );
    expect(result.current.groupedByRound[1].map(m => m.id)).toEqual(
      expect.arrayContaining(['m1a', 'm1b'])
    );
    expect(result.current.groupedByRound[2].map(m => m.id)).toEqual(['m2a']);
  });

  it('matches without a round are placed in bucket 1', () => {
    const matches = [makeMatch({ id: 'noRound' })]; // round defaults to 1

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(result.current.groupedByRound[1]).toHaveLength(1);
    expect(result.current.groupedByRound[1][0].id).toBe('noRound');
  });

  it('returns an empty object when there are no matches', () => {
    const { result } = renderHook(() =>
      useMatchList({ matches: [], participants: noParticipants })
    );

    expect(result.current.groupedByRound).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// groupedByGroup
// ---------------------------------------------------------------------------

describe('groupedByGroup', () => {
  it('buckets matches by normalised group key', () => {
    const matches = [
      makeMatch({ id: 'a1', group: 'A', round: 1 }),
      makeMatch({ id: 'a2', group: 'A', round: 2 }),
      makeMatch({ id: 'b1', group: 'B', round: 1 }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(Object.keys(result.current.groupedByGroup)).toEqual(
      expect.arrayContaining(['A', 'B'])
    );
    expect(result.current.groupedByGroup['A'].map(m => m.id)).toEqual(
      expect.arrayContaining(['a1', 'a2'])
    );
    expect(result.current.groupedByGroup['B'].map(m => m.id)).toEqual(['b1']);
  });

  it('strips "Group " prefix when building the key', () => {
    const matches = [makeMatch({ id: 'gA', group: 'Group A', round: 1 })];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    // normalised key should be 'A', not 'GROUP A'
    expect(result.current.groupedByGroup['A']).toBeDefined();
    expect(result.current.groupedByGroup['A'][0].id).toBe('gA');
  });

  it('matches without a group are placed under the "ZZZ" key', () => {
    const matches = [makeMatch({ id: 'noGroup', group: undefined })];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(result.current.groupedByGroup['ZZZ']).toBeDefined();
    expect(result.current.groupedByGroup['ZZZ'][0].id).toBe('noGroup');
  });
});

// ---------------------------------------------------------------------------
// orderedGroupKeys
// ---------------------------------------------------------------------------

describe('orderedGroupKeys', () => {
  it('returns group keys sorted alphabetically', () => {
    const matches = [
      makeMatch({ id: 'c1', group: 'C' }),
      makeMatch({ id: 'a1', group: 'A' }),
      makeMatch({ id: 'b1', group: 'B' }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(result.current.orderedGroupKeys).toEqual(['A', 'B', 'C']);
  });

  it('always places the "ZZZ" key (no-group bucket) last', () => {
    const matches = [
      makeMatch({ id: 'noGroup', group: undefined }),
      makeMatch({ id: 'b1', group: 'B' }),
      makeMatch({ id: 'a1', group: 'A' }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    const keys = result.current.orderedGroupKeys;
    expect(keys[keys.length - 1]).toBe('ZZZ');
    expect(keys.slice(0, -1)).toEqual(['A', 'B']);
  });

  it('sorts numeric-style group names numerically', () => {
    const matches = [
      makeMatch({ id: 'm10', group: '10' }),
      makeMatch({ id: 'm2', group: '2' }),
      makeMatch({ id: 'm1', group: '1' }),
    ];

    const { result } = renderHook(() =>
      useMatchList({ matches, participants: noParticipants })
    );

    expect(result.current.orderedGroupKeys).toEqual(['1', '2', '10']);
  });

  it('returns an empty array when there are no matches', () => {
    const { result } = renderHook(() =>
      useMatchList({ matches: [], participants: noParticipants })
    );

    expect(result.current.orderedGroupKeys).toEqual([]);
  });
});
