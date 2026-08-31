
import React, { useState, useEffect } from 'react';
import { Calendar, User, X, ArrowRight, Sword, Crown, Bell, Clock, Briefcase, RotateCw, Fingerprint, AlertCircle, CheckCircle2, ChevronDown, Users, Zap } from 'lucide-react';
import { GroupProfile, StudentProfile } from '../../types';
import { generateId } from '../../utils';

interface MissionBriefingProps {
  onStart: (data: { date: string; students: string[]; isTraining?: boolean }) => void;
  initialStudentIds?: string[];
  activeGroup?: GroupProfile;
  allStudents: StudentProfile[];
  allGroups?: GroupProfile[];
  onSelectGroup?: (group: GroupProfile | null) => void;
  onUpdateGroup?: (group: GroupProfile) => void;
  onUpdateAllStudents?: (students: StudentProfile[]) => void;
}

const JOBS = [
  { id: 'gemstones', title: 'Gemstones', icon: Crown, color: 'text-amber-500' },
  { id: 'timer', title: 'Timer', icon: Clock, color: 'text-blue-500' },
  { id: 'schedule', title: 'Schedule', icon: Briefcase, color: 'text-emerald-500' },
  { id: 'bell', title: 'Bell', icon: Bell, color: 'text-red-500' },
];

