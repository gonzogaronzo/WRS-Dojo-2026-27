import React, { useState } from 'react';
import { Check, Copy, Laptop, Link2, Radio, Square, X } from 'lucide-react';
import { PresenterConnectionStatus } from '../presenterMode';

interface PresenterSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenLocal: () => void;
  onStartCloud: () => void;
  onUseAsStudentScreen: () => void;
  onStopCloud: () => void;
  onResync: () => void;
  cloudActive: boolean;
  cloudAvailable: boolean;
  code: string;
  studentDisplayUrl: string;
  status: PresenterConnectionStatus;
  error?: string | null;
}

const PresenterSetupDialog: React.FC<PresenterSetupDialogProps> = ({
  open,
  onClose,
  onOpenLocal,
  onStartCloud,
  onUseAsStudentScreen,
  onStopCloud,
  onResync,
  cloudActive,
  cloudAvailable,
  code,
  studentDisplayUrl,
  status,
  error
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  if (!open) return null;

  const copy = async (value: string, kind: 'code' | 'link') => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const statusText = status === 'connected'
    ? 'Student screen connected'
    : status === 'lagging'
      ? 'Connection delayed — recovering automatically'
    : status === 'connecting'
      ? 'Waiting for the student screen'
      : 'Presenter session is not connected';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="presenter-setup-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] border border-stone-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-700">Presenter Mode</p>
            <h2 id="presenter-setup-title" className="mt-1 font-serif text-3xl font-black text-stone-950">Open the student display</h2>
            <p className="mt-2 max-w-xl text-xs font-bold leading-relaxed text-stone-500">Students see only the lesson content. Scores, error marks, notes, and teacher controls stay on your screen.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-300 hover:bg-stone-100 hover:text-stone-700" aria-label="Close presenter setup">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!cloudActive ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={onOpenLocal} className="rounded-[2rem] border-2 border-stone-200 bg-stone-50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md">
              <Laptop className="mb-5 h-8 w-8 text-stone-700" />
              <span className="block font-serif text-xl font-black text-stone-950">This computer</span>
              <span className="mt-2 block text-[10px] font-bold leading-relaxed text-stone-500">Open a second browser window on this laptop, ideal for a projector or extended desktop.</span>
            </button>
            <button
              type="button"
              onClick={onStartCloud}
              disabled={!cloudAvailable}
              className="rounded-[2rem] border-2 border-emerald-200 bg-emerald-50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Radio className="mb-5 h-8 w-8 text-emerald-700" />
              <span className="block font-serif text-xl font-black text-stone-950">Another computer</span>
              <span className="mt-2 block text-[10px] font-bold leading-relaxed text-stone-500">Pair a smart-screen computer through the cloud while this laptop remains the teacher console.</span>
            </button>
            {!cloudAvailable && (
              <p className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[10px] font-bold text-amber-900">Sign in to Firebase on the teacher laptop before starting a cross-device student display.</p>
            )}
            {cloudAvailable && (
              <button type="button" onClick={onUseAsStudentScreen} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:border-red-300 hover:text-red-800">
                <Radio className="h-4 w-4" /> Already have a pairing code? Use this computer as the student screen
              </button>
            )}
          </div>
        ) : (
          <div className="mt-7">
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${status === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : status === 'lagging' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <span className={`h-3 w-3 shrink-0 rounded-full ${status === 'connected' ? 'bg-emerald-500' : status === 'lagging' ? 'bg-red-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest">{statusText}</p>
                <p className="mt-0.5 text-[9px] font-bold opacity-70">Keep this teacher tab open while presenting.</p>
              </div>
            </div>

            <div className="mt-5 rounded-[2rem] border-4 border-stone-900 bg-[#fdf6e3] p-6 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-stone-500">Pairing Code</p>
              <p className="mt-2 font-mono text-4xl font-black tracking-[0.12em] text-stone-950 sm:text-5xl">{code}</p>
              <button type="button" onClick={() => copy(code, 'code')} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-stone-700">
                {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'code' ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            <ol className="mt-5 space-y-3 rounded-[2rem] border border-stone-200 bg-stone-50 p-5 text-xs font-bold text-stone-600">
              <li><strong className="mr-2 text-stone-950">1.</strong>On the smart-screen computer, open this same site and sign in with the same Google account.</li>
              <li><strong className="mr-2 text-stone-950">2.</strong>Click <span className="font-black text-stone-950">Student Screen</span> in the top bar.</li>
              <li><strong className="mr-2 text-stone-950">3.</strong>Enter the pairing code above, then choose <span className="font-black text-stone-950">Connect Display</span>.</li>
            </ol>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => copy(studentDisplayUrl, 'link')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-widest text-stone-600 hover:border-stone-400">
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copied === 'link' ? 'Link Copied' : 'Copy Direct Link'}
              </button>
              <button type="button" onClick={onStopCloud} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white hover:bg-red-700">
                <Square className="h-4 w-4" /> Stop Student Display
              </button>
            </div>
            <button type="button" onClick={onResync} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-800 hover:border-emerald-400">
              <Radio className="h-4 w-4" /> Resync Current Screen
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[10px] font-bold leading-relaxed text-red-900">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenterSetupDialog;
