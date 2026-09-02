import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Layers3, RefreshCw, Save, Sparkles } from 'lucide-react';
import {
  createEmptyGroupInstructionalProfile,
  GroupInstructionalProfile,
  GroupProfile,
  LessonFocus
} from '../types';
import { classifyWordElements } from '../cumulativeWrsScope';

interface GroupInstructionalProfileProps {
  group: GroupProfile;
  onSave: (profile: GroupInstructionalProfile) => Promise<boolean>;
  onGenerate?: (profile: GroupInstructionalProfile) => Promise<void>;
  compilerConfigured?: boolean;
  generationSupported?: boolean;
}

interface ProfileDraft {
  currentSubstep: string;
  lessonFocus: LessonFocus | '';
  currentCardRepository: string;
  reviewCardRepository: string;
  affixes: string;
  baseElements: string;
  otherWordElements: string;
  highFrequencyWords: string;
  troubleSpots: string;
  conceptsToWeave: string;
  nextLessonNotes: string;
}

const lines = (items: string[]) => items.join('\n');
const toItems = (value: string) => value
  .split('\n')
  .map(item => item.trim())
  .filter(Boolean);

const toDraft = (profile?: GroupInstructionalProfile): ProfileDraft => {
  const source = profile || createEmptyGroupInstructionalProfile();
  const wordElements = classifyWordElements(source.practicedWordElements);
  return {
    currentSubstep: source.currentSubstep,
    lessonFocus: source.lessonFocus,
    currentCardRepository: lines(source.currentCardRepository),
    reviewCardRepository: lines(source.reviewCardRepository),
    affixes: lines(wordElements.affixes),
    baseElements: lines(wordElements.baseElements),
    otherWordElements: lines(wordElements.other),
    highFrequencyWords: lines(source.highFrequencyWords),
    troubleSpots: lines(source.troubleSpots),
    conceptsToWeave: lines(source.conceptsToWeave),
    nextLessonNotes: source.nextLessonNotes
  };
};