const MissionBriefing: React.FC<MissionBriefingProps> = ({ 
  onStart, initialStudentIds = [], activeGroup, allStudents, allGroups = [], onSelectGroup, onUpdateGroup, onUpdateAllStudents 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [jobAssignments, setJobAssignments] = useState<Record<string, string>>(activeGroup?.jobs || {});

  // Reset selection when activeGroup changes or initialStudentIds are provided
  useEffect(() => {
    if (initialStudentIds && initialStudentIds.length > 0) {
      // Filter initial IDs to ensure they belong to the current group
      const validIds = initialStudentIds.filter(id => activeGroup?.studentIds.includes(id));
      setSelectedStudentIds(validIds);
    } else if (activeGroup?.studentIds) {
      setSelectedStudentIds(activeGroup.studentIds);
    } else {
      setSelectedStudentIds([]);
    }
  }, [activeGroup?.id, initialStudentIds]);

  // Sync jobs from group memory
  useEffect(() => {
    if (activeGroup?.jobs) {
      setJobAssignments(activeGroup.jobs);
    }
  }, [activeGroup?.jobs]);

  const fullSquadRoster = activeGroup?.studentIds || [];

  const togglePresence = (sid: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  const assignJob = (jobId: string, studentId: string) => {
    const newJobs = { ...jobAssignments, [jobId]: studentId };
    setJobAssignments(newJobs);
    if (activeGroup && onUpdateGroup) {
      onUpdateGroup({ ...activeGroup, jobs: newJobs });
    }
  };

  /**
   * STAGGERED TACTICAL ROTATION
   * 1. Increments a global rotationOffset.
   * 2. For each job, it starts searching from (Offset + JobIndex).
   * 3. It finds the next PRESENT student, then ensures the NEXT job searches 
   *    STARTING FROM the person after that, to avoid overlaps.
   */
  const rotateJobs = () => {
    if (fullSquadRoster.length === 0 || selectedStudentIds.length === 0) {
      alert("Cannot rotate: No students are checked in for today's lesson.");
      return;
    }
    
    // Increment the global turn offset
    const currentOffset = activeGroup?.rotationOffset || 0;
    const nextGlobalOffset = currentOffset + 1;
    
    const newJobs: Record<string, string> = {};
    let searchStartIndex = nextGlobalOffset % fullSquadRoster.length;

    JOBS.forEach((job) => {
      let assignedId = "";
      
      // Search for the next present ninja starting from the current cursor
      for (let attempts = 0; attempts < fullSquadRoster.length; attempts++) {
        const checkIdx = (searchStartIndex + attempts) % fullSquadRoster.length;
        const candidateId = fullSquadRoster[checkIdx];
        
        if (selectedStudentIds.includes(candidateId)) {
          // If we have enough students to not repeat, check if already assigned
          // If we HAVE to repeat (1 student present, 4 jobs), allow it
          const isAlreadyAssigned = Object.values(newJobs).includes(candidateId);
          if (!isAlreadyAssigned || selectedStudentIds.length === 1) {
            assignedId = candidateId;
            // Move the search cursor forward for the NEXT job
            searchStartIndex = (checkIdx + 1) % fullSquadRoster.length;
            break;
          }
        }
      }
      
      newJobs[job.id] = assignedId;
    });

    setJobAssignments(newJobs);
    if (activeGroup && onUpdateGroup) {
      onUpdateGroup({ 
        ...activeGroup, 
        jobs: newJobs,
        rotationOffset: nextGlobalOffset 
      });
    }
  };

  return (
    <div className="min-h-full w-full bg-[#fdf6e3] flex flex-col items-center md:justify-center justify-start p-4 md:p-8 font-sans text-stone-900">
      <div className="max-w-6xl w-full bg-white shadow-2xl border-4 border-stone-800 rounded-3xl overflow-hidden flex flex-col md:flex-row my-4">
        
        {/* ATTENDANCE PANEL */}
        <div className="md:w-5/12 bg-stone-900 p-10 text-white relative border-r-4 border-stone-800">
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-red-900 rounded-2xl"><Sword className="w-8 h-8 text-white" /></div>
                <div>
                   <h1 className="text-2xl font-black font-serif tracking-widest uppercase">Mission Briefing</h1>
                   <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Attendance & Deployment</p>
                </div>
             </div>

             <div className="mb-10">
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-3">Active Group</label>
                <div className="relative">
                  <select 
                    value={activeGroup?.id || ''} 
                    onChange={(e) => {
                      const g = allGroups.find(group => group.id === e.target.value);
                      onSelectGroup?.(g || null);
                    }}
                    className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl p-4 font-serif text-lg font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select a Group...</option>
                    {allGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-500 pointer-events-none" />
                </div>
             </div>

             <div className="mb-10">
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-3">Mission Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl p-4 font-serif text-lg font-bold text-white outline-none" />
             </div>

             <div className="mb-10">
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">Students Present</label>
                <p className="mb-4 text-[9px] font-bold leading-relaxed text-stone-500">Checked students are saved as present; unchecked group members are saved as absent when the lesson begins.</p>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-3 custom-scrollbar">
                  {fullSquadRoster.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-stone-800 rounded-2xl text-stone-600">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Students in this Group</p>
                    </div>
                  ) : (
                    fullSquadRoster.map((sid) => {
                      const s = allStudents.find(ninja => ninja.id === sid);
                      if (!s) return null;
                      const isPresent = selectedStudentIds.includes(sid);
                      return (
                        <div 
                          key={sid} 
                          onClick={() => togglePresence(sid)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group active:scale-[0.98] ${isPresent ? 'bg-red-900 border-red-700 shadow-lg' : 'bg-stone-800/50 border-stone-800 text-stone-500 hover:border-stone-700'}`}
                        >
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isPresent ? 'bg-white text-red-900' : 'bg-stone-900 text-stone-700'}`}>
                               {s.name.charAt(0)}
                             </div>
                             <span className={`font-bold text-sm tracking-wide transition-colors ${isPresent ? 'text-white' : 'text-stone-600'}`}>{s.name}</span>
                          </div>
                          {isPresent ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Present</span>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase text-stone-700 tracking-widest">Absent</span>
                              <div className="w-5 h-5 rounded-full border-2 border-stone-800" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
             </div>

             <div className="flex flex-col gap-3">
               <button 
                  onClick={() => onStart({ date, students: selectedStudentIds })} 
                  disabled={selectedStudentIds.length === 0} 
                  className="w-full bg-red-800 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-4"
               >
                  Begin Mission <ArrowRight className="w-6 h-6" />
               </button>
               <button 
                  onClick={() => onStart({ date, students: selectedStudentIds, isTraining: true })} 
                  disabled={selectedStudentIds.length === 0} 
                  className="w-full bg-stone-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-4 border border-stone-700"
               >
                  Enter Training Mode <Zap className="w-4 h-4 text-amber-500" />
               </button>
             </div>
           </div>
        </div>

        {/* JOBS PANEL */}
        <div className="md:w-7/12 bg-white p-10 relative">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-stone-900 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-red-800" /> Tactical Assignments
                </h2>
                <p className="text-stone-400 text-[10px] font-bold uppercase mt-1">Automatic shift and skip for absent students</p>
              </div>
              <button 
                onClick={rotateJobs} 
                className="flex items-center gap-3 text-[10px] font-black bg-stone-900 text-white px-6 py-3 rounded-full hover:bg-red-800 transition-all uppercase tracking-widest shadow-lg active:scale-95"
              >
                <RotateCw className="w-4 h-4" /> Next Shift
              </button>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {JOBS.map(job => {
                const Icon = job.icon;
                const assignedId = jobAssignments[job.id];
                const isAbsent = assignedId && !selectedStudentIds.includes(assignedId);

                return (
                  <div 
                    key={job.id} 
                    className={`bg-stone-50 p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${isAbsent ? 'border-amber-200 bg-amber-50/50' : 'border-stone-100 hover:border-stone-200'}`}
                  >
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl bg-white shadow-sm border border-stone-100 ${job.color}`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="font-black text-stone-900 font-serif uppercase tracking-wider text-sm block">{job.title}</span>
                          {isAbsent && (
                             <span className="text-[10px] text-amber-600 font-black uppercase flex items-center gap-1 mt-1">
                               <AlertCircle className="w-3 h-3" /> Student is Absent
                             </span>
                          )}
                        </div>
                    </div>

                    <div className="relative w-48">
                      <select 
                        value={assignedId || ''}
                        onChange={(e) => assignJob(job.id, e.target.value)}
                        className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer ${isAbsent ? 'border-amber-300 text-amber-700' : 'border-stone-200 focus:border-red-800 text-stone-900'}`}
                      >
                        <option value="">Empty Slot</option>
                        {fullSquadRoster.map(sid => {
                          const s = allStudents.find(n => n.id === sid);
                          const present = selectedStudentIds.includes(sid);
                          return s ? <option key={sid} value={sid}>{s.name} {!present ? '(Absent)' : ''}</option> : null;
                        })}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
           </div>

           <div className="mt-12 p-8 bg-stone-900 rounded-3xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 text-stone-500">
                  <Fingerprint className="w-4 h-4 text-red-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registry Instruction</span>
                </div>
                <p className="text-stone-300 text-sm italic font-serif leading-relaxed">
                  "The app remembers the turn and cycles each job to the next student who is present."
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MissionBriefing;
