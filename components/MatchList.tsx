import React, { useMemo, useRef, useState } from 'react';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  onReorderMatches?: (reorderedMatches: Match[]) => void;
  readOnly?: boolean;
}

export const MatchList: React.FC<Props> = ({ matches, participants, onMatchClick, onReorderMatches, readOnly = false }) => {
  const [sortMode, setSortMode] = useState<'round' | 'group' | 'custom'>('group');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canDrag = !readOnly && !!onReorderMatches && sortMode === 'custom';

  // Track last non-custom sort so Custom can inherit that order as initial state
  const prevSortModeRef = useRef<'round' | 'group'>('group');

  const handleSortModeChange = (mode: 'round' | 'group' | 'custom') => {
    if (mode !== 'custom') prevSortModeRef.current = mode;
    setSortMode(mode);
  };

  const handleSetViewMode = (mode: 'cards' | 'list') => {
    if (mode === 'cards' && sortMode === 'custom') handleSortModeChange('round');
    setViewMode(mode);
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
      ps.forEach((p, idx) => { map[p.id] = `${g}${idx + 1}`; });
    });
    return map;
  }, [participants, matches]);

  const normalizeGroup = (group?: string): string => {
    if (!group) return 'ZZZ';
    return group.replace(/^group\s+/i, '').trim().toUpperCase();
  };

  // Slot index per match within its (round, group) bucket — preserves scheduler order for interleaving
  const slotMap = useMemo(() => {
    const map = new Map<string, number>();
    const counts = new Map<string, number>();
    matches.forEach(m => {
      const key = `${m.round}|${m.group || ''}`;
      const slot = counts.get(key) ?? 0;
      map.set(m.id, slot);
      counts.set(key, slot + 1);
    });
    return map;
  }, [matches]);

  const sortByRound = (arr: Match[]) =>
    [...arr].sort((a, b) => {
      if ((a.round || 1) !== (b.round || 1)) return (a.round || 1) - (b.round || 1);
      // Within same round: interleave by slot then group (A1vsA2, B1vsB2, C1vsC2, A3vsA4, ...)
      const slotDiff = (slotMap.get(a.id) ?? 0) - (slotMap.get(b.id) ?? 0);
      if (slotDiff !== 0) return slotDiff;
      return normalizeGroup(a.group).localeCompare(normalizeGroup(b.group), undefined, { numeric: true });
    });

  const sortByGroup = (arr: Match[]) =>
    [...arr].sort((a, b) => {
      const gA = normalizeGroup(a.group);
      const gB = normalizeGroup(b.group);
      if (gA !== gB) return gA.localeCompare(gB, undefined, { numeric: true });
      return (a.round || 1) - (b.round || 1);
    });

  const sortedListMatches = useMemo(() => {
    if (sortMode === 'custom') {
      const hasSortOrder = matches.some(m => m.sortOrder !== undefined);
      if (hasSortOrder) return [...matches].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
      // No saved order yet — inherit current non-custom sort as starting point
      return prevSortModeRef.current === 'round' ? sortByRound(matches) : sortByGroup(matches);
    }
    if (sortMode === 'round') return sortByRound(matches);
    return sortByGroup(matches);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, sortMode, slotMap]);

  // Group by round (for cards view)
  const groupedByRound = matches.reduce((acc, match) => {
    const r = match.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const groupedByGroup = matches.reduce((acc, match) => {
    const key = normalizeGroup(match.group);
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const orderedGroupKeys = Object.keys(groupedByGroup).sort((a, b) => {
    if (a === 'ZZZ') return 1;
    if (b === 'ZZZ') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...sortedListMatches];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);
    onReorderMatches?.(reordered.map((m, idx) => ({ ...m, sortOrder: idx })));
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="">
      {/* Controls */}
      <div className="flex justify-end items-center gap-3 mb-3">
        <label className="text-xs text-slate-400 flex items-center gap-2">
          Order by
          <select
            value={sortMode}
            onChange={(e) => handleSortModeChange(e.target.value as 'round' | 'group' | 'custom')}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          >
            <option value="group">Group</option>
            <option value="round">Round</option>
            {viewMode === 'list' && <option value="custom">Custom</option>}
          </select>
        </label>
        {/* View toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded overflow-hidden text-xs">
          <button
            onClick={() => handleSetViewMode('cards')}
            title="Cards view"
            className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            Cards
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            title="List view"
            className={`px-2.5 py-1.5 flex items-center gap-1 border-l border-slate-700 transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
              <rect x="1" y="12" width="14" height="2" rx="1"/>
            </svg>
            List
          </button>
        </div>
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          {canDrag && (
            <div className="px-3 py-1.5 bg-slate-900/70 border-b border-slate-700 text-xs text-slate-500 flex items-center gap-1.5 select-none">
              <span className="text-slate-600 text-base leading-none">⠿</span> Drag rows to reorder — order is saved automatically
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-500 text-xs uppercase border-b border-slate-700">
              <tr>
                {canDrag && <th className="w-8"></th>}
                <th className="px-3 py-2 w-10 text-center text-slate-600">#</th>
                <th className="px-3 py-2 text-right">Home</th>
                <th className="px-3 py-2 w-28 text-center">Score</th>
                <th className="px-3 py-2 text-left">Away</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sortedListMatches.map((m, idx) => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const posA = m.participantAId ? (groupPositionMap[m.participantAId] || '?') : '?';
                const posB = m.participantBId ? (groupPositionMap[m.participantBId] || '?') : '?';
                const isDragging = dragIndex === idx;
                const isDragOver = dragOverIndex === idx && dragIndex !== idx;

                return (
                  <tr
                    key={m.id}
                    draggable={canDrag}
                    onDragStart={canDrag ? () => setDragIndex(idx) : undefined}
                    onDragOver={canDrag ? (e) => { e.preventDefault(); if (dragIndex !== idx) setDragOverIndex(idx); } : undefined}
                    onDrop={canDrag ? (e) => { e.preventDefault(); handleDrop(); } : undefined}
                    onDragEnd={canDrag ? () => { setDragIndex(null); setDragOverIndex(null); } : undefined}
                    onClick={() => { if (!readOnly) onMatchClick(m); }}
                    className={[
                      'transition-colors',
                      readOnly ? 'cursor-default' : 'cursor-pointer',
                      isDragging ? 'opacity-30 bg-slate-700' : '',
                      isDragOver ? 'bg-blue-900/20 border-t-2 border-t-blue-500' : '',
                      !isDragging && !isDragOver ? (m.isCompleted ? 'bg-slate-800 hover:bg-slate-700/50' : 'bg-slate-800/40 hover:bg-slate-700/30') : '',
                    ].join(' ')}
                  >
                    {canDrag && (
                      <td className="px-2 text-center text-slate-600 cursor-grab active:cursor-grabbing select-none text-base leading-none">
                        ⠿
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-500">{idx + 1}</td>
                    {/* Team A */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium truncate max-w-[130px] ${m.winnerId === m.participantAId ? 'text-green-400' : 'text-slate-200'}`}>
                          {pA?.name || 'TBD'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/50 shrink-0">
                          {posA}
                        </span>
                      </div>
                    </td>
                    {/* Score */}
                    <td className="px-3 py-2.5 text-center w-28">
                      {m.isCompleted ? (
                        <span className="font-mono font-bold text-white text-base tabular-nums">
                          {m.scoreA} – {m.scoreB}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs flex items-center justify-center gap-1.5">
                          vs
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block"></span>
                        </span>
                      )}
                    </td>
                    {/* Team B */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/50 shrink-0">
                          {posB}
                        </span>
                        <span className={`font-medium truncate max-w-[130px] ${m.winnerId === m.participantBId ? 'text-green-400' : 'text-slate-200'}`}>
                          {pB?.name || 'TBD'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cards view — Round sort ── */}
      {viewMode === 'cards' && sortMode === 'round' && Object.keys(groupedByRound).sort((a,b) => parseInt(a)-parseInt(b)).map(round => (
        <div key={`round-${round}`}>
          <h3 className="text-sm font-bold text-slate-500 uppercase my-3 ml-1">Round {round}</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groupedByRound[parseInt(round)]
              .slice()
              .sort((a, b) => {
                const slotDiff = (slotMap.get(a.id) ?? 0) - (slotMap.get(b.id) ?? 0);
                if (slotDiff !== 0) return slotDiff;
                return normalizeGroup(a.group).localeCompare(normalizeGroup(b.group), undefined, { numeric: true });
              })
              .map(m => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const nameA = pA?.name || "TBD";
                const nameB = pB?.name || "TBD";
                const groupName = m.group ? (m.group.startsWith('Group') ? m.group : `Group ${m.group}`) : null;

                return (
                    <div 
                        key={m.id}
                        onClick={() => { if (!readOnly) onMatchClick(m)}}
                        className={`
                        relative rounded-lg border p-3 transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                            ${m.isCompleted 
                                ? 'bg-slate-800 border-slate-600 opacity-80 hover:opacity-100' 
                                : 'bg-slate-800/50 border-blue-900/30 hover:border-blue-500 shadow-sm hover:shadow-md hover:shadow-blue-900/20'}
                        `}
                    >
                        {(groupName || !m.isCompleted) && (
                            <div className="flex justify-center items-center mb-2 h-4">
                                {groupName ? (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900/50 px-1.5 py-0.5 mr-2 rounded border border-slate-700/50">
                                        {groupName}
                                    </span>
                                ) : <span></span>}
                                
                                {!m.isCompleted && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                            <span className={`font-medium truncate ${m.winnerId === m.participantAId ? 'text-green-400' : 'text-slate-300'}`}>
                                {nameA}
                            </span>
                            <span className={`font-mono text-lg font-bold ${m.isCompleted ? (m.winnerId === m.participantAId ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                                {m.scoreA ?? '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`font-medium truncate ${m.winnerId === m.participantBId ? 'text-green-400' : 'text-slate-300'}`}>
                                {nameB}
                            </span>
                            <span className={`font-mono text-lg font-bold ${m.isCompleted ? (m.winnerId === m.participantBId ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                                {m.scoreB ?? '-'}
                            </span>
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
      ))}

      {/* ── Cards view — Group sort ── */}
      {viewMode === 'cards' && sortMode === 'group' && orderedGroupKeys.map(groupKey => (
        <div key={`group-${groupKey}`}>
          <h3 className="text-sm font-bold text-slate-500 uppercase my-3 ml-1">
            {groupKey === 'ZZZ' ? 'Without Group' : `Group ${groupKey}`}
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groupedByGroup[groupKey]
              .slice()
              .sort((a, b) => (a.round || 1) - (b.round || 1))
              .map(m => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const nameA = pA?.name || "TBD";
                const nameB = pB?.name || "TBD";

                return (
                  <div
                    key={m.id}
                    onClick={() => { if (!readOnly) onMatchClick(m); }}
                    className={`
                        relative rounded-lg border p-3 transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                            ${m.isCompleted
                                ? 'bg-slate-800 border-slate-600 opacity-80 hover:opacity-100'
                                : 'bg-slate-800/50 border-blue-900/30 hover:border-blue-500 shadow-sm hover:shadow-md hover:shadow-blue-900/20'}
                        `}
                  >
                    <div className="flex justify-center items-center mb-2 h-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                        Round {m.round || 1}
                      </span>
                      {!m.isCompleted && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2"></div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium truncate ${m.winnerId === m.participantAId ? 'text-green-400' : 'text-slate-300'}`}>
                        {nameA}
                      </span>
                      <span className={`font-mono text-lg font-bold ${m.isCompleted ? (m.winnerId === m.participantAId ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                        {m.scoreA ?? '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium truncate ${m.winnerId === m.participantBId ? 'text-green-400' : 'text-slate-300'}`}>
                        {nameB}
                      </span>
                      <span className={`font-mono text-lg font-bold ${m.isCompleted ? (m.winnerId === m.participantBId ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                        {m.scoreB ?? '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};