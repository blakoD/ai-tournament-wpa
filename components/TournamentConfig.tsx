import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tournament, TournamentStatus, EliminationType } from '../types';
import { RiFileCopyLine } from 'react-icons/ri';

interface Props {
  tournament: Tournament;
  readOnly: boolean;
  onUpdate: (t: Tournament) => Promise<Tournament>;
}

const tsToDateInput = (ts: number | null | undefined): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Trims values and drops empty entries so comparisons/saves are stable
const cleanGroupDescriptions = (map: Record<string, string> | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(map ?? {})) {
    const trimmed = (val ?? '').trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
};

const sameGroupDescriptions = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every(k => a[k] === b[k]);
};

const dateInputToTs = (val: string): number | null => {
  if (!val) return null;
  return new Date(val).getTime();
};

export const TournamentConfig: React.FC<Props> = ({ tournament, readOnly, onUpdate }) => {
  const { t } = useTranslation();
  const hasStarted = tournament.status !== TournamentStatus.SETUP;

  const [name, setName] = useState(tournament.name);
  const [title, setTitle] = useState(tournament.title);
  const [description, setDescription] = useState(tournament.description);
  const [maxScore, setMaxScore] = useState(tournament.maxScore ?? 16);
  const [groupDescriptions, setGroupDescriptions] = useState<Record<string, string>>(tournament.groupDescriptions ?? {});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(tournament.name);
    setTitle(tournament.title);
    setDescription(tournament.description);
    setMaxScore(tournament.maxScore ?? 16);
    setGroupDescriptions(tournament.groupDescriptions ?? {});
  }, [tournament.id]);

  const isDirty =
    name !== tournament.name ||
    title !== tournament.title ||
    description !== tournament.description ||
    maxScore !== (tournament.maxScore ?? 16) ||
    !sameGroupDescriptions(cleanGroupDescriptions(groupDescriptions), cleanGroupDescriptions(tournament.groupDescriptions));

  const handleSave = async () => {
    if (readOnly || !isDirty) return;
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await onUpdate({
        ...tournament,
        name: name.trim(),
        title: title.trim(),
        description: description.trim(),
        maxScore,
        groupDescriptions: cleanGroupDescriptions(groupDescriptions),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('config.errorSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySlug = () => {
    void navigator.clipboard.writeText(tournament.urlSlug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group participants by group name, sorted by groupSort within each group
  const groupedParticipants = useMemo(() => {
    const map: Record<string, typeof tournament.participants> = {};
    for (const p of tournament.participants) {
      const g = p.group || 'A';
      if (!map[g]) map[g] = [];
      map[g].push(p);
    }
    for (const g of Object.keys(map)) {
      map[g].sort((a, b) => (a.groupSort ?? 0) - (b.groupSort ?? 0));
    }
    return map;
  }, [tournament.participants]);

  const sortedGroupNames = Object.keys(groupedParticipants).sort();
  // Group descriptions are just labels (e.g. start time), so they stay editable after start
  const showGroupDescriptions = tournament.eliminationType !== EliminationType.SINGLE_ELIMINATION;

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none';
  const inputDisabledClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-400 outline-none opacity-60 cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('config.tournamentName')}</label>
          <input
            type="text"
            className={readOnly ? inputDisabledClass : inputClass}
            placeholder={t('config.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={labelClass}>{t('config.urlSlug')}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className={`${inputDisabledClass} flex-1`}
              value={tournament.urlSlug}
              readOnly
            />
            <button
              onClick={handleCopySlug}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
              title={t('config.copy')}
            >
              <RiFileCopyLine />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('config.officialTitle')}</label>
        <input
          type="text"
          className={readOnly ? inputDisabledClass : inputClass}
          placeholder={t('config.titlePlaceholder')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div>
        <label className={labelClass}>{t('config.description')}</label>
        <textarea
          className={`${readOnly ? inputDisabledClass : inputClass} h-20`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={readOnly}
        />
      </div>

      {/* Match Settings */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{t('config.matchSettings')}</h3>
        <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">{t('config.maxScore')}</label>
        <div className="w-24">
          <input
            type="number"
            min={1}
            max={999}
            className={readOnly ? inputDisabledClass : inputClass}
            value={maxScore}
            onChange={e => setMaxScore(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={readOnly}
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">{t('config.maxScoreNote')}</p>
      </div>

      {/* Participants & Groups */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('config.participants')}</h3>
          {hasStarted && (
            <span className="text-xs text-amber-600 bg-amber-100/10 dark:bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded">
              {t('config.locked')}
            </span>
          )}
        </div>

        {sortedGroupNames.length > 0 ? (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {sortedGroupNames.map(groupName => (
              <div key={groupName} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 text-center whitespace-nowrap">
                  {groupName.startsWith('Group') ? groupName : t('standings.group', { name: groupName })}
                </h4>
                {showGroupDescriptions && (
                  <input
                    type="text"
                    className={`${readOnly ? inputDisabledClass : inputClass} mb-2 !p-1.5 text-xs`}
                    placeholder={t('config.groupDescriptionPlaceholder')}
                    aria-label={t('config.groupDescription')}
                    value={groupDescriptions[groupName] ?? ''}
                    onChange={e => setGroupDescriptions(prev => ({ ...prev, [groupName]: e.target.value }))}
                    disabled={readOnly}
                    maxLength={60}
                  />
                )}
                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {groupedParticipants[groupName].map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 py-1">
                      <span className="w-6 text-slate-400 dark:text-slate-600 text-xs font-mono text-right shrink-0">
                        #{p.groupSort ?? i + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-slate-500 dark:text-slate-300 truncate">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            {t('config.noParticipants')}
          </div>
        )}
      </div>

      {/* Error */}
      {saveError && (
        <div className="p-3 bg-red-200/50 dark:bg-red-900/50 border border-red-600 text-red-600 dark:text-red-200 rounded text-sm">
          {saveError}
        </div>
      )}

      {/* Save */}
      {!readOnly && (
        <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-800 -mx-4 px-4 py-3 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row justify-end items-center gap-2 sm:gap-4">
          {saveSuccess && <span className="text-sm text-emerald-400">{t('config.savedSuccess')}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`w-full sm:w-auto px-6 py-2 font-bold rounded shadow-lg shadow-blue-900/20 transition-all ${
              isDirty && !isSaving
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? t('config.saving') : t('config.saveChanges')}
          </button>
        </div>
      )}
    </div>
  );
};
