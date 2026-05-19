import { useMemo, useRef, useState } from 'react';
import { Match, Participant } from '../../types';

interface UseMatchListOptions {
  matches: Match[];
  participants: Participant[];
  onReorderMatches?: (reorderedMatches: Match[]) => void;
  readOnly?: boolean;
}

export function useMatchList({ matches, participants, onReorderMatches, readOnly = false }: UseMatchListOptions) {
  const [sortMode, setSortMode] = useState<'round' | 'group' | 'custom'>('group');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canDrag = !readOnly && !!onReorderMatches && sortMode === 'custom';

  // Track last non-custom sort so Custom can inherit that order as initial state
  const prevSortModeRef = useRef<'round' | 'group'>('group');

  const normalizeGroup = (group?: string): string => {
    if (!group) return 'ZZZ';
    return group.replace(/^group\s+/i, '').trim().toUpperCase();
  };

  // Compute group position labels (A1, B2, etc.) for participants in this stage
  const groupPositionMap = useMemo(() => {
    const map: Record<string, string> = {};
    const matchParticipantIds = new Set(
      matches.flatMap(m => [m.participantAId, m.participantBId]).filter((id): id is string => !!id)
    );
    const groupBuckets: Record<string, Participant[]> = {};
    participants
      .filter(p => matchParticipantIds.has(p.id))
      .forEach(p => {
        const g = p.group || 'A';
        if (!groupBuckets[g]) groupBuckets[g] = [];
        groupBuckets[g].push(p);
      });
    Object.entries(groupBuckets).forEach(([g, ps]) => {
      const sorted = [...ps].sort((a, b) => (a.groupSort ?? 9999) - (b.groupSort ?? 9999));
      sorted.forEach((p, idx) => { map[p.id] = `${g}${idx + 1}`; });
    });
    return map;
  }, [participants, matches]);

  // Maps participant ID → groupSort value for efficient sort key lookup
  const groupSortMap = useMemo(() => {
    const map = new Map<string, number>();
    participants.forEach(p => { map.set(p.id, p.groupSort ?? 9999); });
    return map;
  }, [participants]);

  const sortByRound = (arr: Match[]) =>
    [...arr].sort((a, b) => {
      const roundDiff = (a.round || 1) - (b.round || 1);
      if (roundDiff !== 0) return roundDiff;
      // Within same round: sort by min(groupSort of participants) then by group name
      // e.g. Round 1: A1vsA2, B1vsB2, C1vsC2, A3vsA4, B3vsB4, C3vsC4
      const slotA = Math.min(
        a.participantAId ? (groupSortMap.get(a.participantAId) ?? 9999) : 9999,
        a.participantBId ? (groupSortMap.get(a.participantBId) ?? 9999) : 9999,
      );
      const slotB = Math.min(
        b.participantAId ? (groupSortMap.get(b.participantAId) ?? 9999) : 9999,
        b.participantBId ? (groupSortMap.get(b.participantBId) ?? 9999) : 9999,
      );
      if (slotA !== slotB) return slotA - slotB;
      return normalizeGroup(a.group).localeCompare(normalizeGroup(b.group), undefined, { numeric: true });
    });

  const sortByGroup = (arr: Match[]) =>
    [...arr].sort((a, b) => {
      const gA = normalizeGroup(a.group);
      const gB = normalizeGroup(b.group);
      if (gA !== gB) return gA.localeCompare(gB, undefined, { numeric: true });
      return (a.round || 1) - (b.round || 1);
    });

  const sortedMatches = useMemo(() => {
    if (sortMode === 'custom') {
      const hasSortOrder = matches.some(m => m.sortOrder !== undefined);
      if (hasSortOrder) return [...matches].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
      // No saved order yet — inherit current non-custom sort as starting point
      return prevSortModeRef.current === 'round' ? sortByRound(matches) : sortByGroup(matches);
    }
    if (sortMode === 'round') return sortByRound(matches);
    return sortByGroup(matches);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, sortMode, groupSortMap]);

  // Group by round (for cards view) — derived from sortedMatches to preserve sort order
  const groupedByRound = useMemo(() =>
    sortedMatches.reduce((acc, match) => {
      const r = match.round || 1;
      if (!acc[r]) acc[r] = [];
      acc[r].push(match);
      return acc;
    }, {} as Record<number, Match[]>),
  [sortedMatches]);

  const groupedByGroup = useMemo(() =>
    sortedMatches.reduce((acc, match) => {
      const key = normalizeGroup(match.group);
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {} as Record<string, Match[]>),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sortedMatches]);

  const orderedGroupKeys = useMemo(() =>
    Object.keys(groupedByGroup).sort((a, b) => {
      if (a === 'ZZZ') return 1;
      if (b === 'ZZZ') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    }),
  [groupedByGroup]);

  const handleSortModeChange = (mode: 'round' | 'group' | 'custom') => {
    if (mode !== 'custom') prevSortModeRef.current = mode;
    setSortMode(mode);
  };

  const handleSetViewMode = (mode: 'cards' | 'list') => {
    if (mode === 'cards' && sortMode === 'custom') handleSortModeChange('round');
    setViewMode(mode);
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...sortedMatches];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);
    onReorderMatches?.(reordered.map((m, idx) => ({ ...m, sortOrder: idx })));
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (idx: number) => setDragIndex(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== idx) setDragOverIndex(idx);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return {
    sortMode,
    viewMode,
    dragIndex,
    dragOverIndex,
    canDrag,
    groupPositionMap,
    sortedMatches,
    groupedByRound,
    groupedByGroup,
    orderedGroupKeys,
    handleSortModeChange,
    handleSetViewMode,
    handleDrop,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
