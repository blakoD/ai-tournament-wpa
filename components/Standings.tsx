import React from 'react';
import { Participant } from '../types';

interface Props {
  participants: Participant[];
  qualificationCount: number;
  onReplaceParticipant: (oldId: string, newName: string) => void;
  onUpdateRankManual: (id: string, val: number) => void;
  allowEdits: boolean;
}

export const Standings: React.FC<Props> = ({ participants, qualificationCount }) => {
  // Group participants
  const groups: Record<string, Participant[]> = {};
  participants.forEach(p => {
    const g = p.group || 'A';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  
  const groupKeys = Object.keys(groups).sort();
  const showGroups = groupKeys.length > 1;

  return (
    <div className="space-y-8">
      {groupKeys.map(gKey => {
        const groupParticipants = groups[gKey];
        return (
          <div key={gKey} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
             {showGroups && (
                 <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700 font-bold text-blue-400">
                     Group {gKey}
                 </div>
             )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase font-medium border-b border-slate-700">
                    <tr>
                    <th className="px-4 py-3 w-12" title="Group Rank">#</th>
                    {showGroups && <th className="px-4 py-3 w-16 text-center border-l border-slate-800 text-slate-500" title="Global Rank">G.Pos</th>}
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center w-16">G</th>
                    <th className="px-4 py-3 text-center w-16">PJ</th>
                    <th className="px-4 py-3 text-center w-16">PF</th>
                    <th className="px-4 py-3 text-center w-16">PC</th>
                    <th className="px-4 py-3 text-center w-16">Diff</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {groupParticipants.map((p, idx) => {
                    // Use the total qualification count directly as requested
                    const qualifiedLimit = qualificationCount;
                    // Check against Global Rank if available (for Total count)
                    const isQualified = (p.globalRank || 999) <= qualifiedLimit;
                    
                    return (
                        <tr key={p.id} className={`hover:bg-slate-700/50 transition-colors ${isQualified ? 'bg-emerald-900/10' : ''}`}>
                        <td className="px-4 py-3 font-mono text-slate-500">
                            {p.rank}
                            {isQualified && <span className="ml-1 text-emerald-500 text-xs">●</span>}
                        </td>
                        {showGroups && (
                            <td className="px-4 py-3 font-mono text-slate-600 text-center border-l border-slate-800">
                                {p.globalRank || '-'}
                            </td>
                        )}
                        <td className="px-4 py-3">
                            <div className="font-medium text-white flex items-center gap-2">
                                {p.name}
                                {p.isDropped && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">DROPPED</span>}
                            </div>
                            {p.originalId && <div className="text-xs text-slate-500">Replaced prev. player</div>}
                        </td>
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
         <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Qualified Zone (Top {qualificationCount} Global)</span>
      </div>
    </div>
  );
};