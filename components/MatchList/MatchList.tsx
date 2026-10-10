import React from 'react';
import { useTranslation } from 'react-i18next';
import { Match, Participant } from '../../types';
import { useMatchList, isMatchInProgress as isInProgressMatch, getGroupDescription } from './useMatchList';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  onReorderMatches?: (reorderedMatches: Match[]) => void;
  readOnly?: boolean;
  maxScore?: number;
  groupDescriptions?: Record<string, string>;
}

export const MatchList: React.FC<Props> = ({ matches, participants, onMatchClick, onReorderMatches, readOnly = false, maxScore = 16, groupDescriptions }) => {
  const { t } = useTranslation();
  const {
    sortMode,
    viewMode,
    dragIndex,
    dragOverIndex,
    canDrag,
    groupPositionMap,
    groupSeedMap,
    sortedMatches,
    groupedByRound,
    groupedByGroup,
    orderedGroupKeys,
    handleSortModeChange,
    handleSetViewMode,
    handleDrop,
    handleMoveUp,
    handleMoveDown,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useMatchList({ matches, participants, onReorderMatches, readOnly });

  const isMatchInProgress = (m: Match) => isInProgressMatch(m, maxScore);

  // "Group A" + optional muted description (e.g. start time) on a single line
  const renderGroupHeader = (groupKey: string, labelClassName: string) => {
    if (groupKey === 'ZZZ') return <span className={labelClassName}>{t('matchList.withoutGroup')}</span>;
    const description = getGroupDescription(groupDescriptions, groupKey);
    return (
      <span className="flex items-baseline gap-1.5 min-w-0">
        <span className={`${labelClassName} whitespace-nowrap shrink-0`}>{t('matchList.groupLabel', { name: groupKey })}</span>
        {description && (
          <>
            <span className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true">·</span>
            <span className="font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500 truncate min-w-0" title={description}>{description}</span>
          </>
        )}
      </span>
    );
  };

  const livePill = (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/70 dark:border-amber-500/40 px-1.5 py-px text-[9px] sm:text-[10px] font-bold uppercase tracking-wide leading-none whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
      {t('common.live')}
    </span>
  );

  // In group sort mode the separator already names the group, so badges only show the seed number
  const getPositionLabel = (participantId: string | null | undefined) => {
    if (!participantId) return '?';
    if (sortMode === 'group') return groupSeedMap[participantId] ? String(groupSeedMap[participantId]) : '?';
    return (groupPositionMap[participantId] || '?').replace(/^group\s+/i, '').trim().toUpperCase();
  };

  return (
    <div className="">
      {/* Controls */}
      <div className="flex justify-end items-center gap-2 sm:gap-3 mb-3">
        <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2" title={t('matchList.orderBy')}>
          <span className="hidden sm:inline">{t('matchList.orderBy')}</span>
          <select
            value={sortMode}
            onChange={(e) => handleSortModeChange(e.target.value as 'round' | 'group' | 'custom')}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-200"
          >
            <option value="group">{t('matchList.group')}</option>
            <option value="round">{t('matchList.round')}</option>
            {viewMode === 'list' && <option value="custom">{t('matchList.custom')}</option>}
          </select>
        </label>
        {/* View toggle */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded overflow-hidden text-xs">
          <button
            onClick={() => handleSetViewMode('cards')}
            title={t('matchList.cards')}
            className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors ${viewMode === 'cards' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            <span className="hidden sm:inline">{t('matchList.cards')}</span>
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            title={t('matchList.list')}
            className={`px-2.5 py-1.5 flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 transition-colors ${viewMode === 'list' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
              <rect x="1" y="12" width="14" height="2" rx="1"/>
            </svg>
            <span className="hidden sm:inline">{t('matchList.list')}</span>
          </button>
        </div>
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {canDrag && (
            <div className="hidden sm:flex px-3 py-1.5 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 items-center gap-1.5 select-none">
              <span className="text-slate-400 dark:text-slate-600 text-base leading-none">⢷</span> {t('matchList.dragHint')}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                {canDrag && <th className="hidden sm:table-cell w-8"></th>}
                <th className="px-1 md:px-3 py-2 w-6 sm:w-10 text-center text-slate-400 dark:text-slate-600">#</th>
                <th className="px-1 md:px-3 py-2 text-right"></th>
                <th className="px-0 md:px-3 py-2 w-16 sm:w-28 text-center">{t('matchList.score')}</th>
                <th className="px-1 md:px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {sortedMatches.map((m, idx) => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const posA = getPositionLabel(m.participantAId);
                const posB = getPositionLabel(m.participantBId);
                const isDragging = dragIndex === idx;
                const isDragOver = dragOverIndex === idx && dragIndex !== idx;
                const isInProgress = isMatchInProgress(m);

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
                  ? t('matchList.roundLabel', { number: m.round || 1 })
                  : currentKey === 'ZZZ' ? t('matchList.withoutGroup') : t('matchList.groupLabel', { name: currentKey });

                return (
                  <React.Fragment key={m.id}>
                    {showSeparator && (
                      <tr className="bg-slate-100 dark:bg-slate-900/60">
                        <td
                          colSpan={canDrag ? 6 : 4}
                          className="px-3 py-0.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider max-w-0"
                        >
                          {sortMode === 'group' && currentKey
                            ? renderGroupHeader(currentKey, '')
                            : <span className="whitespace-nowrap">{separatorLabel}</span>}
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
                      isDragging ? 'opacity-30 bg-slate-200 dark:bg-slate-700' : '',
                      isDragOver ? 'bg-blue-50 dark:bg-blue-900/20 border-t-2 border-t-blue-500' : '',
                      !isDragging && !isDragOver
                        ? (isInProgress
                          // Live: static amber accent bar on the left edge + faint amber tint
                          ? 'bg-amber-50/70 dark:bg-amber-500/[0.06] hover:bg-amber-50 dark:hover:bg-amber-500/10 shadow-[inset_3px_0_0_0_rgb(245,158,11)]'
                          : m.isCompleted ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-700/30')
                        : '',
                    ].join(' ')}
                  >
                    {canDrag && (
                      <td className="hidden sm:table-cell px-2 text-center text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing select-none text-base leading-none">
                        ⠿
                      </td>
                    )}
                    {canDrag && (
                      <td className="sm:hidden w-6 pl-1 py-0.5">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveUp(idx); }}
                            disabled={idx === 0}
                            title={t('matchList.moveUp')}
                            aria-label={t('matchList.moveUp')}
                            className="px-1.5 py-0.5 text-[10px] leading-none text-slate-400 dark:text-slate-500 hover:text-blue-500 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveDown(idx); }}
                            disabled={idx === sortedMatches.length - 1}
                            title={t('matchList.moveDown')}
                            aria-label={t('matchList.moveDown')}
                            className="px-1.5 py-0.5 text-[10px] leading-none text-slate-400 dark:text-slate-500 hover:text-blue-500 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="px-0 md:px-2 py-2 sm:py-2.5 w-6 sm:w-10 text-center font-mono text-xs text-slate-400 dark:text-slate-500">{idx + 1}</td>
                    {/* Team A */}
                    <td className="px-1 md:px-2 py-2 sm:py-2.5">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <span className={`font-medium min-w-0 truncate max-w-[90px] sm:max-w-[160px] text-right ${m.winnerId === m.participantAId ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {pA?.name || t('matchList.tbd')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50 shrink-0">
                          {posA}
                        </span>
                      </div>
                    </td>
                    {/* Score */}
                    <td className="px-0 md:px-2 py-2 sm:py-2.5 w-16 sm:w-28 text-center">
                      {m.isCompleted ? (
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                          <span className={`${m.winnerId === m.participantAId ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>{m.scoreA}</span>
                          {` – `}
                          <span className={`${m.winnerId === m.participantBId ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>{m.scoreB}</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-bold text-sm tabular-nums text-amber-600 dark:text-amber-400">
                            {`${m.scoreA ?? 0}–${m.scoreB ?? 0}`}
                          </span>
                          {livePill}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs">
                          {t('matchList.vs')}
                        </span>
                      )}
                    </td>
                    {/* Team B */}
                    <td className="px-1 md:px-2 py-2 sm:py-2.5">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50 shrink-0">
                          {posB}
                        </span>
                        <span className={`font-medium min-w-0 truncate max-w-[90px] sm:max-w-[160px] text-left ${m.winnerId === m.participantBId ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {pB?.name || t('matchList.tbd')}
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
              header: t('matchList.roundLabel', { number: key }),
              sectionMatches: groupedByRound[parseInt(key)],
            }))
          : orderedGroupKeys.map(groupKey => ({
              key: `group-${groupKey}`,
              header: renderGroupHeader(groupKey, ''),
              sectionMatches: groupedByGroup[groupKey],
            }));

        const getBadge = (m: Match) =>
          sortMode === 'round'
            ? (m.group ? (m.group.startsWith('Group') ? m.group : t('matchList.groupLabel', { name: m.group })) : null)
            : t('matchList.roundLabel', { number: m.round || 1 });

        return (
          <div>
            {sections.map(({ key, header, sectionMatches }) => (
              <div key={key} className="mt-4 first:mt-0">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase mb-2 ml-1 whitespace-nowrap min-w-0">{header}</h3>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {sectionMatches.map((m, idx) => {
                    const pA = participants.find(p => p.id === m.participantAId);
                    const pB = participants.find(p => p.id === m.participantBId);
                    const badge = getBadge(m);
                    const isInProgress = isMatchInProgress(m);
                    return (
                      <div
                        key={m.id}
                        onClick={() => { if (!readOnly) onMatchClick(m); }}
                        className={`relative rounded-lg border p-3 transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
                          isInProgress
                            // Live: amber ring pulses on a pseudo-element (.live-ring in index.html), content stays still
                            ? 'live-ring bg-white dark:bg-slate-800 border-amber-300/70 dark:border-amber-500/40 shadow-sm'
                            : m.isCompleted
                              ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 opacity-80 hover:opacity-100'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex">
                          <div className="font-mono text-xs text-slate-400 dark:text-slate-500">#{idx + 1}</div>
                          <div className="flex flex-1 justify-center items-center mb-2 h-4">
                            {badge && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 mr-2 rounded border border-slate-200 dark:border-slate-700/50">
                                {badge}
                              </span>
                            )}
                            {isInProgress && livePill}
                          </div>
                        </div>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`font-medium min-w-0 truncate ${m.winnerId === m.participantAId ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {pA?.name || t('matchList.tbd')}
                          </span>
                          <span className={`font-mono text-lg font-bold shrink-0 ${m.isCompleted ? (m.winnerId === m.participantAId ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white') : isInProgress ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {m.scoreA ?? '-'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className={`font-medium min-w-0 truncate ${m.winnerId === m.participantBId ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {pB?.name || t('matchList.tbd')}
                          </span>
                          <span className={`font-mono text-lg font-bold shrink-0 ${m.isCompleted ? (m.winnerId === m.participantBId ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white') : isInProgress ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>
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
      })()}
    </div>
  );
};
