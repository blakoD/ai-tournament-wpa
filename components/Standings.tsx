import React from 'react';
import { Participant } from '../types';

interface Props {
  participants: Participant[];
  qualifiesByGroup: number;
  onReplaceParticipant: (oldId: string, newName: string) => void;
  onUpdateRankManual: (id: string, val: number) => void;
  allowEdits: boolean;
  mode?: 'grouped' | 'global';
}

export const Standings: React.FC<Props> = ({ 
  participants, 
  qualifiesByGroup, 
  onReplaceParticipant, 
  onUpdateRankManual, 
  allowEdits,
  mode = 'grouped'
}) => {
  if (!participants || participants.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-500 italic">
        No participants found in this tournament.
      </div>
    );
  }

  // Group participants
  const groups: Record<string, Participant[]> = {};
  
  if (mode === 'global') {
      // Sort by global rank
      const sorted = [...participants].sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999));
      groups['Global Standings'] = sorted;
  } else {
      participants.forEach(p => {
        const g = p.group || 'A';
        if (!groups[g]) groups[g] = [];
        groups[g].push(p);
      });
  }
  
  const groupKeys = Object.keys(groups).sort();
  const showGroups = mode === 'grouped' && groupKeys.length > 1;

  const handleReplace = (id: string) => {
    const newName = prompt("Enter replacement player name:");
    if (newName && newName.trim()) {
      onReplaceParticipant(id, newName.trim());
    }
  };

  return (
    <div className="space-y-8">
      {groupKeys.map(gKey => {
        const groupParticipants = groups[gKey];
        return (
          <div key={gKey} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
             {(showGroups || mode === 'global') && (
                 <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700 font-bold text-blue-400">
                     {mode === 'global' ? 'Global Standings' : (gKey.startsWith('Group') ? gKey : `Group ${gKey}`)}
                 </div>
             )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase font-medium border-b border-slate-700">
                    <tr>
                    <th className="px-4 py-3 w-12" title={mode === 'global' ? "Global Rank" : "Group Rank"}>#</th>
                    {showGroups && <th className="px-4 py-3 w-16 text-center border-l border-slate-800 text-slate-500" title="Global Rank">Gp</th>}
                    <th className="px-4 py-3">Player</th>
                    {mode === 'global' && <th className="px-4 py-3 text-center w-16">Group</th>}
                    <th className="px-4 py-3 text-center w-16">G</th>
                    <th className="px-4 py-3 text-center w-16">PJ</th>
                    <th className="px-4 py-3 text-center w-16">PF</th>
                    <th className="px-4 py-3 text-center w-16">PC</th>
                    <th className="px-4 py-3 text-center w-16">Diff</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {groupParticipants.map((p, idx) => {
                    const isQualified = mode === 'grouped' && p.rank <= qualifiesByGroup;
                    
                    return (
                        <tr key={p.id} className={`hover:bg-slate-700/50 transition-colors group ${isQualified ? 'bg-emerald-900/10' : ''}`}>
                        <td className="px-4 py-3 font-mono text-slate-500">
                            {mode === 'global' ? p.globalRank : p.rank}
                            {isQualified && <span className="ml-1 text-emerald-500 text-xs">●</span>}
                        </td>
                        {showGroups && (
                            <td className="px-4 py-3 font-mono text-slate-600 text-center border-l border-slate-800">
                                {p.globalRank || '-'}
                            </td>
                        )}
                        <td className="px-4 py-3">
                            <div className="font-medium text-white flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {p.name}
                                    {p.isDropped && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">DROPPED</span>}
                                </div>
                                {allowEdits && (
                                    <button 
                                        onClick={() => handleReplace(p.id)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Replace
                                    </button>
                                )}
                            </div>
                            {p.originalId && <div className="text-xs text-slate-500">Replaced prev. player</div>}
                        </td>
                        {mode === 'global' && (
                            <td className="px-2 py-3 text-center text-slate-500 font-mono">
                                <span className="text-[12px] font-bold text-slate-500 uppercase bg-slate-900/50 px-1.5 py-1 rounded border border-slate-700/50">
                                  {p.group}
                                </span>
                            </td>
                        )}
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">{p.wins}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{p.matchesPlayed}</td>
                        <td className="px-4 py-3 text-center text-slate-300">{p.pointsFor}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{p.pointsAgainst}</td>
                        <td className={`px-4 py-3 text-center font-medium ${ (p.pointsFor - p.pointsAgainst) > 0 ? 'text-blue-400' : 'text-red-400' }`}>
                            {p.pointsFor - p.pointsAgainst}
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </div>
        );
      })}
      <div className="bg-slate-900 px-4 py-2 text-xs text-slate-500 flex justify-between">
         <span>Sorting: Wins &gt; Diff &gt; Points For &gt; Manual</span>
         <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Qualified Zone (Top {qualifiesByGroup} per Group)</span>
      </div>
    </div>
  );
};