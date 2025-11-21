import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId, generateRoundRobinMatches } from '../services/tournamentLogic';
import { saveTournament, checkSlugExists } from '../services/storageService';
import { Tournament, TournamentStatus, EliminationType, StageType, Participant } from '../types';

interface GroupDef {
  id: string;
  name: string;
}

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [desc, setDesc] = useState('');
  
  const [pCount, setPCount] = useState<8 | 12 | 16>(8);
  const [qCount, setQCount] = useState(4);
  const [elimType, setElimType] = useState<EliminationType>(EliminationType.SINGLE_ELIMINATION);
  
  // Participants & Groups State
  const [names, setNames] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupDef[]>([{ id: 'g1', name: 'Group A' }]);
  const [assignments, setAssignments] = useState<Record<number, string>>({}); // playerIndex -> groupID
  
  // UI State
  const [activeGroupModal, setActiveGroupModal] = useState<string | null>(null);
  const [tempAssignments, setTempAssignments] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  // Initialize defaults
  useEffect(() => {
    initializeParticipants(8);
  }, []);

  // Update qCount options when elimType or pCount changes
  useEffect(() => {
    // If Bracket (Single Elimination) is selected, enforce powers of 2 (4, 8, 16)
    if (elimType === EliminationType.SINGLE_ELIMINATION) {
        if (qCount !== 4 && qCount !== 8 && qCount !== 16) {
            setQCount(4);
        }
    }
  }, [elimType, pCount]);

  const initializeParticipants = (count: number) => {
    const newNames = Array(count).fill(0).map((_, i) => `Player ${i + 1}`);
    setNames(newNames);
    
    // Reset to single default group
    const defId = 'g1';
    setGroups([{ id: defId, name: 'Group A' }]);
    
    const newAssignments: Record<number, string> = {};
    for(let i=0; i<count; i++) {
        newAssignments[i] = defId;
    }
    setAssignments(newAssignments);
  };

  const handlePCountChange = (c: 8 | 12 | 16) => {
    setPCount(c);
    initializeParticipants(c);
    // Reset Q count to a safe default
    setQCount(4);
  };

  const handleNameChange = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    setNames(newNames);
  };

  // Group Management Functions
  const addGroup = () => {
      const nextLetter = String.fromCharCode(65 + groups.length);
      const newId = generateId();
      setGroups([...groups, { id: newId, name: `Group ${nextLetter}` }]);
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

  const handleSubmit = () => {
    setError('');

    if (!name || !title || !slug) {
      setError('Please fill in all required basic info.');
      return;
    }

    if (names.some(n => !n.trim())) {
      setError('All participant names must be filled.');
      return;
    }

    if (checkSlugExists(slug)) {
      setError('URL Slug is already taken. Please choose another.');
      return;
    }
    
    // Validate Group Sizes
    for (const g of groups) {
        const count = Object.values(assignments).filter(id => id === g.id).length;
        if (count < 2) {
            setError(`Group "${g.name}" must have at least 2 participants.`);
            return;
        }
    }
    
    // Validate Qualification Count vs Participants
    if (qCount > pCount) {
        setError(`Cannot qualify ${qCount} players from only ${pCount} participants.`);
        return;
    }

    const tId = generateId();
    
    const participants: Participant[] = names.map((n, i) => ({
      id: generateId(),
      name: n.trim(),
      group: groups.find(g => g.id === assignments[i])?.name || 'A',
      wins: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      rank: 0,
      globalRank: 0,
      manualRankAdjustment: 0,
      isQualified: false,
      isDropped: false,
    }));

    const matches = generateRoundRobinMatches(tId, participants, StageType.RR1);

    const newTournament: Tournament = {
      id: tId,
      name,
      title,
      urlSlug: slug,
      description: desc,
      participantCount: pCount,
      qualificationCount: qCount,
      eliminationType: elimType,
      status: TournamentStatus.STARTED,
      participants,
      matches,
      createdAt: Date.now(),
      startedAt: Date.now()
    };

    saveTournament(newTournament);
    navigate(`/tournament/${slug}`);
  };

  // Determine valid Q counts
  const getQOptions = () => {
      if (elimType === EliminationType.SINGLE_ELIMINATION) {
          // Powers of 2 only
          const opts = [4, 8, 16];
          return opts.filter(n => n <= pCount);
      } else {
          // RR2: Any reasonable even number
          const opts = [4, 6, 8, 10, 12, 14, 16];
          return opts.filter(n => n <= pCount);
      }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl my-8">
      <h2 className="text-2xl font-bold mb-6 text-white">Setup Tournament</h2>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Tournament Name</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
              placeholder="e.g. Winter Cup"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">URL Slug</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
              placeholder="e.g. winter-cup-24"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Official Title</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
            placeholder="e.g. The 2024 Grand Winter Championship"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none h-20"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Step 2 Format</label>
            <select 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
              value={elimType}
              onChange={e => setElimType(e.target.value as EliminationType)}
            >
              <option value={EliminationType.SINGLE_ELIMINATION}>Bracket (Tree)</option>
              <option value={EliminationType.ROUND_ROBIN_2}>2nd Round Robin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Participants</label>
            <select 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
              value={pCount}
              onChange={e => handlePCountChange(parseInt(e.target.value) as 8|12|16)}
            >
              <option value={8}>8 Players</option>
              <option value={12}>12 Players</option>
              <option value={16}>16 Players</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Qualify to Step 2</label>
            <select 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
              value={qCount}
              onChange={e => setQCount(parseInt(e.target.value))}
            >
              {getQOptions().map(opt => (
                  <option key={opt} value={opt}>Top {opt} Total</option>
              ))}
            </select>
          </div>
        </div>

        {/* Participants Input */}
        <div>
           <h3 className="text-sm font-bold text-slate-400 mb-3">Enter Participants</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {names.map((pName, i) => {
               // Find assigned group for display
               const gId = assignments[i];
               const gName = groups.find(g => g.id === gId)?.name;
               return (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-slate-500 text-sm font-mono text-right">#{i + 1}</span>
                    <div className="flex-1 relative">
                        <input 
                            type="text"
                            placeholder={`Player ${i + 1}`}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 pr-16 text-white text-sm focus:border-blue-500 outline-none"
                            value={pName}
                            onChange={e => handleNameChange(i, e.target.value)}
                        />
                        {gName && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                {gName}
                            </span>
                        )}
                    </div>
                </div>
               );
             })}
           </div>
        </div>

        {/* Groups Section */}
        <div className="pt-4 border-t border-slate-700">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-400">Group Configuration</h3>
                <button 
                    onClick={addGroup}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
                >
                    + Add Group
                </button>
             </div>

             <div className="space-y-3">
                 {groups.map((g) => {
                     const memberIndices = Object.entries(assignments)
                        .filter(([_, gid]) => gid === g.id)
                        .map(([idx]) => parseInt(idx));
                     
                     return (
                        <div key={g.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                            <div className="flex items-center gap-3 mb-2">
                                <input 
                                    className="bg-transparent text-white font-bold text-sm border-b border-transparent focus:border-blue-500 outline-none w-full"
                                    value={g.name}
                                    onChange={e => updateGroupName(g.id, e.target.value)}
                                    placeholder="Group Name"
                                />
                                {groups.length > 1 && (
                                    <button 
                                        onClick={() => removeGroup(g.id)}
                                        className="text-slate-500 hover:text-red-400 text-xs"
                                        title="Remove Group"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                                {memberIndices.length === 0 ? (
                                    <span className="text-xs text-slate-600 italic">No players assigned</span>
                                ) : (
                                    memberIndices.map(idx => (
                                        <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                            {names[idx]}
                                        </span>
                                    ))
                                )}
                            </div>

                            <button 
                                onClick={() => openGroupModal(g.id)}
                                className="w-full py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 font-medium transition-colors"
                            >
                                Select Participants ({memberIndices.length})
                            </button>
                        </div>
                     );
                 })}
             </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-slate-700 flex justify-end gap-4">
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg shadow-blue-900/20 transition-all"
          >
            Start Tournament
          </button>
        </div>
      </div>

      {/* Modal for Group Selection */}
      {activeGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-white">
                            Manage <span className="text-blue-400">{groups.find(g => g.id === activeGroupModal)?.name}</span> Players
                        </h3>
                        <button onClick={closeGroupModal} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-1">
                    {names.map((pName, i) => {
                        // Use tempAssignments to show state inside modal
                        const assignedGid = tempAssignments[i];
                        const isAssignedToThis = assignedGid === activeGroupModal;
                        const otherGroup = groups.find(g => g.id === assignedGid);
                        
                        return (
                            <label key={i} className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${isAssignedToThis ? 'bg-blue-900/30 border border-blue-500/50' : 'border border-transparent hover:bg-slate-700/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAssignedToThis ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-600'}`}>
                                        {isAssignedToThis && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    {/* Hidden Checkbox for logic */}
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={isAssignedToThis}
                                        onChange={() => toggleAssignment(i, activeGroupModal)}
                                    />
                                    <span className={isAssignedToThis ? 'text-white font-medium' : 'text-slate-400'}>{pName}</span>
                                </div>
                                {!isAssignedToThis && otherGroup && (
                                    <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                        in {otherGroup.name}
                                    </span>
                                )}
                            </label>
                        )
                    })}
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-900/30 rounded-b-xl flex gap-3">
                    <button onClick={closeGroupModal} className="flex-1 py-2 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                    <button onClick={saveGroupModal} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};