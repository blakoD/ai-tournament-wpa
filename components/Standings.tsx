import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Participant } from '../types';

interface Props {
  participants: Participant[];
  qualifiesByGroup: number | undefined;
  onReplaceParticipant: (oldId: string, newName: string) => void;
  allowEdits: boolean;
  mode?: 'grouped' | 'global';
}

export const Standings: React.FC<Props> = ({ 
  participants, 
  qualifiesByGroup, 
  onReplaceParticipant, 
  allowEdits,
  mode = 'grouped'
}) => {
  const { t } = useTranslation();
  if (!participants || participants.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 italic">
        {t('standings.noParticipants')}
      </div>
    );
  }

  // Group participants
  const groups: Record<string, Participant[]> = {};
  
  if (mode === 'global') {
      // Sort by global rank
      const sorted = [...participants].sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999));
      groups[t('standings.globalStandings')] = sorted;
  } else {
      participants.forEach(p => {
        const g = p.group || 'A';
        if (!groups[g]) groups[g] = [];
        groups[g].push(p);
      });
  }
  
  const groupKeys = Object.keys(groups).sort();
  const showGroups = mode === 'grouped' && groupKeys.length > 1;

  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacingName, setReplacingName] = useState('');

  const handleReplace = (id: string) => {
    setReplacingId(id);
    setReplacingName('');
  };

  const handleConfirmReplace = (id: string) => {
    if (replacingName.trim()) {
      onReplaceParticipant(id, replacingName.trim());
    }
    setReplacingId(null);
  };

  return (
    <div className="space-y-8">
      {groupKeys.map(gKey => {
        const groupParticipants = groups[gKey];
        return (
          <div key={gKey} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
             {(showGroups || mode === 'global') && (
                 <div className="bg-white/95 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-blue-600 dark:text-blue-400">
                     {mode === 'global' ? t('standings.globalStandings') : (gKey.startsWith('Group') ? gKey : t('standings.group', { name: gKey }))}
                 </div>
             )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                    <th className="px-4 py-3 w-12" title={mode === 'global' ? t('standings.globalRank') : t('standings.groupRank')}>#</th>
                    {showGroups && <th className="px-4 py-3 w-16 text-center border-l border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500" title={t('standings.globalRank')}>{t('standings.gp')}</th>}
                    <th className="px-4 py-3">{t('standings.player')}</th>
                    {mode === 'global' && <th className="px-4 py-3 text-center w-16">{t('standings.groupCol')}</th>}
                    <th className="px-4 py-3 text-center w-16">{t('standings.wins')}</th>
                    <th className="px-4 py-3 text-center w-16">{t('standings.matchesPlayed')}</th>
                    <th className="px-4 py-3 text-center w-16">{t('standings.pointsFor')}</th>
                    <th className="px-4 py-3 text-center w-16">{t('standings.pointsAgainst')}</th>
                    <th className="px-4 py-3 text-center w-16">{t('standings.diff')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {groupParticipants.map((p, idx) => {
                    const isQualified = mode === 'grouped' && qualifiesByGroup && p.rank <= qualifiesByGroup;
                    
                    return (
                        <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${isQualified ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                        <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-500">
                            {mode === 'global' ? p.globalRank : p.rank}
                            {isQualified && <span className="ml-1 text-emerald-500 text-xs">●</span>}
                        </td>
                        {showGroups && (
                            <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-600 text-center border-l border-slate-200 dark:border-slate-800">
                                {p.globalRank || '-'}
                            </td>
                        )}
                        <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 dark:text-white flex items-center justify-between gap-2">
                                {replacingId === p.id ? null : (
                                  <div className="flex items-center gap-2">
                                      {p.name}
                                      {p.isDropped && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">{t('standings.dropped')}</span>}
                                  </div>
                                )}
                                {allowEdits && (
                                    replacingId === p.id ? (
                                        <div className="flex w-full items-center gap-1">
                                            <input
                                                autoFocus
                                                value={replacingName}
                                                onChange={e => setReplacingName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleConfirmReplace(p.id);
                                                    if (e.key === 'Escape') setReplacingId(null);
                                                }}
                                                className="text-xs w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded px-2 py-0.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                placeholder={p.name}
                                            />
                                            <button onClick={() => handleConfirmReplace(p.id)} className="text-[15px] text-emerald-400 px-1 hover:text-emerald-300">✓</button>
                                            <button onClick={() => setReplacingId(null)} className="text-[15px] text-red-400 px-1 hover:text-red-300">✕</button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleReplace(p.id)}
                                            className="text-[10px] text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {t('standings.rename')}
                                        </button>
                                    )
                                )}
                            </div>
                        </td>
                        {mode === 'global' && (
                            <td className="px-2 py-3 text-center text-slate-400 dark:text-slate-500 font-mono">
                                <span className="text-[12px] font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-900/50 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700/50">
                                  {p.group}
                                </span>
                            </td>
                        )}
                        <td className="px-4 py-3 text-center font-bold text-emerald-400 dark:text-emerald-400">{p.wins}</td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{p.matchesPlayed}</td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{p.pointsFor}</td>
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
      <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs text-slate-400 dark:text-slate-500 flex justify-between">
        <span>{t('standings.sorting')}</span>
        { qualifiesByGroup &&
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('standings.qualifiedZone', { count: qualifiesByGroup })}</span>
        }
      </div>
    </div>
  );
};