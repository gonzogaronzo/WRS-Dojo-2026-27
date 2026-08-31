import React, { useState } from 'react';
import { MonitorUp, Radio, X } from 'lucide-react';
import { normalizePresenterCode } from '../presenterMode';

interface StudentScreenJoinDialogProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

const StudentScreenJoinDialog: React.FC<StudentScreenJoinDialogProps> = ({ open, onClose, onJoin }) => {
  const [codeInput, setCodeInput] = useState('');
  const normalizedCode = normalizePresenterCode(codeInput);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="student-screen-join-title">
      <form
        className="w-full max-w-md rounded-[2.5rem] border border-stone-200 bg-white p-7 shadow-2xl"
        onSubmit={event => {
          event.preventDefault();
          if (normalizedCode) onJoin(normalizedCode);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl bg-red-800 p-3 text-white"><MonitorUp className="h-6 w-6" /></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-300 hover:bg-stone-100 hover:text-stone-700" aria-label="Close student screen connection"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.25em] text-red-700">Student Display</p>
        <h2 id="student-screen-join-title" className="mt-1 font-serif text-3xl font-black text-stone-950">Connect to teacher</h2>
        <p className="mt-2 text-xs font-bold leading-relaxed text-stone-500">Enter the pairing code shown on the teacher laptop. This screen will show lesson content only.</p>

        <label className="mt-6 block">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-stone-500">Pairing Code</span>
          <input
            autoFocus
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={codeInput}
            onChange={event => setCodeInput(event.target.value.toUpperCase().slice(0, 9))}
            placeholder="ABCD-EFGH"
            className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-center font-mono text-2xl font-black uppercase tracking-[0.15em] text-stone-950 outline-none focus:border-red-700"
            aria-invalid={Boolean(codeInput) && !normalizedCode}
          />
        </label>
        {codeInput && !normalizedCode && (
          <p className="mt-2 text-center text-[9px] font-bold text-red-700">Enter all 8 letters and numbers from the teacher screen.</p>
        )}

        <button type="submit" disabled={!normalizedCode} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-35">
          <Radio className="h-4 w-4" /> Connect Display
        </button>
      </form>
    </div>
  );
};

export default StudentScreenJoinDialog;
