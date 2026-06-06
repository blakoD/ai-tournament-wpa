import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, TournamentStatus } from '../types';

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

const dateInputToTs = (val: string): number | null => {
  if (!val) return null;
  return new Date(val).getTime();
};

export const TournamentConfig: React.FC<Props> = ({ tournament, readOnly, onUpdate }) => {
  const hasStarted = tournament.status !== TournamentStatus.SETUP;

  const [name, setName] = useState(tournament.name);
  const [title, setTitle] = useState(tournament.title);
  const [description, setDescription] = useState(tournament.description);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(tournament.name);
    setTitle(tournament.title);
    setDescription(tournament.description);
  }, [tournament.id]);

  const isDirty =
    name !== tournament.name ||
    title !== tournament.title ||
    description !== tournament.description;

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
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration.');
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

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none';
  const inputDisabledClass = 'w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-400 outline-none opacity-60 cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-slate-400 mb-1';

  return (
    <div className="max-w-4xl mx-auto space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tournament Name</label>
          <input
            type="text"
            className={readOnly ? inputDisabledClass : inputClass}
            placeholder="e.g. Winter Cup"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={labelClass}>URL Slug</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className={`${inputDisabledClass} flex-1`}
              value={tournament.urlSlug}
              readOnly
            />
            <button
              onClick={handleCopySlug}
              className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
              title="Copy slug to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Official Title</label>
        <input
          type="text"
          className={readOnly ? inputDisabledClass : inputClass}
          placeholder="e.g. The 2024 Grand Winter Championship"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div>
        <label className={labelClass}>Description (Optional)</label>
        <textarea
          className={`${readOnly ? inputDisabledClass : inputClass} h-20`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={readOnly}
        />
      </div>

      {/* Participants & Groups */}
      <div className="pt-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-400">Participants</h3>
          {hasStarted && (
            <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded">
              Locked — tournament has started
            </span>
          )}
        </div>

        {sortedGroupNames.length > 0 ? (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {sortedGroupNames.map(groupName => (
              <div key={groupName} className="bg-slate-900/50 border border-slate-700 rounded-lg pt-3 pr-5 pb-5 pl-2">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 text-center">{groupName}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {groupedParticipants[groupName].map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="w-5 text-slate-600 text-xs font-mono text-right shrink-0">
                        #{p.groupSort ?? i + 1}
                      </span>
                      <span className="flex-1 border border-slate-700 rounded p-1.5 text-sm text-slate-300 truncate">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
            No participants yet.
          </div>
        )}
      </div>

      {/* Error */}
      {saveError && (
        <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm">
          {saveError}
        </div>
      )}

      {/* Save */}
      {!readOnly && (
        <div className="pt-4 border-t border-slate-700 flex justify-end items-center gap-4">
          {saveSuccess && <span className="text-sm text-emerald-400">✓ Saved successfully</span>}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`px-6 py-2 font-bold rounded shadow-lg shadow-blue-900/20 transition-all ${
              isDirty && !isSaving
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};
