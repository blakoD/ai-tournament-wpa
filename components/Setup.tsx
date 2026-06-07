import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { generateId, generateRoundRobinMatches, generateBracket } from '../services/tournamentLogic';
import { Tournament, TournamentStatus, EliminationType, StageType, Participant } from '../types';
import { createTournament, listTournaments, startTournament } from '../services/apiClient';

interface GroupDef {
  id: string;
  name: string;
}

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [desc, setDesc] = useState('');
  
  const [pCount, setPCount] = useState<number>(8);
  const [qCount, setQCount] = useState(2);
  const [elimType, setElimType] = useState<EliminationType>(EliminationType.ROUND_ROBIN_2);
  
  // Participants & Groups State
  const [names, setNames] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupDef[]>([{ id: 'g1', name: 'Group A' }]);
  const [assignments, setAssignments] = useState<Record<number, string>>({}); // playerIndex -> groupID
  const [groupMemberOrder, setGroupMemberOrder] = useState<Record<string, number[]>>({}); // groupId -> ordered playerIndices

  // Drag state for group member reordering
  const [dragInfo, setDragInfo] = useState<{ pIdx: number; groupId: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ pIdx: number; groupId: string } | null>(null);

  // Bulk import state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // UI State
  const [activeGroupModal, setActiveGroupModal] = useState<string | null>(null);
  const [tempAssignments, setTempAssignments] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toSlug = (val: string) =>
    val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleTournamentNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setSlug(cleaned);
    setSlugManuallyEdited(cleaned !== '' && cleaned !== toSlug(name));
  };

  // Initialize defaults
  useEffect(() => {
    initializeParticipants(8);
  }, []);

  // Update qCount options when elimType or pCount changes
  useEffect(() => {
    // If Bracket (Single Elimination) is selected, enforce multiples of 2 for pCount
    if (elimType === EliminationType.SINGLE_ELIMINATION) {
        if (pCount % 2 !== 0) {
            setPCount(prev => prev + (prev % 2));
        }
    }
  }, [elimType, pCount]);

  const initializeParticipants = (count: number) => {
    const newNames = Array(count).fill(0).map((_, i) => `${t('setup.player', { number: i + 1 })}`);
    setNames(newNames);
    
    // Reset to single default group
    const defId = 'g1';
    setGroups([{ id: defId, name: 'Group A' }]);
    
    const newAssignments: Record<number, string> = {};
    for(let i=0; i<count; i++) {
        newAssignments[i] = defId;
    }
    setAssignments(newAssignments);
    setGroupMemberOrder({ [defId]: Array.from({ length: count }, (_, i) => i) });
  };

  const handlePCountChange = (c: number) => {
    setPCount(c);
    initializeParticipants(c);
    // Reset Q count to a safe default
    setQCount(2);
  };

  const handleNameChange = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    setNames(newNames);
  };

  const switchToBulkMode = () => {
    setBulkText(names.join('\n'));
    setBulkMode(true);
  };

  const handleBulkApply = () => {
    const parsed = bulkText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (parsed.length < 2) {
      setError(t('setup.bulkImportMinError'));
      return;
    }

    let count = Math.min(parsed.length, 50);
    // Single elimination requires even number
    if (elimType === EliminationType.SINGLE_ELIMINATION && count % 2 !== 0) {
      count -= 1;
    }
    if (count < 2) {
      setError(t('setup.bulkImportMinError'));
      return;
    }

    const finalNames = parsed.slice(0, count);
    setPCount(count);
    setNames(finalNames);

    // Reset all to first group
    const defId = groups[0]?.id || 'g1';
    const newAssignments: Record<number, string> = {};
    for (let i = 0; i < count; i++) {
      newAssignments[i] = defId;
    }
    setAssignments(newAssignments);
    setGroupMemberOrder(prev => ({
      ...Object.fromEntries(Object.keys(prev).map(gid => [gid, [] as number[]])),
      [defId]: Array.from({ length: count }, (_, i) => i),
    }));

    setError('');
    setBulkMode(false);
  };

  // Group Management Functions
  const addGroup = () => {
      const nextLetter = String.fromCharCode(65 + groups.length);
      const newId = generateId();
      setGroups([...groups, { id: newId, name: `Group ${nextLetter}` }]);
      setGroupMemberOrder(prev => ({ ...prev, [newId]: [] }));
  };

  const removeGroup = (gid: string) => {
      if (groups.length <= 1) return;
      const newGroups = groups.filter(g => g.id !== gid);
      setGroups(newGroups);
      
      // Reassign orphans to first group
      const fallbackId = newGroups[0].id;
      const newAssignments = { ...assignments };
      Object.keys(newAssignments).forEach(key => {
          const k = parseInt(key);
          if (newAssignments[k] === gid) {
              newAssignments[k] = fallbackId;
          }
      });
      setAssignments(newAssignments);
      setGroupMemberOrder(prev => {
          const orphans = prev[gid] || [];
          const next = { ...prev };
          delete next[gid];
          next[fallbackId] = [...(next[fallbackId] || []), ...orphans];
          return next;
      });
  };

  const updateGroupName = (gid: string, val: string) => {
      setGroups(groups.map(g => g.id === gid ? { ...g, name: val } : g));
  };

  // Open modal and buffer current assignments
  const openGroupModal = (gid: string) => {
      setTempAssignments({ ...assignments });
      setActiveGroupModal(gid);
  };

  // Commit changes from modal
  const saveGroupModal = () => {
      setGroupMemberOrder(prev => {
          const next: Record<string, number[]> = {};
          // Copy existing order arrays, removing participants that moved away
          for (const [gid, order] of Object.entries(prev)) {
              next[gid] = order.filter(pIdx => tempAssignments[pIdx] === gid);
          }
          // Append participants that were newly assigned to each group
          for (const [key, newGid] of Object.entries(tempAssignments)) {
              const pIdx = parseInt(key);
              const oldGid = assignments[pIdx];
              if (oldGid !== newGid) {
                  if (!next[newGid]) next[newGid] = [];
                  if (!next[newGid].includes(pIdx)) {
                      next[newGid] = [...next[newGid], pIdx];
                  }
              }
          }
          return next;
      });
      setAssignments({ ...tempAssignments });
      setActiveGroupModal(null);
  };

  // Close modal without saving
  const closeGroupModal = () => {
      setActiveGroupModal(null);
      setTempAssignments({}); // Clear temp
  };

  const toggleAssignment = (pIndex: number, gid: string) => {
      setTempAssignments(prev => {
          const currentGroup = prev[pIndex];
          const defaultGroup = groups[0].id;

          // If currently in this group, check if we can remove (move to default)
          if (currentGroup === gid) {
              // If this is the default group, we can't "uncheck" because they must be somewhere.
              // They must be moved to another group by checking them there.
              if (gid === defaultGroup) {
                  return prev; // No change
              }
              // Otherwise, move back to default group
              return { ...prev, [pIndex]: defaultGroup };
          } else {
              // Move into this group
              return { ...prev, [pIndex]: gid };
          }
      });
  };

  const handleMemberDrop = (groupId: string) => {
      if (
          !dragInfo ||
          !dragOverInfo ||
          dragInfo.groupId !== groupId ||
          dragOverInfo.groupId !== groupId ||
          dragInfo.pIdx === dragOverInfo.pIdx
      ) {
          setDragInfo(null);
          setDragOverInfo(null);
          return;
      }
      setGroupMemberOrder(prev => {
          const order = [...(prev[groupId] || [])];
          const fromIdx = order.indexOf(dragInfo.pIdx);
          const toIdx = order.indexOf(dragOverInfo.pIdx);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const [moved] = order.splice(fromIdx, 1);
          order.splice(toIdx, 0, moved);
          return { ...prev, [groupId]: order };
      });
      setDragInfo(null);
      setDragOverInfo(null);
  };

  const handleSubmit = async () => {
    setError('');

    try {

    if (!name || !title || !slug) {
      setError(t('setup.errorFillRequired'));
      return;
    }

    if (names.some(n => !n.trim())) {
      setError(t('setup.errorAllNames'));
      return;
    }

      const existingTournaments = await listTournaments();
      if (existingTournaments.some((tournament) => tournament.urlSlug === slug)) {
        setError(t('setup.errorSlugTaken'));
        return;
      }
    
    // Validate Group Sizes
    for (const g of groups) {
        const count = Object.values(assignments).filter(id => id === g.id).length;
        if (count < 2) {
            setError(t('setup.errorGroupMinParticipants', { name: g.name }));
            return;
        }
    }
    
    // Validate Qualification Count vs Participants
    if (qCount > pCount) {
        setError(t('setup.errorQualifyCount', { qualified: qCount, total: pCount }));
        return;
    }

    const tId = generateId();
    
    const participants: Participant[] = names.map((n, i) => {
      const groupId = assignments[i];
      const groupSort = (groupMemberOrder[groupId] || []).indexOf(i);
      return {
        id: generateId(),
        name: n.trim(),
        group: elimType === EliminationType.SINGLE_ELIMINATION ? 'A' : (groups.find(g => g.id === groupId)?.name || 'A'),
        groupSort: groupSort >= 0 ? groupSort + 1 : 1,
        wins: 0,
        matchesPlayed: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        rank: 0,
        globalRank: 0,
        manualRankAdjustment: 0,
        isQualified: false,
        isDropped: false,
      };
    });

    let matches = [];
    if (elimType === EliminationType.SINGLE_ELIMINATION) {
        matches = generateBracket(tId, participants, 1);
    } else {
        matches = generateRoundRobinMatches(tId, participants, StageType.RR, 1);
    }

    const newTournament: Tournament = {
      id: tId,
      name,
      title,
      urlSlug: slug,
      description: desc,
      participantCount: pCount,
      qualifiesByGroup: qCount,
      eliminationType: elimType,
      status: TournamentStatus.STARTED,
      participants,
      matches,
      createdAt: Date.now(),
      startedAt: Date.now()
    };

      setIsSubmitting(true);
      const created = await createTournament({
        ...newTournament,
        status: TournamentStatus.SETUP,
        participants: [],
        matches: [],
        startedAt: undefined,
      });

      await startTournament(created.id, {
        participants,
        matches,
        startedAt: Date.now(),
      });

      navigate(`/tournament/${slug}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('setup.errorCreateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl my-8">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">{t('setup.title')}</h2>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('setup.tournamentName')}</label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
              placeholder={t('setup.namePlaceholder')}
              value={name}
              onChange={e => handleTournamentNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              {t('setup.urlSlug')}
              {!slugManuallyEdited && slug && (
                <span className="text-[10px] font-semibold text-blue-400 bg-blue-900/30 border border-blue-700/40 px-1.5 py-0.5 rounded">{t('setup.auto')}</span>
              )}
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
              placeholder={t('setup.slugPlaceholder')}
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('setup.officialTitle')}</label>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
            placeholder={t('setup.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        
        <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('setup.description')}</label>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none h-20"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">{t('setup.startFormat')}</label>
            <select 
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white"
              value={elimType}
              onChange={e => setElimType(e.target.value as EliminationType)}
            >
              <option value={EliminationType.SINGLE_ELIMINATION}>{t('setup.bracket')}</option>
              <option value={EliminationType.ROUND_ROBIN_2}>{t('setup.roundRobin')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">{t('setup.participants')}</label>
            <select 
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white"
              value={pCount}
              onChange={e => handlePCountChange(parseInt(e.target.value))}
            >
              {Array.from({ length: 49 }, (_, i) => i + 2)
                .filter(n => elimType !== EliminationType.SINGLE_ELIMINATION || n % 2 === 0)
                .map(n => (
                  <option key={n} value={n}>{t('setup.players', { count: n })}</option>
                ))
              }
            </select>
          </div>
          {elimType !== EliminationType.SINGLE_ELIMINATION && (
            <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">{t('setup.qualifiesByGroup')}</label>
              <select 
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white"
                value={qCount}
                onChange={e => setQCount(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 8].map(opt => (
                    <option key={opt} value={opt}>{t('setup.topPerGroup', { count: opt })}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Participants Input */}
        <div>
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('setup.enterParticipants')}</h3>
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
               <button
                 type="button"
                 onClick={() => setBulkMode(false)}
                 className={`px-3 py-1 rounded text-xs font-medium transition-all ${!bulkMode ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
               >
                 {t('setup.bulkImportIndividual')}
               </button>
               <button
                 type="button"
                 onClick={switchToBulkMode}
                 className={`px-3 py-1 rounded text-xs font-medium transition-all ${bulkMode ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
               >
                 {t('setup.bulkImport')}
               </button>
             </div>
           </div>

           {bulkMode ? (
             <div className="space-y-2">
               <textarea
                 className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none resize-none font-mono"
                 rows={Math.max(6, Math.min(names.length + 2, 16))}
                 placeholder={t('setup.bulkImportPlaceholder')}
                 value={bulkText}
                 onChange={e => setBulkText(e.target.value)}
                 autoFocus
               />
               <div className="flex items-center justify-between gap-3">
                 <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                   </svg>
                   {t('setup.bulkImportHint')}
                 </p>
                 <div className="flex gap-2 shrink-0">
                   <button
                     type="button"
                     onClick={() => setBulkMode(false)}
                     className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
                   >
                     {t('common.cancel')}
                   </button>
                   <button
                     type="button"
                     onClick={handleBulkApply}
                     className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-colors"
                   >
                     {t('setup.bulkImportApply')}
                   </button>
                 </div>
               </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {names.map((pName, i) => {
                 return (
                  <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-slate-400 dark:text-slate-500 text-sm font-mono text-right">#{i + 1}</span>
                      <div className="flex-1 relative">
                          <input 
                              type="text"
                              placeholder={t('setup.player', { number: i + 1 })}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 pr-16 text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none"
                              value={pName}
                              onChange={e => handleNameChange(i, e.target.value)}
                          />
                      </div>
                  </div>
                 );
               })}
             </div>
           )}
        </div>

        {/* Groups Section */}
        {elimType !== EliminationType.SINGLE_ELIMINATION && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('setup.groupConfiguration')}</h3>
                  <button 
                      onClick={addGroup}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
                  >
                      {t('setup.addGroup')}
                  </button>
               </div>

               <div className="space-y-3">
                   {groups.map((g) => {
                       const memberOrder = groupMemberOrder[g.id] || [];
                       
                       return (
                          <div key={g.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                              <div className="flex items-center gap-3 mb-2">
                                  <input 
                                      className="bg-transparent text-slate-900 dark:text-white font-bold text-sm border-b border-transparent focus:border-blue-500 outline-none w-full"
                                      value={g.name}
                                      onChange={e => updateGroupName(g.id, e.target.value)}
                                      placeholder={t('setup.groupName')}
                                  />
                                  {groups.length > 1 && (
                                      <button 
                                          onClick={() => removeGroup(g.id)}
                                          className="text-slate-500 hover:text-red-400 text-xs"
                                          title={t('setup.removeGroup')}
                                      >
                                          {t('setup.removeGroup')}
                                      </button>
                                  )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                  {memberOrder.length === 0 ? (
                                      <span className="text-xs text-slate-300 italic">{t('setup.noPlayersAssigned')}</span>
                                  ) : (
                                      memberOrder.map((pIdx) => (
                                          <span
                                              key={pIdx}
                                              draggable
                                              onDragStart={() => setDragInfo({ pIdx, groupId: g.id })}
                                              onDragOver={(e) => { e.preventDefault(); setDragOverInfo({ pIdx, groupId: g.id }); }}
                                              onDrop={(e) => { e.preventDefault(); handleMemberDrop(g.id); }}
                                              onDragEnd={() => { setDragInfo(null); setDragOverInfo(null); }}
                                              className={`text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-grab select-none transition-all
                                                  ${dragInfo?.pIdx === pIdx ? 'opacity-30' : ''}
                                                  ${dragOverInfo?.pIdx === pIdx && dragInfo?.groupId === g.id && dragInfo?.pIdx !== pIdx ? 'ring-1 ring-blue-500 bg-slate-200 dark:bg-slate-700' : ''}`}
                                          >
                                            <span className="text-slate-600">⠿</span> {names[pIdx]}
                                          </span>
                                      ))
                                  )}
                              </div>

                              <button 
                                  onClick={() => openGroupModal(g.id)}
                                  className="w-full py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-blue-600 dark:text-blue-400 font-medium transition-colors"
                              >
                                  {t('setup.selectParticipants', { count: memberOrder.length })}
                              </button>
                          </div>
                       );
                   })}
               </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg shadow-blue-900/20 transition-all"
          >
            {isSubmitting ? t('setup.starting') : t('setup.startTournament')}
          </button>
        </div>
      </div>

      {/* Modal for Group Selection */}
      {activeGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                            {t('setup.manageGroup', { name: groups.find(g => g.id === activeGroupModal)?.name })}
                        </h3>
                        <button onClick={closeGroupModal} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-1">
                    {names.map((pName, i) => {
                        // Use tempAssignments to show state inside modal
                        const assignedGid = tempAssignments[i];
                        const isAssignedToThis = assignedGid === activeGroupModal;
                        const otherGroup = groups.find(g => g.id === assignedGid);
                        
                        return (
                            <label key={i} className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${isAssignedToThis ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-500/50' : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAssignedToThis ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`}>
                                        {isAssignedToThis && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    {/* Hidden Checkbox for logic */}
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={isAssignedToThis}
                                        onChange={() => toggleAssignment(i, activeGroupModal)}
                                    />
                                    <span className={isAssignedToThis ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}>{pName}</span>
                                </div>
                                {!isAssignedToThis && otherGroup && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                                        {t('setup.inGroup', { name: otherGroup.name })}
                                    </span>
                                )}
                            </label>
                        )
                    })}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 rounded-b-xl flex gap-3">
                    <button onClick={closeGroupModal} className="flex-1 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        {t('common.cancel')}
                    </button>
                    <button onClick={saveGroupModal} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors">
                        {t('setup.done')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};