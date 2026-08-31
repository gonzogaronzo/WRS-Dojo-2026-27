import React from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Lesson, WrsLessonPlan, WrsSourceReference } from '../types';
import { generateId } from '../utils';
import { getWrsLessonReadiness } from '../wrsLessonPlan';

const inputClass = 'w-full border border-stone-300 rounded-xl p-3 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none';
const labelClass = 'block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2';

const Field = ({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <label>
    <span className={labelClass}>{label}</span>
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
  </label>
);

const Area = ({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <label>
    <span className={labelClass}>{label}</span>
    <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} min-h-20`} />
  </label>
);

const Choice = ({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; disabled?: boolean }) => (
  <label>
    <span className={labelClass}>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled} className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-500`}>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </label>
);

const Toggle = ({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
  <label className="flex items-center gap-2 text-xs font-bold text-stone-600">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} disabled={disabled} className="w-4 h-4 accent-red-800 disabled:opacity-60" />
    {label}
  </label>
);

export const WrsPlanOverview = ({ lesson, onChange, onLessonChange }: { lesson: Lesson; onChange: (plan: WrsLessonPlan) => void; onLessonChange?: (lesson: Lesson) => void }) => {
  const plan = lesson.wrsPlan!;
  const runtimePlan = lesson.runtimePlan;
  const runtimePart4 = runtimePlan?.parts.find(part => part.part === 4);
  const runtimeFocus = runtimePlan?.focus === 'automaticity-fluency' ? 'fluency' : runtimePlan?.focus || '';
  const runtimeWordTypes = runtimePart4?.data.chartingType ? [runtimePart4.data.chartingType] : [];
  const focusOptions: Array<[string, string]> = runtimePlan
    ? [["", "Select focus"], ["introduction", "Introduction"], ["accuracy", "Accuracy"], ["mixed", "Mixed"], ["fluency", "Automaticity / Fluency"]]
    : [["", "Select focus"], ["introduction", "Introduction"], ["accuracy", "Accuracy"], ["fluency", "Automaticity / Fluency"]];
  const planningContext = runtimePlan?.planningContext || { conceptsToWeave: '', troubleSpots: '' };
  const readiness = getWrsLessonReadiness(lesson);
  const update = <K extends keyof WrsLessonPlan>(key: K, value: WrsLessonPlan[K]) => onChange({ ...plan, [key]: value });
  const updateRuntimePlanningContext = (changes: Partial<typeof planningContext>) => {
    if (!runtimePlan || !onLessonChange) return;
    onLessonChange({
      ...lesson,
      runtimePlan: {
        ...runtimePlan,
        planningContext: { ...planningContext, ...changes }
      }
    });
  };
  const toggleWordType = (wordType: 'real' | 'nonsense', checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...plan.wordTypesToChart, wordType]))
      : plan.wordTypesToChart.filter(value => value !== wordType);
    update('wordTypesToChart', next);
  };
  const updateSource = (id: string, changes: Partial<WrsSourceReference>) => update('sources', plan.sources.map(source => source.id === id ? { ...source, ...changes } : source));
  const addSource = () => update('sources', [...plan.sources, {
    id: generateId(), sourceType: 'step-instruction', title: '', edition: '4th Edition', locator: '', verification: 'needs-verification', notes: ''
  }]);

  return (
    <section className="bg-[#f7f5ef] p-6 rounded-2xl border-2 border-stone-300 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-800" />
            <h3 className="text-lg font-black font-serif text-stone-900">Official WRS Lesson Plan</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">{runtimePlan ? 'The runtime lesson is authoritative; readiness is derived directly from its 10 Parts.' : 'Planning fields are additive; all existing lesson activities and live-teaching controls remain intact.'}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 border ${readiness.missing.length ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            {readiness.missing.length ? <AlertTriangle className="w-4 h-4 text-amber-700" /> : <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            {readiness.complete}/{readiness.total} planning requirements ready
          </div>
          {readiness.missing.length > 0 && <p className="text-[10px] text-stone-600 mt-1 max-w-sm">Still needed: {readiness.missing.join(', ')}.</p>}
          {readiness.sourceWarning && <p className="text-[10px] text-red-700 mt-1 max-w-sm">{readiness.sourceWarning}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Date" value={plan.date} onChange={value => update('date', value)} placeholder="YYYY-MM-DD" />
        <Field label="Lesson Number" value={plan.lessonNumber} onChange={value => update('lessonNumber', value)} />
        <Field label="Student Name / Group" value={plan.studentNameOrGroup} onChange={value => update('studentNameOrGroup', value)} />
        <Choice label="Lesson Focus" value={runtimePlan ? runtimeFocus : plan.lessonFocus} onChange={value => update('lessonFocus', value as WrsLessonPlan['lessonFocus'])} disabled={Boolean(runtimePlan)} options={focusOptions} />
        <div>
          <span className={labelClass}>Word Type to Chart</span>
          <div className="flex gap-4 rounded-xl border border-stone-300 bg-white p-3 min-h-[46px]">
            <Toggle label="Real" checked={(runtimePlan ? runtimeWordTypes : plan.wordTypesToChart).includes('real')} onChange={checked => toggleWordType('real', checked)} disabled={Boolean(runtimePlan)} />
            <Toggle label="Nonsense" checked={(runtimePlan ? runtimeWordTypes : plan.wordTypesToChart).includes('nonsense')} onChange={checked => toggleWordType('nonsense', checked)} disabled={Boolean(runtimePlan)} />
          </div>
        </div>
        <Choice label="Fidelity Status" value={plan.verificationStatus} onChange={value => update('verificationStatus', value as WrsLessonPlan['verificationStatus'])} options={[["draft", "Draft / teacher-created"], ["partially-verified", "Partially source-verified"], ["source-verified", "Source-verified"]]} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Area label="Concepts to Weave" value={runtimePlan ? planningContext.conceptsToWeave : plan.conceptsToWeave} onChange={value => runtimePlan ? updateRuntimePlanningContext({ conceptsToWeave: value }) : update('conceptsToWeave', value)} placeholder="Previously taught concepts to spiral into this lesson..." />
        <Area label="Trouble Spots" value={runtimePlan ? planningContext.troubleSpots : plan.troubleSpots} onChange={value => runtimePlan ? updateRuntimePlanningContext({ troubleSpots: value }) : update('troubleSpots', value)} placeholder="Documented student or group error patterns..." />
      </div>

      <details className="mt-6 rounded-xl border border-stone-300 bg-white">
        <summary className="cursor-pointer list-none flex items-center justify-between p-4 text-xs font-black uppercase tracking-widest text-stone-700">
          Source citations and verification
          <ChevronDown className="w-4 h-4" />
        </summary>
        <div className="border-t border-stone-200 p-4 space-y-3">
          {runtimePlan ? (
            <>
              <p className="text-xs text-stone-500">These citations come from the authoritative runtime lesson.</p>
              {runtimePlan.sources.map(source => (
                <div key={source.id} className="grid md:grid-cols-4 gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs">
                  <div><span className={labelClass}>Source Type</span><p className="font-bold text-stone-700">{source.kind}</p></div>
                  <div className="md:col-span-2"><span className={labelClass}>Title</span><p className="font-bold text-stone-700">{source.label}</p></div>
                  <div><span className={labelClass}>Edition / Locator</span><p className="font-bold text-stone-700">{[source.edition, source.locator].filter(Boolean).join(' · ') || '—'}</p></div>
                </div>
              ))}
            </>
          ) : <>
          <p className="text-xs text-stone-500">Record where lesson content came from. A fidelity label does not verify itself.</p>
          {plan.sources.map(source => (
            <div key={source.id} className="grid md:grid-cols-6 gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3">
              <Choice label="Source Type" value={source.sourceType} onChange={value => updateSource(source.id, { sourceType: value as WrsSourceReference['sourceType'] })} options={[["step-instruction", "Step Instruction"], ["instructor-manual", "Instructor Manual"], ["dictation-book", "Dictation Book"], ["student-reader", "Student Reader"], ["notebook-answer-key", "Notebook Answer Key"], ["inventory", "Inventory"], ["teacher-created", "Teacher-created"]]} />
              <div className="md:col-span-2"><Field label="Title" value={source.title} onChange={value => updateSource(source.id, { title: value })} /></div>
              <Field label="Edition" value={source.edition} onChange={value => updateSource(source.id, { edition: value })} />
              <Field label="Page / Locator" value={source.locator} onChange={value => updateSource(source.id, { locator: value })} />
              <div className="flex items-end gap-2">
                <Choice label="Verification" value={source.verification} onChange={value => updateSource(source.id, { verification: value as WrsSourceReference['verification'] })} options={[["needs-verification", "Needs verification"], ["verified", "Verified"], ["teacher-created", "Teacher-created"]]} />
                <button type="button" onClick={() => update('sources', plan.sources.filter(item => item.id !== source.id))} className="mb-2 p-2 text-stone-400 hover:text-red-700" aria-label="Remove source"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSource} className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:border-red-800 hover:text-red-800"><Plus className="w-4 h-4" />Add source citation</button>
          </>}
        </div>
      </details>
    </section>
  );
};

export const WrsPartPlanning = ({ part, plan, onChange }: { part: number; plan: WrsLessonPlan; onChange: (plan: WrsLessonPlan) => void }) => {
  const updatePart = (key: keyof WrsLessonPlan, value: unknown) => onChange({ ...plan, [key]: value });
  const panel = (children: React.ReactNode) => (
    <details className="mb-5 rounded-xl border border-stone-200 bg-[#fbfaf7]">
      <summary className="cursor-pointer list-none flex items-center justify-between p-3 text-[10px] font-black uppercase tracking-widest text-stone-600">
        Official plan details
        <ChevronDown className="w-4 h-4" />
      </summary>
      <div className="border-t border-stone-200 p-4">{children}</div>
    </details>
  );

  if (part === 1) {
    const p = plan.part1; const set = (changes: Partial<typeof p>) => updatePart('part1', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-3 gap-4"><Area label="Vowels" value={p.vowels} onChange={v => set({ vowels: v })} /><Area label="Consonants" value={p.consonants} onChange={v => set({ consonants: v })} /><Area label="Welded Sounds" value={p.welded} onChange={v => set({ welded: v })} /><div className="md:col-span-2"><Field label="Add to Notebook" value={p.addToNotebook} onChange={v => set({ addToNotebook: v })} /></div><Field label="Drill Leader (Group)" value={p.drillLeader} onChange={v => set({ drillLeader: v })} /></div>);
  }
  if (part === 2) {
    const p = plan.part2; const set = (changes: Partial<typeof p>) => updatePart('part2', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-2 gap-4"><Area label="Review Concepts" value={p.reviewConcepts} onChange={v => set({ reviewConcepts: v })} /><Area label="Review Words" value={p.reviewWords} onChange={v => set({ reviewWords: v })} /><Area label="Current Concepts" value={p.currentConcepts} onChange={v => set({ currentConcepts: v })} /><Area label="Current Words" value={p.currentWords} onChange={v => set({ currentWords: v })} /><div className="md:col-span-2"><Field label="Add to Notebook" value={p.addToNotebook} onChange={v => set({ addToNotebook: v })} /></div></div>);
  }
  if (part === 3) {
    const p = plan.part3; const set = (changes: Partial<typeof p>) => updatePart('part3', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-3 gap-4"><Field label="Substeps" value={p.substeps} onChange={v => set({ substeps: v })} /><div className="md:col-span-2"><Field label="Activity" value={p.activity} onChange={v => set({ activity: v })} /></div><div className="md:col-span-2"><Area label="Vocabulary Words" value={p.vocabularyWords} onChange={v => set({ vocabularyWords: v })} /></div><div className="space-y-3 pt-6"><Toggle label="Add new vocabulary to notebook" checked={p.addVocabularyToNotebook} onChange={v => set({ addVocabularyToNotebook: v })} /><Toggle label="Add new HFW to notebook" checked={p.addHfwToNotebook} onChange={v => set({ addHfwToNotebook: v })} /></div></div>);
  }
  if (part === 4) {
    const p = plan.part4; const set = (changes: Partial<typeof p>) => updatePart('part4', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-4 gap-4"><Choice label="Student Reader" value={p.studentReader} onChange={v => set({ studentReader: v as typeof p.studentReader })} options={[["", "Select"], ["AB", "AB"], ["A", "A"], ["B", "B"]]} /><Field label="Practice Page" value={p.practicePage} onChange={v => set({ practicePage: v })} /><Choice label="Practice Half" value={p.practiceHalf} onChange={v => set({ practiceHalf: v as typeof p.practiceHalf })} options={[["", "Select"], ["top", "Top"], ["bottom", "Bottom"]]} /><Field label="Charting Page" value={p.chartingPage} onChange={v => set({ chartingPage: v })} /><Choice label="Charting Half" value={p.chartingHalf} onChange={v => set({ chartingHalf: v as typeof p.chartingHalf })} options={[["", "Select"], ["top", "Top"], ["bottom", "Bottom"]]} /><div className="md:col-span-2"><Area label="Anticipated / Observed Errors" value={p.anticipatedErrors} onChange={v => set({ anticipatedErrors: v })} /></div><Area label="Activity (Group)" value={p.groupActivity} onChange={v => set({ groupActivity: v })} /></div>);
  }
  if (part === 5) {
    const p = plan.part5; const set = (changes: Partial<typeof p>) => updatePart('part5', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-4 gap-4"><Choice label="Student Reader" value={p.studentReader} onChange={v => set({ studentReader: v as typeof p.studentReader })} options={[["", "Select"], ["AB", "AB"], ["B", "B"]]} /><Field label="Page" value={p.page} onChange={v => set({ page: v })} /><Area label="Errors" value={p.anticipatedErrors} onChange={v => set({ anticipatedErrors: v })} /><Area label="Notes" value={p.notes} onChange={v => set({ notes: v })} /></div>);
  }
  if (part === 6) {
    const p = plan.part6; const set = (changes: Partial<typeof p>) => updatePart('part6', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-4 gap-4"><Area label="Vowels" value={p.vowels} onChange={v => set({ vowels: v })} /><Area label="Consonants" value={p.consonants} onChange={v => set({ consonants: v })} /><Area label="Welded Sounds" value={p.welded} onChange={v => set({ welded: v })} /><Area label="Word Elements" value={p.wordElements} onChange={v => set({ wordElements: v })} /></div>);
  }
  if (part === 7) {
    const p = plan.part7; const set = (changes: Partial<typeof p>) => updatePart('part7', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-2 gap-4"><Area label="Review Concepts" value={p.reviewConcepts} onChange={v => set({ reviewConcepts: v })} /><Area label="Review Words and Word Elements" value={p.reviewWordsAndElements} onChange={v => set({ reviewWordsAndElements: v })} /><Area label="Current Concepts" value={p.currentConcepts} onChange={v => set({ currentConcepts: v })} /><Area label="Current Words and Word Elements" value={p.currentWordsAndElements} onChange={v => set({ currentWordsAndElements: v })} /><Field label="High Frequency Words" value={p.highFrequencyWords} onChange={v => set({ highFrequencyWords: v })} /><Field label="Add to Notebook" value={p.addToNotebook} onChange={v => set({ addToNotebook: v })} /></div>);
  }
  if (part === 8) {
    const p = plan.part8; const set = (changes: Partial<typeof p>) => updatePart('part8', { ...p, ...changes });
    return panel(<Area label="Dictation / Proofreading Notes" value={p.notes} onChange={v => set({ notes: v })} />);
  }
  if (part === 9) {
    const p = plan.part9; const set = (changes: Partial<typeof p>) => updatePart('part9', { ...p, ...changes });
    return panel(<div className="grid md:grid-cols-4 gap-4"><Field label="Title" value={p.title} onChange={v => set({ title: v })} /><Field label="Page" value={p.page} onChange={v => set({ page: v })} /><Choice label="Source" value={p.source} onChange={v => set({ source: v as typeof p.source })} options={[["", "Select"], ["student-reader", "Student Reader"], ["wilson-fluency-kit", "Wilson Fluency Kit"], ["other-wrs-controlled", "Other WRS Controlled"]]} /><Choice label="Reader" value={p.studentReader} onChange={v => set({ studentReader: v as typeof p.studentReader })} options={[["", "Select"], ["AB", "AB"], ["B", "B"]]} /><Choice label="Comprehension S.O.S." value={p.comprehensionMode} onChange={v => set({ comprehensionMode: v as typeof p.comprehensionMode })} options={[["", "Select"], ["silent", "Silent"], ["oral", "Oral"]]} /><div className="pt-7"><Toggle label="Repeated reading" checked={p.repeatedReading} onChange={v => set({ repeatedReading: v })} /></div><Area label="Vocabulary" value={p.vocabulary} onChange={v => set({ vocabulary: v })} /><Area label="Follow-up Questions" value={p.followUpQuestions} onChange={v => set({ followUpQuestions: v })} /></div>);
  }
  if (part === 10) {
    const p = plan.part10; const set = (changes: Partial<typeof p>) => updatePart('part10', { ...p, ...changes });
    const toggleTask = (task: typeof p.tasks[number], checked: boolean) => set({ tasks: checked ? Array.from(new Set([...p.tasks, task])) : p.tasks.filter(value => value !== task) });
    return panel(<div className="space-y-4"><Choice label="Selection Timing" value={p.selectionStatus} onChange={v => set({ selectionStatus: v as typeof p.selectionStatus })} options={[["teacher-selected-at-lesson", "Teacher selects at lesson"], ["planned", "Planned now"]]} />{p.selectionStatus === 'planned' && <><div className="grid md:grid-cols-3 gap-4"><Field label="Source" value={p.source} onChange={v => set({ source: v })} /><Field label="Title" value={p.title} onChange={v => set({ title: v })} /><Field label="Page(s)" value={p.pages} onChange={v => set({ pages: v })} /></div><div><span className={labelClass}>Tasks</span><div className="flex flex-wrap gap-4"><Toggle label="Listening comprehension" checked={p.tasks.includes('listening-comprehension')} onChange={v => toggleTask('listening-comprehension', v)} /><Toggle label="Interactive oral reading" checked={p.tasks.includes('interactive-oral-reading')} onChange={v => toggleTask('interactive-oral-reading', v)} /><Toggle label="Scaffolded silent reading" checked={p.tasks.includes('scaffolded-silent-reading')} onChange={v => toggleTask('scaffolded-silent-reading', v)} /><Toggle label="Oral fluency" checked={p.tasks.includes('oral-fluency')} onChange={v => toggleTask('oral-fluency', v)} /></div></div></>}<Area label="Notes" value={p.notes} onChange={v => set({ notes: v })} /></div>);
  }
  return null;
};
