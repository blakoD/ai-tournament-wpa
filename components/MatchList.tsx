import React from 'react';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  readOnly?: boolean;
}

export const MatchList: React.FC<Props> = ({ matches, participants, onMatchClick, readOnly = false }) => {
  const [sortMode, setSortMode] = React.useState<'round' | 'group'>('group');

  // Group by round for the default current behavior.
  const groupedByRound = matches.reduce((acc, match) => {
    const r = match.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const normalizeGroup = (group?: string): string => {
    if (!group) return 'ZZZ';
    return group.replace(/^group\s+/i, '').trim().toUpperCase();
  };

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

  return (
    <div className="">
      <div className="flex justify-end">
        <label className="text-xs text-slate-400 flex items-center gap-2">
          Order by
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'round' | 'group')}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          >
            <option value="group">Group</option>
            <option value="round">Round</option>
          </select>
        </label>
      </div>

      {sortMode === 'round' && Object.keys(groupedByRound).sort((a,b) => parseInt(a)-parseInt(b)).map(round => (
        <div key={`round-${round}`}>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">Round {round}</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groupedByRound[parseInt(round)].map(m => {
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

      {sortMode === 'group' && orderedGroupKeys.map((groupKey, ix) => (
        <div key={`group-${groupKey}`} className={ix > 0 ? 'mt-3' : ''}>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">
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