const GroupInstructionalProfilePanel: React.FC<GroupInstructionalProfileProps> = ({
  group,
  onSave,
  onGenerate,
  compilerConfigured = false,
  generationSupported = false
}) => {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(group.instructionalProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [generateMessage, setGenerateMessage] = useState('');
  const [generateError, setGenerateError] = useState(false);

  useEffect(() => {
    setDraft(toDraft(group.instructionalProfile));
    setSaveState('idle');
    setGenerateMessage('');
    setGenerateError(false);
  }, [group.id, group.instructionalProfile]);

  const updateDraft = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setSaveState('idle');
    setGenerateMessage('');
    setGenerateError(false);
  };

  const profileFromDraft = (): GroupInstructionalProfile => ({
    schemaVersion: 1,
    currentSubstep: draft.currentSubstep.trim(),
    lessonFocus: draft.lessonFocus,
    currentCardRepository: toItems(draft.currentCardRepository),
    reviewCardRepository: toItems(draft.reviewCardRepository),
    practicedWordElements: [...new Set([
      ...toItems(draft.affixes),
      ...toItems(draft.baseElements),
      ...toItems(draft.otherWordElements)
    ])],
    highFrequencyWords: toItems(draft.highFrequencyWords),
    troubleSpots: toItems(draft.troubleSpots),
    conceptsToWeave: toItems(draft.conceptsToWeave),
    nextLessonNotes: draft.nextLessonNotes.trim(),
    ...(group.instructionalProfile?.curriculumScopeVersion === 3 ? { curriculumScopeVersion: 3 as const } :
      group.instructionalProfile?.curriculumScopeVersion === 2 ? { curriculumScopeVersion: 2 as const } : {}),
    updatedAt: new Date().toISOString()
  });

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveState('idle');
    const saved = await onSave(profileFromDraft());
    setIsSaving(false);
    setSaveState(saved ? 'saved' : 'error');
  };

  const generateLesson = async () => {
    if (!onGenerate) return;
    const profile = profileFromDraft();
    if (!profile.lessonFocus || profile.lessonFocus === 'mixed') {
      setGenerateError(true);
      setGenerateMessage('Choose Introduction, Accuracy, or Automaticity / Fluency before generating.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(false);
    setGenerateMessage('Saving planning context…');
    try {
      const saved = await onSave(profile);
      if (!saved) throw new Error('The Instructional Profile could not be saved. Generation was stopped.');
      setSaveState('saved');
      setGenerateMessage('Compiling source-controlled lesson…');
      await onGenerate(profile);
    } catch (error) {
      setGenerateError(true);
      setGenerateMessage(error instanceof Error ? error.message : 'Lesson generation failed.');
      setIsGenerating(false);
      return;
    }
    setIsGenerating(false);
  };

  const generateDisabled = isSaving || isGenerating || !onGenerate || !compilerConfigured || !generationSupported;
  const generateHint = !compilerConfigured
    ? 'Compiler not configured in this Dojo build.'
    : !generationSupported
      ? `Automatic fidelity generation is not enabled for Substep ${draft.currentSubstep || '(not set)'} yet. The Release 1.0.1 pilot is 8.2 only.`
      : 'Saves this profile first, then opens the generated lesson in the editor for teacher review.';

  const textareaClass = 'min-h-24 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-red-800 focus:ring-4 focus:ring-red-800/10';
  const labelClass = 'mb-1.5 block text-[9px] font-black uppercase tracking-widest text-stone-500';

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="instructional-profile-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-800 p-2.5 text-white"><Layers3 className="h-5 w-5" /></div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-800">Persistent group state</p>
            <h3 id="instructional-profile-title" className="font-serif text-xl font-black text-stone-900">Instructional Profile</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">One item per line in the repositories and planning fields. This stays with {group.name}; it does not change a lesson already in progress.</p>
          </div>
        </div>
        {saveState === 'saved' && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>}
        {saveState === 'error' && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-700"><AlertCircle className="h-3.5 w-3.5" /> Could not save</span>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Current Substep</span>
          <input value={draft.currentSubstep} onChange={event => updateDraft('currentSubstep', event.target.value)} placeholder="Example: 1.6" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-red-800 focus:ring-4 focus:ring-red-800/10" />
        </label>
        <label>
          <span className={labelClass}>Lesson Focus</span>
          <select value={draft.lessonFocus} onChange={event => updateDraft('lessonFocus', event.target.value as LessonFocus | '')} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-red-800 focus:ring-4 focus:ring-red-800/10">
            <option value="">Not set</option>
            <option value="introduction">Introduction</option>
            <option value="accuracy">Accuracy</option>
            <option value="automaticity-fluency">Automaticity / Fluency</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Current Card Repository</span>
          <textarea value={draft.currentCardRepository} onChange={event => updateDraft('currentCardRepository', event.target.value)} placeholder="Cards or content currently in active use" className={textareaClass} />
        </label>
        <label>
          <span className={labelClass}>Review Card Repository</span>
          <textarea value={draft.reviewCardRepository} onChange={event => updateDraft('reviewCardRepository', event.target.value)} placeholder="Cards or content to keep in review" className={textareaClass} />
        </label>
        <label>
          <span className={labelClass}>Affixes</span>
          <textarea value={draft.affixes} onChange={event => updateDraft('affixes', event.target.value)} placeholder="No cumulative affixes at this substep" className={textareaClass} />
        </label>
        <label>
          <span className={labelClass}>Base Elements (Roots)</span>
          <textarea value={draft.baseElements} onChange={event => updateDraft('baseElements', event.target.value)} placeholder="No cumulative base elements at this substep" className={textareaClass} />
        </label>
        {draft.otherWordElements && <label className="sm:col-span-2">
          <span className={labelClass}>Other Word Elements</span>
          <textarea value={draft.otherWordElements} onChange={event => updateDraft('otherWordElements', event.target.value)} className={textareaClass} />
        </label>}
        <label>
          <span className={labelClass}>High Frequency Words</span>
          <textarea value={draft.highFrequencyWords} onChange={event => updateDraft('highFrequencyWords', event.target.value)} placeholder="Current or review High Frequency Words" className={textareaClass} />
        </label>
        <label>
          <span className={labelClass}>Trouble Spots</span>
          <textarea value={draft.troubleSpots} onChange={event => updateDraft('troubleSpots', event.target.value)} placeholder="Patterns to target in the next lesson" className={textareaClass} />
        </label>
        <label>
          <span className={labelClass}>Concepts to Weave</span>
          <textarea value={draft.conceptsToWeave} onChange={event => updateDraft('conceptsToWeave', event.target.value)} placeholder="Cumulative concepts to include" className={textareaClass} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className={labelClass}>Next-Lesson Notes</span>
        <textarea value={draft.nextLessonNotes} onChange={event => updateDraft('nextLessonNotes', event.target.value)} placeholder="What should the next generated or teacher-built lesson do?" className={textareaClass} />
      </label>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] leading-relaxed text-stone-400">{generateHint}</p>
            {generateMessage && (
              <p className={`mt-2 text-[10px] font-bold ${generateError ? 'text-red-700' : 'text-emerald-700'}`} role="status">
                {generateMessage}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button type="button" onClick={saveProfile} disabled={isSaving || isGenerating} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-stone-600 shadow-sm transition hover:border-red-200 hover:text-red-800 disabled:cursor-wait disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save Profile'}
            </button>
            <button type="button" onClick={generateLesson} disabled={generateDisabled} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none">
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? 'Generating…' : 'Generate Lesson'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GroupInstructionalProfilePanel;
