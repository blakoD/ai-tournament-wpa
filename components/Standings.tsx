import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Participant } from '../types';

interface Props {
  participants: Participant[];
  qualifiesByGroup: number | undefined;
  onReplaceParticipant: (oldId: string, newName: string) => void;
  allowEdits: boolean;
  mode?: 'grouped' | 'global';
  groupDescriptions?: Record<string, string>;
  /** Tighter cells for narrow side columns (desktop Groups stage); hides the GP column. */
  compact?: boolean;
  /** Rendered next to its own group's matches: no group header and no legend footer. */
  embedded?: boolean;
}

export const Standings: React.FC<Props> = ({
  participants,
  qualifiesByGroup,
  onReplaceParticipant,
  allowEdits,
  mode = 'grouped',
  groupDescriptions,
  compact = false,
  embedded = false
}) => {
  const { t } = useTranslation();
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacingName, setReplacingName] = useState('');

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
  const showGpColumn = showGroups && !compact;

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

  const thClass = compact ? 'px-2 py-2' : 'px-2 sm:px-4 py-2 sm:py-3';
  const tdClass = compact ? 'px-2 py-2' : 'px-2 sm:px-4 py-2 sm:py-3';
  // Compact cells for rank/numeric columns so every stat fits on ~360px screens
  const rankThClass = compact ? 'px-2 py-2 w-8 whitespace-nowrap' : 'px-1.5 sm:px-4 py-2 sm:py-3 w-8 sm:w-12 whitespace-nowrap';
  const rankTdClass = compact ? 'px-2 py-2 whitespace-nowrap' : 'px-1.5 sm:px-4 py-2 sm:py-3 whitespace-nowrap';
  const numThClass = compact ? 'px-2 py-2 text-center w-11 whitespace-nowrap' : 'px-1.5 sm:px-4 py-2 sm:py-3 text-center w-10 sm:w-16 whitespace-nowrap';
  const numTdClass = compact ? 'px-2 py-2 text-center text-sm tabular-nums' : 'px-1.5 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm tabular-nums';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4 sm:space-y-8'}>
      {groupKeys.map(gKey => {
        const groupParticipants = groups[gKey];
        const groupDescription = mode === 'grouped' ? groupDescriptions?.[gKey]?.trim() : undefined;
        return (
          <div key={gKey} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
             {!embedded && (showGroups || groupDescription) && (
                 <div className="bg-white/95 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-baseline gap-1.5 min-w-0">
                     <span className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                       {gKey.startsWith('Group') ? gKey : t('standings.group', { name: gKey })}
                     </span>
                     {groupDescription && (
                       <>
                         <span className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true">·</span>
                         <span className="text-sm text-slate-500 dark:text-slate-400 truncate min-w-0" title={groupDescription}>{groupDescription}</span>
                       </>
                     )}
                 </div>
             )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                    <th className={rankThClass} title={mode === 'global' ? t('standings.globalRank') : t('standings.groupRank')}>#</th>
                    {showGpColumn && <th className={`${thClass} hidden sm:table-cell w-16 text-center whitespace-nowrap border-l border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500`} title={t('standings.globalRank')}>{t('standings.gp')}</th>}
                    <th className={thClass}>{t('standings.playerName')}</th>
                    {mode === 'global' && <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-center w-12 sm:w-16 whitespace-nowrap">{t('standings.groupCol')}</th>}
                    <th className={numThClass}>{t('standings.matchesPlayed')}</th>
                    <th className={numThClass}>{t('standings.wins')}</th>
                    <th className={numThClass}>{t('standings.pointsFor')}</th>
                    <th className={numThClass}>{t('standings.pointsAgainst')}</th>
                    <th className={numThClass}>{t('standings.diff')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {groupParticipants.map((p) => {
                    const isQualified = mode === 'grouped' && qualifiesByGroup && p.rank <= qualifiesByGroup;
                    const diff = p.pointsFor - p.pointsAgainst;

                    return (
                        <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${isQualified ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                        <td className={`${rankTdClass} font-mono text-slate-400 dark:text-slate-500`}>
                            {mode === 'global' ? p.globalRank : p.rank}
                            {isQualified && <span className="ml-1 text-emerald-500 text-xs">●</span>}
                        </td>
                        {showGpColumn && (
                            <td className={`${tdClass} hidden sm:table-cell font-mono text-slate-400 dark:text-slate-600 text-center border-l border-slate-200 dark:border-slate-800`}>
                                {p.globalRank || '-'}
                            </td>
                        )}
                        <td className={compact ? `${tdClass} max-w-0 w-full` : tdClass}>
                            <div className="font-medium text-slate-900 dark:text-white flex items-center justify-between gap-2 min-w-0">
                                {replacingId === p.id ? null : (
                                  <div className={`flex items-center gap-2 ${compact ? 'min-w-0' : ''}`} title={compact ? p.name : undefined}>
                                      <span className={compact ? 'truncate' : undefined}>{p.name}</span>
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
                                            className="text-xs px-2 py-1 text-blue-400 hover:text-blue-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        >
                                            {t('standings.rename')}
                                        </button>
                                    )
                                )}
                            </div>
                        </td>
                        {mode === 'global' && (
                            <td className="px-1.5 sm:px-2 py-2 sm:py-3 text-center text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                                <span className="whitespace-nowrap text-[12px] font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-900/50 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700/50">
                                  {p.group}
                                </span>
                            </td>
                        )}
                        <td className={`${numTdClass} text-slate-500 dark:text-slate-400`}>{p.matchesPlayed}</td>
                        <td className={`${numTdClass} font-bold text-emerald-400 dark:text-emerald-400`}>{p.wins}</td>
                        <td className={`${numTdClass} text-slate-700 dark:text-slate-300`}>{p.pointsFor}</td>
                        <td className={`${numTdClass} text-slate-500`}>{p.pointsAgainst}</td>
                        <td className={`${numTdClass} font-medium ${diff > 0 ? 'text-blue-400' : diff < 0 ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {diff}
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
      {!embedded && <div className={`bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs text-slate-400 dark:text-slate-500 ${qualifiesByGroup ? 'flex' : 'hidden sm:flex'} flex-col ${compact ? '' : 'sm:flex-row sm:justify-between'} gap-1`}>
        {!compact && <span className="hidden sm:inline">{t('standings.sorting')}</span>}
        { qualifiesByGroup &&
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('standings.qualifiedZone', { count: qualifiesByGroup })}</span>
        }
      </div>}
    </div>
  );
};
