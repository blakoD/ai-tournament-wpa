import React from 'react';
import { Match, Participant } from '../../types';
import { useMatchList } from './useMatchList';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  onReorderMatches?: (reorderedMatches: Match[]) => void;
  readOnly?: boolean;
}

export const MatchList: React.FC<Props> = ({ matches, participants, onMatchClick, onReorderMatches, readOnly = false }) => {
  const {
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
  } = useMatchList({ matches, participants, onReorderMatches, readOnly });

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
                <th className="px-3 py-2 text-right"></th>
                <th className="px-3 py-2 w-28 text-center">Score</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sortedMatches.map((m, idx) => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const posA = m.participantAId ? (groupPositionMap[m.participantAId] || '?') : '?';
                const posB = m.participantBId ? (groupPositionMap[m.participantBId] || '?') : '?';
                const isDragging = dragIndex === idx;
                const isDragOver = dragOverIndex === idx && dragIndex !== idx;

                // Section separator logic
                const getSectionKey = (match: Match) => {
                  if (sortMode === 'round') return String(match.round || 1);
                  if (sortMode === 'group') {
                    const g = match.group;
                    return g ? g.replace(/^group\s+/i, '').trim().toUpperCase() : 'ZZZ';
                  }
                  return null;
                };
                const currentKey = getSectionKey(m);
                const prevKey = idx > 0 ? getSectionKey(sortedMatches[idx - 1]) : null;
                const showSeparator = sortMode !== 'custom' && (idx === 0 || currentKey !== prevKey);
                const separatorLabel = sortMode === 'round'
                  ? `Round ${m.round || 1}`
                  : currentKey === 'ZZZ' ? 'Without Group' : `Group ${currentKey}`;

                return (
                  <React.Fragment key={m.id}>
                    {showSeparator && (
                      <tr className="bg-slate-900/60">
                        <td
                          colSpan={canDrag ? 5 : 4}
                          className="px-3 py-0.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
                        >
                          {separatorLabel}
                        </td>
                      </tr>
                    )}
                  <tr
                    key={m.id}
                    draggable={canDrag}
                    onDragStart={canDrag ? () => handleDragStart(idx) : undefined}
                    onDragOver={canDrag ? (e) => handleDragOver(e, idx) : undefined}
                    onDrop={canDrag ? (e) => { e.preventDefault(); handleDrop(); } : undefined}
                    onDragEnd={canDrag ? handleDragEnd : undefined}
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
                          <span className={`${m.winnerId === m.participantAId ? 'text-green-400' : 'text-white'}`}>{m.scoreA}</span> 
                          {` – `}
                          <span className={`${m.winnerId === m.participantBId ? 'text-green-400' : 'text-white'}`}>{m.scoreB}</span>
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cards view ── */}
      {viewMode === 'cards' && (() => {
        const sections = sortMode === 'round'
          ? Object.keys(groupedByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(key => ({
              key: `round-${key}`,
              header: `Round ${key}`,
              sectionMatches: groupedByRound[parseInt(key)],
            }))
          : orderedGroupKeys.map(groupKey => ({
              key: `group-${groupKey}`,
              header: groupKey === 'ZZZ' ? 'Without Group' : `Group ${groupKey}`,
              sectionMatches: groupedByGroup[groupKey],
            }));

        const getBadge = (m: Match) =>
          sortMode === 'round'
            ? (m.group ? (m.group.startsWith('Group') ? m.group : `Group ${m.group}`) : null)
            : `Round ${m.round || 1}`;

        return sections.map(({ key, header, sectionMatches }) => (
          <div key={key}>
            <h3 className="text-sm font-bold text-slate-500 uppercase my-3 ml-1">{header}</h3>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sectionMatches.map(m => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const badge = getBadge(m);
                return (
                  <div
                    key={m.id}
                    onClick={() => { if (!readOnly) onMatchClick(m); }}
                    className={`relative rounded-lg border p-3 transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
                      m.isCompleted
                        ? 'bg-slate-800 border-slate-600 opacity-80 hover:opacity-100'
                        : 'bg-slate-800/50 border-blue-900/30 hover:border-blue-500 shadow-sm hover:shadow-md hover:shadow-blue-900/20'
                    }`}
                  >
                    {(badge || !m.isCompleted) && (
                      <div className="flex justify-center items-center mb-2 h-4">
                        {badge && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900/50 px-1.5 py-0.5 mr-2 rounded border border-slate-700/50">
                            {badge}
                          </span>
                        )}
                        {!m.isCompleted && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium truncate ${m.winnerId === m.participantAId ? 'text-green-400' : 'text-slate-300'}`}>
                        {pA?.name || 'TBD'}
                      </span>
                      <span className={`font-mono text-lg font-bold ${m.isCompleted ? (m.winnerId === m.participantAId ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                        {m.scoreA ?? '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium truncate ${m.winnerId === m.participantBId ? 'text-green-400' : 'text-slate-300'}`}>
                        {pB?.name || 'TBD'}
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
        ));
      })()}
    </div>
  );
};