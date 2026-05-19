import { describe, it, expect } from 'vitest';
import { generateRoundRobinMatches } from '../tournamentLogic';
import { Match, Participant, StageType } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Returns a canonical "XvY" label for a match (lower ID first). */
const pairLabel = (m: Match): string => {
  const ids = [m.participantAId ?? '', m.participantBId ?? ''].sort();
  return `${ids[0]}v${ids[1]}`;
};

/** Matches in a given round, represented as sorted pair labels. */
const pairsInRound = (matches: Match[], round: number): string[] =>
  matches
    .filter(m => m.round === round)
    .map(pairLabel)
    .sort();

// ---------------------------------------------------------------------------
// generateRoundRobinMatches
// ---------------------------------------------------------------------------

describe('generateRoundRobinMatches', () => {
  // ── Main scenario ──────────────────────────────────────────────────────────

  it('12 players / 3 groups of 4 / 3 rounds — correct pairings per round', () => {
    const participants = [
      // Group A — seeds 1-4
      makeParticipant({ id: 'a1', group: 'A', groupSort: 1 }),
      makeParticipant({ id: 'a2', group: 'A', groupSort: 2 }),
      makeParticipant({ id: 'a3', group: 'A', groupSort: 3 }),
      makeParticipant({ id: 'a4', group: 'A', groupSort: 4 }),
      // Group B — seeds 1-4
      makeParticipant({ id: 'b1', group: 'B', groupSort: 1 }),
      makeParticipant({ id: 'b2', group: 'B', groupSort: 2 }),
      makeParticipant({ id: 'b3', group: 'B', groupSort: 3 }),
      makeParticipant({ id: 'b4', group: 'B', groupSort: 4 }),
      // Group C — seeds 1-4
      makeParticipant({ id: 'c1', group: 'C', groupSort: 1 }),
      makeParticipant({ id: 'c2', group: 'C', groupSort: 2 }),
      makeParticipant({ id: 'c3', group: 'C', groupSort: 3 }),
      makeParticipant({ id: 'c4', group: 'C', groupSort: 4 }),
    ];

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    // C(4,2) = 6 pairs per group × 3 groups = 18 matches total
    expect(matches).toHaveLength(18);
    expect(new Set(matches.map(m => m.round))).toEqual(new Set([1, 2, 3]));

    // Round 1: adjacent seeds — A1vsA2, B1vsB2, C1vsC2, A3vsA4, B3vsB4, C3vsC4
    expect(pairsInRound(matches, 1)).toEqual(
      ['a1va2', 'a3va4', 'b1vb2', 'b3vb4', 'c1vc2', 'c3vc4'].sort()
    );

    // Round 2: A1vsA3, B1vsB3, C1vsC3, A2vsA4, B2vsB4, C2vsC4
    expect(pairsInRound(matches, 2)).toEqual(
      ['a1va3', 'a2va4', 'b1vb3', 'b2vb4', 'c1vc3', 'c2vc4'].sort()
    );

    // Round 3: A1vsA4, B1vsB4, C1vsC4, A2vsA3, B2vsB3, C2vsC3
    expect(pairsInRound(matches, 3)).toEqual(
      ['a1va4', 'a2va3', 'b1vb4', 'b2vb3', 'c1vc4', 'c2vc3'].sort()
    );
  });

  // ── Round count ───────────────────────────────────────────────────────────

  it('4 players in one group produce 3 rounds', () => {
    const participants = [1, 2, 3, 4].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    expect(matches).toHaveLength(6); // C(4,2) = 6
    expect(new Set(matches.map(m => m.round))).toEqual(new Set([1, 2, 3]));
    // Each round has exactly 2 matches (4/2)
    [1, 2, 3].forEach(r => {
      expect(matches.filter(m => m.round === r)).toHaveLength(2);
    });
  });

  it('2 players in one group produce 1 round with 1 match', () => {
    const participants = [1, 2].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    expect(matches).toHaveLength(1);
    expect(matches[0].round).toBe(1);
    expect(pairLabel(matches[0])).toBe('p1vp2');
  });

  // ── Every pair plays exactly once ─────────────────────────────────────────

  it('every pair of participants plays exactly once', () => {
    const participants = [1, 2, 3, 4, 5, 6].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    // C(6,2) = 15 pairs, each played once
    expect(matches).toHaveLength(15);
    const labels = matches.map(pairLabel);
    expect(new Set(labels).size).toBe(15); // all unique
  });

  // ── Round 1: seeds 1&2 always play each other ─────────────────────────────

  it('seed-1 plays seed-2 in Round 1 (adjacent-first schedule)', () => {
    const participants = [1, 2, 3, 4].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    const round1Pairs = pairsInRound(matches, 1);
    expect(round1Pairs).toContain('p1vp2');
    expect(round1Pairs).toContain('p3vp4');
  });

  // ── Odd number of players (BYE) ───────────────────────────────────────────

  it('3 players produce 3 rounds with 1 match each (BYE absorbs the odd slot)', () => {
    const participants = [1, 2, 3].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    // BYE added internally → 4-player schedule, but BYE matches are excluded
    expect(matches).toHaveLength(3); // C(3,2) = 3 real matches
    // Each participant appears in exactly 2 matches
    ['p1', 'p2', 'p3'].forEach(id => {
      const count = matches.filter(m => m.participantAId === id || m.participantBId === id).length;
      expect(count).toBe(2);
    });
  });

  // ── Participants sorted by groupSort regardless of input order ─────────────

  it('respects groupSort order regardless of input order', () => {
    // Feed participants in reverse groupSort order
    const participants = [4, 3, 2, 1].map(i =>
      makeParticipant({ id: `p${i}`, group: 'A', groupSort: i })
    );

    const matches = generateRoundRobinMatches('t1', participants, StageType.RR, 1);

    // p1 (lowest groupSort) must play p2 in Round 1
    expect(pairsInRound(matches, 1)).toContain('p1vp2');
  });

  // ── Match metadata ────────────────────────────────────────────────────────

  it('assigns correct tournamentId, stage, stageNumber and group to each match', () => {
    const participants = [1, 2].map(i =>
      makeParticipant({ id: `p${i}`, group: 'X', groupSort: i })
    );

    const matches = generateRoundRobinMatches('my-tournament', participants, StageType.RR, 2);

    expect(matches[0].tournamentId).toBe('my-tournament');
    expect(matches[0].stage).toBe(StageType.RR);
    expect(matches[0].stageNumber).toBe(2);
    expect(matches[0].group).toBe('X');
    expect(matches[0].isCompleted).toBe(false);
    expect(matches[0].scoreA).toBeNull();
    expect(matches[0].scoreB).toBeNull();
    expect(matches[0].winnerId).toBeNull();
  });
});
